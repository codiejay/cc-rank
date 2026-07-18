// Product analytics: one append-only stream in D1 (table: analytics).
//
// Split of responsibilities: the `events` table is already the clean record of
// CLI activity (per-user, per-day prompts/edits) — DAU/retention of players
// comes from there. THIS stream records the web funnel around it: anonymous
// visits, signup vs returning login, room creates/joins, share-card unfurls.
// Never duplicate `events` rows here. Saved queries: server/ANALYTICS.md.
//
// Rules that keep the data clean enough to hand to a buyer:
//  - Fire-and-forget: writes ride ctx.waitUntil with errors swallowed —
//    analytics may never add latency to, or fail, a user-facing request.
//  - No PII: actors are hashes. Signed-in actor = H(github_id), stable across
//    days so retention joins work. Anonymous actor = H(day+ip+ua), unique
//    within a UTC day and unlinkable across days by construction (the raw
//    IP/UA is never stored).
//  - Bots are FLAGGED, not dropped: crawler hits on /u/ and /og/ are signal
//    (link unfurls), but human metrics filter is_bot = 0.
//  - External referrer + CF country are captured as columns: acquisition and
//    geography are the first questions any acquirer asks.

export type AnalyticsEvent =
  | "page_view"    // props: {page:'home'|'room'|'share', code?, login?}
  | "signup"       // first-ever GitHub login          props: {login}
  | "login"        // returning user re-auth           props: {login}
  | "room_create"  // props: {code}
  | "room_join"    // props: {code}
  | "og_card";     // share-card PNG fetched           props: {login}

// Static pepper, not a managed secret: for anonymous actors the real privacy
// mechanism is the daily rotation (day is inside the hash); for signed-in
// actors the source id already lives raw in `users`/`events`.
const PEPPER = "ccrank-analytics-v1";

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|skype|slackbot|curl|wget|python|go-http-client|node-fetch|axios|headless|lighthouse|pingdom|uptime/i;

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function track(
  c: any,
  event: AnalyticsEvent,
  opts?: { githubId?: number; props?: Record<string, unknown> }
): void {
  const work = (async () => {
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const ua = c.req.header("user-agent") || "";
    const ip = c.req.header("cf-connecting-ip") || "?";
    const actor = opts?.githubId
      ? "u:" + (await sha256hex(PEPPER + ":u:" + opts.githubId)).slice(0, 32)
      : "v:" + (await sha256hex(PEPPER + ":v:" + day + ":" + ip + ":" + ua)).slice(0, 32);
    // Only EXTERNAL referrers (acquisition); own-site navigation is noise.
    let ref: string | null = null;
    try {
      const r = c.req.header("referer");
      if (r) {
        const host = new URL(r).host;
        if (host && host !== new URL(c.req.url).host) ref = host;
      }
    } catch { /* malformed referer — drop it */ }
    const country = (c.req.raw as any)?.cf?.country ?? null;
    await c.env.DB.prepare(
      "INSERT INTO analytics (ts, day, event, actor, signed_in, is_bot, country, ref, props) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      now, day, event, actor,
      opts?.githubId ? 1 : 0,
      BOT_RE.test(ua) ? 1 : 0,
      country, ref,
      opts?.props ? JSON.stringify(opts.props) : null
    ).run();
  })().catch(() => {});
  try {
    c.executionCtx.waitUntil(work);
  } catch { /* no execution context (tests) — promise already running */ }
}
