# Tetsao Party — Codex repository instructions

## Purpose
Build `tetsao.party`, a private-feeling personal portal for Tom's existing ZimaOS services, hosted entirely on Cloudflare. Maintain this as a standalone project unrelated to ThriveSesh. Prioritize simplicity, attractive responsive design, and secure defaults.

## Design references
- The four images in `design-reference/` are the visual source of truth. Inspect all of them before designing.
- Build four genuinely distinct themes: Magic (cozy wizarding library, parchment, gold/burgundy), Utah Game Day (crimson, black, white, stadium), Retro Arcade (1990s/2000s pixel/neon gaming), and RC Trail (rugged outdoors, topo maps, forest/earth colors).
- Preserve each theme's distinctive typography, framing, decoration, and card treatments; don't merely recolor one generic dashboard.
- Use one shared semantic content structure for maintainability. Maintain responsive layouts, readable text, keyboard accessibility, focus indicators, reduced-motion support, and reasonable image sizes.
- Treat the reference screenshots as design inspiration. Do not use the entire screenshot as a page background or embed simulated browser chrome as live UI.
- Never publish `design-reference/` by default. Respect third-party intellectual property: use original artwork or appropriately licensed assets instead of copyrighted character/game/team logos.

## Functionality
- Site identity: Tetsao Party, Tom's Personal Server Portal.
- Six destination cards: Zima Admin, Zima VM, Jellyseerr, Jellyfin, Audiobookshelf, Immich.
- Theme selector: Random, Magic, Utah Game Day, Retro Arcade, RC Trail.
- Random selects one theme on each fresh page visit; manually selected themes persist in localStorage. Switching themes should take effect immediately.
- The 'Prove You Know Tom' challenge is a playful entry gate, but it must not be represented as security for individual services.

## Technical architecture
- Target Cloudflare Workers with Static Assets and a small optional Worker for later server-side challenge verification.
- Prefer vanilla HTML, CSS, and JavaScript unless a framework has a compelling demonstrated reason. Minimize dependencies and build complexity.
- No new Docker containers, ZimaOS workloads, databases, server-side hosting on ZimaOS, or additions to the ThriveSesh codebase.
- Keep environment-dependent URLs in a single explicit configuration location. Do not invent actual internal IP addresses, service ports, or Cloudflare tunnel IDs.
- Use local development and preview first. Do not deploy, modify DNS, Cloudflare Access, Cloudflare Tunnel, or live infrastructure without explicit user approval.

## Security requirements
- A personal trivia question is not authentication and can be guessed, shared, or bypassed by visiting a service directly.
- Never gate sensitive content solely with a frontend check or expose correct answers, signing keys, and secrets in public client code.
- Zima Admin and Zima VM must be planned for independent Cloudflare Access protection before becoming publicly accessible. Other services retain their own login controls and require separate review.
- Verify gateway answers server-side in the Worker, protect against guessing with shared rate limits, and issue Secure, HttpOnly, SameSite session cookies with server-verifiable signatures.
- Do not make nonfunctional controls appear to enforce security. A visual-only first-phase question screen must be explicitly marked as a demo locally.
- Never commit credentials, API tokens, account identifiers, or real security answers.

## Phase 2 gateway architecture
- The “Prove You Know Tom” gateway is verified by `src/worker.js`. Question prompts may live in `src/question-bank.js`, but accepted answers must be loaded exclusively from the `QUESTION_ANSWERS` Wrangler secret. Never encode real answers in tracked code, tests, defaults, documentation, or generated assets.
- Local development secrets belong in the ignored `.dev.vars` file. Keep the fictional `.dev.vars.example` values fictional. Production values must be configured as Wrangler secrets; do not add secret values to `wrangler.jsonc` or public files.
- The public HTML and JavaScript must not include service names, destinations, or dashboard links. Serve the dashboard data from an authenticated Worker API only after the Worker verifies the signed session cookie. Keep destination values blank until a separate review.
- Route all static assets through the Worker with Workers Static Assets `run_worker_first` enabled. Decorative backgrounds may be public; dashboard data and quiz answers may not be static assets.
- Sign challenge and session tokens with a Wrangler secret. Fail closed if the secret, client IP, Durable Object binding, or rate-limit service is unavailable. Do not add an in-memory fallback.
- Use a persistent Cloudflare Durable Object limiter keyed by a hash of the client IP. Never log answers, challenge payloads, signed cookies, or private question data. Do not upload source maps containing server code.
- Preserve the local preview port `8788` and Wrangler compatibility date `2026-10-30` unless the user specifically changes them.
- Session cookies must be signed, `HttpOnly`, `Secure`, `SameSite=Lax`, and time-limited. Revalidate them in the Worker for every dashboard request.
- This friendly quiz gate is not strong authentication and does not protect direct access to services. Zima Admin and Zima VM require independent Cloudflare Access policies before they become publicly accessible.

## Development workflow
- Read this file and examine the existing repository before changing anything.
- At the start of substantial tasks, briefly outline the implementation approach, then work through it without needless approval interruptions.
- Implement coherent changes end-to-end, run available lint/build/test checks, and fix issues before reporting completion.
- Commit only if this repository is already initialized or the user explicitly requests initialization; do not push or deploy without permission.
- Report files changed, commands run, verification results, and any remaining blockers or user decisions.
- If a requirement is ambiguous, make a safe reversible decision and document it instead of halting progress for minor questions.
