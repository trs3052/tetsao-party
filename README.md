# Tetsao Party

Tom's personal server portal, built as a static front end plus a Cloudflare Worker gateway. Four themes and their optimized WebP backdrops remain client-side. The Worker provides server-verified quiz sessions and serves the dashboard only after verifying a signed cookie.

## Local development

The local Worker uses port **8788**.

1. Keep `.dev.vars` in the project root. It is ignored by Git and should contain your private local `SESSION_SECRET` and `QUESTION_ANSWERS` values.
2. If you need a starting point, copy `.dev.vars.example` to `.dev.vars`. It contains fictional sample values only; replace them with locally managed values before testing the gateway. Do not overwrite an existing `.dev.vars` file that already has a session secret.
3. Run `npm run dev` or `npm run preview`, then open `http://localhost:8788`.

`QUESTION_ANSWERS` is a JSON array of answer arrays, ordered to match the prompts in `src/question-bank.js`. Put real values only in the ignored local secret file or the Cloudflare Worker secret store. Keep them out of shell command arguments, source files, tests, documentation, and logs. Wrangler runs the Durable Object locally with persistent local state. If either secret, the client IP, or the Durable Object binding is unavailable, the gateway fails closed.

Run `npm test` for the automated suite and `npm run check` for JavaScript syntax checks. Tests use fictional answer fixtures and check that local accepted answers do not appear in tracked project files.

## Cloudflare secrets

`wrangler.jsonc` defines Workers Static Assets and a SQLite Durable Object for shared attempt limits. Configure production secrets separately with Wrangler's secret store; do not put their values in configuration files:

```sh
npx wrangler secret put SESSION_SECRET
npx wrangler secret put QUESTION_ANSWERS
```

This project has not been deployed. The production commands above are documentation only.

## Gateway architecture

- `src/worker.js` handles every request before static asset serving. It provides `GET /api/challenge`, `POST /api/answer`, and `GET /api/dashboard`.
- `src/question-bank.js` stores only the question prompts. The accepted answer arrays are loaded from the `QUESTION_ANSWERS` Wrangler secret and are never returned by an API.
- `src/services.js` contains the six service labels and deliberately blank URLs. The dashboard catalog is returned only after the Worker validates the signed session cookie. No service names, links, or URLs appear in the initial HTML or public JavaScript.
- Successful answers receive a 30-day HMAC-signed cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`. The Worker verifies it again on reload and each dashboard request.
- Answer submissions pass through the `AttemptLimiter` SQLite Durable Object. It stores a shared, transactional fixed-window limit of five attempts per client IP per 15 minutes. The Worker keys it using a SHA-256 hash of the Cloudflare-provided client IP. A missing IP, secret, binding, or failed Durable Object request blocks verification.
- `wrangler.jsonc` uses Workers Static Assets with `run_worker_first: true`. The Worker explicitly forwards public decorative and application assets through `ASSETS`; source map upload is disabled.

## Themes and layout

The selector offers Random, Magic, Utah Game Day, Retro Arcade, and RC Trail. Random chooses a theme on each fresh visit; manually selected themes apply immediately and persist in local storage. Selecting Random clears that preference. `public/artwork/` contains decorative backdrops only; text, questions, cards, and controls remain HTML.

The static `public/` directory contains the gate shell, front-end code, CSS, and artwork. Worker-only code is in `src/`; automated tests are in `test/`. The original screenshots remain in `design-reference/` and are not included in the static asset directory.

## Security boundaries

This quiz is a friendly portal gate, not strong authentication. Answers can be guessed or shared, and visitors may access services directly if they know their URLs. Each service must retain its own login and access controls. **Zima Admin and Zima VM need independent Cloudflare Access policies before public access.** Other services require a separate access review. The portal session does not authorize access to individual services.

All six destinations remain unconfigured. No service is connected, and no DNS, Cloudflare Access, Cloudflare Tunnel, ZimaOS, or other external infrastructure was changed.
