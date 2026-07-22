// ccrank home OG — the hero card behind every share of the SITE itself.
// Full-bleed poster (vs the framed per-user cards): giant MOST CRACKED.
// headline, live top-3 with real avatars, live totals, a 30-day global heat
// strip, and the terminal statusline bar. The Worker computes the data from
// D1 and calls this with ?d=<base64url JSON>; this only lays out + rasterizes.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const HEAT = ["#2B2822", "#472A1D", "#8C4326", "#D97757", "#F6A87D"];
const CORAL = "#D97757", GOLD = "#E6B655", INK = "#F1EDE3", MUTED = "#9C9587";
const MONO = "JetBrains Mono";
const MEDAL = { 1: GOLD, 2: "#C8C1B4", 3: "#D08A5A" };

const FONT_BASE = "https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@2.304/fonts/ttf/";
const fontCache = new Map();
async function font(name) {
  if (fontCache.has(name)) return fontCache.get(name);
  const res = await fetch(FONT_BASE + name);
  if (!res.ok) throw new Error("font fetch failed: " + name);
  const buf = await res.arrayBuffer();
  fontCache.set(name, buf);
  return buf;
}
async function avatarDataUri(url, login) {
  const src = url || `https://github.com/${encodeURIComponent(login)}.png?size=200`;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error("avatar " + res.status);
    const mime = res.headers.get("content-type") || "image/png";
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000)
      bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return `data:${mime};base64,${btoa(bin)}`;
  } catch {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";
  }
}
const svgUri = (svg) => "data:image/svg+xml;base64," + btoa(svg);
const CROWN = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18" fill="${GOLD}"><path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"/><rect x="3.5" y="16" width="17" height="1.8" rx=".9"/></svg>`);
const LOGO = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="106 106 300 300"><g fill="#736C5D"><rect x="118" y="318" width="76" height="76" rx="19"/><rect x="118" y="218" width="76" height="76" rx="19"/><rect x="318" y="318" width="76" height="76" rx="19"/></g><g fill="#D97757"><rect x="218" y="318" width="76" height="76" rx="19"/><rect x="218" y="218" width="76" height="76" rx="19"/><rect x="218" y="118" width="76" height="76" rx="19"/></g></svg>`);

const el = (type, style, children, extra) =>
  ({ type, props: { style, ...(extra || {}), children } });
const div = (style, children) => el("div", { display: "flex", ...style }, children);
const txt = (style, s) => el("div", { display: "flex", ...style }, String(s));
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Last 30 UTC days as one intensity strip, oldest -> today.
function heatStrip(heat) {
  const by = new Map(heat.map((h) => [h.day, h.n]));
  const vals = heat.map((h) => h.n).filter((n) => n > 0).sort((a, b) => a - b);
  const q = [vals[Math.floor(vals.length * 0.25)] || 1,
             vals[Math.floor(vals.length * 0.5)] || 2,
             vals[Math.floor(vals.length * 0.75)] || 3];
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const n = by.get(new Date(today - i * 86400000).toISOString().slice(0, 10)) || 0;
    cells.push(n <= 0 ? 0 : n <= q[0] ? 1 : n <= q[1] ? 2 : n <= q[2] ? 3 : 4);
  }
  return cells;
}

function poster(d, avatars) {
  const top = d.top || [];
  const champ = top[0];

  // Right rail: champion hero card + runner-up rows beneath.
  const runner = (r, i) => div({
    alignItems: "center", background: "#1A1712", border: "1px solid #332F26",
    borderRadius: 16, padding: "11px 16px", marginTop: 10 }, [
    txt({ fontWeight: 800, fontSize: 20, color: MEDAL[r.rank] || CORAL, width: 34 }, "0" + r.rank),
    el("img", { borderRadius: 26, boxShadow: `0 0 0 3px ${MEDAL[r.rank] || CORAL}` },
       undefined, { src: avatars[i + 1], width: 52, height: 52 }),
    txt({ fontWeight: 700, fontSize: r.login.length > 10 ? 15 : 19, color: INK, marginLeft: 14, marginRight: 12, whiteSpace: "nowrap" },
        r.login.length > 12 ? r.login.slice(0, 11) + "…" : r.login),
    div({ marginLeft: "auto", alignItems: "baseline", paddingLeft: 10 }, [
      txt({ fontWeight: 800, fontSize: 24, color: INK }, fmt(r.score)),
      txt({ fontWeight: 600, fontSize: 11, color: MUTED, marginLeft: 6 }, "PTS"),
    ]),
  ]);

  const champCard = champ ? div({
    flexDirection: "column", alignItems: "center",
    background: "linear-gradient(160deg, rgba(230,182,85,.16) 0%, #1A1712 55%)",
    border: `1px solid rgba(230,182,85,.45)`, borderRadius: 22,
    padding: "18px 22px 15px" }, [
    div({ position: "relative", width: 92, height: 92 }, [
      el("img", { position: "absolute", top: -30, left: 25, transform: "rotate(-5deg)" },
         undefined, { src: CROWN, width: 42, height: 32 }),
      el("img", { borderRadius: 46, boxShadow: `0 0 0 4px ${GOLD}` },
         undefined, { src: avatars[0], width: 92, height: 92 }),
    ]),
    txt({ fontWeight: 800, fontSize: 24, color: INK, marginTop: 12 },
        champ.login.length > 14 ? champ.login.slice(0, 13) + "…" : champ.login),
    div({ alignItems: "baseline", marginTop: 6 }, [
      txt({ fontWeight: 800, fontSize: 34, color: GOLD }, fmt(champ.score)),
      txt({ fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", color: MUTED, marginLeft: 9 }, "PTS"),
    ]),
    txt({ fontWeight: 700, fontSize: 12, letterSpacing: "0.2em", color: "#131109",
          background: GOLD, borderRadius: 999, padding: "5px 13px", marginTop: 8 },
        "MOST CRACKED"),
  ]) : null;

  const stat = (n, label) => div({ flexDirection: "column", marginRight: 46 }, [
    txt({ fontWeight: 800, fontSize: 32, color: INK }, fmt(n)),
    txt({ fontWeight: 700, fontSize: 13, letterSpacing: "0.14em", color: MUTED, marginTop: 6 }, label),
  ]);

  return div({ width: 1200, height: 630, background: "#131109",
               fontFamily: MONO, position: "relative", flexDirection: "column" }, [
    // atmosphere: coral glow upper-left, gold ember lower-right
    div({ position: "absolute", top: 0, left: 0, width: 1200, height: 630,
          background: "radial-gradient(circle at 10% 8%, rgba(217,119,87,.26) 0%, rgba(0,0,0,0) 52%)" }),
    div({ position: "absolute", top: 0, left: 0, width: 1200, height: 630,
          background: "radial-gradient(circle at 92% 88%, rgba(230,182,85,.12) 0%, rgba(0,0,0,0) 46%)" }),

    div({ flexDirection: "column", flexGrow: 1, padding: "40px 56px 0" }, [
      // header
      div({ alignItems: "center", width: "100%" }, [
        el("img", {}, undefined, { src: LOGO, width: 34, height: 34 }),
        txt({ fontWeight: 800, fontSize: 23, color: INK, marginLeft: 12 }, "mostcracked"),
        div({ marginLeft: "auto", alignItems: "center",
              border: "1px solid #332F26", borderRadius: 999, padding: "8px 16px" }, [
          div({ width: 9, height: 9, borderRadius: 5, background: CORAL, marginRight: 9 }),
          txt({ fontWeight: 700, fontSize: 14, letterSpacing: "0.14em", color: MUTED },
              `LIVE · ${fmt(d.stats.players)} PLAYERS`),
        ]),
      ]),

      div({ flexGrow: 1, marginTop: 8, alignItems: "center" }, [
        // left: the shout
        div({ flexDirection: "column", flexGrow: 1, marginRight: 40 }, [
          txt({ fontWeight: 700, fontSize: 21, letterSpacing: "0.18em", color: MUTED }, "WHO IS THE"),
          txt({ fontWeight: 800, fontSize: 100, color: INK, lineHeight: 1.0, marginTop: 6 }, "MOST"),
          div({ alignItems: "baseline" }, [
            txt({ fontWeight: 800, fontSize: 100, color: CORAL, lineHeight: 1.0 }, "CRACKED"),
            txt({ fontWeight: 800, fontSize: 100, color: GOLD, lineHeight: 1.0 }, "?"),
          ]),
          txt({ fontWeight: 600, fontSize: 19, color: MUTED, marginTop: 14 },
              "the global leaderboard for coding agents"),
          div({ marginTop: 22 }, [
            stat(d.stats.prompts, "PROMPTS COUNTED"),
            stat(d.stats.edits, "FILES EDITED"),
          ]),
        ]),
        // right: the podium rail
        div({ flexDirection: "column", width: 356 }, [
          champCard,
          ...top.slice(1, 3).map((r, i) => runner(r, i)),
        ]),
      ]),
    ]),

    // 30-day global heat strip
    div({ padding: "14px 56px 0", alignItems: "center" }, [
      ...heatStrip(d.heat).map((l) =>
        div({ width: 30, height: 11, borderRadius: 3, background: HEAT[l], marginRight: 7 })),
    ]),

    // terminal statusline bar
    div({ alignItems: "center", background: "#0D0B07", padding: "16px 56px 20px",
          marginTop: 14 }, [
      txt({ fontWeight: 700, fontSize: 20, color: CORAL }, ">"),
      txt({ fontWeight: 700, fontSize: 20, color: INK, marginLeft: 12 }, "every prompt counts."),
      txt({ marginLeft: "auto", fontWeight: 700, fontSize: 20, color: MUTED }, d.site || "mostcracked.com"),
      div({ width: 11, height: 22, background: CORAL, marginLeft: 10 }),
    ]),
  ]);
}

export default async function handler(req) {
  try {
    const d64 = new URL(req.url).searchParams.get("d");
    if (!d64) return new Response("missing d", { status: 400 });
    const json = decodeURIComponent(escape(atob(d64.replace(/-/g, "+").replace(/_/g, "/"))));
    const d = JSON.parse(json);
    if (!d || !d.stats || !Array.isArray(d.top)) return new Response("bad d", { status: 400 });

    const [reg, bold, xbold, ...avatars] = await Promise.all([
      font("JetBrainsMono-Regular.ttf"),
      font("JetBrainsMono-Bold.ttf"),
      font("JetBrainsMono-ExtraBold.ttf"),
      ...d.top.slice(0, 3).map((r) => avatarDataUri(r.avatar, r.login)),
    ]);
    return new ImageResponse(poster(d, avatars), {
      width: 1200,
      height: 630,
      fonts: [
        { name: MONO, data: reg, weight: 400, style: "normal" },
        { name: MONO, data: bold, weight: 700, style: "normal" },
        { name: MONO, data: xbold, weight: 800, style: "normal" },
      ],
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response("render error: " + (e && e.message), { status: 500 });
  }
}
