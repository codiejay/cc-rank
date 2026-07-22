// mostcracked duel OG — the FUT-cut head-to-head poster behind /duel/ links.
// A 1200x630 crop of the dashboard's duel poster (dDuelSvg): two shield cards
// around a gradient VS, the blade, the six-round score. The Worker computes
// everything (ratings, roles, rounds won) and calls this with ?d=<base64url
// JSON> { a, b, wa, wb } where each side is { login, avatar, rank, ovr, role,
// rates: {PMT,EDT,LNS,BRN,STK,REC} }.
//
// Rendering split: satori can't run the shield's clip/mask/gradient stack, and
// resvg can't set text in a webfont inside a nested SVG — so all VECTOR CHROME
// (shields, portraits, blade, rules) ships as one background SVG data URI, and
// ALL TYPE is satori text in Saira Condensed layered on top, at the same
// 540x820 card coordinates the dashboard export uses, scaled by CARD_S.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const STAGE = "#16130E";
const STATS = ["PMT", "EDT", "LNS", "BRN", "STK", "REC"];

// ---- the FUT cut + tones, verbatim from dashboard.ts -----------------------
const DHALF = [[226.1,14.8],[207.7,16.5],[184,20],[166.4,23.5],[144.4,28.8],[133,32.3],
  [112.8,39.3],[95.3,46.4],[83.9,53.4],[82.1,56.9],[82.1,62.2],[80.3,69.2],[76.8,78],
  [71.6,86.8],[66.3,93.8],[61,99],[53.1,104.3],[47,107.8],[36.4,111.3],[24.1,113.6],
  [20,118],[20,660],[21.5,682.1],[22.4,689.2],[25.9,696.2],[30.3,703.2],[38.2,710.2],
  [51.4,717.3],[73.3,724.3],[96.1,731.3],[117.2,738.3],[139.2,745.4],[159.4,752.4],
  [179.6,759.4],[197.1,766.4],[213.8,773.5],[229.6,780.5],[241.9,787.5],[254.2,794.5],
  [263,801.6],[269.1,806.8],[270,809]];
const DOUT = DHALF.concat(DHALF.slice(0, -1).reverse().map((p) => [540 - p[0], p[1]]));
const DSHIELD = "M" + DOUT.map((p) => p[0] + " " + p[1]).join("L") + "Z";
const DSPLIT = 390;
const DTONE = {
  a: { up1:"#EEDF9C", up2:"#B9A250", lo1:"#FCF1A8", lo2:"#DDBE5C",
       ink:"#3A2F0D", rule:"rgba(58,47,13,.5)", rim:"#8E7126", rim2:"rgba(255,247,205,.7)",
       seam:"rgba(255,250,214,.85)", upmid:"#D3C076",
       vig1:"rgba(243,214,121,.22)", vig2:"rgba(140,104,26,.5)",
       wm:"rgba(58,47,13,.085)", mk1:"#4A3C0E", mk2:"#7A6414" },
  b: { up1:"#453626", up2:"#231A11", lo1:"#2B2117", lo2:"#120D07",
       ink:"#F0CE84", rule:"rgba(235,205,91,.4)", rim:"#E6B655", rim2:"rgba(0,0,0,.55)",
       seam:"rgba(235,205,91,.55)", upmid:"#34281B",
       vig1:"rgba(217,119,87,.20)", vig2:"rgba(38,17,8,.58)",
       wm:"rgba(240,206,132,.055)", mk1:"#8A7A5E", mk2:"#D97757" },
};

// ---- poster geometry (1200x630) --------------------------------------------
const CARD_W = 270, CARD_H = 410, CARD_Y = 152;
const CARD_S = CARD_W / 540; // 540x820-space -> poster px
const AX0 = 88, BX0 = 1200 - 88 - CARD_W;
const ACX = AX0 + CARD_W / 2, BCX = BX0 + CARD_W / 2;

// ---- fonts -----------------------------------------------------------------
// satori needs TTF (not woff2); an unrecognized UA (curl-style) makes Google
// Fonts css2 serve plain .ttf urls at the requested weights.
const SAIRA_CSS = "https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800";
let sairaCache = null;
async function sairaFonts() {
  if (sairaCache) return sairaCache;
  const css = await (await fetch(SAIRA_CSS, {
    headers: { "User-Agent": "curl/8.4.0" },
  })).text();
  const out = [];
  const re = /@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const w = (m[1].match(/font-weight:\s*(\d+)/) || [])[1];
    const u = (m[1].match(/url\((https:[^)]+\.(?:ttf|otf))\)/) || [])[1];
    if (!w || !u) continue;
    out.push({ weight: +w, data: await (await fetch(u)).arrayBuffer() });
  }
  if (!out.length) throw new Error("saira ttf unavailable");
  sairaCache = out;
  return out;
}

async function avatarDataUri(url, login) {
  const src = url || `https://github.com/${encodeURIComponent(login)}.png?size=400`;
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
    return "";
  }
}

// ---- vector chrome: one full-bleed SVG -------------------------------------
const escXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function markSvg(c1, c2) {
  const R = (x, y) => `<rect x="${x}" y="${y}" width="76" height="76" rx="19"/>`;
  return `<g fill="${c1}">${R(118,318)}${R(118,218)}${R(318,318)}</g>` +
    `<g fill="${c2}">${R(218,318)}${R(218,218)}${R(218,118)}</g>`;
}

// The shield in two sheets around the portrait: resvg won't resolve raster
// <image> refs inside an image-embedded SVG, so the avatar rides as a real
// satori <img> sandwiched between them. BASE = fills + watermark (under the
// portrait); OVERLAY = vignette, highlight, seam, rims, rules, mark (over it).
function cardBase(id, t) {
  const wm = `<g transform="translate(75,52) scale(1.3)" fill="${t.wm}">` +
    [[12,212],[12,112],[212,212],[112,212],[112,112],[112,12]]
      .map((p) => `<rect x="${p[0]}" y="${p[1]}" width="76" height="76" rx="19"/>`).join("") +
    "</g>";
  return `
<defs>
  <linearGradient id="fu${id}" x1="0" y1="0" x2=".42" y2="1">
    <stop offset="0" stop-color="${t.up1}"/><stop offset="1" stop-color="${t.up2}"/></linearGradient>
  <linearGradient id="fl${id}" x1="0" y1="0" x2=".92" y2="1">
    <stop offset="0" stop-color="${t.lo1}"/><stop offset="1" stop-color="${t.lo2}"/></linearGradient>
  <clipPath id="fk${id}"><path d="${DSHIELD}"/></clipPath>
</defs>
<g clip-path="url(#fk${id})">
  <rect width="540" height="${DSPLIT + 1}" fill="url(#fu${id})"/>
  <rect y="${DSPLIT}" width="540" height="${820 - DSPLIT}" fill="url(#fl${id})"/>
  ${wm}
</g>`;
}
function cardOverlay(id, t) {
  const ax = 59.4, ay = 32.4, aw = 421.2;
  const cx = ax + aw * 0.5;
  const rrect = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${t.rule}"/>`;
  return `
<defs>
  <linearGradient id="fh${id}" x1="0" y1="1" x2="1" y2="0">
    <stop offset=".22" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".5" stop-color="#fff" stop-opacity=".14"/>
    <stop offset=".78" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="vg${id}" cx=".52" cy=".4" r=".74">
    <stop offset=".46" stop-color="#000" stop-opacity="0"/>
    <stop offset=".78" stop-color="${t.vig1}"/><stop offset="1" stop-color="${t.vig2}"/>
  </radialGradient>
  <radialGradient id="ig${id}" cx=".5" cy=".44" r=".62">
    <stop offset=".55" stop-color="${t.upmid}" stop-opacity="0"/>
    <stop offset=".8" stop-color="${t.upmid}" stop-opacity=".6"/>
    <stop offset="1" stop-color="${t.upmid}" stop-opacity="1"/>
  </radialGradient>
  <clipPath id="fo${id}"><path d="${DSHIELD}"/></clipPath>
</defs>
<g clip-path="url(#fo${id})">
  <rect x="${ax}" y="${ay}" width="${aw}" height="${DSPLIT - ay}" fill="url(#ig${id})"/>
  <rect x="${ax}" y="${ay}" width="${aw}" height="${DSPLIT - ay}" fill="url(#vg${id})"/>
  <rect y="${DSPLIT - 1.2}" width="540" height="2.4" fill="${t.seam}" opacity=".55"/>
  <rect width="540" height="820" fill="url(#fh${id})"/>
</g>
<path d="${DSHIELD}" fill="none" stroke="${t.rim}" stroke-width="7" opacity=".7"/>
<path d="${DSHIELD}" fill="none" stroke="${t.rim2}" stroke-width="1.6"/>
${rrect(186.8, 415, 1.7, 123)}
${rrect(54, 549.4, 432, 1.7)}
${rrect(202.5, 572.4, 1.7, 142.7)}
${rrect(337.5, 572.4, 1.7, 142.7)}
<g transform="translate(248.4,733.1) scale(.144 .1476)" opacity=".8">
  <g transform="translate(-106,-106)">${markSvg(t.mk1, t.mk2)}</g>
</g>`;
}

const wrapCard = (x, inner) =>
  `<svg x="${x}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 540 820">${inner}</svg>`;
function baseSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <radialGradient id="pemb" cx=".5" cy=".45" r=".62">
    <stop offset="0" stop-color="#D97757" stop-opacity=".16"/>
    <stop offset="1" stop-color="#D97757" stop-opacity="0"/></radialGradient>
  <linearGradient id="pblade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E0A32E" stop-opacity="0"/>
    <stop offset=".32" stop-color="#E0A32E"/><stop offset=".68" stop-color="#D97757"/>
    <stop offset="1" stop-color="#D97757" stop-opacity="0"/></linearGradient>
</defs>
<rect width="1200" height="630" fill="${STAGE}"/>
<rect width="1200" height="630" fill="url(#pemb)"/>
<g transform="translate(600 330) rotate(18)" fill="url(#pblade)">
  <rect x="-2" y="-268" width="4" height="212"/>
  <rect x="-2" y="118" width="4" height="180"/></g>
${wrapCard(AX0, cardBase("A", DTONE.a))}
${wrapCard(BX0, cardBase("B", DTONE.b))}
</svg>`;
}
function overlaySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
${wrapCard(AX0, cardOverlay("A", DTONE.a))}
${wrapCard(BX0, cardOverlay("B", DTONE.b))}
</svg>`;
}

// The portrait window: avatar box ∩ shield, top shoulders traced off DHALF,
// hard floor at the seam. Element-relative px in the box's 540-space, scaled
// by CARD_S at build.
const AV = { ax: 59.4, ay: 32.4, aw: 421.2 };
const AVCLIP = (() => {
  const left = [[73.6,0],[53.4,6.9],[35.9,14],[24.5,21],[22.7,24.5],[22.7,29.8],
    [20.9,36.8],[17.4,45.6],[12.2,54.4],[6.9,61.4],[1.6,66.6],[0,68.2]];
  const floor = DSPLIT - AV.ay;
  const pts = [...left, [0, floor], [AV.aw, floor],
    ...left.slice().reverse().map((p) => [AV.aw - p[0], p[1]])];
  return "polygon(" +
    pts.map((p) => (p[0] * CARD_S).toFixed(1) + "px " + (p[1] * CARD_S).toFixed(1) + "px")
      .join(", ") + ")";
})();

// ---- type layer (satori) ---------------------------------------------------
const SAIRA = "Saira Condensed";
const el = (type, style, children, extra) =>
  ({ type, props: { style, ...(extra || {}), children } });
const div = (style, children) => el("div", { display: "flex", ...style }, children);
const abs = (left, top, style, s) =>
  el("div", { display: "flex", position: "absolute", left, top, ...style }, String(s));

// Text overlays for one card, at dCardSvg's 540x820 coordinates times CARD_S.
function cardType(p, x0, tone) {
  const t = DTONE[tone];
  const P = (x, y) => [x0 + x * CARD_S, CARD_Y + y * CARD_S];
  const out = [];
  // OVR + rank (top-anchored in the source, same here)
  let [x, y] = P(67.5, 406.7);
  out.push(abs(x, y - 8, { fontWeight: 700, fontSize: 102.6 * CARD_S, color: t.ink,
    letterSpacing: -0.5 }, p.ovr));
  [x, y] = P(72.4, 521.5);
  out.push(abs(x, y, { fontWeight: 800, fontSize: 23.8 * CARD_S, color: t.ink,
    letterSpacing: 1.9, opacity: 0.62 }, `OVR · #${p.rank || "-"}`));
  // name (strip suffix + shrink to fit, same rule as the dashboard card)
  const nm = String(p.login).replace(/[-_].*$/, "").slice(0, 13).toUpperCase();
  const nsz = (nm.length > 7 ? 11 * 7 / nm.length : 11) * 5.4;
  [x, y] = P(207.9, 413.3);
  out.push(abs(x, y - 2, { fontWeight: 800, fontSize: nsz * CARD_S, color: t.ink,
    letterSpacing: nsz * 0.035 * CARD_S }, nm));
  [x, y] = P(210.6, 488.7);
  out.push(abs(x, y, { fontWeight: 600, fontSize: 30.2 * CARD_S, color: t.ink,
    letterSpacing: 1.5, opacity: 0.74 }, p.role));
  // the six stats: three across, twice down, centered on their column
  const COLX = [135, 270, 405], ROWBASE = [625, 702.1];
  ROWBASE.forEach((base, row) => {
    COLX.forEach((cx, col) => {
      const k = STATS[row * 3 + col];
      const [sx, sy] = P(cx, base);
      out.push(div({ position: "absolute", left: sx - 60 * CARD_S * 2,
        top: sy - 46 * CARD_S, width: 120 * CARD_S * 2,
        justifyContent: "center", alignItems: "baseline" }, [
        el("div", { display: "flex", fontWeight: 800, fontSize: 46.4 * CARD_S,
          color: t.ink }, String(p.rates[k])),
        el("div", { display: "flex", fontWeight: 600, fontSize: 33.5 * CARD_S,
          color: t.ink, opacity: 0.76, letterSpacing: 0.8, marginLeft: 4 }, k),
      ]));
    });
  });
  return out;
}

function poster(d) {
  const { a, b } = d;
  const nameSize = (s) => Math.min(38, Math.round(38 * 11 / Math.max(11, s.length)));
  return div({ width: 1200, height: 630, position: "relative",
               fontFamily: SAIRA, background: "transparent" }, [
    // eyebrow
    div({ position: "absolute", left: 0, top: 30, width: 1200,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 700, fontSize: 17, color: "#D97757",
        letterSpacing: 6 }, "MOSTCRACKED DUEL"),
    ]),
    // the names around the bolt
    div({ position: "absolute", left: 0, top: 62, width: 545,
          justifyContent: "flex-end" }, [
      el("div", { display: "flex", fontWeight: 800, fontSize: nameSize(a.login),
        color: "#E8B84B", letterSpacing: 1, transform: "skewX(-8deg)" },
        a.login.toUpperCase()),
    ]),
    div({ position: "absolute", left: 655, top: 62, width: 545 }, [
      el("div", { display: "flex", fontWeight: 800, fontSize: nameSize(b.login),
        color: "#E28763", letterSpacing: 1, transform: "skewX(-8deg)" },
        b.login.toUpperCase()),
    ]),
    // VS in the gradient, slightly thrown
    div({ position: "absolute", left: 0, top: 180, width: 1200,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 800, fontSize: 130,
        transform: "skewX(-12deg) rotate(-3deg)",
        backgroundImage: "linear-gradient(135deg, #FFD98A 18%, #E0A32E 42%, #D97757 62%, #FF9E77 88%)",
        backgroundClip: "text", color: "transparent" }, "VS"),
    ]),
    // full-time score + rounds
    div({ position: "absolute", left: 0, top: 356, width: 1200,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 800, fontSize: 74, color: "#F4EFE5" },
        `${d.wa} – ${d.wb}`),
    ]),
    div({ position: "absolute", left: 0, top: 452, width: 1200,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 600, fontSize: 17, color: "#8B867B",
        letterSpacing: 4.5 }, "ACROSS SIX ROUNDS"),
    ]),
    // card type layers
    ...cardType(a, AX0, "a"),
    ...cardType(b, BX0, "b"),
    // handles + site mark
    div({ position: "absolute", left: ACX - 200, top: 585, width: 400,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 600, fontSize: 19,
        color: "rgba(232,184,75,.85)", letterSpacing: 1 }, "@" + a.login),
    ]),
    div({ position: "absolute", left: BCX - 200, top: 585, width: 400,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 600, fontSize: 19,
        color: "rgba(226,135,99,.9)", letterSpacing: 1 }, "@" + b.login),
    ]),
    div({ position: "absolute", left: 0, top: 588, width: 1200,
          justifyContent: "center" }, [
      el("div", { display: "flex", fontWeight: 600, fontSize: 16, color: "#6B665B",
        letterSpacing: 5 }, "MOSTCRACKED.COM"),
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
    if (!d || !d.a || !d.b || typeof d.a.login !== "string" || typeof d.b.login !== "string" ||
        !d.a.rates || !d.b.rates)
      return new Response("bad d", { status: 400 });

    const [fonts, avA, avB] = await Promise.all([
      sairaFonts(),
      avatarDataUri(d.a.avatar, d.a.login),
      avatarDataUri(d.b.avatar, d.b.login),
    ]);
    const uri = (svg) =>
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));

    // portrait: clipped to the shield window, feathered at the sides like the
    // dashboard card's radial mask (single-gradient approximation)
    const portrait = (src, x0) => src
      ? el("img", {
          position: "absolute", left: x0 + AV.ax * CARD_S, top: CARD_Y + AV.ay * CARD_S,
          clipPath: AVCLIP,
          WebkitMaskImage: "radial-gradient(ellipse 62% 80% at 50% 44%, #000 62%, rgba(0,0,0,0) 90%)",
        }, undefined,
        { src, width: AV.aw * CARD_S, height: AV.aw * CARD_S })
      : null;

    const tree = div({ width: 1200, height: 630, position: "relative" }, [
      el("img", { position: "absolute", left: 0, top: 0 }, undefined,
        { src: uri(baseSvg()), width: 1200, height: 630 }),
      portrait(avA, AX0),
      portrait(avB, BX0),
      el("img", { position: "absolute", left: 0, top: 0 }, undefined,
        { src: uri(overlaySvg()), width: 1200, height: 630 }),
      poster(d),
    ]);
    return new ImageResponse(tree, {
      width: 1200,
      height: 630,
      fonts: fonts.map((f) => ({ name: SAIRA, data: f.data, weight: f.weight, style: "normal" })),
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
