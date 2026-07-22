// ccrank OG card — Vercel edge renderer.
// The ccrank Worker computes the card data from D1 and calls this with
// ?d=<base64url JSON>; this function only lays out and rasterizes. Plain
// element objects (no JSX) so there's no build step to maintain.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

// ---- palette (mirrors the dashboard's dark theme + medal tokens) -----------
const MEDALS = {
  1: { c: "#E6B655", dim: "#8a6c2e", wash: "rgba(230,182,85,.14)", lblInk: "#131109", lbl: "CHAMPION" },
  2: { c: "#C8C1B4", dim: "#6e6a60", wash: "rgba(200,193,180,.10)", lblInk: "#131109", lbl: "SILVER" },
  3: { c: "#D08A5A", dim: "#7d5334", wash: "rgba(208,138,90,.11)", lblInk: "#131109", lbl: "BRONZE" },
  0: { c: "#D97757", dim: "#5a3a2c", wash: "rgba(217,119,87,.08)", lblInk: "#FFFFFF", lbl: "ON THE BOARD" },
};
const HEAT = ["#2B2822", "#472A1D", "#8C4326", "#D97757", "#F6A87D"];
const GOLD = "#E6B655", INK = "#F1EDE3", MUTED = "#9C9587", MONO = "JetBrains Mono";

// ---- assets ----------------------------------------------------------------
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
const CROWN = (color) =>
  svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18" fill="${color}"><path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"/><rect x="3.5" y="16" width="17" height="1.8" rx=".9"/></svg>`);
const LOGO = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="106 106 300 300"><g fill="#736C5D"><rect x="118" y="318" width="76" height="76" rx="19"/><rect x="118" y="218" width="76" height="76" rx="19"/><rect x="318" y="318" width="76" height="76" rx="19"/></g><g fill="#D97757"><rect x="218" y="318" width="76" height="76" rx="19"/><rect x="218" y="218" width="76" height="76" rx="19"/><rect x="218" y="118" width="76" height="76" rx="19"/></g></svg>`);

// element helper — satori accepts plain {type, props} trees
const el = (type, style, children, extra) =>
  ({ type, props: { style, ...(extra || {}), children } });
const div = (style, children) => el("div", { display: "flex", ...style }, children);
const txt = (style, s) => el("div", { display: "flex", ...style }, String(s));

// ---- heatmap ---------------------------------------------------------------
function heatCells(heat) {
  const vals = heat.map((h) => h.n).filter((n) => n > 0).sort((a, b) => a - b);
  const q = [vals[Math.floor(vals.length * 0.25)] || 1,
             vals[Math.floor(vals.length * 0.5)] || 2,
             vals[Math.floor(vals.length * 0.75)] || 3];
  const lv = new Map();
  for (const h of heat) lv.set(h.day, h.n <= 0 ? 0 : h.n <= q[0] ? 1 : h.n <= q[1] ? 2 : h.n <= q[2] ? 3 : 4);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const lastSunday = today - new Date(today).getUTCDay() * 86400000;
  const rows = [];
  for (let d = 0; d < 7; d++) {
    const row = [];
    for (let w = 12; w >= 0; w--) {
      const t = lastSunday - w * 7 * 86400000 + d * 86400000;
      if (t > today) { row.push(-1); continue; }
      row.push(lv.get(new Date(t).toISOString().slice(0, 10)) ?? 0);
    }
    rows.push(row);
  }
  return rows;
}

// ---- card ------------------------------------------------------------------
function card(d, avatar) {
  const { row, total } = d;
  const m = MEDALS[row.rank <= 3 ? row.rank : 0];
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const TICKS = 24;
  const filled = Math.max(row.score > 0 ? 1 : 0,
    Math.round(row.score / Math.max(1, d.maxScore) * TICKS));
  const ticks = div({ gap: 6, marginTop: 12 },
    Array.from({ length: TICKS }, (_, i) =>
      div({ width: 9, height: 18, background: i < filled ? "#D97757" : "#332F27" })));

  const cells = div({ flexDirection: "column", gap: 5, marginTop: 15 },
    heatCells(d.heat).map((r) => div({ gap: 5 },
      r.map((l) => div({ width: 17, height: 17, borderRadius: 4,
        background: l < 0 ? "#211E17" : HEAT[l] })))));

  const shown = (row.awards || []).slice(0, 3);
  const extra = (row.awards || []).length - shown.length;
  const pill = (label, color, border, bg) =>
    txt({ alignItems: "center", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em",
          color, background: bg, border: `1px solid ${border}`, borderRadius: 999,
          padding: "5px 12px" }, label);
  const badges = shown.length
    ? div({ gap: 8, marginTop: 10, flexWrap: "wrap" }, [
        ...shown.map((a) => pill(String(a.label).toUpperCase(), GOLD,
          "rgba(230,182,85,.30)", "rgba(230,182,85,.13)")),
        ...(extra > 0 ? [pill("+" + extra, MUTED, "#332F26", "transparent")] : []),
      ])
    : null;

  const nmSize = row.login.length > 17 ? 28 : row.login.length > 12 ? 34 : 44;
  const stat = (n, label) => div({ flexDirection: "column" }, [
    txt({ fontWeight: 800, fontSize: 24, color: INK }, fmt(n)),
    txt({ fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", color: MUTED, marginTop: 4 }, label),
  ]);

  return div({ width: 1200, height: 630, background: "#131109",
               fontFamily: MONO, position: "relative" }, [
    div({ position: "absolute", top: 0, left: 0, width: 1200, height: 630,
          background: `radial-gradient(circle at 85% 0%, ${m.wash} 0%, rgba(0,0,0,0) 55%)` }),
    div({ position: "absolute", top: 44, left: 48, width: 1104, height: 542,
          borderRadius: 28, padding: 2,
          background: `linear-gradient(140deg, ${m.c} 0%, #332F26 34%, #332F26 70%, ${m.dim} 100%)`,
          boxShadow: "0 40px 90px -30px rgba(0,0,0,.75)" }, [
      div({ flexDirection: "column", width: 1100, height: 538, borderRadius: 26,
            background: "#211E17", padding: "32px 44px 28px" }, [

        div({ alignItems: "center", width: "100%" }, [
          div({ alignItems: "center" }, [
            el("img", {}, undefined, { src: LOGO, width: 30, height: 30 }),
            txt({ fontWeight: 800, fontSize: 23, color: INK, marginLeft: 11 }, "ccrank"),
          ]),
          txt({ marginLeft: "auto", fontWeight: 600, fontSize: 14,
                letterSpacing: "0.14em", color: MUTED }, "GLOBAL CLAUDE CODE LEADERBOARD"),
        ]),

        div({ flexGrow: 1, alignItems: "center", marginTop: 4 }, [
          div({ alignItems: "center", flexGrow: 1 }, [
            div({ position: "relative", width: 118, height: 118 }, [
              ...(row.rank === 1
                ? [el("img", { position: "absolute", top: -32, left: 36, transform: "rotate(-4deg)" },
                     undefined, { src: CROWN(m.c), width: 46, height: 35 })]
                : []),
              el("img", { borderRadius: 59, boxShadow: `0 0 0 4px ${m.c}` },
                 undefined, { src: avatar, width: 118, height: 118 }),
            ]),
            div({ flexDirection: "column", marginLeft: 26 }, [
              txt({ fontWeight: 800, fontSize: nmSize, color: INK }, row.login),
              ...(badges ? [badges] : []),
              div({ alignItems: "baseline", marginTop: 10 }, [
                txt({ fontWeight: 800, fontSize: 58, color: INK }, fmt(row.score)),
                txt({ fontWeight: 600, fontSize: 16, letterSpacing: "0.1em",
                      color: MUTED, marginLeft: 13 }, "PTS"),
              ]),
              ticks,
            ]),
          ]),

          div({ flexDirection: "column", alignItems: "center", marginRight: 42 }, [
            div({ alignItems: "flex-start" }, [
              txt({ fontWeight: 800, fontSize: 64, color: m.c, marginTop: 14 }, "#"),
              txt({ fontWeight: 800, fontSize: 124, color: m.c }, row.rank),
            ]),
            txt({ fontWeight: 700, fontSize: 14, letterSpacing: "0.2em",
                  color: MUTED, marginTop: 4 }, `OF ${total} WORLDWIDE`),
            txt({ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", color: m.lblInk,
                  background: m.c, borderRadius: 999, padding: "7px 16px", marginTop: 12 }, m.lbl),
          ]),

          div({ flexDirection: "column", width: 336, background: "#1A1712",
                border: "1px solid #332F26", borderRadius: 18, padding: "22px 24px 18px" }, [
            txt({ fontWeight: 600, fontSize: 13, letterSpacing: "0.12em", color: MUTED }, "LAST 13 WEEKS"),
            cells,
            div({ gap: 30, marginTop: 15, borderTop: "1px solid #332F26", paddingTop: 13 }, [
              stat(row.prompts, "PROMPTS"),
              stat(row.edits, "EDITS"),
            ]),
          ]),
        ]),

        div({ alignItems: "center", background: "#14110C", borderRadius: 13,
              padding: "14px 22px", marginTop: 22 }, [
          txt({ fontWeight: 700, fontSize: 18, color: "#D97757" }, `CC-Rank #${row.rank}/${total}`),
          txt({ fontSize: 18, color: "#57524A", marginLeft: 10, marginRight: 10 }, "·"),
          txt({ fontWeight: 600, fontSize: 18, color: "#A99F8F" },
              `${fmt(row.prompts)} prompts · ${fmt(row.edits)} edits`),
          txt({ marginLeft: "auto", fontWeight: 600, fontSize: 18, color: "#857D70" },
              "mostcracked.com"),
          div({ width: 10, height: 20, background: "#D97757", marginLeft: 8 }),
        ]),
      ]),
    ]),
  ]);
}

// ---- handler ---------------------------------------------------------------
export default async function handler(req) {
  try {
    const d64 = new URL(req.url).searchParams.get("d");
    if (!d64) return new Response("missing d", { status: 400 });
    const json = decodeURIComponent(escape(atob(d64.replace(/-/g, "+").replace(/_/g, "/"))));
    const d = JSON.parse(json);
    if (!d || !d.row || typeof d.row.login !== "string") return new Response("bad d", { status: 400 });

    const [reg, bold, xbold, avatar] = await Promise.all([
      font("JetBrainsMono-Regular.ttf"),
      font("JetBrainsMono-Bold.ttf"),
      font("JetBrainsMono-ExtraBold.ttf"),
      avatarDataUri(d.row.avatar, d.row.login),
    ]);
    return new ImageResponse(card(d, avatar), {
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
