// ccrank "the weekly 25" OG cards — Vercel edge renderer.
// Same contract as card.js: the Worker computes data from D1 and calls this
// with ?d=<base64url JSON>; this file only lays out and rasterizes.
// Two card kinds in one endpoint (one deploy artifact):
//   d.kind === "poster" — the Monday drop poster: most-cracked spotlight +
//     rows 2..10 with movement arrows. Posted to X every drop.
//   d.kind === "me"     — one user's chart performance ("debuted at #7").
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

// ---- palette (mirrors the dashboard's dark theme) --------------------------
const INK = "#F1EDE3", MUTED = "#9C9587", FAINT = "#57524A", MONO = "JetBrains Mono";
const CORAL = "#D97757", GOLD = "#E6B655", UP = "#3DCF7C", DOWN = "#F97066";
const LINE = "#332F26", CARD = "#211E17", WELL = "#1A1712", BG = "#131109";
const MEDALS = {
  1: { c: GOLD, dim: "#8a6c2e" },
  2: { c: "#C8C1B4", dim: "#6e6a60" },
  3: { c: "#D08A5A", dim: "#7d5334" },
  0: { c: CORAL, dim: "#5a3a2c" },
};

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
const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";
async function avatarDataUri(url, login, size) {
  const src = url || `https://github.com/${encodeURIComponent(login)}.png?size=${size || 200}`;
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
    return BLANK;
  }
}
const svgUri = (svg) => "data:image/svg+xml;base64," + btoa(svg);
const CROWN = (color) =>
  svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18" fill="${color}"><path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"/><rect x="3.5" y="16" width="17" height="1.8" rx=".9"/></svg>`);
const LOGO = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="106 106 300 300"><g fill="#736C5D"><rect x="118" y="318" width="76" height="76" rx="19"/><rect x="118" y="218" width="76" height="76" rx="19"/><rect x="318" y="318" width="76" height="76" rx="19"/></g><g fill="#D97757"><rect x="218" y="318" width="76" height="76" rx="19"/><rect x="218" y="218" width="76" height="76" rx="19"/><rect x="218" y="118" width="76" height="76" rx="19"/></g></svg>`);

const el = (type, style, children, extra) =>
  ({ type, props: { style, ...(extra || {}), children } });
const div = (style, children) => el("div", { display: "flex", ...style }, children);
const txt = (style, s) => el("div", { display: "flex", ...style }, String(s));
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Movement cell: arrow+n, NEW/RE pill, or an em dash.
function mvEl(e, size) {
  const fs = size || 15;
  if (e.tag)
    return txt({ fontWeight: 700, fontSize: fs - 3, letterSpacing: "0.06em", color: CORAL,
                 border: `1px solid rgba(217,119,87,.45)`, borderRadius: 6,
                 padding: "2px 6px" }, e.tag);
  const m = e.movement;
  if (m == null || m === 0) return txt({ fontSize: fs, color: FAINT }, "—");
  return txt({ fontWeight: 700, fontSize: fs, color: m > 0 ? UP : DOWN },
    (m > 0 ? "▲" : "▼") + Math.abs(m));
}

function frame(children, medal) {
  const m = medal || MEDALS[0];
  return div({ width: 1200, height: 630, background: BG, fontFamily: MONO,
               position: "relative" }, [
    div({ position: "absolute", top: 0, left: 0, width: 1200, height: 630,
          background: `radial-gradient(circle at 85% 0%, rgba(217,119,87,.10) 0%, rgba(0,0,0,0) 55%)` }),
    div({ position: "absolute", top: 44, left: 48, width: 1104, height: 542,
          borderRadius: 28, padding: 2,
          background: `linear-gradient(140deg, ${m.c} 0%, ${LINE} 34%, ${LINE} 70%, ${m.dim} 100%)`,
          boxShadow: "0 40px 90px -30px rgba(0,0,0,.75)" }, [
      div({ flexDirection: "column", width: 1100, height: 538, borderRadius: 26,
            background: CARD, padding: "30px 44px 26px" }, children),
    ]),
  ]);
}

function header(right) {
  return div({ alignItems: "center", width: "100%" }, [
    div({ alignItems: "center" }, [
      el("img", {}, undefined, { src: LOGO, width: 30, height: 30 }),
      txt({ fontWeight: 800, fontSize: 23, color: INK, marginLeft: 11 }, "ccrank"),
    ]),
    txt({ marginLeft: "auto", fontWeight: 600, fontSize: 14,
          letterSpacing: "0.14em", color: MUTED }, right),
  ]);
}

function footer(left) {
  return div({ alignItems: "center", background: "#14110C", borderRadius: 13,
        padding: "13px 22px", marginTop: "auto" }, [
    txt({ fontWeight: 700, fontSize: 17, color: CORAL }, left),
    txt({ marginLeft: "auto", fontWeight: 600, fontSize: 17, color: "#857D70" },
        "ccrank.ccrank.workers.dev"),
    div({ width: 10, height: 19, background: CORAL, marginLeft: 8 }),
  ]);
}

// ---- the drop poster -------------------------------------------------------
function poster(d, avatars) {
  const e1 = d.entries[0];
  const rest = d.entries.slice(1, 10);
  const colA = rest.slice(0, 5), colB = rest.slice(5);

  const rowEl = (e) => div({ alignItems: "center", height: 52, width: "100%" }, [
    txt({ fontWeight: 700, fontSize: 19, color: MUTED, width: 44 },
      (e.position < 10 ? "0" : "") + e.position),
    div({ width: 58, justifyContent: "flex-start" }, [mvEl(e)]),
    el("img", { borderRadius: 16 }, undefined,
       { src: avatars[e.login] || BLANK, width: 32, height: 32 }),
    txt({ fontWeight: 700, fontSize: 19, color: INK, marginLeft: 12,
          maxWidth: 250, overflow: "hidden" }, e.login),
    txt({ marginLeft: "auto", fontWeight: 800, fontSize: 19, color: INK }, fmt(e.score)),
  ]);

  return frame([
    header("THE WEEKLY 25 · " + d.weekLabel.toUpperCase()),

    // most cracked spotlight
    div({ alignItems: "center", marginTop: 20, padding: "18px 24px",
          background: "rgba(230,182,85,.10)", border: "1px solid rgba(230,182,85,.30)",
          borderRadius: 18, width: "100%" }, [
      div({ position: "relative", width: 84, height: 84 }, [
        el("img", { position: "absolute", top: -26, left: 24, transform: "rotate(-4deg)" },
           undefined, { src: CROWN(GOLD), width: 38, height: 29 }),
        el("img", { borderRadius: 42, boxShadow: `0 0 0 3px ${GOLD}` },
           undefined, { src: avatars[e1.login] || BLANK, width: 84, height: 84 }),
      ]),
      div({ flexDirection: "column", marginLeft: 22 }, [
        txt({ fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", color: GOLD },
          "THIS WEEK'S MOST CRACKED"),
        txt({ fontWeight: 800, fontSize: e1.login.length > 16 ? 28 : 36, color: INK,
              marginTop: 2 }, e1.login),
        txt({ fontWeight: 600, fontSize: 15, color: MUTED, marginTop: 4 },
          `${fmt(e1.prompts)} prompts · ${fmt(e1.edits)} edits`),
      ]),
      div({ flexDirection: "column", alignItems: "flex-end", marginLeft: "auto" }, [
        txt({ fontWeight: 800, fontSize: 54, color: INK }, fmt(e1.score)),
        div({ alignItems: "center", marginTop: 2 }, [
          txt({ fontWeight: 800, fontSize: 19, color: GOLD, marginRight: 8 }, "#1"),
          mvEl(e1, 19),
        ]),
      ]),
    ]),

    // rows 2..10, two columns
    div({ marginTop: 14, width: "100%", flexGrow: 1 }, [
      div({ flexDirection: "column", flexGrow: 1, marginRight: 26 }, colA.map(rowEl)),
      div({ width: 1, background: LINE, alignSelf: "stretch" }),
      div({ flexDirection: "column", flexGrow: 1, marginLeft: 26 }, colB.map(rowEl)),
    ]),

    footer(`${d.charted} CHARTED · ${d.debuts} DEBUT${d.debuts === 1 ? "" : "S"} · DROPS MONDAYS`),
  ], MEDALS[1]);
}

// ---- personal chart card ---------------------------------------------------
function meCard(d, avatars) {
  const e = d.entry;
  const m = MEDALS[e.position <= 3 ? e.position : 0];
  const line = e.tag === "NEW" ? `debuted at #${e.position}`
    : e.tag === "RE" ? `back on the chart at #${e.position}`
    : e.movement > 0 ? `climbed ${e.movement} to #${e.position}`
    : e.movement < 0 ? `slipped ${-e.movement} to #${e.position}`
    : `held #${e.position}`;

  return frame([
    header("THE WEEKLY 25 · " + d.weekLabel.toUpperCase()),
    div({ flexGrow: 1, alignItems: "center" }, [
      div({ position: "relative", width: 128, height: 128 }, [
        ...(e.position === 1
          ? [el("img", { position: "absolute", top: -34, left: 40, transform: "rotate(-4deg)" },
               undefined, { src: CROWN(m.c), width: 48, height: 37 })]
          : []),
        el("img", { borderRadius: 64, boxShadow: `0 0 0 4px ${m.c}` },
           undefined, { src: avatars[e.login] || BLANK, width: 128, height: 128 }),
      ]),
      div({ flexDirection: "column", marginLeft: 30, flexGrow: 1 }, [
        txt({ fontWeight: 800, fontSize: e.login.length > 16 ? 30 : 40, color: INK }, e.login),
        txt({ fontWeight: 700, fontSize: 21, color: m.c, marginTop: 6 }, line),
        txt({ fontWeight: 600, fontSize: 16, color: MUTED, marginTop: 10 },
          `${fmt(e.prompts)} prompts · ${fmt(e.edits)} edits this week`),
        txt({ fontWeight: 600, fontSize: 16, color: MUTED, marginTop: 4 },
          `peak #${e.peak} · ${e.weeks} wk${e.weeks > 1 ? "s" : ""} on chart`),
      ]),
      div({ flexDirection: "column", alignItems: "center" }, [
        div({ alignItems: "flex-start" }, [
          txt({ fontWeight: 800, fontSize: 60, color: m.c, marginTop: 16 }, "#"),
          txt({ fontWeight: 800, fontSize: 120, color: m.c }, e.position),
        ]),
        div({ marginTop: 2 }, [mvEl(e, 22)]),
        txt({ fontWeight: 700, fontSize: 13, letterSpacing: "0.18em", color: MUTED,
              marginTop: 10 }, `OF ${d.charted} CHARTED`),
      ]),
    ]),
    footer(`${fmt(e.score)} PTS THIS WEEK`),
  ], m);
}

// ---- handler ---------------------------------------------------------------
export default async function handler(req) {
  try {
    const d64 = new URL(req.url).searchParams.get("d");
    if (!d64) return new Response("missing d", { status: 400 });
    const json = decodeURIComponent(escape(atob(d64.replace(/-/g, "+").replace(/_/g, "/"))));
    const d = JSON.parse(json);
    const isPoster = d && d.kind === "poster" && Array.isArray(d.entries) && d.entries.length;
    const isMe = d && d.kind === "me" && d.entry && typeof d.entry.login === "string";
    if (!isPoster && !isMe) return new Response("bad d", { status: 400 });

    const who = isPoster
      ? d.entries.slice(0, 10).map((e) => ({ login: e.login, avatar: e.avatar }))
      : [{ login: d.entry.login, avatar: d.entry.avatar }];
    const [reg, bold, xbold, ...avs] = await Promise.all([
      font("JetBrainsMono-Regular.ttf"),
      font("JetBrainsMono-Bold.ttf"),
      font("JetBrainsMono-ExtraBold.ttf"),
      ...who.map((w) => avatarDataUri(w.avatar, w.login, 96)),
    ]);
    const avatars = {};
    who.forEach((w, i) => { avatars[w.login] = avs[i]; });

    return new ImageResponse(isPoster ? poster(d, avatars) : meCard(d, avatars), {
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
