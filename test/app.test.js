import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker, { signToken, verifySession, verifyToken } from "../src/worker.js";
import { AttemptLimiter } from "../src/attempt-limiter.js";
import { QUESTIONS } from "../src/question-bank.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const secret = "test-only-secret-key-with-more-than-32-bytes";
const TEST_ANSWERS = [
  ["sample-family"],
  ["sample-snack"],
  ["sample-cut-a", "sample-cut-b"],
  ["sample-tone-a", "sample-tone-b"],
  ["sample-vehicle-a", "sample-vehicle-b", "sample-vehicle-c"],
  ["sample-home"],
  ["sample-city-a"],
  ["sample-city-b"],
  ["sample-color"],
  ["sample-month"]
];
const nowSeconds = () => Math.floor(Date.now() / 1000);

function makeStorageState() {
  const values = new Map();
  const storage = {
    async transaction(callback) {
      return callback({
        get: async (key) => values.get(key),
        put: async (key, value) => values.set(key, value),
        delete: async (key) => values.delete(key)
      });
    },
    async setAlarm() {},
    async delete(key) { return values.delete(key); }
  };
  return { storage };
}

function createEnvironment(options = {}) {
  const instances = new Map();
  const env = {
    SESSION_SECRET: options.secret === undefined ? secret : options.secret,
    QUESTION_ANSWERS: options.questionAnswers === undefined ? JSON.stringify(TEST_ANSWERS) : options.questionAnswers,
    ASSETS: {
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        if (pathname === "/" || pathname === "/index.html") {
          return new Response(fs.readFileSync(path.join(root, "public/index.html"), "utf8"), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }
        const filename = path.join(root, "public", pathname.replace(/^\//u, ""));
        if (!filename.startsWith(path.join(root, "public"))) return new Response("Not found", { status: 404 });
        if (!fs.existsSync(filename)) return new Response("Not found", { status: 404 });
        return new Response(fs.readFileSync(filename), { headers: { "Content-Type": "application/octet-stream" } });
      }
    }
  };
  if (options.limiter !== false) {
    env.ATTEMPT_LIMITER = {
      idFromName: (name) => name,
      get(id) {
        if (!instances.has(id)) instances.set(id, new AttemptLimiter(makeStorageState()));
        const limiter = instances.get(id);
        return { fetch: (url, init) => limiter.fetch(new Request(url, init)) };
      }
    };
  }
  return env;
}

function request(pathname, init = {}, headers = {}) {
  return new Request(`https://portal.test${pathname}`, { ...init, headers: { ...headers, ...init.headers } });
}

async function challengeFor(questionIndex, selectedSecret = secret) {
  const iat = nowSeconds();
  return signToken({ typ: "challenge", qid: questionIndex, iat, exp: iat + 600, nonce: "test-nonce-value-0001" }, selectedSecret);
}

async function sessionCookie(selectedSecret = secret, options = {}) {
  const iat = options.iat ?? nowSeconds();
  const exp = options.exp ?? iat + 30 * 24 * 60 * 60;
  const token = await signToken({ typ: "session", iat, exp, jti: "test-session-id-000001" }, selectedSecret);
  return `tetsao_session=${token}`;
}

async function answerRequest(env, challenge, answer, ip = "203.0.113.10") {
  return worker.fetch(request("/api/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://portal.test",
      "CF-Connecting-IP": ip
    },
    body: JSON.stringify({ challenge, answer })
  }), env);
}

async function captureWarnings(callback) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...values) => warnings.push(values.join(" "));
  try {
    return { result: await callback(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

test("a correct secret-provided answer creates a signed 30-day session cookie", async () => {
  const env = createEnvironment();
  const challengeResponse = await worker.fetch(request("/api/challenge"), env);
  const challengeBody = await challengeResponse.json();
  assert.equal(challengeBody.authenticated, false);
  assert.equal(typeof challengeBody.question, "string");
  assert.equal(typeof challengeBody.challenge, "string");
  assert.equal("answers" in challengeBody, false);

  const payload = await verifyToken(challengeBody.challenge, secret);
  const answerResponse = await answerRequest(env, challengeBody.challenge, TEST_ANSWERS[payload.qid][0]);
  assert.equal(answerResponse.status, 200);
  assert.deepEqual(await answerResponse.clone().json(), { ok: true });
  const cookie = answerResponse.headers.get("Set-Cookie");
  assert.match(cookie, /Max-Age=2592000/u);
  assert.match(cookie, /HttpOnly/u);
  assert.match(cookie, /Secure/u);
  assert.match(cookie, /SameSite=Lax/u);

  const status = await worker.fetch(request("/api/challenge", { headers: { Cookie: cookie.split(";")[0] } }), env);
  assert.deepEqual(await status.json(), { authenticated: true });
});

test("incorrect answers are rejected without revealing accepted answers", async () => {
  const env = createEnvironment();
  const challenge = await challengeFor(0);
  const response = await answerRequest(env, challenge, "not-the-sample-answer");
  assert.equal(response.status, 401);
  assert.equal(response.headers.has("Set-Cookie"), false);
  const body = await response.json();
  assert.match(body.error, /doesn't sound quite right/u);
  assert.equal("answers" in body, false);
});

test("all configured alternatives are accepted after trimming and case normalization", async () => {
  let requestNumber = 1;
  for (const [index, alternatives] of TEST_ANSWERS.entries()) {
    if (alternatives.length < 2) continue;
    for (const answer of alternatives) {
      const env = createEnvironment();
      const challenge = await challengeFor(index);
      const response = await answerRequest(env, challenge, `  ${answer.toLocaleUpperCase("en-US")}  `, `198.51.100.${requestNumber++}`);
      assert.equal(response.status, 200, `configured alternative for prompt ${index + 1} should pass`);
    }
  }
});

test("expired sessions and invalid cookies do not authorize the dashboard", async () => {
  const env = createEnvironment();
  const now = nowSeconds();
  const expired = await sessionCookie(secret, { iat: now - 31 * 24 * 60 * 60, exp: now - 24 * 60 * 60 });
  const expiredRequest = request("/api/dashboard", { headers: { Cookie: expired } });
  assert.equal(await verifySession(expiredRequest, env), null);
  assert.equal((await worker.fetch(expiredRequest, env)).status, 401);

  const invalidRequest = request("/api/dashboard", { headers: { Cookie: "tetsao_session=not-a-valid-token" } });
  assert.equal((await worker.fetch(invalidRequest, env)).status, 401);
  const tamperedRequest = request("/api/dashboard", { headers: { Cookie: `tetsao_session=${(await sessionCookie()).split("=")[1]}x` } });
  assert.equal((await worker.fetch(tamperedRequest, env)).status, 401);
});

test("unauthorized dashboard requests and static page source reveal no service cards or links", async () => {
  const env = createEnvironment();
  const dashboard = await worker.fetch(request("/api/dashboard"), env);
  assert.equal(dashboard.status, 401);
  const body = await dashboard.text();
  for (const name of ["Zima Admin", "Zima VM", "Jellyseerr", "Jellyfin", "Audiobookshelf", "Immich"]) assert.equal(body.includes(name), false);

  const html = await (await worker.fetch(request("/"), env)).text();
  const client = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
  for (const name of ["Zima Admin", "Zima VM", "Jellyseerr", "Jellyfin", "Audiobookshelf", "Immich"]) {
    assert.equal(html.includes(name), false, `${name} must not be in initial HTML`);
    assert.equal(client.includes(name), false, `${name} must not be in public JavaScript`);
  }
  assert.equal(fs.existsSync(path.join(root, "public/config.js")), false);
  assert.equal((await worker.fetch(request("/src/question-bank.js"), env)).status, 404);
  assert.equal((await worker.fetch(request("/config.js"), env)).status, 404);

  const authorized = await worker.fetch(request("/api/dashboard", { headers: { Cookie: await sessionCookie() } }), env);
  assert.equal(authorized.status, 200);
  const servicePayload = await authorized.json();
  assert.deepEqual(servicePayload.services.map((service) => service.name), ["Zima Admin", "Zima VM", "Jellyseerr", "Jellyfin", "Audiobookshelf", "Immich"]);
  assert.ok(servicePayload.services.every((service) => service.href === ""));
  assert.ok(authorized.headers.get("Cache-Control").includes("no-store"));
});

test("attempt limits are enforced in the shared Durable Object counter", async () => {
  const env = createEnvironment();
  const challenge = await challengeFor(0);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await answerRequest(env, challenge, "incorrect sample", "192.0.2.90");
    assert.equal(response.status, 401);
  }
  const limited = await answerRequest(env, challenge, "incorrect sample", "192.0.2.90");
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);

  const noLimiter = createEnvironment({ limiter: false });
  assert.equal((await answerRequest(noLimiter, challenge, TEST_ANSWERS[0][0])).status, 503);
  assert.equal((await worker.fetch(request("/api/challenge"), noLimiter)).status, 503);
  assert.equal((await worker.fetch(request("/api/dashboard", { headers: { Cookie: await sessionCookie() } }), noLimiter)).status, 503);

  const missingIp = await worker.fetch(request("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://portal.test" },
    body: JSON.stringify({ challenge, answer: TEST_ANSWERS[0][0] })
  }), env);
  assert.equal(missingIp.status, 503);
});

test("gateway fails closed when either Wrangler secret is missing or malformed", async () => {
  const missingSessionSecret = createEnvironment();
  missingSessionSecret.SESSION_SECRET = "";
  const missingAnswerBank = createEnvironment();
  delete missingAnswerBank.QUESTION_ANSWERS;
  for (const env of [missingSessionSecret, missingAnswerBank]) {
    assert.equal((await worker.fetch(request("/api/challenge"), env)).status, 503);
    assert.equal((await worker.fetch(request("/api/dashboard", { headers: { Cookie: await sessionCookie() } }), env)).status, 503);
  }
  const malformed = createEnvironment({ questionAnswers: "not-json" });
  assert.equal((await worker.fetch(request("/api/challenge"), malformed)).status, 503);
});

test("challenge preflight logs a safe reason for every configuration failure", async () => {
  const missingSecret = createEnvironment();
  missingSecret.SESSION_SECRET = "";
  const shortSecret = createEnvironment({ secret: "too-short" });
  const missingAnswers = createEnvironment();
  delete missingAnswers.QUESTION_ANSWERS;
  const invalidJson = createEnvironment({ questionAnswers: "not-json" });
  const wrongQuestionCount = createEnvironment({ questionAnswers: JSON.stringify(Array.from({ length: 9 }, () => ["sample"])) });
  const invalidShape = createEnvironment({ questionAnswers: JSON.stringify(Array.from({ length: 10 }, (_, index) => index === 3 ? [""] : ["sample"])) });
  const tooLarge = createEnvironment({ questionAnswers: " ".repeat(8193) });
  const missingLimiter = createEnvironment({ limiter: false });
  const scenarios = [
    [missingSecret, "session_secret_missing_or_not_string"],
    [shortSecret, "session_secret_too_short"],
    [missingAnswers, "question_answers_missing_or_not_string"],
    [invalidJson, "question_answers_invalid_json"],
    [wrongQuestionCount, "question_answers_invalid_question_count"],
    [invalidShape, "question_answers_invalid_shape"],
    [tooLarge, "question_answers_too_large"],
    [missingLimiter, "attempt_limiter_binding_missing"]
  ];

  for (const [env, component] of scenarios) {
    const { result, warnings } = await captureWarnings(() => worker.fetch(request("/api/challenge"), env));
    assert.equal(result.status, 503, component);
    assert.equal(warnings.length, 1, component);
    assert.deepEqual(JSON.parse(warnings[0]), {
      event: "portal_gate_unavailable",
      route: "/api/challenge",
      component
    });
    assert.equal(warnings[0].includes(secret), false);
    for (const answer of TEST_ANSWERS.flat()) assert.equal(warnings[0].includes(answer), false);
  }
});

test("challenge preflight does not contact the Durable Object", async () => {
  const env = createEnvironment();
  let contacted = false;
  env.ATTEMPT_LIMITER = {
    idFromName() { contacted = true; throw new Error("must not be called for GET /api/challenge"); },
    get() { contacted = true; throw new Error("must not be called for GET /api/challenge"); }
  };
  const response = await worker.fetch(request("/api/challenge"), env);
  assert.equal(response.status, 200);
  assert.equal(contacted, false);
});

test("unexpected challenge errors log only a fixed diagnostic label", async () => {
  const env = createEnvironment();
  Object.defineProperty(env, "ATTEMPT_LIMITER", {
    get() { throw new Error("private runtime detail must not be logged"); }
  });
  const { result, warnings } = await captureWarnings(() => worker.fetch(request("/api/challenge"), env));
  assert.equal(result.status, 503);
  assert.deepEqual(warnings.map((line) => JSON.parse(line)), [{
    event: "portal_gate_unavailable",
    route: "/api/challenge",
    component: "unexpected_worker_error"
  }]);
  assert.equal(warnings.join(" ").includes("private runtime detail"), false);
});

test("answer submission fails closed and diagnoses Durable Object failures safely", async () => {
  const challenge = await challengeFor(0);
  const scenarios = [
    ["client_ip_missing", { ip: null }],
    ["attempt_limiter_request_failed", { fetch: async () => { throw new Error("private DO detail"); } }],
    ["attempt_limiter_response_not_ok", { fetch: async () => new Response("private DO detail", { status: 500 }) }],
    ["attempt_limiter_response_invalid", { fetch: async () => new Response("{}") }]
  ];

  for (const [component, limiter] of scenarios) {
    const env = createEnvironment();
    if (component !== "client_ip_missing") {
      env.ATTEMPT_LIMITER = {
        idFromName: (key) => key,
        get: () => ({ fetch: limiter.fetch })
      };
    }
    const ip = limiter.ip === null ? null : "203.0.113.10";
    const { result, warnings } = await captureWarnings(() => worker.fetch(request("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://portal.test",
        ...(ip ? { "CF-Connecting-IP": ip } : {})
      },
      body: JSON.stringify({ challenge, answer: "sample-answer" })
    }), env));
    assert.equal(result.status, 503, component);
    assert.deepEqual(warnings.map((line) => JSON.parse(line)), [{
      event: "portal_gate_unavailable",
      route: "/api/answer",
      component
    }]);
    assert.equal(warnings.join(" ").includes("private DO detail"), false);
    assert.equal(warnings.join(" ").includes("sample-answer"), false);
    assert.equal(warnings.join(" ").includes(challenge), false);
  }
});

test("theme selection, saved preferences, backgrounds, and six themes remain available", () => {
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "public/styles.css"), "utf8");
  const client = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
  for (const theme of ["Random", "Magic", "Utah Game Day", "Retro Arcade", "RC Trail"]) assert.match(html, new RegExp(theme));
  for (const theme of ["magic", "utah", "arcade", "trail"]) {
    assert.match(css, new RegExp(`data-theme=\\"${theme}\\"`));
    assert.ok(fs.existsSync(path.join(root, "public/artwork", {
      magic: "magic-library.webp",
      utah: "utah-stadium.webp",
      arcade: "retro-arcade.webp",
      trail: "rc-trail.webp"
    }[theme])));
  }
  assert.match(client, /localStorage\.getItem\("tetsao-theme"\)/u);
  assert.match(client, /localStorage\.setItem\("tetsao-theme"/u);
  assert.match(client, /localStorage\.removeItem\("tetsao-theme"\)/u);
});

test("ignore rules cover local secrets, dependencies, and generated outputs", () => {
  const ignoreLines = fs.readFileSync(path.join(root, ".gitignore"), "utf8").split(/\r?\n/u);
  for (const rule of [".dev.vars*", ".env*", "node_modules/", ".wrangler/", "dist/", "build/", "out/", "coverage/"]) {
    assert.ok(ignoreLines.includes(rule), `${rule} should be ignored`);
  }
  assert.ok(ignoreLines.includes("!.dev.vars.example"), "fictional example configuration should remain trackable");
  assert.ok(ignoreLines.indexOf("!.dev.vars.example") > ignoreLines.indexOf(".dev.vars*"));
});

test("real local accepted answers exist only in the ignored local secret", () => {
  const localVarsPath = path.join(root, ".dev.vars");
  if (!fs.existsSync(localVarsPath)) return;
  const localVars = fs.readFileSync(localVarsPath, "utf8");
  const answerLine = localVars.split(/\r?\n/u).find((line) => line.startsWith("QUESTION_ANSWERS="));
  assert.ok(answerLine, "local answer secret should be configured");
  const answers = JSON.parse(answerLine.slice("QUESTION_ANSWERS=".length));
  assert.equal(answers.length, QUESTIONS.length);
  const candidates = [
    "src/question-bank.js", "src/worker.js", "src/services.js", "src/attempt-limiter.js",
    "test/app.test.js", "README.md", "AGENTS.md", "CODEX-FIRST-TASK.md", ".gitignore",
    "package.json", "wrangler.jsonc", ".dev.vars.example",
    "public/index.html", "public/app.js", "public/styles.css"
  ];
  for (const relativePath of candidates) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    for (const answer of answers.flat()) {
      assert.equal(source.includes(answer), false, `private answer leaked into ${relativePath}`);
    }
  }
});

test("Wrangler uses port 8788, Worker-first assets, and the supported compatibility date", () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));
  const packageConfig = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(config.compatibility_date, "2026-10-30");
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.durable_objects.bindings[0].name, "ATTEMPT_LIMITER");
  assert.equal(config.upload_source_maps, false);
  assert.match(packageConfig.scripts.dev, /--port 8788/u);
  assert.match(packageConfig.scripts.preview, /--port 8788/u);
});
