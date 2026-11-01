const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COUNTER_KEY = "attempt-window";

// One Durable Object instance is selected per hashed client IP. Storage
// transactions make the counter shared and race-safe across Worker instances.
export class AttemptLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const now = Date.now();
    const result = await this.state.storage.transaction(async (storage) => {
      let window = await storage.get(COUNTER_KEY);
      const isNewWindow = !window || now >= window.resetAt;
      if (isNewWindow) window = { count: 0, resetAt: now + WINDOW_MS };

      if (window.count >= MAX_ATTEMPTS) {
        return { allowed: false, resetAt: window.resetAt };
      }

      window.count += 1;
      await storage.put(COUNTER_KEY, window);
      return { allowed: true, remaining: MAX_ATTEMPTS - window.count, resetAt: window.resetAt, isNewWindow };
    });

    if (result.isNewWindow) await this.state.storage.setAlarm(result.resetAt);
    return Response.json(result);
  }

  async alarm() {
    await this.state.storage.delete(COUNTER_KEY);
  }
}
