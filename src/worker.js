import { AttemptLimiter } from "./attempt-limiter.js";
import { QUESTIONS } from "./question-bank.js";
import { SERVICES } from "./services.js";

export { AttemptLimiter };

const SESSION_COOKIE = "tetsao_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const CHALLENGE_TTL_SECONDS = 10 * 60;
const MAX_ANSWER_LENGTH = 160;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

function unavailable() {
  return json({ error: "The portal gate is temporarily unavailable. Please try again shortly." }, 503);
}

function hasSecret(env) {
  return typeof env.SESSION_SECRET === "string" && encoder.encode(env.SESSION_SECRET).byteLength >= 32;
}

function loadAnswerBank(env) {
  if (typeof env.QUESTION_ANSWERS !== "string" || env.QUESTION_ANSWERS.length > 8192) return null;
  try {
    const bank = JSON.parse(env.QUESTION_ANSWERS);
    if (!Array.isArray(bank) || bank.length !== QUESTIONS.length) return null;
    if (!bank.every((answers) => Array.isArray(answers) && answers.length > 0 && answers.length <= 8 && answers.every((answer) => typeof answer === "string" && answer.trim().length > 0 && answer.length <= MAX_ANSWER_LENGTH))) return null;
    return bank;
  } catch {
    return null;
  }
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new TypeError("Invalid token encoding");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function signToken(payload, secret) {
  const body = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${encodeBase64Url(signature)}`;
}

export async function verifyToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    if (typeof token !== "string" || token.length > 2048) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const bodyBytes = decodeBase64Url(parts[0]);
    const signature = decodeBase64Url(parts[1]);
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(bodyBytes));
    if (!payload || typeof payload !== "object" || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
    if (payload.iat > nowSeconds + 60 || payload.exp <= nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieValue(request) {
  const cookie = request.headers.get("Cookie") || "";
  const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return entry ? entry.slice(SESSION_COOKIE.length + 1) : "";
}

export async function verifySession(request, env, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!hasSecret(env)) return null;
  const payload = await verifyToken(cookieValue(request), env.SESSION_SECRET, nowSeconds);
  if (!payload || payload.typ !== "session") return null;
  if (payload.exp - payload.iat !== SESSION_TTL_SECONDS) return null;
  if (typeof payload.jti !== "string" || payload.jti.length < 16) return null;
  return payload;
}

async function issueChallenge(questionIndex, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const nonce = crypto.getRandomValues(new Uint8Array(18));
  return signToken({
    typ: "challenge",
    qid: questionIndex,
    iat: nowSeconds,
    exp: nowSeconds + CHALLENGE_TTL_SECONDS,
    nonce: encodeBase64Url(nonce)
  }, secret);
}

function randomQuestionIndex() {
  return crypto.getRandomValues(new Uint32Array(1))[0] % QUESTIONS.length;
}

async function handleChallenge(request, env) {
  if (request.method !== "GET") return json({ error: "Use GET to request a question." }, 405, { Allow: "GET" });
  if (!hasSecret(env) || !loadAnswerBank(env) || !env.ATTEMPT_LIMITER) return unavailable();

  if (await verifySession(request, env)) return json({ authenticated: true });

  const qid = randomQuestionIndex();
  const challenge = await issueChallenge(qid, env.SESSION_SECRET);
  return json({ authenticated: false, question: QUESTIONS[qid].prompt, challenge });
}

async function hashedClientKey(request) {
  const address = request.headers.get("CF-Connecting-IP");
  if (!address) return null;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`tetsao-party:v1:${address}`)));
  return encodeBase64Url(digest);
}

async function consumeAttempt(request, env) {
  if (!env.ATTEMPT_LIMITER) return { unavailable: true };
  const clientKey = await hashedClientKey(request);
  if (!clientKey) return { unavailable: true };

  try {
    const id = env.ATTEMPT_LIMITER.idFromName(clientKey);
    const stub = env.ATTEMPT_LIMITER.get(id);
    const response = await stub.fetch("https://attempt-limiter.internal/check", { method: "POST" });
    if (!response.ok) return { unavailable: true };
    const result = await response.json();
    if (typeof result.allowed !== "boolean") return { unavailable: true };
    return result;
  } catch {
    return { unavailable: true };
  }
}

async function readJsonBody(request, maxBytes) {
  if (!request.body) throw new TypeError("Missing request body");
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RangeError("Request body is too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(decoder.decode(bytes));
}

function originAllowed(request, url) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === url.origin;
  } catch {
    return false;
  }
}

function secureEnoughForCookie(url) {
  return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
}

async function handleAnswer(request, env, url) {
  if (request.method !== "POST") return json({ error: "Use POST to submit an answer." }, 405, { Allow: "POST" });
  const answerBank = loadAnswerBank(env);
  if (!hasSecret(env) || !answerBank || !env.ATTEMPT_LIMITER || !secureEnoughForCookie(url)) return unavailable();
  if (!originAllowed(request, url) || !request.headers.get("Origin")) return json({ error: "Please submit your answer from this portal page." }, 403);
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "That answer could not be read. Please try again." }, 415);
  }

  const attempt = await consumeAttempt(request, env);
  if (attempt.unavailable) return unavailable();
  if (!attempt.allowed) {
    const retryAfter = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
    return json({ error: "That's a lot of guesses for now. Please take a break and try again later." }, 429, { "Retry-After": String(retryAfter) });
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 2048) return json({ error: "That answer could not be read. Please try again." }, 400);

  let body;
  try {
    body = await readJsonBody(request, 2048);
  } catch {
    return json({ error: "That answer could not be read. Please try again." }, 400);
  }

  if (!body || typeof body.answer !== "string" || body.answer.length > MAX_ANSWER_LENGTH || typeof body.challenge !== "string") {
    return json({ error: "That answer could not be read. Please try again." }, 400);
  }

  const token = await verifyToken(body.challenge, env.SESSION_SECRET);
  if (!token || token.typ !== "challenge" || !Number.isInteger(token.qid) || token.qid < 0 || token.qid >= QUESTIONS.length || typeof token.nonce !== "string") {
    return json({ error: "That question expired. Please choose a new one." }, 400);
  }

  const answer = body.answer.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  const correct = answerBank[token.qid].some((accepted) => accepted.normalize("NFKC").trim().toLocaleLowerCase("en-US") === answer);
  if (!correct) return json({ error: "That doesn't sound quite right. Try again or choose a new question." }, 401);

  const now = Math.floor(Date.now() / 1000);
  const session = await signToken({
    typ: "session",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    jti: encodeBase64Url(crypto.getRandomValues(new Uint8Array(18)))
  }, env.SESSION_SECRET);

  return json({ ok: true }, 200, {
    "Set-Cookie": `${SESSION_COOKIE}=${session}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`
  });
}

async function handleDashboard(request, env) {
  if (request.method !== "GET") return json({ error: "Not found." }, 404);
  if (!hasSecret(env) || !loadAnswerBank(env) || !env.ATTEMPT_LIMITER) return unavailable();
  if (!(await verifySession(request, env))) return json({ error: "Please answer the portal question first." }, 401);
  return json({ services: SERVICES });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/challenge") return await handleChallenge(request, env);
      if (url.pathname === "/api/answer") return await handleAnswer(request, env, url);
      if (url.pathname === "/api/dashboard") return await handleDashboard(request, env);
      if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);

      if (!env.ASSETS) return unavailable();
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch {
      // Intentionally do not log request bodies or private question data.
      return unavailable();
    }
  }
};
