// Self-contained dashboard page. Only external asset: GitHub avatar images
// (identity is a GitHub login), with a letter fallback when they 404.
// Visual language lives in /DESIGN.md — warm product dashboard, app shell,
// white cards, square-dot chart, mono numerals, one orange accent.
// og: per-user share meta for /u/:login pages — values are server-derived
// (validated login + numbers), escaped here anyway as defense-in-depth.
export interface OgMeta { login: string; title: string; desc: string; image: string; url: string }
export function dashboardHtml(code: string | null, og?: OgMeta, page?: "chart" | "duel",
  duel?: { a: string; b: string }): string {
  // Defense-in-depth: even though the caller only passes a CODE_RE-validated
  // code, harden the serializer so a value could never break out of the inline
  // <script>. JSON.stringify quotes/escapes it, then we unicode-escape <, > and
  // / so a literal </script> can't appear in the source.
  const initial = code
    ? JSON.stringify(code).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\//g, "\\u002f")
    : "null";
  const escAttr = (s: string) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const ogTags = og ? `
<meta property="og:type" content="website" />
<meta property="og:site_name" content="mostcracked" />
<meta property="og:title" content="${escAttr(og.title)}" />
<meta property="og:description" content="${escAttr(og.desc)}" />
<meta property="og:url" content="${escAttr(og.url)}" />
<meta property="og:image" content="${escAttr(og.image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escAttr(og.title)}" />
<meta name="twitter:description" content="${escAttr(og.desc)}" />
<meta name="twitter:image" content="${escAttr(og.image)}" />` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#F4F3EF" />${ogTags}
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='106 106 300 300'%3E%3Cg fill='%23736C5D'%3E%3Crect x='118' y='318' width='76' height='76' rx='19'/%3E%3Crect x='118' y='218' width='76' height='76' rx='19'/%3E%3Crect x='318' y='318' width='76' height='76' rx='19'/%3E%3C/g%3E%3Cg fill='%23D97757'%3E%3Crect x='218' y='318' width='76' height='76' rx='19'/%3E%3Crect x='218' y='218' width='76' height='76' rx='19'/%3E%3Crect x='218' y='118' width='76' height='76' rx='19'/%3E%3C/g%3E%3C/svg%3E" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700;800&display=swap" />
<title>mostcracked · who&rsquo;s the most cracked?</title>
<script>
  // Theme before first paint (no light flash). One-time hard reset: this push
  // forces dark on EVERYONE once (even returning users who'd picked light),
  // then their own choice sticks. After the forced flip, stored choice wins,
  // else system.
  (function(){
    var FORCE_KEY = 'ccrank_dark_forced_v1';
    var t;
    try {
      if (!localStorage.getItem(FORCE_KEY)) {
        t = 'dark';
        localStorage.setItem('ccrank_theme', 'dark');
        localStorage.setItem(FORCE_KEY, '1');
      } else {
        t = localStorage.getItem('ccrank_theme');
      }
    } catch (e) {}
    if (t !== 'light' && t !== 'dark')
      t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#161511' : '#F4F3EF');
  })();
</script>
<style>
  :root {
    color-scheme: light;
    --side:#F4F3EF; --bg:#FAFAF8; --card:#FFFFFF;
    --ink:#221F1A; --muted:#8B867B; --faint:#C9C5BB;
    --line:#EAE8E1; --line2:#DEDBD2;
    --accent:#D97757; --accent-deep:#B05730; --accent-soft:#F7E7DE; --edits:#7C6455;
    --up:#12A150; --down:#D92D20; --amber:#F5B301;
    /* podium medals — warm metallics that sit next to the coral accent */
    --gold:#E0A32E; --gold-soft:rgba(224,163,46,.13); --gold-glow:rgba(224,163,46,.34);
    --award:#8A6210; --award-bg:rgba(224,163,46,.12); --award-bd:rgba(224,163,46,.38);
    --silver:#9A948B; --silver-soft:rgba(154,148,139,.13);
    --bronze:#C0794A; --bronze-soft:rgba(192,121,74,.13);
    --ink2:#4A463E; --ink3:#55514A;         /* secondary / tertiary text */
    --hover:#FBFAF7; --chipbg:#F1F0EA; --seg:#EEEDE7;
    --track:#EDEBE4;                         /* meter + race unfilled ticks */
    --skbg:#EFEDE6; --skhi:rgba(255,252,245,.7);
    --me:#FBF4EE; --me-hov:#F8EDE4;
    --navhov:rgba(255,255,255,.6);
    --h0:#F0EDE6; --h1:#F6DFD2; --h2:#EDB795; --h3:#D97757; --h4:#8C3D1D;
    --heathov:rgba(34,31,26,.45);
    --term:#1E1913; --termbar:#2A241C; --termink:#F4EFE5; --cmdbg:#23201A;
    --onink:#FFFFFF; --inkbtn-hov:#000000;   /* ink-block buttons: text + hover */
    --pill-hov:#000000;
    --veil1:rgba(255,255,255,.28); --veil2:rgba(255,255,255,.08);
    --mono: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --sans: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
    /* condensed grotesk for the FUT-cut duel cards — the real ones are set in
       DIN Condensed, so fall through the condensed faces that actually ship on
       macOS/Windows/Android before giving up to the system sans. */
    --cond: 'Saira Condensed','Barlow Condensed','Roboto Condensed','Oswald',
            'Arial Narrow','Helvetica Neue Condensed',var(--sans);
    --shadow: 0 1px 2px rgba(35,28,15,.04), 0 0 0 1px var(--line);
  }
  /* Dark: warm charcoal, same DNA — espresso greige grounds, cream ink, the
     one coral accent. Designed values per surface, never naive inversion
     (DESIGN.md bans dark-mode-with-neon). */
  :root[data-theme="dark"] {
    color-scheme: dark;
    --side:#161511; --bg:#1B1915; --card:#242119;
    --ink:#F1EDE3; --muted:#9C9587; --faint:#57524A;
    --line:#2F2C24; --line2:#3E392F;
    --accent-deep:#E89A72; --accent-soft:#3B2A20; --edits:#B39482;
    --up:#3DCF7C; --down:#F97066;
    --gold:#E6B655; --gold-soft:rgba(230,182,85,.16); --gold-glow:rgba(230,182,85,.30);
    --award:#E6B655; --award-bg:rgba(230,182,85,.13); --award-bd:rgba(230,182,85,.30);
    --silver:#B4ADA2; --silver-soft:rgba(180,173,162,.14);
    --bronze:#D08A5A; --bronze-soft:rgba(208,138,90,.15);
    --ink2:#C9C2B4; --ink3:#B4AC9D;
    --hover:#2A261F; --chipbg:#332F26; --seg:#141310;
    --track:#332F27;
    --skbg:#2C2921; --skhi:rgba(255,250,240,.06);
    --me:#2E241C; --me-hov:#382B20;
    --navhov:rgba(255,255,255,.045);
    --h0:#2B2822; --h1:#472A1D; --h2:#8C4326; --h3:#D97757; --h4:#F6A87D;
    --heathov:rgba(241,237,227,.6);
    --term:#14110C; --termbar:#1F1A13; --cmdbg:#14110C;
    --onink:#1B1915; --inkbtn-hov:#FFFFFF;
    --pill-hov:#2A241C;
    --veil1:rgba(255,255,255,.07); --veil2:rgba(255,255,255,.02);
    --shadow: 0 1px 2px rgba(0,0,0,.35), 0 0 0 1px var(--line);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { margin: 0; background: var(--bg); color: var(--ink);
         font: 14px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
  button { font: inherit; color: inherit; }
  a { color: inherit; }

  .shell { display: grid; grid-template-columns: 236px minmax(0,1fr); min-height: 100vh; }

  /* ================= sidebar ================= */
  .side { background: var(--side); border-right: 1px solid var(--line);
          padding: 18px 14px 20px; display: flex; flex-direction: column; gap: 4px;
          position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 18px; }
  .brandlink { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
  .mark { display: grid; place-items: center; flex: none; }
  .mark svg { width: 26px; height: 26px; display: block; }
  .brand b { font-size: 15px; letter-spacing: -.02em; white-space: nowrap; }
  .livechip { margin-left: auto; display: flex; align-items: center; gap: 6px;
              font: 10px/1 var(--mono); letter-spacing: .1em; color: var(--muted); }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--up);
         animation: pulse 2.4s ease-in-out infinite; }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(18,161,80,.35); }
    50%     { box-shadow: 0 0 0 5px rgba(18,161,80,0); }
  }
  .navsec { font: 600 10.5px/1 var(--mono); letter-spacing: .12em; color: var(--muted);
            text-transform: uppercase; padding: 16px 8px 8px; display: flex; align-items: center; }
  .navsec .cnt { margin-left: auto; color: var(--faint); }
  .nav { display: flex; align-items: center; gap: 10px; padding: 8px 10px;
         border-radius: 9px; text-decoration: none; font-weight: 500; color: var(--ink2);
         border: 1px solid transparent; }
  .nav svg { width: 16px; height: 16px; flex: none; color: var(--muted); }
  .nav:hover { background: var(--navhov); }
  .nav.on { background: var(--card); border-color: var(--line);
            box-shadow: 0 1px 2px rgba(35,28,15,.06); font-weight: 600; color: var(--ink); }
  .nav.on svg { color: var(--ink); }
  .nav .rdot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
  .nav .code { margin-left: auto; font: 10px/1 var(--mono); color: var(--faint); }
  .nav.static { cursor: default; }
  .nav.static:hover { background: none; }
  .side .spacer { flex: 1; }
  .sidefoot { padding: 12px 8px 0; font: 11px/1.6 var(--mono); color: var(--muted); }
  .sidefoot a { text-decoration: none; }
  .sidefoot a:hover { color: var(--ink); }

  /* ================= main ================= */
  .main { min-width: 0; }
  .topbar { padding: 14px 32px; border-bottom: 1px solid var(--line); background: var(--bg);
            position: sticky; top: 0; z-index: 5; }
  .tbin { max-width: 1336px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
  .crumb { font-size: 16px; font-weight: 650; letter-spacing: -.01em;
           display: flex; align-items: center; gap: 10px; min-width: 0; }
  .crumb .codechip { font: 600 11px/1 var(--mono); letter-spacing: .08em; color: var(--muted);
                     border: 1px solid var(--line2); border-radius: 999px; padding: 4px 9px; }
  .seg { margin-left: auto; display: flex; background: var(--seg); border-radius: 10px; padding: 3px; }
  .seg button { border: 0; background: transparent; border-radius: 8px; padding: 6px 14px;
                font-size: 12.5px; font-weight: 600; color: var(--muted); cursor: pointer; }
  .seg button.on { background: var(--card); color: var(--ink);
                   box-shadow: 0 1px 2px rgba(35,28,15,.08), 0 0 0 1px var(--line); }
  .tbtn { border: 1px solid var(--line2); background: var(--card); color: var(--muted);
          border-radius: 9px; width: 32px; height: 32px; display: grid; place-items: center;
          cursor: pointer; flex: none; padding: 0; }
  .tbtn:hover { color: var(--ink); border-color: var(--ink); }
  .tbtn svg { width: 15px; height: 15px; display: block; }

  .content { padding: 26px 32px 60px; max-width: 1400px; margin: 0 auto; }
  .grid { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 20px; align-items: start; }
  .card { background: var(--card); border-radius: 14px; box-shadow: var(--shadow); }
  .span2 { grid-column: 1 / -1; }
  .cardhead { display: flex; align-items: center; gap: 10px; padding: 18px 22px 6px; }
  .cardhead h3 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -.01em; }
  .cardhead .sub { font: 11px/1 var(--mono); color: var(--muted); }
  .cardhead .right { margin-left: auto; }

  /* ---- dot chart ---- */
  .chartwrap { padding: 14px 22px 0 22px; }
  .chartrow { display: flex; gap: 12px; }
  .yaxis { display: flex; flex-direction: column; justify-content: space-between;
           font: 10.5px/1 var(--mono); color: var(--faint); text-align: right;
           padding: 0 0 20px; flex: none; width: 30px; }
  /* contain:inline-size stops the year grid's intrinsic 700px+ width from
     propagating up into the CSS grid track — without it the Activity card
     widened EVERY card in the column (leaderboard podium shoved offscreen
     on phones) instead of scrolling. */
  .chartscroll { overflow-x: auto; flex: 1; min-width: 0; scrollbar-width: none;
                 contain: inline-size; }
  .chartscroll::-webkit-scrollbar { display: none; }
  /* Activity heatmap — GitHub's contribution graph in Claude coral: columns
     are weeks, rows are weekdays, cell shade = that day's intensity. */
  /* gap is the floor between columns; space-between only adds slack on top of
     it when the grid fits. Without it, an overflowing (scrolling) grid had
     zero column spacing — cells fused into strips on phones. */
  .heat { position: relative; display: flex; justify-content: space-between;
          gap: 4px; width: 100%; min-width: max-content; --cell: 12px; }
  .ccol { display: flex; flex-direction: column; gap: 4px; width: var(--cell); flex: none; }
  .heat i, .heatfoot i { width: var(--cell); height: var(--cell); border-radius: 24%;
                         background: var(--h0); flex: none; display: block; }
  .heat i.off { background: transparent; }
  i.l0 { background: var(--h0); }
  i.l1 { background: var(--h1); }
  i.l2 { background: var(--h2); }
  i.l3 { background: var(--h3); }
  i.l4 { background: var(--h4); }
  .heat i[data-d] { cursor: crosshair; }
  .heat i[data-d]:hover { outline: 1.5px solid var(--heathov); outline-offset: -1px; }
  /* Entrance: tiles drop into place in a diagonal wave (top-left first),
     each with a delay from its --i order. Only runs while .anim is set —
     poll repaints render fully in place, no replay. */
  @keyframes heatIn {
    from { opacity: 0; transform: scale(0) translateY(-6px); }
    55%  { opacity: 1; }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .heat.anim i { opacity: 0; }
  .heat.anim i:not(.off) {
    transform-origin: center;
    animation: heatIn .68s cubic-bezier(.34,1.46,.44,1) both;
    animation-delay: calc(var(--i,0) * 26ms);
  }
  @media (prefers-reduced-motion: reduce) {
    .heat.anim i { opacity: 1; }
    .heat.anim i:not(.off) { animation: none; }
  }
  .wdays { display: flex; flex-direction: column; justify-content: space-between;
           font: 10.5px/1 var(--mono); color: var(--faint); text-align: right;
           width: 30px; flex: none; margin-top: 22px; }
  .heatfoot { display: flex; align-items: center; gap: 4px; justify-content: flex-end;
              margin-top: 12px; font: 10.5px/1 var(--mono); color: var(--muted); }
  .heatfoot i { width: 10px; height: 10px; }
  .heatfoot span { margin: 0 4px; }
  .chna { position: absolute; inset: 0; display: grid; place-items: center;
          font: 12.5px var(--sans); color: var(--muted); }

  .months { position: relative; height: 26px; width: max-content; min-width: 100%;
            font: 11px/26px var(--mono); color: var(--muted); }
  .months span { position: absolute; top: 0; }
  .tip { position: absolute; pointer-events: none; background: var(--card); border-radius: 10px;
         box-shadow: 0 6px 20px rgba(35,28,15,.12), 0 0 0 1px var(--line);
         padding: 9px 12px; white-space: nowrap; z-index: 4; display: none; transform: translate(-50%, 0); }
  .tip .d { font: 10.5px/1 var(--mono); color: var(--muted); margin-bottom: 5px; }
  .tip .v { font: 700 15px/1 var(--mono); }
  .tip .v small { font: 10.5px/1 var(--mono); color: var(--muted); font-weight: 400; }
  /* who made the day: overlapped avatar stack, biggest contributor first */
  .tip .tw { display: flex; align-items: center; margin-top: 8px; }
  .tip .tw > span:not(.twn) { margin-left: -7px; display: flex; }
  .tip .tw > span:first-child { margin-left: 0; }
  .tip .tw .ava { width: 22px; height: 22px; font-size: 10px;
                  box-shadow: 0 0 0 2px var(--card); }
  .tip .twn { margin-left: 6px; font: 600 10.5px/1 var(--mono); color: var(--muted); }

  /* ---- metric strip ---- */
  .mstrip { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line);
            margin-top: 16px; }
  .mcell { border-left: 1px solid var(--line); padding: 14px 22px 18px; cursor: pointer;
           border-top: 2px solid transparent; margin-top: -1px; background: none; text-align: left; border-bottom:0; border-right:0; }
  .mcell:first-child { border-left: 0; border-bottom-left-radius: 14px; }
  .mcell:last-child { border-bottom-right-radius: 14px; }
  .mcell.on { border-top-color: var(--ink); background: var(--hover); }
  .mlab { display: flex; align-items: center; gap: 8px; color: var(--ink3); font-size: 12.5px;
          font-weight: 550; margin-bottom: 10px; }
  .mico { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center;
          background: var(--chipbg); color: var(--ink3); flex: none; }
  .mcell.on .mico { background: var(--ink); color: var(--onink); }
  .mico svg { width: 12px; height: 12px; }
  .mnum { display: block; font: 700 24px/1 var(--mono); font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .mdelta { display: block; margin-top: 8px; font: 11px/1 var(--mono); color: var(--muted); }
  .mdelta b { font-weight: 700; }
  .mdelta .pos { color: var(--up); } .mdelta .neg { color: var(--down); }

  /* ---- leaderboard ---- */
  .lrow { display: grid; grid-template-columns: 26px 30px minmax(0,1fr) auto 56px;
          gap: 14px; align-items: center; padding: 11px 22px;
          border-top: 1px solid var(--line); animation: rise .45s cubic-bezier(.22,1,.36,1) both;
          animation-delay: calc(var(--i) * 40ms); }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  /* poll repaints: swap in place, no re-run of the entrance choreography */
  .quiet .lrow, .quiet .pod { animation: none; }
  .lrow:hover { background: var(--hover); }
  .lrow:last-child { border-radius: 0 0 14px 14px; }
  .rk { font: 600 12px/1 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
  .rk.r1 { color: var(--accent); font-weight: 700; }
  .ava { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
         font: 650 12.5px/1 var(--sans); flex: none; position: relative; overflow: hidden; }
  .ava img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .nm { font-weight: 600; font-size: 13.5px; display: flex; align-items: center;
        flex-wrap: wrap; gap: 7px; min-width: 0; }
  /* The product IS prompts + edits — the stat line dresses up: bigger, bolder,
     with a slow orange glint sweeping through (staggered per row). */
  .meta { font: 700 12.5px/1 var(--mono); margin-top: 5px; font-variant-numeric: tabular-nums;
          width: max-content;
          background: linear-gradient(110deg, var(--ink2) 0 40%, var(--accent) 50%, var(--ink2) 60% 100%);
          background-size: 230% 100%; -webkit-background-clip: text; background-clip: text;
          color: transparent; animation: glint 3.6s ease-in-out infinite;
          animation-delay: calc(var(--i, 0) * .3s); }
  @keyframes glint { 0% { background-position: 115% 0; } 100% { background-position: -115% 0; } }
  @media (prefers-reduced-motion: reduce) { .meta { color: var(--ink2); background: none; } }
  /* stat-line segments never break mid-phrase — a wrap happens between
     "prompts · edits" and "tok · $", never inside either */
  .mseg, .usage { white-space: nowrap; }
  .chip { font: 10px/1 var(--mono); color: var(--muted); border: 1px solid var(--line2);
          border-radius: 999px; padding: 3px 7px; text-decoration: none; white-space: nowrap; }
  .streak { font: 700 10.5px/1 var(--mono); color: var(--accent-deep);
            background: var(--accent-soft); border-radius: 999px; padding: 3px 7px; white-space: nowrap; }
  /* earned badges — one holder per badge, gold family so they read as trophies
     next to the coral streak pill without competing with the accent */
  .award { font: 700 9.5px/1 var(--mono); letter-spacing: .07em; text-transform: uppercase;
           color: var(--award); background: var(--award-bg); border: 1px solid var(--award-bd);
           border-radius: 999px; padding: 3px 8px 3px 6px; white-space: nowrap;
           display: inline-flex; align-items: center; gap: 4px; }
  .award > svg { width: 10px; height: 10px; flex: none; display: block; }
  /* ×N count chip inside a pill — solid gold so the number pops. Only ever
     rendered from ×2 up; a first win is just the pill. */
  .awx { font: 800 8px/1 var(--mono); color: var(--card); background: var(--award);
         border-radius: 99px; padding: 2px 4px 1.5px; margin-left: 1px; }
  .award.was { opacity: .55; }
  /* Codex mark: the OpenAI logomark next to a name when the score includes
     Codex sessions. Sized to sit with the username; hover = the title tip. */
  .cxmark { display: inline-flex; align-items: center; color: var(--muted);
            vertical-align: middle; cursor: help; transition: color .12s; }
  .cxmark > svg { width: 13px; height: 13px; flex: none; display: block; }
  .cxmark:hover, .cxmark:focus-visible { color: var(--ink); outline: none; }
  .podnm .cxmark > svg { width: 14px; height: 14px; }
  .cardcap .cxmark > svg { width: 15px; height: 15px; }
  /* award-record button: a plain shield next to the gold pills — opens the
     dropdown of every day-end record this player has (held now or before) */
  .pastbtn { font: 700 10.5px/1 var(--mono); color: var(--award); background: none;
             border: none; border-radius: 8px; padding: 2px 4px;
             display: inline-flex; align-items: center; gap: 3px; cursor: pointer; }
  .pastbtn svg { width: 16px; height: 16px; flex: none; display: block; }
  .pastbtn:hover { color: var(--ink); }
  .pmnow { font: 800 7.5px/1 var(--mono); letter-spacing: .08em; color: var(--card);
           background: var(--award); border-radius: 99px; padding: 2px 5px 1.5px; }
  .pastmenu { position: absolute; z-index: 80; min-width: 216px; background: var(--card);
              border: 1px solid var(--line2); border-radius: 12px; padding: 7px;
              box-shadow: 0 14px 36px -10px rgba(0,0,0,.4); }
  .pmhd { font: 700 9px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase;
          color: var(--faint); padding: 5px 8px 7px; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; }
  .pmrow { display: flex; align-items: center; gap: 7px; padding: 7px 8px;
           font: 700 10px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase;
           color: var(--award); border-radius: 8px; }
  .pmrow:hover { background: var(--hover); }
  .pmico svg { width: 11px; height: 11px; display: block; }
  .pmx { color: var(--ink); font-weight: 800; }
  .pmlast { margin-left: auto; padding-left: 10px; color: var(--faint); font-size: 9px;
            letter-spacing: 0; text-transform: none; }
  /* all-time awards under the player-card modal */
  .cardawards { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;
                margin-top: 12px; max-width: 480px; }
  /* badge hover = a speech bubble OFF THE HOLDER'S AVATAR, like they're
     saying it (copy is first person, their brag). Same terminal-dark + gold
     surface as before; positioned by JS, tail aimed at the avatar. */
  .award { position: relative; cursor: default; }
  .awbub { position: fixed; width: 218px; z-index: 70; pointer-events: none;
           background: radial-gradient(130% 95% at 16% -12%, rgba(230,182,85,.16), transparent 55%), var(--term);
           border-radius: 12px; padding: 12px 13px 11px;
           box-shadow: 0 14px 36px -10px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07);
           opacity: 0; transform: translateY(5px) scale(.97);
           transition: opacity .16s ease, transform .16s cubic-bezier(.22,1,.36,1);
           text-align: left; }
  .awbub.on { opacity: 1; transform: none; }
  .awbub::after { content: ""; position: absolute; top: 100%; left: var(--tx, 50%);
                  transform: translateX(-50%); border: 7px solid transparent;
                  border-top-color: var(--term); }
  .awbub.below::after { top: auto; bottom: 100%;
                        border-top-color: transparent; border-bottom-color: var(--term); }
  .awtip-hd { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
  .awtip-ico { width: 32px; height: 32px; border-radius: 10px; flex: none;
               display: grid; place-items: center; color: var(--gold);
               background: rgba(230,182,85,.13); box-shadow: inset 0 0 0 1px rgba(230,182,85,.3); }
  .awtip-ico svg { width: 17px; height: 17px; display: block; }
  .awtip-t { font: 700 10.5px/1.35 var(--mono); letter-spacing: .13em;
             text-transform: uppercase; color: var(--gold); }
  .awtip-x { font: 400 11.5px/1.55 var(--sans); color: var(--termink); opacity: .92;
             display: block; }
  @media (prefers-reduced-motion: reduce) { .awbub { transition: none; } }
  .podawards { margin-top: 9px; display: flex; flex-wrap: wrap; justify-content: center;
               gap: 5px; max-width: 100%; }
  /* viewer's own row (?me= / localStorage) — subtle, matches the accent system */
  .lrow.me { background: var(--me); }
  .lrow.me:hover { background: var(--me-hov); }
  .youbadge { font: 700 9.5px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase;
              color: #fff; background: var(--accent); border-radius: 999px; padding: 3px 7px; }
  /* share — appears only on YOUR card; opens the share menu */
  .shbtn { display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
           font: 700 9.5px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase;
           color: var(--accent-deep); background: none; border: 1px solid var(--accent);
           border-radius: 999px; padding: 3px 8px; transition: background .15s, color .15s; }
  .shbtn:hover { background: var(--accent); color: #fff; }
  .shbtn svg { width: 10px; height: 10px; display: block; }
  /* duel — on every row; opens the rival picker */
  .duelbtn { display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
             font: 700 9.5px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase;
             color: var(--muted); background: none; border: 1px solid var(--line2);
             border-radius: 999px; padding: 3px 8px;
             transition: background .15s, color .15s, border-color .15s; }
  .duelbtn:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
  .duelbtn svg { width: 11px; height: 11px; display: block; }
  /* rival picker: click duel on a row, pick the opponent from this list */
  .dpk { position: fixed; inset: 0; z-index: 220; display: flex; align-items: center;
         justify-content: center; padding: 24px; background: rgba(35,28,15,.30);
         backdrop-filter: blur(16px) saturate(1.15);
         -webkit-backdrop-filter: blur(16px) saturate(1.15);
         opacity: 0; transition: opacity .18s ease; }
  :root[data-theme="dark"] .dpk { background: rgba(12,9,5,.60); }
  .dpk.on { opacity: 1; }
  .dpk-panel { width: min(420px, 94vw); max-height: min(560px, 84vh); display: flex;
               flex-direction: column; background: var(--card); border: 1px solid var(--line2);
               border-radius: 18px; overflow: hidden;
               box-shadow: 0 24px 70px -20px rgba(0,0,0,.5);
               transform: scale(.96) translateY(8px);
               transition: transform .22s cubic-bezier(.2,.85,.28,1); }
  .dpk.on .dpk-panel { transform: none; }
  .dpk-hd { display: flex; align-items: center; gap: 9px; padding: 14px 16px;
            border-bottom: 1px solid var(--line2); }
  .dpk-hd > svg { width: 17px; height: 17px; color: var(--accent); flex: none; }
  .dpk-hd .t { min-width: 0; }
  .dpk-hd .t b { display: block; font: 800 12.5px/1.2 var(--mono); letter-spacing: .07em;
                 text-transform: uppercase; }
  .dpk-hd .t span { display: block; color: var(--muted); font-size: 12px; margin-top: 2px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dpk-x { margin-left: auto; flex: none; width: 30px; height: 30px; cursor: pointer;
           display: flex; align-items: center; justify-content: center;
           background: none; border: 0; border-radius: 999px; color: var(--muted);
           transition: background .15s, color .15s; }
  .dpk-x:hover { background: var(--hover); color: var(--ink); }
  .dpk-x svg { width: 16px; height: 16px; }
  .dpk-list { overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
  .dpk-row { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
             background: none; border: 0; border-radius: 12px; padding: 8px 10px;
             cursor: pointer; color: var(--ink); font: inherit; transition: background .12s; }
  .dpk-row:hover { background: var(--hover); }
  .dpk-row .ava { width: 30px; height: 30px; flex: none; }
  .dpk-row .who { min-width: 0; flex: 1; }
  .dpk-row .who b { display: block; font-size: 13.5px; font-weight: 650;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dpk-row .who span { display: block; color: var(--muted); font: 11px var(--mono); margin-top: 1px; }
  .dpk-row .ovr { flex: none; color: var(--muted); font: 700 11px var(--mono);
                  letter-spacing: .04em; }
  .dpk-row:hover .ovr { color: var(--accent); }
  .dpk-empty { padding: 22px 16px; text-align: center; color: var(--muted); font-size: 13px; }
  .shmenu { position: absolute; z-index: 210; width: 252px; background: var(--card);
            border-radius: 14px; box-shadow: 0 12px 40px -8px rgba(0,0,0,.35), 0 0 0 1px var(--line2);
            padding: 10px; animation: shpop .18s cubic-bezier(.22,1,.36,1) both; }
  @keyframes shpop { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: none; } }
  /* preview slot: glimmer skeleton underneath, image fades in over it on load */
  .shprev { position: relative; width: 100%; aspect-ratio: 1200/630; border-radius: 8px;
            overflow: hidden; background: var(--skbg); margin-bottom: 8px; }
  .shprev::before { content: ''; position: absolute; inset: 0; transform: translateX(-100%);
                    background: linear-gradient(90deg, transparent, var(--skhi), transparent);
                    animation: sksweep 1.8s ease-in-out infinite; }
  .shprev img { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
                opacity: 0; transition: opacity .35s ease-out; }
  .shprev img.on { opacity: 1; }
  .shprev .shfail { position: absolute; inset: 0; display: none; align-items: center;
                    justify-content: center; text-align: center; padding: 0 14px;
                    font: 600 11px/1.5 var(--mono); color: var(--muted); }
  .shprev.err::before { animation: none; }
  .shprev.err .shfail { display: flex; }
  .shmenu button { display: flex; align-items: center; gap: 8px; width: 100%; cursor: pointer;
                   font: 600 12.5px/1 var(--sans); color: var(--ink); text-align: left;
                   background: none; border: 0; border-radius: 8px; padding: 9px 10px; }
  .shmenu button:hover { background: var(--hover); }
  .shmenu button svg { width: 14px; height: 14px; flex: none; color: var(--muted); }
  /* ---- profile card lightbox ----
     Click any avatar → the user's share card opens as an image over a
     blue-tinted frosted glass. Card stays crisp; the page behind blurs. */
  /* Warm ink scrim (the espresso base of --shadow), not the old blue — the
     modal lives in ccrank's greige/coral world, not a stock frosted glass. */
  .cardmodal { position: fixed; inset: 0; z-index: 200; display: flex;
               align-items: center; justify-content: center; padding: 24px;
               background: rgba(35,28,15,.30);
               backdrop-filter: blur(16px) saturate(1.15);
               -webkit-backdrop-filter: blur(16px) saturate(1.15);
               opacity: 0; transition: opacity .22s ease; }
  :root[data-theme="dark"] .cardmodal { background: rgba(12,9,5,.60); }
  .cardmodal.on { opacity: 1; }
  .cardwrap { position: relative; width: min(600px, 92vw);
              display: flex; flex-direction: column; align-items: center; gap: 13px;
              transform: scale(.955) translateY(8px);
              transition: transform .26s cubic-bezier(.2,.85,.28,1); }
  .cardmodal.on .cardwrap { transform: none; }
  /* Native profile card — rendered instantly from board data the client
     already holds, replacing the multi-second OG PNG the modal used to embed.
     Theme-aware and responsive (the PNG could be neither). --mc is the medal
     accent, set per rank; the coral --accent stays the score/tick color. */
  .pcard { position: relative; width: 100%; border-radius: 20px; overflow: hidden;
           background: var(--card); color: var(--ink); --mc: var(--accent);
           border: 1px solid var(--line2);
           box-shadow: 0 34px 90px -26px rgba(0,0,0,.55),
                       inset 0 1px 0 rgba(255,255,255,.04); }
  .pcard.r1 { --mc: var(--gold); } .pcard.r2 { --mc: var(--silver); }
  .pcard.r3 { --mc: var(--bronze); }
  .pcard::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 190px;
                   background: radial-gradient(120% 150% at 88% -30%,
                     color-mix(in srgb, var(--mc) 22%, transparent) 0%, transparent 60%);
                   pointer-events: none; }
  .pc-in { position: relative; padding: 20px 22px 18px; display: flex; flex-direction: column; gap: 16px; }
  .pc-top { display: flex; align-items: center; gap: 10px; }
  .pc-brand { display: flex; align-items: center; gap: 8px; font: 800 15px/1 var(--sans);
              letter-spacing: -.01em; color: var(--ink); }
  .pc-brand svg { width: 20px; height: 20px; display: block; }
  .pc-eyebrow { margin-left: auto; font: 700 9.5px/1 var(--mono); letter-spacing: .16em;
                text-transform: uppercase; color: var(--muted); }
  .pc-hero { display: flex; align-items: center; gap: 18px; }
  .pc-idcol { display: flex; align-items: center; gap: 16px; flex: 1 1 auto; min-width: 0; }
  .pc-av { position: relative; width: 92px; height: 92px; flex: none; }
  .pc-av .ava { width: 92px; height: 92px; border-radius: 50%; font-size: 34px;
                box-shadow: 0 0 0 3px var(--mc), 0 8px 20px -8px rgba(0,0,0,.5); }
  .pc-crown { position: absolute; top: -20px; left: 50%; width: 38px; height: 29px;
              transform: translateX(-50%) rotate(-5deg); color: var(--mc); }
  .pc-idtext { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .pc-name { display: flex; align-items: center; gap: 7px; font: 800 26px/1 var(--sans);
             letter-spacing: -.02em; color: var(--ink);
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pc-name.long { font-size: 21px; } .pc-name.xlong { font-size: 17px; }
  .pc-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pc-score { display: flex; align-items: baseline; gap: 9px; }
  .pc-score b { font: 800 40px/1 var(--sans); letter-spacing: -.03em; color: var(--ink);
                font-variant-numeric: tabular-nums; }
  .pc-score span { font: 700 12px/1 var(--mono); letter-spacing: .12em; color: var(--muted); }
  .pc-ticks { display: flex; gap: 4px; }
  .pc-ticks i { width: 7px; height: 15px; border-radius: 1.5px; background: var(--track); }
  .pc-ticks i.on { background: var(--accent); }
  .pc-rankcol { flex: none; display: flex; flex-direction: column; align-items: center; gap: 3px;
                text-align: center; padding-left: 6px; }
  .pc-rk { display: flex; align-items: flex-start; color: var(--mc);
           font: 800 62px/.85 var(--sans); letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .pc-rk sup { font-size: .48em; font-weight: 800; margin-top: .12em; }
  .pc-of { font: 700 9px/1 var(--mono); letter-spacing: .14em; color: var(--muted);
           text-transform: uppercase; }
  .pc-medal { margin-top: 5px; font: 700 9px/1 var(--mono); letter-spacing: .12em;
              text-transform: uppercase; color: var(--onink); background: var(--mc);
              border-radius: 999px; padding: 5px 11px; }
  .pcard:not(.r1):not(.r2):not(.r3) .pc-medal { color: #fff; }
  .pc-panel { background: var(--bg); border: 1px solid var(--line); border-radius: 14px;
              padding: 14px 16px 13px; display: flex; flex-direction: column; gap: 11px; }
  .pc-panelhd { display: flex; align-items: baseline; gap: 12px; }
  .pc-panelhd > span { font: 700 9.5px/1 var(--mono); letter-spacing: .12em;
                       text-transform: uppercase; color: var(--muted); }
  .pc-stats { margin-left: auto; display: flex; gap: 18px; }
  .pc-stat { display: flex; align-items: baseline; gap: 5px; }
  .pc-stat b { font: 800 14px/1 var(--sans); color: var(--ink); font-variant-numeric: tabular-nums; }
  .pc-stat span { font: 700 8.5px/1 var(--mono); letter-spacing: .1em;
                  text-transform: uppercase; color: var(--muted); }
  .pc-heat { display: flex; flex-direction: column; gap: 3px; }
  .pc-heat .hrow { display: flex; gap: 3px; }
  .pc-heat .hrow i { flex: 1 1 0; aspect-ratio: 1; border-radius: 2.5px; background: var(--h0);
                     min-width: 0; }
  .pc-heat.load .hrow i { animation: pcpulse 1.4s ease-in-out infinite; }
  @keyframes pcpulse { 0%,100% { opacity: .5; } 50% { opacity: .85; } }
  @media (prefers-reduced-motion: reduce) { .pc-heat.load .hrow i { animation: none; } }
  .pc-foot { display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
             font: 600 12px/1.3 var(--sans); color: var(--muted); }
  .pc-foot .tag { font: 700 12px/1 var(--mono); color: var(--accent); }
  .pc-foot .dot { color: var(--faint); }
  .pc-foot a { margin-left: auto; color: var(--ink3); text-decoration: none;
               display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
  .pc-foot a:hover { color: var(--ink); }
  .pc-foot .pc-share { margin-left: auto; }
  /* only the FIRST action pushes right — the rest sit beside it as one group */
  .pc-foot .pc-share ~ .pc-share { margin-left: 0; }
  .pc-foot a.pc-github { margin-left: 0; }
  .pc-share { border: 1px solid var(--line2); background: var(--card); color: var(--ink);
              border-radius: 9px; padding: 7px 12px; cursor: pointer; font: 700 11.5px/1 var(--sans);
              display: inline-flex; align-items: center; gap: 6px; }
  .pc-share:hover { border-color: var(--mc); }
  .pc-share svg { width: 13px; height: 13px; display: block; }
  @media (max-width: 560px) {
    .pc-hero { flex-direction: column; align-items: stretch; gap: 14px; }
    .pc-rankcol { flex-direction: row; justify-content: center; align-items: center; gap: 12px;
                  padding: 10px 0 0; border-top: 1px solid var(--line); }
    .pc-rk { font-size: 44px; } .pc-medal { margin-top: 0; }
    .pc-stats { gap: 14px; }
  }
  .cardx { position: fixed; top: 18px; right: 18px; width: 40px; height: 40px; cursor: pointer;
           display: grid; place-items: center; border: 0; border-radius: 50%;
           background: rgba(255,255,255,.14); color: #fff;
           backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
           transition: background .15s ease, transform .15s ease; }
  .cardx:hover { background: rgba(255,255,255,.26); transform: scale(1.06); }
  .cardx svg { width: 20px; height: 20px; }
  /* whole row / podium tile is a card trigger; the username link opts out */
  .lclk, .pclk { cursor: pointer; }
  .lclk .nm a, .pclk .podnm a { cursor: pointer; }
  @media (max-width: 640px) {
    .cardmodal { padding: 16px; }
    .cardwrap { width: 94vw; gap: 11px; }
    .cardframe { border-radius: 13px; }
    .cardx { top: 12px; right: 12px; width: 36px; height: 36px; }
  }
  .delta { font: 700 10.5px/1 var(--mono); }
  .delta.up { color: var(--up); } .delta.down { color: var(--down); }
  .meter { position: relative; width: 108px; height: 10px; overflow: hidden;
           background: repeating-linear-gradient(90deg, var(--track) 0 4px, transparent 4px 7px); }
  .meter i { position: absolute; inset: 0 auto 0 0;
             background: repeating-linear-gradient(90deg, var(--accent) 0 4px, transparent 4px 7px);
             transition: width .6s cubic-bezier(.22,1,.36,1); }
  .sc { font: 700 15px/1 var(--mono); text-align: right; font-variant-numeric: tabular-nums; }
  .lempty { padding: 34px 22px 38px; border-top: 1px solid var(--line); }
  .lempty b { display: block; font-size: 14px; margin-bottom: 4px; }
  .lempty span { color: var(--muted); font-size: 12.5px; }

  /* ---- podium (top 3) ---- */
  .podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
            align-items: end; padding: 22px 22px 20px; border-top: 1px solid var(--line);
            background:
              radial-gradient(120% 90% at 50% -10%, var(--gold-soft), transparent 60%); }
  .pod { display: flex; flex-direction: column; align-items: center; text-align: center;
         min-width: 0; animation: podrise .6s cubic-bezier(.22,1,.36,1) both;
         animation-delay: calc(var(--i) * 120ms); }
  @keyframes podrise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .pod.p1 { order: 2; --medal: var(--gold);   --medal-soft: var(--gold-soft); }
  .pod.p2 { order: 1; --medal: var(--silver); --medal-soft: var(--silver-soft); }
  .pod.p3 { order: 3; --medal: var(--bronze); --medal-soft: var(--bronze-soft); }
  /* crown floats above #1 */
  .podcrown { color: var(--gold); margin-bottom: 3px; filter: drop-shadow(0 1px 4px var(--gold-glow));
              animation: crownfloat 3.2s ease-in-out 1s infinite; }
  .podcrown svg { width: 24px; height: 18px; display: block; }
  @keyframes crownfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  .pod.p2 .podcrown, .pod.p3 .podcrown { visibility: hidden; }
  .podav { position: relative; display: block; border-radius: 50%; text-decoration: none;
           padding: 3px; background: var(--card); cursor: pointer;
           box-shadow: 0 0 0 2px var(--medal), 0 6px 16px -8px rgba(0,0,0,.4); }
  .pod.p1 .podav { box-shadow: 0 0 0 2.5px var(--gold), 0 0 22px -2px var(--gold-glow), 0 8px 20px -8px rgba(0,0,0,.45);
                   animation: podglow 3s ease-in-out infinite; }
  @keyframes podglow {
    0%,100% { box-shadow: 0 0 0 2.5px var(--gold), 0 0 16px -3px var(--gold-glow), 0 8px 20px -8px rgba(0,0,0,.45); }
    50%     { box-shadow: 0 0 0 2.5px var(--gold), 0 0 30px 1px var(--gold-glow), 0 8px 20px -8px rgba(0,0,0,.45); } }
  .podav .ava { width: 46px; height: 46px; font-size: 17px; }
  .pod.p1 .podav .ava { width: 60px; height: 60px; font-size: 22px; }
  .medal { position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
           font: 800 10px/1 var(--mono); color: #fff; background: var(--medal);
           border: 2px solid var(--card); border-radius: 999px; min-width: 18px;
           height: 18px; display: grid; place-items: center; padding: 0 4px; }
  .pod.p1 .medal { bottom: -6px; height: 20px; min-width: 20px; font-size: 11px; }
  .podnm { margin-top: 11px; font-weight: 650; font-size: 13px; max-width: 100%;
           display: flex; align-items: center; justify-content: center; gap: 8px;
           flex-wrap: wrap; }
  .podnm a { color: var(--ink); text-decoration: none; overflow: hidden;
             text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
  .podnm a:hover { color: var(--accent); }
  .podsc { font: 800 20px/1 var(--mono); margin-top: 6px; font-variant-numeric: tabular-nums;
           color: var(--medal); }
  .pod.p1 .podsc { font-size: 26px; }
  .podmeta { font: 700 10.5px/1 var(--mono); color: var(--muted); margin-top: 5px;
             font-variant-numeric: tabular-nums; }
  /* pedestal blocks — 1st tallest, giving the classic podium silhouette */
  .ped { margin-top: 12px; width: 100%; border-radius: 8px 8px 0 0;
         background: linear-gradient(180deg, var(--medal-soft), transparent);
         border: 1px solid var(--line); border-bottom: none;
         display: grid; place-items: center; color: var(--medal);
         font: 800 22px/1 var(--mono); }
  .pod.p1 .ped { height: 62px; } .pod.p2 .ped { height: 46px; } .pod.p3 .ped { height: 34px; }
  .pod.me .podnm a { color: var(--accent-deep); }
  @media (prefers-reduced-motion: reduce) {
    .pod { animation: none; } .podcrown, .pod.p1 .podav { animation: none; } }

  /* ---- the weekly 25 -------------------------------------------------------
     Three banner states above the board (global page only): a quiet strip
     while the week is cooking, an urgent strip on lock day (Sunday), and the
     full Monday drop — coral-wash masthead + gold most-cracked spotlight +
     charting rows. Every surface goes through token pairs; the wash is the
     hero water treatment (the one sanctioned gradient), night-toned in dark
     via the [data-theme] stop overrides below. */
  /* tue–sat tease: the week's statusline — ink-dark bar, mono, live countdown.
     Escalation arc across the week: dark (cooking) -> deep coral (lock day)
     -> the gold drop. */
  .w25tease { display: flex; align-items: center; gap: 12px; background: var(--term);
              color: var(--termink); border-radius: 14px; padding: 15px 18px;
              margin-bottom: 20px; font-size: 13.5px;
              box-shadow: var(--shadow), inset 0 0 0 1px rgba(255,255,255,.06); }
  .w25tease .sq { width: 8px; height: 8px; border-radius: 2px; background: var(--accent);
                  flex: none; animation: w25pulse 1.6s infinite; }
  .w25tease .tx b { color: var(--accent); font-weight: 700; }
  .w25tease .tx { letter-spacing: .01em; }
  .w25tease .sub { color: rgba(244,239,229,.55); }
  .w25cdw { margin-left: auto; display: flex; align-items: baseline; gap: 10px; flex: none; }
  .w25cdw .lab { font: 600 10px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase;
                 color: rgba(244,239,229,.5); }
  .w25cdw .cd { font: 700 16px/1 var(--mono); font-variant-numeric: tabular-nums;
                color: #FFF7EF; letter-spacing: .02em; }
  @keyframes w25pulse { 50% { opacity: .35; } }

  /* sunday: the chart is closing — same statusline anatomy as the tease,
     run hot: deep coral, faster pulse, big clock. the water wash stays
     reserved for the drop masthead where it has room to breathe. */
  .w25lock { display: flex; align-items: center; gap: 12px; border-radius: 14px;
             margin-bottom: 20px; padding: 18px 20px; color: #FFF7EF;
             background: linear-gradient(115deg, #C4602D, #A64A1F 55%, #8F3D18);
             box-shadow: var(--shadow), inset 0 1px 0 rgba(255,255,255,.14); }
  .w25lock .sq { width: 8px; height: 8px; border-radius: 2px; background: #FFDFC8;
                 flex: none; animation: w25pulse 1s infinite; }
  .w25lock .in { display: flex; align-items: center; gap: 12px; flex: 1 1 0; min-width: 0; }
  .w25lock b { font-size: 16px; font-weight: 750; letter-spacing: -.01em; }
  .w25lock .sub { font-size: 13px; color: rgba(255,239,227,.72); }
  .w25lock .w25cdw .lab { color: rgba(255,247,239,.7); }
  .w25lock .w25cdw .cd { font-size: 22px; font-weight: 800; }
  [data-theme="dark"] .w25lock {
    background: linear-gradient(115deg, #6B3018, #4C2110 60%, #38180C);
    box-shadow: var(--shadow), inset 0 0 0 1px rgba(255,255,255,.08); }

  .w25 { margin-bottom: 20px; }
  /* homepage: the weekly-25 block now trails the leaderboard grid, so it
     needs the gap on top instead of relying on the hero's spacing above */
  .grid + .w25tease, .grid + .w25lock, .grid + .w25 { margin-top: 20px; }
  .w25card { background: var(--card); border-radius: 14px; box-shadow: var(--shadow);
             overflow: hidden; }
  .w25wash { position: relative; height: 152px; overflow: hidden; background: #C05F33; }
  .w25wash svg { position: absolute; inset: -30px; width: calc(100% + 60px); height: calc(100% + 60px); }
  .w25wash .wb { transform-origin: center; animation: w25drift 16s ease-in-out infinite alternate; }
  .w25wash .wb2 { animation-duration: 21s; animation-delay: -8s; }
  .w25wash .wb3 { animation-duration: 25s; animation-delay: -13s; }
  @keyframes w25drift {
    from { transform: translate(-4%,-6%) scale(1) rotate(0deg); }
    to   { transform: translate(5%,7%) scale(1.16) rotate(8deg); } }
  [data-theme="dark"] .w25wash { background: #4A2114; }
  [data-theme="dark"] .w25wash .wg1 { stop-color: #8A4128; }
  [data-theme="dark"] .w25wash .wg2 { stop-color: #5E2C1B; }
  [data-theme="dark"] .w25wash .wv1 { fill: #C97B54; }
  [data-theme="dark"] .w25wash .wv2 { fill: #3A1C10; }
  [data-theme="dark"] .w25wash .wv3 { fill: #E0895D; }
  .w25head { position: relative; height: 100%; display: flex; flex-direction: column;
             justify-content: center; padding: 0 22px; color: #FFF7EF; }
  .w25head .k { font: 700 11px/1 var(--mono); letter-spacing: .16em; text-transform: uppercase;
                opacity: .9; animation: w25up .6s cubic-bezier(.22,1,.36,1) both;
                text-shadow: 0 1px 8px rgba(80,25,8,.35); }
  .w25head h2 { margin: 4px 0 0; font-size: 34px; font-weight: 800; letter-spacing: -.025em;
                animation: w25up .6s .1s cubic-bezier(.22,1,.36,1) both;
                text-shadow: 0 1px 12px rgba(80,25,8,.35); }
  .w25head .d { font: 12.5px/1 var(--mono); opacity: .9; margin-top: 7px;
                animation: w25up .6s .18s cubic-bezier(.22,1,.36,1) both;
                text-shadow: 0 1px 8px rgba(80,25,8,.35); }
  @keyframes w25up { from { opacity: 0; transform: translateY(10px); } }
  .w25.quiet .w25head .k, .w25.quiet .w25head h2, .w25.quiet .w25head .d { animation: none; }

  .w25no1 { display: flex; align-items: center; gap: 16px; padding: 20px;
            background: var(--gold-soft); box-shadow: inset 0 -1px 0 var(--award-bd);
            animation: w25up .6s .35s cubic-bezier(.22,1,.36,1) both; }
  .w25.quiet .w25no1 { animation: none; }
  .w25no1 .avwrap { position: relative; flex: none; }
  .w25no1 .ava { width: 62px; height: 62px; font-size: 22px;
                 box-shadow: 0 0 0 3px var(--gold), 0 0 22px var(--gold-glow); }
  .w25no1 .ava img { width: 62px; height: 62px; }
  .w25crown { position: absolute; top: -13px; left: 50%; width: 22px; height: 17px;
              transform: translateX(-50%); color: var(--gold);
              animation: w25crown .55s .8s cubic-bezier(.34,1.56,.64,1) both; }
  .w25crown svg { width: 100%; height: 100%; display: block; }
  .w25.quiet .w25crown { animation: none; }
  @keyframes w25crown { from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.6); } }
  .w25no1 .who { min-width: 0; }
  .w25no1 .k { font: 700 10.5px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase;
               color: var(--award); }
  .w25no1 .nm { font-size: 22px; font-weight: 800; margin: 3px 0 3px; letter-spacing: -.01em; }
  .w25no1 .nm a { text-decoration: none; }
  .w25no1 .nm a:hover { text-decoration: underline; }
  .w25no1 .meta { font: 12px/1.4 var(--mono); color: var(--muted); }
  .w25no1 .scr { margin-left: auto; text-align: right; flex: none; }
  .w25no1 .scr b { display: block; font: 800 34px/1.1 var(--mono); letter-spacing: -.02em; }
  .w25no1 .scr span { font: 700 11.5px/1 var(--mono); color: var(--award); }
  /* the one sanctioned gradient-text use beyond the stat glint: same sweep */
  .w25no1 .scr b.glint {
    background: linear-gradient(100deg, var(--ink) 42%, var(--accent) 50%, var(--ink) 58%);
    background-size: 280% 100%; -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent;
    animation: w25glint 4.5s 1.4s ease-in-out infinite; }
  @keyframes w25glint { 0% { background-position: 120% 0; } 55%,100% { background-position: -160% 0; } }

  .w25row { display: flex; align-items: center; gap: 12px; padding: 11px 16px;
            border-top: 1px solid var(--line);
            animation: w25up .55s cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d,0s); }
  .w25.quiet .w25row { animation: none; }
  .w25row:hover { background: var(--hover); }
  .w25row.me { background: var(--me); }
  .w25row.me:hover { background: var(--me-hov); }
  .w25row .nm .youbadge, .w25no1 .nm .youbadge { margin-left: 6px; vertical-align: middle; }
  .w25row .pos { width: 26px; font: 13px/1 var(--mono); color: var(--muted); flex: none; }
  .w25mv { width: 40px; flex: none; font: 700 11.5px/1 var(--mono);
           animation: w25pop .45s cubic-bezier(.34,1.56,.64,1) both;
           animation-delay: calc(var(--d,0s) + .25s); }
  .w25.quiet .w25mv { animation: none; }
  @keyframes w25pop { from { opacity: 0; transform: scale(.5); } }
  .w25mv.up { color: var(--up); } .w25mv.down { color: var(--down); }
  .w25mv.flat { color: var(--faint); }
  .w25mv .tagb { display: inline-block; font: 700 9.5px/1 var(--mono); letter-spacing: .06em;
                 padding: 3px 5px; border-radius: 5px; background: var(--accent-soft);
                 color: var(--accent-deep); }
  .w25row .who { min-width: 0; flex: 1; }
  .w25row .nm { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden;
                text-overflow: ellipsis; }
  .w25row .nm a { text-decoration: none; }
  .w25row .nm a:hover { text-decoration: underline; }
  .w25row .meta { font: 11.5px/1.4 var(--mono); color: var(--muted); }
  .w25row .hist { width: 112px; flex: none; text-align: right; font: 11px/1 var(--mono);
                  color: var(--muted); white-space: nowrap; }
  .w25row .sc { width: 56px; flex: none; text-align: right; font: 700 14px/1 var(--mono); }
  .w25foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px;
             border-top: 1px solid var(--line); font: 12px/1 var(--mono); color: var(--muted); }
  .w25foot button { margin-left: auto; border: 1px solid var(--line2); background: transparent;
                    color: var(--ink); font: 600 12px/1 var(--sans); padding: 6px 12px;
                    border-radius: 8px; cursor: pointer; }
  .w25foot button:hover { background: var(--hover); }
  /* collapse toggle — sits on the wash masthead, top-right. A pill with a live
     glimmer running around a gradient border: two backgrounds, one fixed inner
     (padding-box) over one oversized moving sheen (border-box). */
  .w25collapse { position: absolute; top: 15px; right: 16px; z-index: 2;
                 display: inline-flex; align-items: center; gap: 6px;
                 padding: 8px 15px; border-radius: 999px; cursor: pointer;
                 border: 1.5px solid transparent; color: #FFF7EF;
                 font: 700 11.5px/1 var(--sans); letter-spacing: .09em; text-transform: uppercase;
                 background:
                   linear-gradient(rgba(22,11,6,.52), rgba(22,11,6,.52)) padding-box,
                   linear-gradient(110deg, rgba(255,235,215,.25) 0%, #FFF6EC 18%, #E8A878 34%,
                     rgba(255,235,215,.25) 50%, #FFF6EC 66%, #E8A878 82%,
                     rgba(255,235,215,.25) 100%) border-box;
                 background-size: 100% 100%, 260% 100%;
                 background-position: 0 0, 0 0;
                 box-shadow: 0 3px 14px rgba(60,20,8,.30), inset 0 1px 0 rgba(255,255,255,.18);
                 -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
                 text-shadow: 0 1px 6px rgba(60,20,8,.5);
                 animation: w25glimmer 3.4s linear infinite;
                 transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s; }
  @keyframes w25glimmer { to { background-position: 0 0, -260% 0; } }
  .w25collapse:hover { transform: translateY(-1px) scale(1.03);
                       box-shadow: 0 5px 20px rgba(60,20,8,.42), inset 0 1px 0 rgba(255,255,255,.28); }
  .w25collapse:active { transform: translateY(0) scale(.99); }
  @media (prefers-reduced-motion: reduce) { .w25collapse { animation: none; } }
  .w25.collapsed .w25no1, .w25.collapsed #w25rows, .w25.collapsed .w25foot { display: none; }
  /* show-the-25: tile the body in on reveal, staggered per row. The #id and
     source order beat the .quiet "no animation" rules above. --d starts at
     .45s (drop choreography); subtract .4s for a snappy click cascade. */
  .w25.w25reveal .w25no1 { animation: w25tile .5s cubic-bezier(.22,1,.36,1) both; }
  .w25.w25reveal #w25rows .w25row { animation: w25tile .5s cubic-bezier(.22,1,.36,1) both;
                                    animation-delay: calc(var(--d, .4s) - .4s); }
  .w25.w25reveal .w25foot { animation: w25tile .45s .14s ease both; }
  @keyframes w25tile { from { opacity: 0; transform: translateY(14px) scale(.97); }
                       to   { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .w25.w25reveal .w25no1, .w25.w25reveal #w25rows .w25row,
    .w25.w25reveal .w25foot { animation: none; } }
  /* hide-the-25: reverse tile-out — rows lift + fade bottom-first (reverse
     stagger via a negative delay off --d), then JS lands display:none. */
  .w25.w25collapsing .w25foot { animation: w25untile .3s ease both; }
  .w25.w25collapsing #w25rows .w25row { animation: w25untile .32s ease both;
                                        animation-delay: calc(.5s - var(--d, .45s)); }
  .w25.w25collapsing .w25no1 { animation: w25untile .32s .12s cubic-bezier(.4,0,.7,.2) both; }
  @keyframes w25untile { from { opacity: 1; transform: none; }
                         to   { opacity: 0; transform: translateY(-12px) scale(.97); } }
  @media (prefers-reduced-motion: reduce) {
    .w25.w25collapsing .w25no1, .w25.w25collapsing #w25rows .w25row,
    .w25.w25collapsing .w25foot { animation: none; } }
  @media (prefers-reduced-motion: reduce) {
    .w25wash .wb, .w25head .k, .w25head h2, .w25head .d, .w25no1, .w25crown,
    .w25row, .w25mv, .w25strip.urgent .sq { animation: none; }
    .w25no1 .scr b.glint { animation: none; background: none;
      -webkit-text-fill-color: currentColor; color: var(--ink); } }
  @media (max-width: 700px) {
    .w25row .w25meter, .w25row .hist { display: none; }
    .w25head h2 { font-size: 21px; } }
  /* phones: the strips put the copy and the countdown side-by-side, which
     starves the copy into a cramped 3-line column and squeezes the clock.
     Stack them — copy first, then the countdown on its own full-width row
     under a hairline, label left / big clock right (its own mini statusline). */
  @media (max-width: 560px) {
    .w25lock { padding: 16px 18px; align-items: flex-start; }
    .w25lock .sq { margin-top: 5px; }
    .w25lock .in { flex-direction: column; align-items: stretch; gap: 13px; }
    .w25lock .w25cdw { margin-left: 0; width: 100%; justify-content: space-between;
      padding-top: 13px; border-top: 1px solid rgba(255,247,239,.3); }
    .w25lock .w25cdw .cd { font-size: 26px; }
    .w25tease { flex-wrap: wrap; align-items: flex-start; padding: 14px 16px; }
    .w25tease .sq { margin-top: 5px; }
    .w25tease .tx { flex: 1 1 0; min-width: 0; }
    .w25tease .w25cdw { flex-basis: 100%; width: 100%; margin-left: 0;
      justify-content: space-between; padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,.12); }
    .w25tease .w25cdw .cd { font-size: 18px; } }

  /* ---- right rail ---- */
  .rail { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
  .card .pad { padding: 16px 20px 20px; }
  .card .pad p.hint { margin: 0 0 14px; color: var(--muted); font-size: 12.5px; }
  .btn { display: block; width: 100%; border: 0; border-radius: 10px; padding: 11px 14px;
         font-size: 13px; font-weight: 600; cursor: pointer; text-align: center;
         text-decoration: none; }
  .btn.dark { background: var(--ink); color: var(--onink); }
  .btn.dark:hover { background: var(--inkbtn-hov); }
  .btn.ghost { background: var(--card); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line2); }
  .btn.ghost:hover { box-shadow: inset 0 0 0 1px var(--ink); }
  .btn + .btn { margin-top: 8px; }
  /* agent picker: 3 copy buttons — Claude Code / Codex / Both. The clicked one
     lights up as the active choice and copies its tailored setup prompt. */
  .agentpick { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
  .apick { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
           padding: 11px 6px; border-radius: 10px; cursor: pointer;
           font: 600 12px/1 var(--sans); color: var(--muted);
           background: var(--card); border: 1px solid var(--line2);
           transition: color .12s, border-color .12s, background .12s; white-space: nowrap; }
  .apick:hover { color: var(--ink); border-color: var(--muted); }
  .apick.on { color: var(--ink); border-color: var(--accent);
              background: color-mix(in srgb, var(--accent) 10%, var(--card)); }
  .apick-ic { display: inline-flex; width: 14px; height: 14px; flex: none; }
  .apick-ic svg { width: 14px; height: 14px; display: block; }
  .apick-cx { width: 13px; height: 13px; }
  .apick-cx svg { width: 13px; height: 13px; }
  .apickhint { margin: 8px 2px 12px; font-size: 10.5px; color: var(--faint); text-align: center; }
  details { border-top: 1px solid var(--line); }
  details summary { cursor: pointer; list-style: none; display: flex; align-items: center;
                    padding: 13px 0; font-size: 13px; font-weight: 600; }
  details summary::-webkit-details-marker { display: none; }
  details summary::after { content: "+"; margin-left: auto; color: var(--muted);
                           font: 400 15px/1 var(--mono); }
  details[open] summary::after { content: "\\2212"; }
  .fields { display: flex; flex-direction: column; gap: 8px; padding-bottom: 16px; }
  .fields input { font: 12.5px/1 var(--mono); padding: 10px 12px; border-radius: 9px;
                  border: 1px solid var(--line2); background: var(--card); color: var(--ink); width: 100%; }
  .fields input::placeholder { color: var(--faint); }
  .fields input:focus { outline: none; border-color: var(--ink); }
  .fields input.up { text-transform: uppercase; letter-spacing: .08em; }
  .cmd { margin-top: 4px; background: var(--cmdbg); color: var(--termink); border-radius: 10px;
         padding: 12px 14px; font: 11.5px/1.65 var(--mono); word-break: break-all; cursor: pointer; }
  .cmd::before { content: "$ "; color: var(--accent); }
  .cmd .copyhint { display: block; color: rgba(244,239,229,.5); margin-top: 6px; font-size: 10px; }
  .msg { margin-top: 8px; font: 11.5px/1.5 var(--mono); }
  .msg.err { color: var(--down); }
  .msg.ok { color: var(--up); }

  /* ---- skeleton loading ----
     Greige ghost blocks that mirror the real cards 1:1 (no layout shift on
     first data paint). A warm cream highlight sweeps left-to-right; the global
     reduced-motion switch below freezes it to flat blocks. */
  .sk { position: relative; overflow: hidden; display: inline-block; vertical-align: top;
        background: var(--skbg); border-radius: 6px; }
  .sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
        background: linear-gradient(100deg, transparent 25%, var(--skhi) 50%, transparent 75%);
        animation: sksweep 1.8s ease-in-out infinite; }
  @keyframes sksweep { to { transform: translateX(100%); } }
  .skblk { display: block; }
  .heatfoot i.sk { border-radius: 3px; }
  .codebox { position: relative; overflow: hidden; border: 1.5px dashed var(--line2);
             border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 14px; }
  .codebox.open { cursor: pointer; }
  .codebox.open:hover { border-color: var(--accent); }
  /* Frosted glass: the code must stay VISIBLE as a blurry ghost behind it. */
  .codeval { filter: blur(4px); opacity: .8; color: var(--accent-deep);
             transition: filter .55s cubic-bezier(.22,1,.36,1), opacity .55s; }
  .codebox.open .codeval { filter: none; opacity: 1; color: var(--ink); }
  .veil { position: absolute; inset: 0; display: grid; place-items: center;
          background: linear-gradient(115deg, var(--veil1), var(--veil2));
          backdrop-filter: blur(2px) saturate(1.1);
          -webkit-backdrop-filter: blur(2px) saturate(1.1);
          transition: opacity .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1); }
  .codebox.open .veil { opacity: 0; transform: scale(1.12); pointer-events: none; }
  .reveal { border: 0; background: var(--ink); color: var(--onink); border-radius: 999px;
            padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
            box-shadow: 0 4px 14px rgba(35,28,15,.22); }
  .reveal:hover { background: var(--inkbtn-hov); }
  .codebox .c { font: 700 24px/1 var(--mono); letter-spacing: .22em; text-indent: .22em; }
  .codebox .h { font: 10px/1 var(--mono); color: var(--muted); margin-top: 8px;
                letter-spacing: .08em; text-transform: uppercase; }
  .scorehow { display: flex; align-items: center; gap: 10px; padding: 9px 0;
              border-top: 1px solid var(--line); font-size: 12.5px; color: var(--ink3); }
  .scorehow:first-of-type { border-top: 0; }
  .scorehow kbd { font: 10.5px/1 var(--mono); background: var(--chipbg); border-radius: 6px;
                  padding: 4px 7px; color: var(--muted); }
  .scorehow .pt { margin-left: auto; font: 700 11px/1 var(--mono); color: var(--accent-deep);
                  background: var(--accent-soft); border-radius: 999px; padding: 4px 8px; }

  /* ---- onboarding hero (the ONE way in — must be impossible to miss) ---- */
  @property --oa { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
  /* Glimmer ring: two coral highlights orbiting a quiet warm-gray track,
     while the whole card breathes a soft coral glow. */
  .onboard { --oa: 0deg; position: relative; border-radius: 16px; padding: 1.5px;
             background: conic-gradient(from var(--oa),
               var(--line2) 0deg, var(--accent) 40deg, #FFC9AE 70deg, var(--line2) 120deg,
               var(--line2) 200deg, var(--accent) 240deg, #FFC9AE 270deg, var(--line2) 320deg,
               var(--line2) 360deg);
             animation: oaspin 5s linear infinite, onbglow 3.6s ease-in-out infinite; }
  @keyframes oaspin { to { --oa: 360deg; } }
  @keyframes onbglow {
    0%,100% { box-shadow: 0 2px 10px rgba(217,119,87,.10); }
    50%     { box-shadow: 0 8px 30px rgba(217,119,87,.30); }
  }
  .onb-in { position: relative; border-radius: 14.5px; background: var(--card); }
  .onb-in .pad { padding: 12px 18px 18px; }
  .onb-head { display: flex; align-items: center; gap: 9px; padding: 16px 20px 4px; }
  .onb-head h3 { margin: 0; font-size: 15.5px; font-weight: 700; letter-spacing: -.01em; }
  .burst-ico { width: 21px; height: 21px; color: var(--accent); flex: none; }
  .onb-tag { margin-left: auto; font: 700 9.5px/1 var(--mono); letter-spacing: .12em;
             text-transform: uppercase; color: var(--accent-deep); background: var(--accent-soft);
             border: 1px solid rgba(217,119,87,.4); border-radius: 999px; padding: 5px 9px;
             animation: tagpulse 2.6s ease-in-out infinite; }
  @keyframes tagpulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(217,119,87,.35); }
    50%     { box-shadow: 0 0 0 6px rgba(217,119,87,0); }
  }
  /* The pitch is a tiny Claude Code session replaying the whole onboarding
     on loop: launch, paste, you're on the board. */
  .term { margin: 8px 0 14px; background: var(--term); border-radius: 11px; overflow: hidden;
          box-shadow: 0 12px 26px rgba(35,28,15,.30); }
  .term-bar { display: flex; align-items: center; gap: 6px; padding: 9px 12px;
              background: var(--termbar); border-bottom: 1px solid rgba(255,255,255,.06); }
  .term-bar i { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .term-bar i.r { background: #FF5F57; } .term-bar i.y { background: #FEBC2E; }
  .term-bar i.g { background: #28C840; }
  .term-bar span { margin-left: 6px; font: 600 10px/1 var(--mono); letter-spacing: .08em;
                   color: rgba(244,239,229,.55); }
  .term-body { padding: 11px 14px 13px; font: 12px/1.9 var(--mono); color: var(--termink); }
  .tl { display: block; white-space: nowrap; }
  .tl .ps { color: var(--accent); }
  .t1, .t2 { display: inline-block; overflow: hidden; white-space: nowrap;
             vertical-align: bottom; }
  .t1 { width: 6ch; animation: t1 9s steps(6, end) infinite; }
  @keyframes t1 { 0% { width: 0; } 6% { width: 6ch; } 100% { width: 6ch; } }
  .t2 { width: 22ch; animation: t2 9s steps(22, end) infinite; }
  @keyframes t2 { 0%, 14% { width: 0; } 38%, 100% { width: 22ch; } }
  .tl.done { animation: t3 9s ease infinite; }
  @keyframes t3 { 0%, 46% { opacity: 0; transform: translateY(3px); }
                  54%, 100% { opacity: 1; transform: none; } }
  .tl .ck { color: #5BD98A; font-weight: 700; }
  .caret { display: inline-block; width: 7px; height: 12px; margin-left: 6px;
           background: var(--accent); vertical-align: -1px;
           animation: blink 1.1s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .t1, .t2 { width: auto; } .tl.done { opacity: 1; } }
  .btn.glow { position: relative; overflow: hidden;
              box-shadow: 0 6px 18px rgba(217,119,87,.30); }
  .btn.glow::after { content: ""; position: absolute; inset: 0;
                     background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,.30) 48%, transparent 64%);
                     transform: translateX(-130%); animation: btnshine 3.4s ease-in-out infinite; }
  @keyframes btnshine { 0%,55% { transform: translateX(-130%); } 90%,100% { transform: translateX(130%); } }

  /* ---- landing hero: liquid panel + live fake terminal --------------------
     James-sanctioned exception to the no-gradient rule: a coral "water" wash —
     an SVG turbulence/displacement marble. Cream veins and deep-coral pools
     drift (CSS transforms) through a fixed noise field, so the displacement
     warps them like liquid as they move. All motion is CSS-driven: the global
     reduced-motion rule freezes it. The terminal on top replays a fake ccrank
     session that prints the REAL live global top 5. */
  .hero { position: relative; border-radius: 18px; overflow: hidden; margin-bottom: 20px;
          padding: clamp(18px, 2.6vw, 30px) 20px clamp(16px, 2.2vw, 24px);
          background: #DC7E5E; box-shadow: var(--shadow); }
  .liq { position: absolute; inset: -6%; width: 112%; height: 112%;
         filter: blur(13px) saturate(1.08); pointer-events: none; }
  .liq * { transform-box: fill-box; transform-origin: center; }
  /* Closed meandering loops (4 waypoints each, 0% == 100%) instead of
     alternate ping-pong: each vein wanders an irregular orbit at its own
     pace, so the flow never looks like a repeat or a reversal. */
  .lq1 { animation: lqa 13s ease-in-out -5s infinite; }
  .lq2 { animation: lqb 17s ease-in-out -11s infinite; }
  .lq3 { animation: lqc 15s ease-in-out -2s infinite; }
  .lq4 { animation: lqb 11s ease-in-out -7s infinite; }
  .lq5 { animation: lqa 19s ease-in-out -13s infinite; }
  .lq6 { animation: lqc 10s ease-in-out -4s infinite; }
  @keyframes lqa {
    0%, 100% { transform: none; }
    25% { transform: translate(180px, -90px) rotate(16deg) scale(1.15); }
    50% { transform: translate(320px, 60px) rotate(38deg) scale(1.32); }
    75% { transform: translate(120px, 170px) rotate(10deg) scale(1.08); }
  }
  @keyframes lqb {
    0%, 100% { transform: none; }
    25% { transform: translate(-160px, 110px) rotate(-18deg) scale(.86); }
    50% { transform: translate(-300px, -50px) rotate(-40deg) scale(.72); }
    75% { transform: translate(-90px, -150px) rotate(-8deg) scale(.94); }
  }
  @keyframes lqc {
    0%, 100% { transform: none; }
    25% { transform: translate(140px, 120px) rotate(14deg) scale(1.22); }
    50% { transform: translate(250px, -70px) rotate(30deg) scale(1.02); }
    75% { transform: translate(60px, -180px) rotate(6deg) scale(1.28); }
  }

  .hero-head { position: relative; text-align: center; margin: 0 auto 14px;
               text-shadow: 0 1px 10px rgba(253,251,245,.85), 0 0 3px rgba(253,251,245,.7); }
  .hero-head h1 { margin: 0; font-size: clamp(24px, 3.4vw, 33px); font-weight: 750;
                  letter-spacing: -.02em; }
  /* two lines on desktop (break after "live."); on narrow screens the long
     first line wraps balanced instead of leaving an orphan word */
  .hero-head p { margin: 8px 0 0; color: var(--ink3); font-size: 13.5px;
                 line-height: 1.7; text-wrap: balance; }

  .heroterm { position: relative; width: min(620px, 100%); margin: 0 auto;
              background: var(--term); border-radius: 14px; overflow: hidden; text-align: left;
              box-shadow: 0 24px 60px rgba(35,28,15,.34), 0 2px 8px rgba(35,28,15,.18); }
  .ht-body { padding: 11px 18px 12px; font: 12.5px/1.85 var(--mono); color: var(--termink); }
  .hl { display: block; white-space: nowrap; overflow: hidden; }
  .htype { display: inline-block; overflow: hidden; white-space: nowrap; vertical-align: bottom;
           animation: htype 1.05s steps(33, end) .35s both; }
  @keyframes htype { from { width: 0; } to { width: 33ch; } }
  .hfade { animation: hfade .45s ease-out both; animation-delay: var(--d, 0s); }
  @keyframes hfade { from { opacity: 0; } to { opacity: 1; } }
  .hmut { color: rgba(244,239,229,.45); }
  .hok { color: #5BD98A; font-weight: 700; }
  /* the ccrank statusline as it renders inside Claude Code — just the rank */
  .slwrap { margin-top: 9px; padding-top: 8px; border-top: 1px solid rgba(244,239,229,.12);
            font-size: 12px; line-height: 1.95; }
  .sl { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sl i { font-style: normal; }
  .sl .hd { color: rgba(244,239,229,.28); }
  .sl .lnk { color: #96B7F0; text-decoration: underline; text-underline-offset: 2px; }
  .hrank { color: var(--accent); font-weight: 700; display: inline-block;
           animation: rankpop .55s cubic-bezier(.22,1,.36,1) 2.75s both; }
  @keyframes rankpop { from { opacity: 0; transform: scale(1.7); } to { opacity: 1; transform: none; } }
  .heroterm.noanim .htype, .heroterm.noanim .hfade, .heroterm.noanim .hrank {
    animation: none; width: auto; opacity: 1; transform: none; }

  .hero-pills { position: relative; display: flex; flex-wrap: wrap; gap: 10px;
                justify-content: center; margin-top: 16px; }
  .hpill { display: inline-flex; align-items: center; gap: 8px; background: var(--term);
           color: var(--termink); border: 0; border-radius: 10px; padding: 10px 16px;
           font-size: 12.5px; font-weight: 600; cursor: pointer;
           box-shadow: 0 8px 20px rgba(35,28,15,.22);
           transition: transform .15s ease-out, background .15s; }
  .hpill:hover { transform: translateY(-1px); background: var(--pill-hov); }
  .hpill svg { width: 13px; height: 13px; color: var(--accent); flex: none; }
  /* hero agent picker: three "Copy <agent> prompt" pills */
  .hero-copyrow { position: relative; display: flex; flex-direction: column;
                  align-items: center; margin-top: 18px; }
  .hero-agents { margin-top: 0; }
  .hpill.hagent { padding: 10px 15px; }
  .hpill.hagent.on { background: var(--pill-hov); box-shadow: 0 8px 20px rgba(35,28,15,.22),
                     inset 0 0 0 1.6px var(--accent); }
  .hpill-cx { display: inline-flex; width: 13px; height: 13px; flex: none; }
  .hpill-cx svg { width: 13px; height: 13px; }
  .hpill .hlbl { line-height: 1; }
  @media (prefers-reduced-motion: reduce) {
    .htype { width: 33ch; } .hfade, .hrank { opacity: 1; transform: none; }
  }

  /* ---- today's race bars ---- */
  .race { padding: 4px 20px 18px; }
  .racerow { padding: 9px 0; }
  .racetop { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; font-weight: 600; }
  .racetop .pc { margin-left: auto; font: 700 12px/1 var(--mono); }
  .racebar { margin-top: 7px; height: 10px; overflow: hidden; position: relative;
             background: repeating-linear-gradient(90deg, var(--track) 0 4px, transparent 4px 7px); }
  .racebar i { position: absolute; inset: 0 auto 0 0;
               transition: width .6s cubic-bezier(.22,1,.36,1); }
  .race .none { color: var(--muted); font-size: 12.5px; padding: 8px 0 6px; }

  /* ---- dark-mode surface overrides ----
     The hero wash deepens into night water — same coral marble, ember veins —
     and floating dark blocks (terminals, pills, tooltips) get a faint light
     ring so they don't melt into the dark cards behind them. */
  [data-theme="dark"] .hero { background: #5F2B12; }
  [data-theme="dark"] #liqg stop:nth-of-type(1) { stop-color: #9C4E2B; }
  [data-theme="dark"] #liqg stop:nth-of-type(2) { stop-color: #7A3A1F; }
  [data-theme="dark"] #liqg stop:nth-of-type(3) { stop-color: #582810; }
  [data-theme="dark"] .lq1 { fill: #E08B5C; opacity: .5; }
  [data-theme="dark"] .lq2 { fill: #D57B4E; opacity: .45; }
  [data-theme="dark"] .lq3 { fill: #3C1B0C; opacity: .85; }
  [data-theme="dark"] .lq4 { fill: #2A150A; opacity: .6; }
  [data-theme="dark"] .lq5 { fill: #F2A878; opacity: .4; }
  [data-theme="dark"] .lq6 { fill: #B65F35; opacity: .6; }
  [data-theme="dark"] .hero-head { text-shadow: 0 1px 12px rgba(26,15,7,.9), 0 0 3px rgba(26,15,7,.75); }
  [data-theme="dark"] .hero-head p { color: #F3E4D2; }
  [data-theme="dark"] .term, [data-theme="dark"] .cmd, [data-theme="dark"] .hpill {
    box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 12px 26px rgba(0,0,0,.5); }
  [data-theme="dark"] .heroterm {
    box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 24px 60px rgba(0,0,0,.55); }
  [data-theme="dark"] .tip { box-shadow: 0 6px 20px rgba(0,0,0,.5), 0 0 0 1px var(--line2); }
  [data-theme="dark"] .nav.on { box-shadow: 0 1px 2px rgba(0,0,0,.4); }
  [data-theme="dark"] .seg button.on { box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 0 0 1px var(--line2); }
  [data-theme="dark"] .reveal { box-shadow: 0 4px 14px rgba(0,0,0,.5); }
  [data-theme="dark"] .btn.glow { box-shadow: 0 6px 18px rgba(217,119,87,.22); }

  .notfound { padding: 40px; }
  .notfound b { font-size: 17px; display: block; margin-bottom: 6px; }
  .notfound span { color: var(--muted); }
  .notfound a { color: var(--accent); }

  @media (max-width: 960px) {
    .shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .side { position: static; height: auto; flex-direction: row; align-items: center;
            flex-wrap: wrap; padding: 10px 16px; overflow: visible; }
    .navsec, .nav:not(.on), .sidefoot, .side .spacer { display: none; }
    .nav.on { margin-left: 10px; }
    /* the longer wordmark needs the space: the pulse is a desktop-only
       affordance and isn't load-bearing on a phone. */
    .livechip { display: none; }
    .brand { padding: 0; }
    .topbar, .content { padding-left: 16px; padding-right: 16px; }
    .grid { grid-template-columns: 1fr; }
  }
  /* grid items default to min-width:auto — one card with wide content would
     stretch the shared track and drag every other card with it */
  .grid > * { min-width: 0; }
  /* ---- phones: the three-across podium starves each column, so restage it —
     champion becomes a full-width hero, 2nd + 3rd share the row beneath, and
     the pedestal blocks go (the rank medals already carry that info). List
     rows drop the decorative meter so name / stats / score get the width. */
  @media (max-width: 640px) {
    /* badge tooltips are absolutely positioned and can poke past the right
       edge while hidden, giving the page a phantom horizontal scroll */
    html, body { overflow-x: clip; }
    .content { padding-top: 18px; padding-bottom: 48px; }
    .cardhead { padding: 16px 16px 6px; }
    .podium { grid-template-columns: 1fr 1fr; gap: 0 12px; padding: 20px 16px;
              align-items: start; }
    .pod.p1 { order: -1; grid-column: 1 / -1; padding-bottom: 18px;
              margin-bottom: 16px; border-bottom: 1px solid var(--line); }
    .ped { display: none; }
    .pod.p2 .podcrown, .pod.p3 .podcrown { display: none; }
    .pod.p1 .podav .ava { width: 72px; height: 72px; font-size: 26px; }
    .pod.p1 .podnm { font-size: 14px; margin-top: 12px; }
    .pod.p1 .podsc { font-size: 32px; margin-top: 8px; }
    .podav .ava { width: 44px; height: 44px; font-size: 16px; }
    .podsc { font-size: 18px; }
    .podnm { font-size: 12.5px; gap: 6px; }
    .podnm a { max-width: 140px; }
    .podmeta { font-size: 10px; }
    .podawards { gap: 4px; }
    .lrow { grid-template-columns: 22px 30px minmax(0,1fr) auto;
            gap: 11px; padding: 12px 16px; }
    .meter { display: none; }
    .sc { font-size: 14px; }
    /* tok/$ made the stat line long — flex-wrap it in clean segments: the
       middot between segments hides and the gap takes over, so a wrap never
       strands a "·" at a line edge (width:max-content + the overflow-x clip
       above used to chop "~$4…" offscreen) */
    .meta { width: auto; display: flex; flex-wrap: wrap; gap: 3px 10px; line-height: 1.35; }
    .podmeta { display: flex; flex-wrap: wrap; justify-content: center;
               gap: 3px 10px; line-height: 1.35; }
    .meta .msep, .podmeta .msep { display: none; }
    /* the name cluster: award pills go ICON-ONLY — the gold glyph + ×N chip
       carries the trophy at a glance; labels were the width hogs ("DAILY
       DRIVER" et al). Tap opens the card, where every pill is spelled out. */
    .nm { gap: 4px 6px; }
    .nm .award .awlb, .podawards .award .awlb { display: none; }
    .nm .award, .podawards .award { padding: 3.5px 5.5px; gap: 3px; }
    .nm .award > svg, .podawards .award > svg { width: 12px; height: 12px; }
    .awx { font-size: 7.5px; margin-left: 0; }
    .chip { font-size: 9px; padding: 2.5px 6px; }
    .streak { font-size: 9.5px; padding: 2.5px 6px; }
    .pastbtn { padding: 1px 3px; }
    .pastbtn svg { width: 14px; height: 14px; }
    .lempty { padding: 28px 16px 32px; }
    .mcell { padding: 12px 14px 14px; }
    .mlab { font-size: 11.5px; gap: 6px; }
    .mnum { font-size: 20px; }
    .mdelta { font-size: 10px; line-height: 1.4; }
  }
  /* COMPACT HERO: on desktop the hero is a two-column band — pitch + CTAs on
     the left, the terminal on the right — instead of a tall stack. Cuts the
     landing fold roughly in half so the board is visible without scrolling. */
  @media (min-width: 1080px) {
    .hero { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr);
            column-gap: 30px; row-gap: 12px; align-items: center;
            padding: 22px 28px; }
    .hero-head { grid-column: 1; grid-row: 1; text-align: left; margin: 0;
                 max-width: none; }
    /* the copy row is a centering column by default (stacked hero); in the
       two-column band its pills must hang off the same left edge as the
       heading and the duel button below it */
    .hero-copyrow { grid-column: 1; grid-row: 2; align-items: flex-start; }
    .hero > .hero-pills:not(.hero-agents) { grid-column: 1; grid-row: 3; }
    .heroterm { grid-column: 2; grid-row: 1 / span 3; margin: 0; width: 100%; }
    .hero-head h1 { font-size: clamp(24px, 2.7vw, 30px); }
    .hero-head p { margin-top: 6px; font-size: 13px; line-height: 1.6; }
    .hero-pills { justify-content: flex-start; gap: 8px; }
    .hero-agents .hpill { padding: 8px 12px; font-size: 12.5px; }
    .hero-agents .hlbl { font-size: 12.5px; }
  }
  /* ---- hero on phones: the stacked layout, tightened. Pills shrink so each
     "Copy <agent> prompt" still sits on one line as they wrap, and the hero
     loses the horizontal padding it can't afford. */
  @media (max-width: 700px) {
    .hero { padding: 20px 14px 18px; border-radius: 16px; }
    .hero-copyrow { margin-top: 14px; }
    .hero-pills { gap: 8px; margin-top: 12px; }
    .hpill { padding: 9px 12px; font-size: 12px; gap: 6px; }
    .hpill.hagent { padding: 9px 11px; }
  }
  /* The terminal's lines are nowrap + overflow:hidden, so on the narrowest
     phones the 33ch prompt gets chopped mid-word rather than wrapping. Scale
     the mono type with the viewport (ch units follow it, so the typing
     animation still lands exactly on the last character). */
  @media (max-width: 430px) {
    .ht-body { font: min(12.5px, 3.2vw)/1.85 var(--mono); padding: 10px 12px 11px; }
    .slwrap { font-size: min(12px, 3.05vw); }
  }
  /* ---- duel: FUT-cut cards + head-to-head --------------------------------
     The card is a container: ONE width drives everything inside it, because
     every position/size in there is a % of the frame or a cqw (1% of the card's
     own width). So the same markup is a 150px thumbnail on a phone and a 300px
     hero on a desktop with no second set of numbers to keep in sync. */
  .duelpg { padding-bottom: 40px; }
  .duelhd { margin: 2px 0 26px; }
  /* the fight poster: eyebrow on top, then the two names in heavy italic caps
     with their corner-colour glow, a diagonal slash cutting the whole band,
     and a big double-shadowed VS riding the slash. Boxing card, not a form. */
  .deyebrow { text-align: center; font: 800 10px/1 var(--mono); letter-spacing: .34em;
              text-transform: uppercase; color: var(--accent);
              margin-bottom: clamp(10px,1.6vw,16px);
              text-shadow: 0 0 14px rgba(217,119,87,.45); }
  .dband { position: relative; display: flex; align-items: center; justify-content: center;
           padding: clamp(8px,1.2vw,14px) 0; }
  /* the slash: one diagonal blade through the middle of the poster */
  .dband::before { content: ''; position: absolute; left: 50%; top: -14px; bottom: -14px;
                   width: 2.5px; transform: translateX(-50%) rotate(21deg);
                   background: linear-gradient(180deg, transparent,
                     var(--gold) 32%, var(--accent) 68%, transparent);
                   filter: drop-shadow(0 0 7px rgba(217,119,87,.55)); opacity: .85; }
  /* a low ember glow pooled behind the whole band so the names sit in light */
  .dband::after { content: ''; position: absolute; inset: -26px -8px;
                  pointer-events: none;
                  background: radial-gradient(52% 115% at 50% 50%,
                    rgba(217,119,87,.10), transparent 72%); }
  .dcorner { position: relative; z-index: 1; flex: 1 1 0; min-width: 0; background: none;
             border: 0; padding: 0; cursor: pointer; display: flex; flex-direction: column;
             gap: 7px; }
  .dcorner.a { align-items: flex-end; text-align: right; }
  .dcorner.b { align-items: flex-start; text-align: left; }
  .dcorner .duelname { font: italic 900 clamp(17px,2.9vw,36px)/1.1 var(--cond);
                       letter-spacing: .02em; transform: skewX(-6deg);
                       text-transform: uppercase; max-width: 100%; overflow: hidden;
                       text-overflow: ellipsis; white-space: nowrap;
                       -webkit-background-clip: text; background-clip: text;
                       color: transparent; }
  .dcorner.a .duelname { background-image: linear-gradient(180deg, #FFE9B0 8%,
                           var(--gold) 55%, #B77E1D 96%);
                         filter: drop-shadow(0 2px 0 rgba(0,0,0,.3))
                                 drop-shadow(0 0 16px var(--gold-glow)); }
  .dcorner.b .duelname { background-image: linear-gradient(180deg, #FFC9AE 8%,
                           var(--accent) 55%, #A64A1F 96%);
                         filter: drop-shadow(0 2px 0 rgba(0,0,0,.3))
                                 drop-shadow(0 0 16px rgba(217,119,87,.4)); }
  .dcorner.a:hover .duelname, .dcorner.b:hover .duelname {
    filter: brightness(1.18) drop-shadow(0 2px 0 rgba(0,0,0,.3))
            drop-shadow(0 0 20px rgba(255,214,140,.5)); }
  .dcorner .seed { font: 700 10px/1 var(--mono); letter-spacing: .16em; color: var(--muted);
                   text-transform: uppercase; white-space: nowrap; }
  /* the VS: big, hard-slanted, gold bleeding into coral, punched off the page
     with a solid offset shadow and an ember glow — it rides the slash */
  .vsbolt { position: relative; z-index: 1; flex: none; margin: 0 clamp(14px,2.4vw,34px);
            transform: skewX(-13deg) rotate(-3deg);
            font: italic 900 clamp(26px,3.8vw,52px)/1 var(--cond); letter-spacing: .02em;
            background: linear-gradient(115deg, #FFD98A 18%, var(--gold) 42%,
              var(--accent) 62%, #FF9E77 88%);
            -webkit-background-clip: text; background-clip: text; color: transparent;
            filter: drop-shadow(2.5px 3px 0 rgba(0,0,0,.5))
                    drop-shadow(0 0 18px rgba(217,119,87,.5)); }
  .vsbolt b { display: block; }

  /* Phone/tablet: the two cards share the top row (they're the point — you want
     them next to each other), the scoreline runs full width beneath. Desktop
     puts the scoreline back between them. */
  .duelstage { display: grid; gap: 30px 14px; align-items: start;
               grid-template-columns: minmax(0,1fr) minmax(0,1fr);
               grid-template-areas: 'a b' 'mid mid'; }
  .dcol-a { grid-area: a; } .dcol-b { grid-area: b; }
  .dmid { grid-area: mid; text-align: center; width: 100%; max-width: 460px;
          margin: 0 auto; min-width: 0; }
  @media (min-width: 1240px) {
    .duelstage { grid-template-columns: minmax(0,1fr) minmax(300px,400px) minmax(0,1fr);
                 grid-template-areas: 'a mid b'; gap: 34px; }
    .dmid { max-width: none; }
  }
  .fcol { display: flex; flex-direction: column; align-items: center; gap: 12px; min-width: 0; }
  .fc { position: relative; width: 100%; max-width: 300px; aspect-ratio: 540 / 820;
        container-type: inline-size; user-select: none; transition: transform .16s ease;
        filter: drop-shadow(0 16px 24px rgba(0,0,0,.55)) drop-shadow(0 0 9px var(--fcglow)); }
  /* phones keep the compact pair; anything laptop-sized gets the hero cut */
  @media (min-width: 900px) { .fc { max-width: 365px; } }
  .fc.win { filter: drop-shadow(0 16px 26px rgba(0,0,0,.55))
                    drop-shadow(0 0 22px var(--fcglow)); }
  /* save-to-PNG: quiet pill under the card — the card is the loud one */
  .fcsave { display: inline-flex; align-items: center; gap: 7px; margin-top: 2px;
            font: 700 10.5px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase;
            color: var(--muted); background: none; border: 1px solid var(--line2);
            border-radius: 999px; padding: 8px 14px; cursor: pointer;
            transition: color .15s ease, border-color .15s ease; }
  .fcsave:hover { color: var(--ink); border-color: var(--muted); }
  .fcsave svg { width: 13px; height: 13px; display: block; }
  .fcsave.busy { opacity: .5; pointer-events: none; }
  .fcsvg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  /* the portrait, cut to the card: masked to the shield so it can never spill,
     then feathered three ways — a radial vignette, a diagonal fade into the
     top-left, and a soft top edge — so the head grows out of the card instead
     of sitting in a box on top of it. */
  .fcav { position: absolute; inset: 0; z-index: 2;
          -webkit-mask-image: var(--fcmask); mask-image: var(--fcmask);
          -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
          -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; }
  .fcav1 { position: absolute; left: 11cqw; top: 6cqw; width: 78cqw; height: 78cqw;
           -webkit-mask-image: radial-gradient(62% 80% at 50% 44%, #000 62%, transparent 88%);
           mask-image: radial-gradient(62% 80% at 50% 44%, #000 62%, transparent 88%); }
  .fcav2 { width: 100%; height: 100%;
           -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%);
           mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%); }
  .fcav3 { position: relative; width: 100%; height: 100%;
           -webkit-mask-image: linear-gradient(transparent 1%, #000 20%, #000 76%, transparent 100%);
           mask-image: linear-gradient(transparent 1%, #000 20%, #000 76%, transparent 100%);
           filter: drop-shadow(0 3cqw 6cqw rgba(0,0,0,.55))
                   drop-shadow(0 0 3cqw var(--fcglow)); }
  .fcav3 img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
  .fcavig { position: absolute; inset: 0;
            background: radial-gradient(72% 76% at 52% 40%, transparent 46%,
                        var(--fcvig1) 78%, var(--fcvig2)); }
  .fcglare { position: absolute; inset: 0; pointer-events: none; z-index: 7;
             opacity: 0; transition: opacity .25s ease; mix-blend-mode: screen;
             -webkit-mask-image: var(--fcmask); mask-image: var(--fcmask);
             -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
             background: linear-gradient(112deg,
               transparent calc(var(--mx,50%) - 21%),
               rgba(255,255,255,.05) calc(var(--mx,50%) - 9%),
               rgba(255,255,255,.22) var(--mx,50%),
               rgba(255,255,255,.06) calc(var(--mx,50%) + 9%),
               transparent calc(var(--mx,50%) + 19%)); }
  .fc:hover .fcglare { opacity: 1; }
  /* The face. FUT hangs the rating over a right-shifted portrait and stacks the
     stats two-across under a centre spine; ours centres the portrait, drops the
     rating onto the name line like a shirt number, and runs the six ratings
     three-across. Same cut, different card. */
  .fcink { position: absolute; z-index: 3; color: var(--fcink); line-height: 1;
           font-family: var(--cond); white-space: nowrap; }
  .fcovr { left: 12.5%; top: 49.6%; font-size: 19cqw; font-weight: 700;
           font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  .fcovrl { left: 13.4%; top: 63.6%; font-size: 4.4cqw; font-weight: 800;
            letter-spacing: .16em; opacity: .62; }
  .fcname { left: 38.5%; top: 50.4%; font-weight: 800; letter-spacing: .035em;
            text-transform: uppercase; }
  .fcrole { left: 39%; top: 59.6%; font-size: 5.6cqw; font-weight: 600;
            letter-spacing: .1em; opacity: .74; }
  .fcst { transform: translateX(-50%); display: flex; align-items: baseline; gap: 1.6cqw; }
  .fcst b { font-size: 8.6cqw; font-weight: 800; font-variant-numeric: tabular-nums; }
  .fcst i { font-style: normal; font-size: 6.2cqw; font-weight: 600; letter-spacing: .05em;
            opacity: .76; }
  .fcrule { position: absolute; z-index: 3; background: var(--fcrule); }
  .fcmark { position: absolute; z-index: 3; left: 46%; top: 89.4%; width: 8%; height: 5.4%;
            opacity: .8; }
  .fcmark svg { width: 100%; height: 100%; display: block; }
  .fcsub { display: flex; flex-direction: column; align-items: center; gap: 8px;
           text-align: center; min-width: 0; }
  .fcsub .handle { font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
  .fcsub .handle b { color: var(--ink); }
  .fcpills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  /* center column */
  .dft { font: 800 11px/1 var(--mono); letter-spacing: .28em; color: var(--muted);
         text-transform: uppercase; }
  .dscore { font: 800 clamp(48px,9vw,86px)/1 var(--cond); margin: 10px 0 2px;
            font-variant-numeric: tabular-nums; letter-spacing: .01em; }
  /* one pip per round, so the scoreline shows HOW it was won, not just the total */
  .dpips { display: flex; gap: 6px; justify-content: center; margin-top: 12px; }
  .dpip { width: 26px; height: 4px; border-radius: 3px; background: var(--track);
          transition: background .3s ease; }
  .dpip.on[data-win="a"] { background: var(--gold); }
  .dpip.on[data-win="b"] { background: var(--accent); }
  .dpip.on[data-win="t"] { background: var(--line2); }
  .dscore #dscA { color: var(--gold); }
  .dscore #dscB { color: var(--accent); }
  .dscore em { font-style: normal; color: var(--faint); font-size: .5em;
               vertical-align: .22em; padding: 0 .22em; }
  .ddomhd { display: flex; align-items: center; gap: 10px; margin: 20px 2px 7px;
            font: 800 10px/1 var(--mono); letter-spacing: .16em;
            font-variant-numeric: tabular-nums; }
  .ddomhd .a { color: var(--gold); } .ddomhd .b { color: var(--accent); }
  .ddomhd .lab { flex: 1; color: var(--muted); letter-spacing: .26em; }
  /* tug of war, not a progress bar: the seam between the two colours is the
     reading, and the centre tick tells you which way it moved off even */
  .ddom { position: relative; height: 10px; border-radius: 6px; margin: 0 2px;
          background: var(--accent); }
  .ddom::after { content: ''; position: absolute; left: 50%; top: -6px; bottom: -6px;
    width: 1px; background: var(--faint); opacity: .55; }
  .ddom i { display: block; position: relative; height: 100%; width: 50%;
            background: var(--gold); border-radius: 6px 0 0 6px;
            transition: width .9s cubic-bezier(.22,1,.36,1); }
  .ddom i::after { content: ''; position: absolute; right: -3px; top: -5px; width: 6px;
    height: 20px; border-radius: 3px; background: var(--ink);
    box-shadow: 0 0 0 3px var(--bg); }
  /* both shapes in one hexagon — the overlap IS the story */
  .dradarwrap { display: flex; justify-content: center; margin: 16px 0 2px; }
  .dradar { width: 100%; max-width: 250px; display: block; }
  .dsrows { margin-top: 10px; }
  .dsrow { display: grid; grid-template-columns: 2.6em 1fr 3.6em 1fr 2.6em; gap: 8px;
           align-items: center; margin: 9px 0; font-variant-numeric: tabular-nums; }
  .dsv { font: 800 14px/1 var(--cond); color: var(--muted); display: flex;
         align-items: center; gap: 5px; }
  .dsv.a { justify-content: flex-end; } .dsv.b { justify-content: flex-start; }
  .dsv.w.a { color: var(--gold); } .dsv.w.b { color: var(--accent); }
  .dsv .pip { width: 4px; height: 4px; border-radius: 50%; background: currentColor;
              opacity: 0; flex: none; }
  .dsv.w .pip { opacity: 1; }
  .dslab { font: 800 10px/1 var(--mono); letter-spacing: .16em; color: var(--muted);
           text-align: center; }
  .dsbar { height: 6px; border-radius: 4px; background: var(--track); overflow: hidden;
           display: flex; }
  .dsbar.l { justify-content: flex-end; }
  .dsbar i { display: block; height: 100%; width: 0;
             transition: width .8s cubic-bezier(.22,1,.36,1); }
  .dsbar.l i { background: linear-gradient(90deg,var(--gold-soft),var(--gold));
               border-radius: 4px 0 0 4px; }
  .dsbar.r i { background: linear-gradient(90deg,var(--accent),var(--accent-soft));
               border-radius: 0 4px 4px 0; }
  .dwin { margin: 30px 0 4px; }
  .dwin .dft { color: var(--accent); display: flex; align-items: center; gap: 10px;
               justify-content: center; }
  .dwin .dft::before, .dwin .dft::after { content: ''; width: 22px; height: 1px;
    background: currentColor; opacity: .5; }
  .dwinname { font: 800 clamp(22px,3.4vw,32px)/1.05 var(--cond); text-transform: uppercase;
              overflow-wrap: anywhere;
              letter-spacing: .02em; margin-top: 10px; color: var(--gold);
              text-shadow: 0 0 26px var(--gold-glow); }
  .dwinname.b { color: var(--accent); text-shadow: 0 0 26px rgba(217,119,87,.34); }
  .dwinsub { font-size: 12.5px; color: var(--muted); margin-top: 8px; }
  .drec { background: var(--card); border: 1px solid var(--line); border-radius: 16px;
          margin-top: 24px; padding: 4px 18px 10px; text-align: left; }
  .dreccap { text-align: center; font: 800 10px/1 var(--mono); letter-spacing: .24em;
             color: var(--muted); text-transform: uppercase; padding: 14px 0 6px; }
  .drecrow { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; padding: 9px 2px;
             font-size: 13px; border-top: 1px solid var(--line); align-items: baseline;
             font-variant-numeric: tabular-nums; }
  .drecrow b { font-weight: 800; }
  .drecrow .l { text-align: right; }
  .drecrow .c { font-size: 10.5px; letter-spacing: .08em; color: var(--muted); text-align: center; }
  .drecrow .l.win { color: var(--gold); }
  .drecrow .r.win { color: var(--accent); }
  .dshare { display: flex; align-items: center; justify-content: center; gap: 9px;
            width: 100%; margin-top: 24px; padding: 14px 18px; cursor: pointer;
            border: 0; border-radius: 13px; background: var(--accent); color: #fff;
            font: 800 13px/1 var(--sans); letter-spacing: .1em; text-transform: uppercase;
            box-shadow: 0 8px 22px rgba(217,119,87,.28); }
  .dshare:hover { filter: brightness(1.06); }
  .dshare svg { width: 16px; height: 16px; }
  /* the poster download: same block, ghost finish — share stays the loud CTA */
  .dshare.ghost { background: none; border: 1px solid var(--line2); color: var(--ink);
                  box-shadow: none; margin-top: 9px; }
  .dshare.ghost:hover { filter: none; border-color: var(--accent); color: var(--accent); }
  .dshare.busy { opacity: .5; pointer-events: none; }
  .dactions { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 9px;
              margin-top: 9px; }
  .dbtn { font: 600 12.5px var(--sans); cursor: pointer; border-radius: 11px;
          padding: 11px 10px; border: 1px solid var(--line); background: var(--card);
          color: var(--ink); display: flex; align-items: center; justify-content: center;
          gap: 7px; min-width: 0; }
  .dbtn svg { width: 14px; height: 14px; flex: none; color: var(--muted); }
  .dbtn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dbtn:hover { border-color: var(--accent); }
  .dbtn:hover svg { color: var(--accent); }
  /* phones: three buttons across 390px only fit once the icons step aside */
  @media (max-width: 430px) {
    .dactions { gap: 7px; }
    .dbtn { padding: 10px 6px; font-size: 11.5px; }
    .dbtn svg { display: none; }
  }
  /* challenge picker */
  .pc-duelhint { font: 10px/1 var(--mono); color: var(--muted); letter-spacing: .04em;
                 align-self: center; }
  .chalgrid { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; margin-top: 6px; }
  .chal { display: flex; align-items: center; gap: 8px; background: var(--card);
          border: 1px solid var(--line); border-radius: 999px; padding: 6px 13px 6px 6px;
          cursor: pointer; font: 600 12.5px var(--sans); color: var(--ink);
          transition: border-color .15s, transform .15s; }
  .chal:hover { transform: translateY(-1px); border-color: var(--accent); }
  .chal .ava { width: 24px; height: 24px; font-size: 10px; }
  .chal span.r { color: var(--muted); font: 700 10px var(--mono); }
  /* ---- round-by-round choreography ---- */
  /* rows wait their turn, then land */
  .dsrow { opacity: .22; transform: translateY(4px);
           transition: opacity .32s ease, transform .32s cubic-bezier(.22,1,.36,1); }
  .dsrow.on { opacity: 1; transform: none; }
  .dsrow.even .dslab { color: var(--ink3); }
  /* the winning number takes the round */
  .dsv.hit { animation: dhit .55s cubic-bezier(.22,1,.36,1); }
  @keyframes dhit {
    0% { transform: scale(1); }
    28% { transform: scale(1.55); text-shadow: 0 0 20px var(--gold-glow); }
    100% { transform: scale(1); text-shadow: none; }
  }
  /* the score ticks up with a thump */
  .dscore span.bump { display: inline-block; animation: dbump .45s cubic-bezier(.22,1,.36,1); }
  @keyframes dbump {
    0% { transform: scale(1); }
    34% { transform: scale(1.32); color: var(--gold); }
    100% { transform: scale(1); }
  }
  /* the loser's card takes the hit */
  .fc.shake { animation: dshake .46s cubic-bezier(.36,.07,.19,.97); }
  @keyframes dshake {
    12% { transform: translate(-7px, 3px) rotate(-1.1deg); }
    32% { transform: translate(6px, -3px) rotate(1deg); }
    52% { transform: translate(-5px, 2px) rotate(-.7deg); }
    72% { transform: translate(4px, -1px) rotate(.5deg); }
    100% { transform: none; }
  }
  /* the verdict, held back until the last round lands */
  .dreveal { opacity: 0; transform: translateY(10px);
             transition: opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1); }
  .dreveal.shown { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    .dsrow, .dreveal { opacity: 1; transform: none; }
  }

  /* the invite: what a stranger sees under a shared duel */
  .dinv { max-width: 620px; margin: 46px auto 0; text-align: center;
          border-top: 1px solid var(--line); padding-top: 34px; }
  .dinv-eyebrow { font: 800 11px/1 var(--mono); letter-spacing: .3em; text-transform: uppercase;
                  color: var(--accent); }
  .dinv-h { margin: 12px 0 0; font-size: clamp(24px,3.2vw,32px); font-weight: 750;
            letter-spacing: -.02em; text-wrap: balance; }
  .dinv-sub { margin: 10px auto 0; max-width: 46ch; color: var(--ink3); font-size: 14px;
              line-height: 1.65; }
  .dinv-steps { list-style: none; margin: 22px auto 0; padding: 0; max-width: 430px;
                display: flex; flex-direction: column; gap: 10px; text-align: left; }
  .dinv-steps li { display: flex; align-items: center; gap: 12px; font-size: 13.5px;
                   color: var(--ink2); background: var(--card); border: 1px solid var(--line);
                   border-radius: 12px; padding: 11px 14px; }
  .dinv-steps b { flex: none; width: 22px; height: 22px; border-radius: 7px; display: grid;
                  place-items: center; font: 800 11px/1 var(--mono); color: #fff;
                  background: var(--accent); }
  .dinv-cta { margin-top: 22px; max-width: 430px; margin-left: auto; margin-right: auto; }
  .dinv-out:not(:empty) { margin-top: 10px; }
  .dinv-foot { margin: 18px auto 0; max-width: 44ch; font: 11.5px/1.6 var(--mono);
               color: var(--muted); }
  .hpill.hduel svg { width: 17px; height: 17px; }
  .duelempty { text-align: center; color: var(--muted); font-size: 13.5px; padding: 26px 10px; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
<div class="shell">

  <aside class="side">
    <div class="brand"><a class="brandlink" href="/" aria-label="Mostcracked home"><span class="mark" aria-hidden="true"><svg viewBox="106 106 300 300"><g fill="#736C5D"><rect x="118" y="318" width="76" height="76" rx="19"/><rect x="118" y="218" width="76" height="76" rx="19"/><rect x="318" y="318" width="76" height="76" rx="19"/></g><g fill="#D97757"><rect x="218" y="318" width="76" height="76" rx="19"/><rect x="218" y="218" width="76" height="76" rx="19"/><rect x="218" y="118" width="76" height="76" rx="19"/></g></svg></span><b>Mostcracked</b></a>
      <span class="livechip"><span class="dot"></span>LIVE</span></div>
    <div class="navsec">Menu</div>
    <a class="nav" id="navHome" href="/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="9" width="4" height="12" rx="1"/></svg>
      Global</a>
    <a class="nav" id="navChart" href="/chart">
      <svg viewBox="0 0 24 18" fill="currentColor" aria-hidden="true" style="padding:1px 0"><path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"/><rect x="3.5" y="16" width="17" height="1.8" rx=".9"/></svg>
      the weekly 25</a>
    <div class="spacer"></div>
    <div class="sidefoot">counts only, never code</div>
  </aside>

  <main class="main">
    <div class="topbar"><div class="tbin">
      <div class="crumb" id="crumb">Global</div>
      <div class="seg" id="seg">
        <button id="segAll" class="on" onclick="setMode('allTime')">All-time</button>
        <button id="segToday" onclick="setMode('today')">Today</button>
      </div>
      <button class="tbtn" id="themeBtn" onclick="toggleTheme()" aria-label="toggle dark mode"></button>
    </div></div>
    <div class="content" id="content"></div>
  </main>

</div>
<script>
  let CODE = ${initial};
  // /chart: the weekly 25's permanent home — always shows the latest chart.
  const CHARTPG = ${page === "chart" ? "true" : "false"};
  // Duel pair. Logins are LOGIN_RE-validated server-side before they get here.
  let DUEL = ${duel ? JSON.stringify(duel) : "null"};
  let mode = "allTime";      // leaderboard range (segmented control)
  let metric = "score";      // chart metric (metric strip tabs)
  let GLOBAL = null, ROOM = null, NOTFOUND = false;
  let lastKey = "";

  // ---- viewer identity ------------------------------------------------------
  // ?me=<github_id> identifies the viewer for a cosmetic "you" highlight.
  // The id is PUBLIC (it's in every board row) — never a token or secret.
  // Persisted in localStorage so plain visits keep the highlight.
  let ME = null, ME_WHO = null;
  try {
    const q = new URLSearchParams(location.search).get('me');
    if (q && /^[0-9]{1,20}$/.test(q)) {
      localStorage.setItem('ccrank_me', q);
      // Scrub ?me= from the address bar immediately: identity is saved, the
      // URL shouldn't carry a personalized param people might copy around.
      try {
        const u = new URL(location.href);
        u.searchParams.delete('me');
        history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      } catch { /* cosmetic */ }
    }
    const stored = localStorage.getItem('ccrank_me');
    if (stored && /^[0-9]{1,20}$/.test(stored)) ME = Number(stored);
  } catch { /* storage may be unavailable; highlight is optional */ }
  async function loadWho(){
    if (!ME || (ME_WHO && ME_WHO.id === ME)) return;
    try {
      const r = await fetch('/api/whois?me='+ME);
      if (r.ok){ ME_WHO = await r.json(); lastKey = ''; paint(); }
    } catch { /* cosmetic only */ }
  }
  // Cross-tab sync: the storage event fires in OTHER tabs when the freshly
  // logged-in tab writes ccrank_me — those tabs re-render instantly.
  window.addEventListener('storage', function(ev){
    if (ev.key !== 'ccrank_me' || !ev.newValue || !/^[0-9]{1,20}$/.test(ev.newValue)) return;
    ME = Number(ev.newValue); ME_WHO = null; lastKey = '';
    paint(); loadWho();
  });

  // ---- theme ---------------------------------------------------------------
  // data-theme is set pre-paint by the head script; this is the runtime side:
  // sun/moon toggle in the topbar, persisted, synced across tabs. A toggle
  // repaints (lastKey reset) so JS-computed colors (avatar tints) re-derive.
  const THEME_META = { light: '#F4F3EF', dark: '#161511' };
  function themeNow(){ return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', THEME_META[t]);
    themeBtnIcon();
    lastKey = ''; paint();
  }
  function toggleTheme(){
    const t = themeNow() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('ccrank_theme', t); } catch { /* still applies this tab */ }
    applyTheme(t);
  }
  function themeBtnIcon(){
    const b = document.getElementById('themeBtn');
    if (!b) return;
    const dk = themeNow() === 'dark';
    b.innerHTML = dk
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    b.title = dk ? 'switch to light mode' : 'switch to dark mode';
  }
  window.addEventListener('storage', function(ev){
    if (ev.key !== 'ccrank_theme') return;
    if ((ev.newValue === 'light' || ev.newValue === 'dark') && ev.newValue !== themeNow())
      applyTheme(ev.newValue);
  });

  // ---- small utils ---------------------------------------------------------
  function shq(s){ return /[^A-Za-z0-9_.-]/.test(s) ? '"' + s.replace(/"/g,'') + '"' : s; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function fmt(n){ return String(n == null ? 0 : n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); }
  // tokens/$ are ESTIMATES (see USAGE_EST server-side) — always shown with ~.
  function fmtTok(n){
    if (n >= 1e9) return (n/1e9).toFixed(1)+'B';
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return Math.round(n/1e3)+'k';
    return String(n);
  }
  function fmtUsd(n){
    if (n >= 100) return '$'+fmt(Math.round(n));
    if (n >= 10) return '$'+n.toFixed(0);
    if (n >= 1) return '$'+n.toFixed(1);
    return '$'+n.toFixed(2);
  }
  function usageBit(r){
    if (!r.tok) return '';
    // separator in its own span: phones hide it and let the flex gap take
    // over, so the stat line never wraps on a dangling middot
    return '<span class="msep"> \\u00B7 </span><span class="usage" title="estimated tokens burnt \\u00B7 API-equivalent cost (approximate)">'+
      '~'+fmtTok(r.tok)+' tok \\u00B7 ~'+fmtUsd(r.usd || 0)+'</span>';
  }
  function hue(s){ let h = 0; for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) % 360; return h; }
  // Identity is a verified GitHub account — real avatar (server-provided
  // avatar_url, else github.com/<login>.png), letter fallback if it 404s.
  // Poll repaints rebuild this HTML, recreating every <img> — without care the
  // letter flashes through for a frame each time ("C" blink). Two guards:
  // decoding="sync" paints cached images in the same frame as the swap, and
  // once a src has loaded we stop drawing the letter under it entirely.
  const AVOK = new Set();
  function avOk(img){ AVOK.add(img.getAttribute('src')); }
  function avatar(login, url){
    const h = hue(login.toLowerCase());
    // Pastel fallback tints per theme: light chips on light, deep muted chips
    // with lifted text on dark — same hue hash, so identity color is stable.
    const dk = themeNow() === 'dark';
    const bg = dk ? 'hsl('+h+',30%,25%)' : 'hsl('+h+',62%,91%)';
    const fg = dk ? 'hsl('+h+',55%,78%)' : 'hsl('+h+',48%,32%)';
    const src = url || ('https://github.com/'+encodeURIComponent(login)+'.png?size=64');
    return '<span class="ava" style="background:'+bg+';color:'+fg+'">'+
      (AVOK.has(src) ? '' : esc(login.charAt(0).toUpperCase()))+
      '<img src="'+esc(src)+'" alt="" decoding="sync" onload="avOk(this)" onerror="this.remove()">'+
      '</span>';
  }
  // ---- profile card lightbox -----------------------------------------------
  // A NATIVE, theme-aware card rendered instantly from the board data the
  // client already holds (rank, score, prompts, edits, awards, avatar) over a
  // frosted-glass scrim. It used to embed /og/<login>.png — the same PNG the
  // crawler-facing share flow renders — which meant a human clicking a row
  // waited multiple seconds on a Vercel cold render. The share menu still uses
  // that PNG (X needs a real image); the modal doesn't. The one field not in
  // the payload — the 13-week heatmap — hydrates from /api/heat a beat later.
  // Backdrop click or Esc closes.
  let cardEl = null;
  let cardSeq = 0;
  function cardKey(ev){ if (ev.key === 'Escape') closeCard(); }
  function closeCard(){
    if (!cardEl) return;
    const el = cardEl; cardEl = null;
    el.classList.remove('on');
    document.removeEventListener('keydown', cardKey);
    document.documentElement.style.overflow = '';
    setTimeout(function(){ el.remove(); }, 240);
  }
  // Every award the player has EVER owned, under their card: current holds
  // in full gold, past ones dimmed, ×N from day-end records (never ×1).
  function cardAwardsHtml(login){
    const r = rowOf(login);
    if (!r) return '';
    const rn = recNOf(r), held = {}, items = [];
    (r.awards || []).forEach(function(a){
      if (!BADGES[a.key]) return;
      held[a.key] = 1;
      items.push({ key: a.key, n: rn[a.key] || 0, now: true });
    });
    pastOf(r).forEach(function(x){ items.push({ key: x.key, n: x.n, now: false }); });
    if (!items.length) return '';
    return '<div class="cardawards">'+items.map(function(it){
      const b = BADGES[it.key];
      return '<span class="award'+(it.now ? '' : ' was')+'" title="'+
        (it.now ? 'holding now' : 'held before, not right now')+'">'+
        b.ico+esc(b.lb)+xN(it.n)+'</span>';
    }).join('')+'</div>';
  }
  // The medal accent + label for a rank, mirroring the OG card's tiers.
  const CARD_MEDALS = { 1: 'CHAMPION', 2: 'SILVER', 3: 'BRONZE' };
  // Held-award pills for the hero (top 3 + overflow), same gold pill as the
  // board. Native title tips instead of the delegated speech bubble — the
  // bubble anchors to a board row/podium that isn't present in the modal.
  function pcPills(r){
    const aw = (r.awards || []).filter(function(a){ return BADGES[a.key]; });
    if (!aw.length) return '';
    const shown = aw.slice(0, 3), extra = aw.length - shown.length;
    return '<div class="pc-pills">'+shown.map(function(a){
      const b = BADGES[a.key];
      return '<span class="award" title="'+esc(b.tip)+'">'+b.ico+esc(a.label)+'</span>';
    }).join('')+(extra > 0
      ? '<span class="award" style="color:var(--muted);background:transparent;'+
        'border-color:var(--line2)">+'+extra+'</span>'
      : '')+'</div>';
  }
  // 24-tick score meter, filled proportional to the board leader — identical
  // math to the OG renderer so the modal and the shared PNG agree.
  function pcTicks(score, maxScore){
    const N = 24, filled = Math.max(score > 0 ? 1 : 0,
      Math.round(score / Math.max(1, maxScore) * N));
    let s = '';
    for (var i = 0; i < N; i++) s += '<i'+(i < filled ? ' class="on"' : '')+'></i>';
    return '<div class="pc-ticks">'+s+'</div>';
  }
  // 7 rows (Sun-first) x 13 week columns of intensity levels, ending today.
  // Quartile buckets of the non-zero days, matching card.js's heatCells so the
  // instant modal and the rasterized share card draw the same graph. -1 = a
  // future cell in this week (drawn transparent).
  function pcHeatCells(heat){
    const vals = heat.map(function(h){ return h.n; }).filter(function(n){ return n > 0; })
      .sort(function(a, b){ return a - b; });
    const q = [vals[Math.floor(vals.length * 0.25)] || 1,
               vals[Math.floor(vals.length * 0.5)] || 2,
               vals[Math.floor(vals.length * 0.75)] || 3];
    const lv = {};
    heat.forEach(function(h){
      lv[h.day] = h.n <= 0 ? 0 : h.n <= q[0] ? 1 : h.n <= q[1] ? 2 : h.n <= q[2] ? 3 : 4; });
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const lastSunday = today - new Date(today).getUTCDay() * 86400000;
    const rows = [];
    for (var d = 0; d < 7; d++){
      const row = [];
      for (var w = 12; w >= 0; w--){
        const t = lastSunday - w * 7 * 86400000 + d * 86400000;
        if (t > today){ row.push(-1); continue; }
        const iso = new Date(t).toISOString().slice(0, 10);
        row.push(lv[iso] == null ? 0 : lv[iso]);
      }
      rows.push(row);
    }
    return rows;
  }
  const HCOL = ['var(--h0)','var(--h1)','var(--h2)','var(--h3)','var(--h4)'];
  function pcHeatHtml(rows){
    return rows.map(function(row){
      return '<div class="hrow">'+row.map(function(l){
        return '<i style="background:'+(l < 0 ? 'transparent' : HCOL[l])+'"></i>';
      }).join('')+'</div>';
    }).join('');
  }
  // Placeholder grid while /api/heat is in flight — same 7x13 shape, pulsing.
  function pcHeatSkeleton(){
    let s = '';
    for (var d = 0; d < 7; d++){
      s += '<div class="hrow">';
      for (var w = 0; w < 13; w++) s += '<i></i>';
      s += '</div>';
    }
    return s;
  }
  function openCard(login, score){
    if (cardEl) closeCard();
    const seq = ++cardSeq;
    const r = rowOf(login) || { login: login, score: score, rank: 0,
                                prompts: 0, edits: 0, awards: [] };
    const total = (GLOBAL && GLOBAL.stats && GLOBAL.stats.players) ||
                  (GLOBAL && (GLOBAL.allTime || []).length) || r.rank || 0;
    const maxScore = (GLOBAL && GLOBAL.allTime && GLOBAL.allTime[0] &&
                      GLOBAL.allTime[0].score) || r.score || 1;
    const rank = r.rank || 0;
    const rkClass = rank >= 1 && rank <= 3 ? ' r'+rank : '';
    const medal = CARD_MEDALS[rank] || 'ON THE BOARD';
    const nmClass = login.length > 17 ? ' xlong' : login.length > 12 ? ' long' : '';
    const LOGO = '<svg viewBox="106 106 300 300" aria-hidden="true">'+
      '<g fill="#736C5D"><rect x="118" y="318" width="76" height="76" rx="19"/>'+
      '<rect x="118" y="218" width="76" height="76" rx="19"/>'+
      '<rect x="318" y="318" width="76" height="76" rx="19"/></g>'+
      '<g fill="#D97757"><rect x="218" y="318" width="76" height="76" rx="19"/>'+
      '<rect x="218" y="218" width="76" height="76" rx="19"/>'+
      '<rect x="218" y="118" width="76" height="76" rx="19"/></g></svg>';
    const m = document.createElement('div');
    m.className = 'cardmodal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', login+'\\u2019s ccrank card');
    m.innerHTML =
      '<button class="cardx" aria-label="close" onclick="closeCard()">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '+
        'stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>'+
      '<div class="cardwrap">'+
        '<div class="pcard'+rkClass+'"><div class="pc-in">'+
          '<div class="pc-top">'+
            '<span class="pc-brand">'+LOGO+'mostcracked</span>'+
            '<span class="pc-eyebrow">Global Claude Code Leaderboard</span>'+
          '</div>'+
          '<div class="pc-hero">'+
            '<div class="pc-idcol">'+
              '<div class="pc-av">'+
                (rank === 1 ? '<span class="pc-crown">'+crownSvg()+'</span>' : '')+
                avatar(login, r.avatar)+
              '</div>'+
              '<div class="pc-idtext">'+
                '<div class="pc-name'+nmClass+'">'+esc(login)+agentMark(r)+'</div>'+
                pcPills(r)+
                '<div class="pc-score"><b>'+fmt(r.score)+'</b><span>PTS</span></div>'+
                pcTicks(r.score || 0, maxScore)+
              '</div>'+
            '</div>'+
            '<div class="pc-rankcol">'+
              (rank ? '<div class="pc-rk"><sup>#</sup>'+rank+'</div>'+
                      '<div class="pc-of">of '+fmt(total)+' worldwide</div>' : '')+
              '<span class="pc-medal">'+medal+'</span>'+
            '</div>'+
          '</div>'+
          '<div class="pc-panel">'+
            '<div class="pc-panelhd"><span>Last 13 weeks</span>'+
              '<div class="pc-stats">'+
                '<div class="pc-stat"><b>'+fmt(r.prompts)+'</b><span>prompts</span></div>'+
                '<div class="pc-stat"><b>'+fmt(r.edits)+'</b><span>edits</span></div>'+
              '</div></div>'+
            '<div class="pc-heat load">'+pcHeatSkeleton()+'</div>'+
          '</div>'+
          '<div class="pc-foot">'+
            '<span class="tag">CC-Rank '+(rank ? '#'+rank+'/'+fmt(total) : 'unranked')+'</span>'+
            '<span class="dot">\\u00B7</span>'+
            '<span>'+fmt(r.prompts)+' prompts \\u00B7 '+fmt(r.edits)+' edits'+usageBit(r)+'</span>'+
            '<button class="pc-share" onclick="shMenu(event, \\''+esc(login)+'\\', '+rank+', '+(r.score || 0)+')">'+
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '+
              'stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/>'+
              '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>'+
              '<path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5"/></svg>Share</button>'+
            '<button class="pc-share" onclick="duelFrom(\\''+esc(login)+'\\')">'+
              fenceSvg()+'Duel</button>'+
            '<span class="pc-duelhint">'+(ME_WHO && ME_WHO.login !== login ? 'you vs them' : 'vs the rank above')+'</span>'+
            '<a class="pc-github" href="https://github.com/'+encodeURIComponent(login)+'" '+
              'target="_blank" rel="noopener">GitHub \\u2197</a>'+
          '</div>'+
        '</div></div>'+
        cardAwardsHtml(login)+
      '</div>';
    m.addEventListener('click', function(ev){ if (ev.target === m) closeCard(); });
    document.body.appendChild(m);
    cardEl = m;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function(){ m.classList.add('on'); });
    document.addEventListener('keydown', cardKey);
    // Hydrate the heatmap: the one card field the board payload lacks.
    fetch(location.origin+'/api/heat/'+encodeURIComponent(login))
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if (!data || seq !== cardSeq || cardEl !== m) return;
        const box = m.querySelector('.pc-heat');
        if (!box) return;
        box.classList.remove('load');
        box.innerHTML = pcHeatHtml(pcHeatCells(data.heat || []));
      })
      .catch(function(){ /* skeleton stays; card is already useful */ });
  }
  // ---- share menu ----------------------------------------------------------
  // One floating menu at a time, anchored to the clicked share button.
  // ?v=score on both URLs: every score change is a NEW url to X's crawler,
  // so the unfurl cache never shows a stale card.
  let shEl = null;
  function shClose(){
    if (!shEl) return;
    shEl.remove(); shEl = null;
    document.removeEventListener('click', shDocClose);
  }
  function shDocClose(ev){ if (shEl && !shEl.contains(ev.target)) shClose(); }
  function shMenu(ev, login, rank, score){
    ev.preventDefault(); ev.stopPropagation();
    if (shEl){ shClose(); return; }
    const total = (GLOBAL && GLOBAL.stats && GLOBAL.stats.players) || rank;
    const link = location.origin+'/u/'+encodeURIComponent(login)+'?v='+score;
    const img  = location.origin+'/og/'+encodeURIComponent(login)+'.png?v='+score;
    const ic = {
      x:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L1.6 2H8l4.4 5.9L18.9 2zm-1.1 18.1h1.7L7.1 3.8H5.3l12.5 16.3z"/></svg>',
      dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 19h16"/></svg>',
      ln: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
      md: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M5.5 15v-6l2.75 3L11 9v6M15.5 9v4.5"/><path d="m13.5 12 2 2.3 2-2.3"/></svg>'
    };
    const m = document.createElement('div');
    m.className = 'shmenu';
    m.innerHTML =
      '<div class="shprev"><img src="'+esc(img)+'" alt="" '+
        'onload="this.classList.add(\\'on\\')" '+
        'onerror="this.closest(\\'.shprev\\').classList.add(\\'err\\')">'+
        '<span class="shfail">preview didn\\u2019t load. sharing still works.</span></div>'+
      '<button onclick="shXCopy(this, \\''+esc(img)+'\\', \\''+esc(login)+'\\', '+rank+', '+total+', '+score+')">'+
        ic.x+'Copy image &amp; open X</button>'+
      '<button onclick="shDl(\\''+esc(img)+'\\', \\''+esc(login)+'\\')">'+ic.dl+'Download PNG</button>'+
      '<button onclick="shCopyLink(this, \\''+esc(link)+'\\')">'+ic.ln+'Copy link</button>'+
      '<button onclick="shBadge(this, \\''+esc(login)+'\\')">'+ic.md+'Copy README badge</button>'+
      w25ShareBtn(login);
    document.body.appendChild(m);
    const r = ev.currentTarget.getBoundingClientRect();
    const left = Math.min(r.left, innerWidth - 268);
    m.style.left = Math.max(8, left) + 'px';
    m.style.top = (r.bottom + scrollY + 8) + 'px';
    shEl = m;
    setTimeout(function(){ document.addEventListener('click', shDocClose); }, 0);
  }
  // Copy the card PNG, then open the X composer with the text+link prefilled —
  // the user pastes the image into the post (browsers can't attach it for us).
  // Copy comes FIRST: the preview <img> already warmed the cache so the blob
  // resolves fast enough to stay inside the click's transient activation, and
  // once a new tab has focus the clipboard would refuse to write.
  async function shXCopy(btn, img, login, rank, total, score){
    const label = btn.lastChild;
    let copied = false;
    try {
      label.textContent = 'copying\\u2026';
      // Promise-flavored ClipboardItem: keeps the user-gesture alive in Safari.
      const p = fetch(img).then(function(r){ if (!r.ok) throw 0; return r.blob(); });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]);
      copied = true;
    } catch (e) {
      // clipboard refused (browser/permission) — hand them the file instead
      shDl(img, login);
    }
    // No URL in the tweet — X's crawler is too flaky to trust with the card;
    // the pasted image IS the card. Copy is James's voice (see the badge tips):
    // short, lowercase, cocky, never an em dash.
    const flex = rank === 1 ? 'come and take it.' : 'coming for the crown.';
    const text = 'CC-Rank #'+rank+'/'+total+'. '+fmt(score)+' pts on the global '+
      'Claude Code leaderboard. '+flex+'\\n\\n'+location.origin;
    const w = window.open('https://x.com/intent/post?text='+encodeURIComponent(text),
      '_blank', 'noopener');
    if (!w){ // popup blocked — next click re-copies instantly from cache
      label.textContent = copied ? 'copied. click again for X' : 'click again for X';
      return;
    }
    label.textContent = copied ? 'copied. paste it in your post' : 'downloaded. attach it';
    setTimeout(shClose, 2200);
  }
  function shDl(img, login){
    const a = document.createElement('a');
    a.href = img; a.download = 'ccrank-'+login+'.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(shClose, 400);
  }
  // Chart-card share: only offered when this login is on the latest weekly 25.
  function w25Entry(login){
    const chart = GLOBAL && GLOBAL.chart;
    if (!chart || !(chart.entries || []).length) return null;
    for (var i = 0; i < chart.entries.length; i++)
      if (chart.entries[i].login.toLowerCase() === String(login).toLowerCase())
        return chart.entries[i];
    return null;
  }
  function w25ShareBtn(login){
    const e = w25Entry(login);
    if (!e) return '';
    const chIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 20v-7M12 20V4M18 20v-10"/></svg>';
    return '<button onclick="shChart(this, \\''+esc(login)+'\\', '+e.position+')">'+
      chIco+'Copy weekly 25 card &amp; open X</button>';
  }
  async function shChart(btn, login, position){
    const label = btn.lastChild;
    const e = w25Entry(login) || { tag: null, movement: null };
    const img = location.origin+'/og/chart/'+encodeURIComponent(login)+'.png';
    let copied = false;
    try {
      label.textContent = 'copying\\u2026';
      const p = fetch(img).then(function(r){ if (!r.ok) throw 0; return r.blob(); });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]);
      copied = true;
    } catch (err) { shDl(img, login + '-weekly25'); }
    const how = e.tag === 'NEW' ? 'debuted at #'+position+' on'
      : e.movement > 0 ? 'climbed to #'+position+' on'
      : position === 1 ? 'runs' : '#'+position+' on';
    const flex = position === 1 ? 'come and take it.' : 'catch me on the chart.';
    const text = (how === 'runs' ? 'I run the weekly 25.' : how+' the weekly 25.')+
      ' the Claude Code chart, new every monday. '+flex+'\\n\\n'+location.origin+'/chart';
    const w = window.open('https://x.com/intent/post?text='+encodeURIComponent(text),
      '_blank', 'noopener');
    if (!w){ label.textContent = copied ? 'copied. click again for X' : 'click again for X'; return; }
    label.textContent = copied ? 'copied. paste it in your post' : 'downloaded. attach it';
    setTimeout(shClose, 2200);
  }
  // Markdown for a live rank badge in any GitHub README/profile. The badge
  // links back to the user's share page.
  async function shBadge(btn, login){
    const label = btn.lastChild;
    const md = '[![ccrank](' + location.origin + '/badge/' +
      encodeURIComponent(login) + '.svg)](' + location.origin + '/u/' +
      encodeURIComponent(login) + ')';
    try {
      await navigator.clipboard.writeText(md);
      label.textContent = 'copied. paste it in your README';
      setTimeout(shClose, 1400);
    } catch (e) { label.textContent = md; }
  }
  async function shCopyLink(btn, link){
    const label = btn.lastChild;
    try {
      await navigator.clipboard.writeText(link);
      label.textContent = 'Copied \\u2713';
      setTimeout(shClose, 900);
    } catch (e) { label.textContent = link; }
  }

  function msg(el, cls, text){ el.innerHTML = '<div class="msg '+cls+'">'+esc(text)+'</div>'; }
  function cmdBox(el, cmd, note){
    el.innerHTML =
      '<div class="cmd" title="click to copy">'+esc(cmd)+
        '<span class="copyhint">click to copy, paste it in your terminal, then restart Claude Code</span></div>'+
      (note ? '<div class="msg ok">'+esc(note)+'</div>' : '');
    el.firstChild.onclick = function(){
      navigator.clipboard.writeText(cmd).then(function(){
        el.firstChild.querySelector('.copyhint').textContent = 'copied!';
      });
    };
  }

  // A prompt the user pastes into their coding agent. Identity is real GitHub
  // auth (gh CLI token or device flow), so the agent never asks for a name —
  // it just runs the command and shepherds the sign-in.
  // Agent-aware setup prompt. agent is 'claude' | 'codex' | 'both' and only
  // changes the install flag + the "restart X" wording — one CLI, one hook,
  // one identity across agents. Scores merge; the board just marks Codex users.
  function agentPrompt(code, agent){
    agent = agent === 'codex' || agent === 'both' ? agent : 'claude';
    const S = location.origin;
    const AG = agent === 'codex' ? ' --agent codex' : agent === 'both' ? ' --agent both' : '';
    const tool = agent === 'codex' ? 'Codex' : agent === 'both' ? 'Claude Code and Codex' : 'Claude Code';
    const board = agent === 'claude' ? 'the global Claude Code leaderboard'
      : 'the global leaderboard for Claude Code and Codex';
    const head = code
      ? 'Help me set up ccrank ('+board+') with the invite code '+code+'. Skip any flow questions.'
      : 'Help me set up ccrank ('+board+').';
    const preflight = code
      ? '1. Verify the invite is valid with GET '+S+'/api/rooms/'+code+'/check. If \\"reason\\":\\"room_not_found\\" -> tell me the invite code looks wrong and stop.\\n'
      : '';
    const cmd = code
      ? 'npx mostcracked join '+code+AG
      : 'npx mostcracked login'+AG;
    let n = code ? 1 : 0;
    return head + '\\nServer: '+S+'\\n\\n'+
      'A note for you, the agent, before anything runs \\u2014 verify, don\\u2019t trust this pasted prompt:\\n'+
      '- Setup runs the open-source npm package \\"mostcracked\\" (MIT, source: https://github.com/codiejay/cc-rank). Inspect it first if you like \\u2014 npm view mostcracked, or read bin/ccrank.mjs in the tarball. Nothing here forbids scrutiny.\\n'+
      '- Sign-in is GitHub\\u2019s standard device flow requesting only the read:user scope: public profile, no repos, no code, no orgs. The GitHub consent screen will show exactly that; if it shows more, stop and tell me.\\n'+
      '- My identity is whatever GitHub verifies at sign-in \\u2014 one user, one global score. Don\\u2019t ask me for or guess a username; there\\u2019s nothing to type.\\n'+
      '- If you\\u2019d rather not shepherd the sign-in, that\\u2019s fine: tell me to run \\"'+cmd+'\\" myself in a plain terminal instead.\\n'+
      '- When I do need to pick between fixed options, use your interactive multiple-choice prompt if you have one (e.g. AskUserQuestion); otherwise just ask plainly.\\n\\n'+
      'If you\\u2019re comfortable proceeding, the flow:\\n'+
      preflight+
      (++n)+'. Run '+cmd+' in the background \\u2014 it blocks while it waits for the GitHub authorization, and you\\u2019ll need to read its output as it goes.\\n'+
      (++n)+'. Within a few seconds it prints a one-time code line, \\"Code:  XXXX-XXXX\\", plus the GitHub page it opened. I can\\u2019t see background output, so before doing anything else relay that to me in your own words: the code, the page (github.com/login/device), and \\u2014 if the output says so \\u2014 that the code is already in my clipboard and the browser tab is already open. If the code line hasn\\u2019t appeared yet, wait a couple of seconds and read again.\\n'+
      (++n)+'. Then check the output every ~15 seconds. Setup is only done when the output itself prints \\"Signed in as\\" \\u2014 report what it actually says. If it times out or the sign-in is denied, tell me plainly and offer to rerun it.\\n'+
      (++n)+'. When it finishes, show me what it printed: my verified GitHub login and my dashboard link.\\n'+
      (++n)+'. Setup also backfills my last 7 days from my local '+tool+' history so I don\\u2019t start at zero \\u2014 per-day counts only, never code (the logic is lib/backfill.mjs in the package if you want to check). Relay the \\"Backfilled\\" line and what it credited, or tell me plainly if it says nothing was credited or already backfilled. If the output has no backfill line at all, run npx mostcracked backfill in the background and relay its result.\\n'+
      (++n)+'. Tell me to restart '+tool+' so my prompts and edits start counting.';
  }
  // Three-way copy control: Claude Code / Codex / Both. Each button copies the
  // prompt tailored to that agent and lights up as the active choice. codeExpr
  // is an invite-code expression (invite flow) or 'null' (get-on-board).
  function agentPicker(outId, codeExpr){
    const btn = function(ag, label, glyph){
      return '<button class="apick'+(ag==='claude'?' on':'')+'" data-agent="'+ag+'" '+
        'onclick="copyAgentFor(event,\\''+ag+'\\',\\''+outId+'\\','+codeExpr+')">'+glyph+label+'</button>';
    };
    const cc = '<svg class="apick-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
      '<path d="M5 16l4-4-4-4M11 17h7"/></svg>';
    const cx = '<span class="apick-ic apick-cx">'+openaiSvg()+'</span>';
    return '<div class="agentpick" role="group" aria-label="pick your coding agent">'+
      btn('claude', 'Claude Code', cc)+
      btn('codex', 'Codex', cx)+
      btn('both', 'Both', cc+cx)+
      '</div>'+
      '<div class="apickhint">Pick your agent \\u2014 it copies a setup prompt to paste into it.</div>';
  }
  let PICKED_AGENT = 'claude';
  function copyAgentFor(ev, agent, outId, code){
    PICKED_AGENT = agent;
    if (ev){ ev.preventDefault();
      const grp = ev.currentTarget.parentElement;
      if (grp) grp.querySelectorAll('.apick').forEach(function(b){
        b.classList.toggle('on', b.getAttribute('data-agent') === agent); });
    }
    const out = document.getElementById(outId);
    const label = agent === 'codex' ? 'Codex' : agent === 'both' ? 'Claude Code or Codex' : 'Claude Code';
    navigator.clipboard.writeText(agentPrompt(code || null, agent)).then(function(){
      msg(out, 'ok', 'Copied. Paste it into '+label+(code ? ' to join.' : '.'));
    }, function(){ msg(out, 'err', 'couldn\\u2019t copy. is the page focused?'); });
    return false;
  }

  // ---- chart: daily columns of stacked square dots -------------------------
  // Fluid: the number of days shown and the dot size grow with the card so the
  // chart always fills its width (the API sends up to 120 days).
  let DIMS = { avail: 760, weeks: 12, span: '', todayIso: '' };
  let MT = 15; // leaderboard meter ticks
  function measure(){
    const w = document.getElementById('content').clientWidth || 940;
    // The Activity card no longer spans the full row — it shares the grid with
    // the 340px rail (20px gap) above 960px viewport, and stacks full-width
    // below it. Subtract the rail there so the heatmap fits its real card and
    // today's column (far right) isn't pushed past the scroll edge.
    const rail = window.innerWidth > 960 ? 340 + 20 : 0;
    // 240 floor (not 380): phones are narrower than the old minimum, which
    // pushed the last heatmap column + month label past the card edge.
    DIMS.avail = Math.max(240, w - 64 /*content pad*/ - 44 /*card pad*/ - 42 /*y-axis*/ - rail);
    MT = w > 1250 ? 22 : w < 600 ? 9 : 15;
  }
  function seriesMap(series){
    const m = {};
    (series || []).forEach(function(r){
      m[r.day] = { p: r.prompts||0, e: r.edits||0, w: r.who||[], wm: r.whoMore||0 }; });
    return m;
  }
  function metricOf(v){ return metric === 'prompts' ? v.p : metric === 'edits' ? v.e : v.p + v.e; }
  // GitHub-style grid (columns are weeks, Sunday-first) — but launch-anchored,
  // not trailing. ccrank is new and we don't backfill, so a trailing year would
  // be months of pre-launch gray with today's data crushed against the right
  // edge. Instead the window opens at the launch month and runs 12 months
  // forward: the empty year ahead is the point — it's there to fill up.
  // Once history outgrows that (anchor below stops clamping to launch), the
  // window slides to "11 months back + the current month" and the chart
  // matures into the classic trailing-year graph on its own.
  const LAUNCH_UTC = Date.UTC(2026, 6, 1); // Jul 2026 — ccrank's first live month
  function monthYr(t){
    return new Date(t).toLocaleDateString('en-US',
      { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function heatWeeks(){
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const anchor = Math.max(LAUNCH_UTC,
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const a = new Date(anchor);
    const end = Date.UTC(a.getUTCFullYear() + 1, a.getUTCMonth(), 1) - 86400000;
    const firstSunday = anchor - a.getUTCDay()*86400000;
    const total = Math.ceil((end + 86400000 - firstSunday) / (7*86400000));
    const weeks = [];
    for (let w = 0; w < total; w++){
      const col = [];
      for (let d = 0; d < 7; d++){
        const t = firstSunday + (w*7 + d)*86400000;
        // outside the 12-month window (alignment padding) -> null -> invisible
        col.push(t < anchor || t > end ? null : new Date(t).toISOString().slice(0,10));
      }
      weeks.push(col);
    }
    DIMS.weeks = total;
    DIMS.span = monthYr(anchor)+' – '+monthYr(end);
    DIMS.todayIso = new Date(today).toISOString().slice(0,10);
    const cell = Math.min(20, Math.max(10, Math.floor(DIMS.avail / total) - 4));
    return { weeks: weeks, cell: cell, todayIso: DIMS.todayIso };
  }
  // Intensity levels like GitHub: quartiles of the non-zero days.
  function levelFor(val, q){
    if (!val) return 0;
    if (val <= q[0]) return 1;
    if (val <= q[1]) return 2;
    if (val <= q[2]) return 3;
    return 4;
  }
  let HEATSM = {};   // day -> {p,e,w,wm}; read by the tooltip on hover
  let chartAnimated = false; // entrance wave plays once, on the first mount
  let boardAnimated = false; // board rise/podium choreography — same deal
  function chartHtml(series){
    const sm = seriesMap(series);
    HEATSM = sm;
    const h = heatWeeks();
    const vals = [];
    h.weeks.forEach(function(col){ col.forEach(function(d){
      if (!d) return;
      const v = sm[d]; const x = v ? metricOf(v) : 0;
      if (x > 0) vals.push(x);
    }); });
    vals.sort(function(a,b){ return a-b; });
    const q = [ vals[Math.floor(vals.length*.25)] || 1,
                vals[Math.floor(vals.length*.5)]  || 2,
                vals[Math.floor(vals.length*.75)] || 3 ];
    const cols = h.weeks.map(function(col, wi){
      return '<div class="ccol">'+col.map(function(d, di){
        // diagonal wave: top-left tiles land first, sweeping to bottom-right
        if (!d) return '<i class="off" style="--i:'+(wi+di)+'"></i>';
        // future days render as empty cells (the year to fill), no tooltip
        if (d > h.todayIso) return '<i class="l0" style="--i:'+(wi+di)+'"></i>';
        const v = sm[d] || {p:0,e:0};
        return '<i class="l'+levelFor(metricOf(v), q)+'" style="--i:'+(wi+di)+
          '" data-d="'+d+'" data-p="'+v.p+'" data-e="'+v.e+'"></i>';
      }).join('')+'</div>';
    }).join('');
    // month labels above the first week-column of each month
    let months = '';
    let prev = '';
    h.weeks.forEach(function(col, wi){
      // first real day of the column (col[0] can be alignment padding)
      const d = col.find(function(x){ return x; }) || '';
      if (!d) return;
      const m = d.slice(0,7);
      if (m !== prev){ prev = m;
        if (wi < h.weeks.length - 1)
          months += '<span style="left:'+(wi/(h.weeks.length-1)*100).toFixed(2)+'%">'+
            new Date(d+'T00:00:00Z').toLocaleDateString('en-US',
              {month:'short', timeZone:'UTC'})+'</span>';
      }
    });
    const none = vals.length ? '' : '<div class="chna">no activity in this window yet</div>';
    const wd = ['','Mon','','Wed','','Fri',''];
    return '<div class="chartrow">'+
      '<div class="wdays">'+wd.map(function(l){ return '<span>'+l+'</span>'; }).join('')+'</div>'+
      // The wrapper gets the grid's exact pixel width (cols + gaps) so the
      // %-positioned month labels track the real columns even when the grid
      // overflows the card and scrolls — % of the visible width put "Jul…Jun"
      // in a crumpled heap on phones.
      '<div class="chartscroll"><div style="position:relative;padding-top:22px;min-width:100%;width:'+
          (h.weeks.length*h.cell + (h.weeks.length-1)*4)+'px">'+
        '<div class="months" style="top:0;height:18px;line-height:18px">'+months+'</div>'+
        '<div class="heat'+(chartAnimated ? '' : ' anim')+'" style="--cell:'+h.cell+'px" id="dotchart">'+cols+none+'</div>'+
        '<div class="tip" id="tip"></div>'+
      '</div></div></div>'+
      // legend sits outside the scroll strip — inside it, the year grid's
      // overflow pushed it past the card edge
      '<div class="heatfoot"><span>less</span>'+
        [0,1,2,3,4].map(function(l){ return '<i class="l'+l+'"></i>'; }).join('')+
        '<span>more</span></div>';
  }
  function bindChart(){
    const chart = document.getElementById('dotchart'), tip = document.getElementById('tip');
    if (!chart || !tip) return;
    if (chart.classList.contains('anim')){ // first mount only
      chartAnimated = true;
      // If the year grid overflows (phones), start scrolled so today — and the
      // lit history left of it — is in view instead of a random future month.
      const sc = chart.closest('.chartscroll');
      const t = sc && chart.querySelector('i[data-d="'+DIMS.todayIso+'"]');
      if (t && sc.scrollWidth > sc.clientWidth)
        sc.scrollLeft = Math.max(0, t.offsetLeft - sc.clientWidth + 40);
    }
    chart.addEventListener('mouseover', function(ev){
      const cell = ev.target.closest ? ev.target.closest('i[data-d]') : null;
      if (!cell) return;
      const d = cell.getAttribute('data-d'), p = +cell.getAttribute('data-p'), e = +cell.getAttribute('data-e');
      const nice = new Date(d+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      const v = HEATSM[d];
      let who = '';
      if (v && v.w && v.w.length){
        who = '<div class="tw">'+v.w.map(function(u){
          return '<span title="'+esc(u.login)+' \\u00B7 '+fmt(u.n)+' pts">'+avatar(u.login, u.avatar)+'</span>';
        }).join('')+
        (v.wm > 0 ? '<span class="twn">+'+v.wm+'</span>' : '')+'</div>';
      }
      tip.innerHTML = '<div class="d">'+nice+'</div><div class="v">'+fmt(p+e)+
        ' <small>pts &middot; '+fmt(p)+' prompts &middot; '+fmt(e)+' edits</small></div>'+who;
      // Keep the tip INSIDE the scroll container — anything outside its box
      // gets clipped by overflow and never shows.
      tip.style.display = 'block';
      const cr = chart.getBoundingClientRect(), r = cell.getBoundingClientRect();
      const x = r.left - cr.left + r.width/2;
      // Clamp by the tip's REAL half-width (it varies with the avatar row),
      // not a guess — otherwise the right edge clips it.
      const half = tip.offsetWidth / 2 + 6;
      tip.style.left = Math.max(half, Math.min(x, cr.width - half)) + 'px';
      // Hug the hovered cell: below it in the top half of the grid, above it
      // in the bottom half (the container clips anything past its edges).
      const cy = r.top - cr.top + 22; // wrapper has 22px padding-top
      if (r.top - cr.top < cr.height / 2){
        tip.style.top = (cy + r.height + 7) + 'px';
        tip.style.transform = 'translate(-50%,0)';
      } else {
        tip.style.top = (cy - 7) + 'px';
        tip.style.transform = 'translate(-50%,-100%)';
      }
    });
    chart.addEventListener('mouseleave', function(){ tip.style.display = 'none'; });
  }


  // ---- metric strip --------------------------------------------------------
  const ICONS = {
    score:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    prompts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/></svg>',
    edits:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4L8 20l-5 1 1-5L17 3z"/></svg>'
  };
  function last28(series, pick, back){
    const sm = seriesMap(series), now = Date.now();
    let s = 0;
    for (let i = 0; i < 28; i++){
      const d = new Date(now - (i + (back ? 28 : 0))*86400000).toISOString().slice(0,10);
      const v = sm[d]; if (v) s += pick(v);
    }
    return s;
  }
  function mcell(key, label, total, series, pick){
    const cur = last28(series, pick, false), prev = last28(series, pick, true);
    let d;
    if (!prev && !cur) d = '<span>quiet 4 wks</span>';
    else if (!prev) d = '<b class="pos">new</b> <span>this 4 wks</span>';
    else {
      const pc = Math.round((cur - prev) / prev * 100);
      d = '<b class="'+(pc >= 0 ? 'pos' : 'neg')+'">'+(pc >= 0 ? '+' : '')+pc+'%</b> <span>vs prior 4 wks</span>';
    }
    return '<button class="mcell'+(metric===key?' on':'')+'" onclick="setMetric(\\''+key+'\\')">'+
      '<span class="mlab"><span class="mico">'+ICONS[key]+'</span>'+label+'</span>'+
      '<span class="mnum">'+fmt(total)+'</span>'+
      '<span class="mdelta">'+d+'</span></button>';
  }
  function stripHtml(series, totals){
    return '<div class="mstrip">'+
      mcell('score', 'Score', totals.score, series, function(v){ return v.p + v.e; })+
      mcell('prompts', 'Prompts', totals.prompts, series, function(v){ return v.p; })+
      mcell('edits', 'Edits', totals.edits, series, function(v){ return v.e; })+
      '</div>';
  }
  function setMetric(m){ metric = m; lastKey = ''; paint(); }
  function setMode(m){ mode = m; lastKey = ''; paint(); }

  // ---- leaderboard ---------------------------------------------------------
  function meterHtml(score, max){
    const T = MT, W = 7; // tick count scales with viewport (see measure())
    const filled = (max > 0 && score > 0) ? Math.max(1, Math.round(score / max * T)) : 0;
    return '<div class="meter" style="width:'+(T*W-3)+'px" aria-hidden="true">'+
      '<i style="width:'+(filled ? filled*W-3 : 0)+'px"></i></div>';
  }
  // Crown for the #1 podium slot — solid concrete glyph, no sparkle.
  function crownSvg(){
    return '<svg viewBox="0 0 24 18" fill="currentColor" aria-hidden="true">'+
      '<path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"/>'+
      '<rect x="3.5" y="16" width="17" height="1.8" rx=".9"/></svg>';
  }
  // Codex mark: the official OpenAI logomark, shown next to any user whose
  // score includes OpenAI Codex sessions. The only cross-agent tell on the
  // board (scores themselves merge). Title = the hover explanation.
  // The official OpenAI logomark (one path), reused by the board mark and the
  // onboarding "Codex" button.
  function openaiSvg(){
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+
      '<path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>'+
      '</svg>';
  }
  function agentMark(r){
    if (!(r.agents || []).includes('codex')) return '';
    const both = (r.agents || []).includes('claude');
    const why = both
      ? 'Codes with OpenAI Codex and Claude Code \\u2014 this score is both combined.'
      : 'Codes with OpenAI Codex \\u2014 this score is from Codex sessions.';
    return '<span class="cxmark" tabindex="0" title="'+esc(why)+'" aria-label="'+esc(why)+'">'+
      openaiSvg()+'</span>';
  }
  // Earned-badge pills — each badge gets its own glyph (same set as the badge
  // study) and a hover blurb in the site voice explaining what it took.
  function bIco(paths){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '+
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  }
  // Tips are FIRST PERSON: hovering a badge makes the holder say it off their
  // avatar. Their brag, their mouth. No em dashes, ever.
  const BADGES = {
    oneshot:   { lb: 'one-shot chief', ico: bIco('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
                 tip: 'i barely prompt and Claude still does the most. best edits per prompt on the board. and no, not a lucky one-off.' },
    conductor: { lb: 'conductor', ico: bIco('<path d="M5 19 17 7"/><circle cx="18.5" cy="5.5" r="1.6"/>'),
                 tip: 'nobody sends more prompts than me. i stay in Claude\\u2019s ear.' },
    lifter:    { lb: 'heavy lifter', ico: bIco('<path d="M4 9v6M8 7v10M16 7v10M20 9v6M8 12h8"/>'),
                 tip: 'most lines changed, period. i ship big diffs, no fear.' },
    surgeon:   { lb: 'surgeon', ico: bIco('<path d="M19 5 7 17l-3 1 1-3L17 3z"/>'),
                 tip: 'tiny edits, every time. lowest lines per edit here. precision.' },
    streak:    { lb: 'streak', ico: bIco('<path d="M12 3c1 3-2 5-2 8a4 4 0 0 0 8 .5C18 8 16 5 12 3z"/>'),
                 tip: 'longest run of back-to-back days here. real days too, 10+ a day. no midnight one-prompt tricks.' },
    driver:    { lb: 'daily driver', ico: bIco('<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
                 tip: 'i show up the most days, full stop. streaks die. i don\\u2019t.' },
    bigday:    { lb: 'big day', ico: bIco('<path d="M4 20h16M6 20v-8M12 20V5M18 20v-6"/>'),
                 tip: 'the biggest single day anyone has put up on this board. mine. come and take it.' },
    owl:       { lb: 'night owl', ico: bIco('<path d="M20 13A8 8 0 1 1 11 4a6.5 6.5 0 0 0 9 9z"/>'),
                 tip: 'midnight to 5am is my time. sleep is for the ranked-below.' },
    weekend:   { lb: 'weekend warrior', ico: bIco('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>'),
                 tip: 'saturdays and sundays are when i do my damage.' },
    // not a held badge — a receipt. counts UTC days finished at #1.
    dayone:    { lb: 'day one',
                 ico: '<svg viewBox="0 0 24 18" fill="currentColor" aria-hidden="true">'+
                      '<path d="M2 6l4 4 6-8 6 8 4-4-2 11H4L2 6z"/></svg>',
                 tip: 'finished the day at #1. it\\u2019s written down. forever.' }
  };
  // records helper: day-end counts per badge key for a row ({key: n})
  function recNOf(r){
    const m = {};
    (r.records || []).forEach(function(x){ m[x.key] = x.n; });
    return m;
  }
  // ×N chip appended to a pill — only ever from ×2 up, a first win is just
  // the pill itself
  function xN(n){ return n >= 2 ? '<b class="awx">\\u00D7' + n + '</b>' : ''; }
  function awardsHtml(r){
    const rn = recNOf(r);
    return (r.awards || []).map(function(a){
      const b = BADGES[a.key];
      if (!b) return '';
      // bubble is spawned by the delegated hover handlers (awShow/awHide);
      // the label sits in .awlb so phones can go icon-only (aria-label keeps
      // the pill named for readers when the text is hidden)
      return '<span class="award" tabindex="0" data-bkey="'+esc(a.key)+'" aria-label="'+esc(a.label)+'">'+
        b.ico+'<span class="awlb">'+esc(a.label)+'</span>'+xN(rn[a.key])+'</span>';
    }).join('') + pastBtnHtml(r);
  }
  // The trophy case: EVERY day-end record the player has, held-now or not
  // (dayone always included — it's never "held"). Shown behind the shield so
  // rows stay tight; the dropdown lists ×N + last date, and tags current holds.
  function recordsOf(r){
    return (r.records || []).filter(function(x){ return BADGES[x.key]; })
      .sort(function(a, b){ return (a.key === 'dayone' ? -1 : b.key === 'dayone' ? 1 : b.n - a.n); });
  }
  // records for badges NOT currently held — the card modal's dimmed row
  function pastOf(r){
    const held = {};
    (r.awards || []).forEach(function(a){ held[a.key] = 1; });
    return recordsOf(r).filter(function(x){ return !held[x.key]; });
  }
  function shieldIco(){
    return bIco('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 11.5l2 2 4-4"/>');
  }
  function pastBtnHtml(r){
    const recs = recordsOf(r);
    if (!recs.length) return '';
    return '<button class="pastbtn" title="award record" aria-haspopup="true" '+
      'onclick="pastMenu(event, \\''+esc(r.login||r.name)+'\\')">'+
      shieldIco()+recs.length+'</button>';
  }
  let pmEl = null;
  function pmClose(){
    if (!pmEl) return;
    pmEl.remove(); pmEl = null;
    document.removeEventListener('click', pmDoc);
  }
  function pmDoc(ev){ if (pmEl && !pmEl.contains(ev.target)) pmClose(); }
  function pastMenu(ev, login){
    ev.preventDefault(); ev.stopPropagation();
    if (pmEl){ pmClose(); return; }
    const r = rowOf(login);
    const recs = r ? recordsOf(r) : [];
    if (!recs.length) return;
    const held = {};
    ((r && r.awards) || []).forEach(function(a){ held[a.key] = 1; });
    const el = document.createElement('div');
    el.className = 'pastmenu';
    el.innerHTML = '<div class="pmhd">'+esc(login)+' \\u00B7 award record</div>'+
      recs.map(function(x){
        const b = BADGES[x.key];
        return '<div class="pmrow"><span class="pmico">'+b.ico+'</span>'+esc(b.lb)+
          (held[x.key] ? '<span class="pmnow">now</span>' : '')+
          '<b class="pmx">\\u00D7'+x.n+'</b><span class="pmlast">'+esc(niceDay(x.last))+'</span></div>';
      }).join('');
    document.body.appendChild(el);
    const br = ev.currentTarget.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(br.left, innerWidth - el.offsetWidth - 8))+'px';
    el.style.top = (br.bottom + 7 + scrollY)+'px';
    pmEl = el;
    setTimeout(function(){ document.addEventListener('click', pmDoc); }, 0);
  }
  function niceDay(d){
    if (!d) return '';
    return new Date(d+'T00:00:00Z').toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  // find a row's live data by login — records are global, first hit wins
  function rowOf(login){
    const pools = [];
    if (GLOBAL){ pools.push(GLOBAL.allTime || []); pools.push(GLOBAL.today || []); }
    if (ROOM){ pools.push(ROOM.allTime || []); pools.push(ROOM.today || []); }
    for (var i = 0; i < pools.length; i++){
      const hit = pools[i].find(function(x){ return (x.login || x.name) === login; });
      if (hit) return hit;
    }
    return null;
  }
  // ---- badge speech bubble -------------------------------------------------
  // One bubble at a time, anchored to the badge HOLDER'S avatar with the tail
  // aimed at them. Delegated: board HTML is rebuilt on every poll repaint, so
  // per-pill listeners would be wiped; document-level survives.
  let awEl = null;
  function awShow(pill){
    const b = BADGES[pill.getAttribute('data-bkey')];
    const host = pill.closest('.pod') || pill.closest('.lrow');
    const av = host && host.querySelector('.ava');
    if (!b || !av) return;
    awHide();
    const el = document.createElement('div');
    el.className = 'awbub'; el.setAttribute('role', 'tooltip');
    el.innerHTML =
      '<span class="awtip-hd"><span class="awtip-ico">'+b.ico+'</span>'+
      '<span class="awtip-t">'+esc(b.lb || pill.textContent.trim())+'</span></span>'+
      '<span class="awtip-x">'+b.tip+'</span>';
    document.body.appendChild(el);
    const r = av.getBoundingClientRect();
    const x = Math.max(8, Math.min(r.left + r.width/2 - el.offsetWidth/2,
      innerWidth - el.offsetWidth - 8));
    let y = r.top - el.offsetHeight - 11;
    if (y < 8){ y = r.bottom + 11; el.classList.add('below'); }
    el.style.left = x+'px'; el.style.top = y+'px';
    el.style.setProperty('--tx', (r.left + r.width/2 - x)+'px');
    requestAnimationFrame(function(){ el.classList.add('on'); });
    awEl = el;
  }
  function awHide(){ if (awEl){ awEl.remove(); awEl = null; } }
  document.addEventListener('mouseover', function(ev){
    const p = ev.target.closest && ev.target.closest('.award');
    if (p) awShow(p);
  });
  document.addEventListener('mouseout', function(ev){
    if (ev.target.closest && ev.target.closest('.award')) awHide();
  });
  document.addEventListener('focusin', function(ev){
    const p = ev.target.closest && ev.target.closest('.award');
    if (p) awShow(p);
  });
  document.addEventListener('focusout', function(ev){
    if (ev.target.closest && ev.target.closest('.award')) awHide();
  });
  // fixed positioning goes stale the moment the page scrolls
  window.addEventListener('scroll', awHide, true);
  // Share button — YOUR cards only, global board only (the card shows your
  // GLOBAL rank; a room page would lie about the denominator).
  function shareBtnHtml(r, withRoom){
    const isMe = ME != null && r.id === ME;
    if (!isMe || !withRoom) return '';
    return '<button class="shbtn" title="share your card" '+
      'onclick="shMenu(event, \\''+esc(r.login||r.name)+'\\', '+r.rank+', '+r.score+')">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '+
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
        '<path d="M4 12v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-7M12 15V3M7.5 7.5 12 3l4.5 4.5"/>'+
      '</svg>share</button>';
  }
  // Duel button — every row gets one; opens the rival picker with this
  // player already in the left corner.
  function duelBtnHtml(login){
    return '<button class="duelbtn" title="duel '+esc(login)+'" '+
      'onclick="event.stopPropagation();duelPick(\\''+esc(login)+'\\')">'+
      fenceSvg()+'duel</button>';
  }
  // Top-3 podium: 2nd | 1st | 3rd, the leader centered and raised.
  function podiumHtml(top, withRoom){
    return '<div class="podium">'+top.map(function(r){
      const login = r.login || r.name;
      const isMe = ME != null && r.id === ME;
      const you = isMe ? '<span class="youbadge">you</span>' : '';
      return '<div class="pod pclk p'+r.rank+(isMe?' me':'')+'" style="--i:'+(r.rank-1)+'" '+
        'title="view '+esc(login)+'\\u2019s card" onclick="openCard(\\''+esc(login)+'\\','+r.score+')">'+
        '<span class="podcrown">'+crownSvg()+'</span>'+
        '<span class="podav">'+avatar(login, r.avatar)+
          '<span class="medal">'+r.rank+'</span></span>'+
        '<div class="podnm"><a href="https://github.com/'+encodeURIComponent(login)+
          '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="'+esc(login)+' on GitHub">'+esc(login)+'</a>'+you+agentMark(r)+shareBtnHtml(r, withRoom)+'</div>'+
        '<div class="podsc">'+fmt(r.score)+'</div>'+
        '<div class="podmeta"><span class="mseg">'+fmt(r.prompts)+' prompts \\u00B7 '+fmt(r.edits)+' edits</span>'+usageBit(r)+'</div>'+
        ((r.awards||[]).length ? '<div class="podawards">'+awardsHtml(r)+'</div>' : '')+
        '<div class="ped">'+r.rank+'</div>'+
      '</div>';
    }).join('')+'</div>';
  }
  // Podium for the top 3, plain rows for the rest; falls back to a flat list
  // when there aren't enough players to fill a podium.
  function boardHtml(rows, withRoom){
    if (!rows.length) return '<div class="lempty"><b>Nothing counted yet'+(mode==='today'?' today':'')+'.</b>'+
      '<span>Restart Claude Code and send a prompt. It shows up here in seconds.</span></div>';
    if (rows.length < 3) return rowsHtml(rows, withRoom);
    return podiumHtml(rows.slice(0, 3), withRoom)+
      (rows.length > 3 ? rowsHtml(rows.slice(3), withRoom, rows[0].score) : '');
  }
  function rowsHtml(rows, withRoom, maxScore){
    if (!rows.length) return '<div class="lempty"><b>Nothing counted yet'+(mode==='today'?' today':'')+'.</b>'+
      '<span>Restart Claude Code and send a prompt. It shows up here in seconds.</span></div>';
    const max = maxScore != null ? maxScore : rows[0].score;
    return rows.map(function(r, i){
      const streak = r.streak >= 2 ? '<span class="streak">\\uD83D\\uDD25 '+r.streak+'d</span>' : '';
      let delta = '';
      if (r.delta != null && r.delta > 0) delta = '<span class="delta up" title="up '+r.delta+' since yesterday">\\u25B2'+r.delta+'</span>';
      else if (r.delta != null && r.delta < 0) delta = '<span class="delta down" title="down '+(-r.delta)+' since yesterday">\\u25BC'+(-r.delta)+'</span>';
      const login = r.login || r.name;
      const isMe = ME != null && r.id === ME;
      const you = isMe ? '<span class="youbadge">you</span>' : '';
      // Whole row opens the share card; only the username escapes to GitHub.
      return '<div class="lrow lclk'+(isMe?' me':'')+'" style="--i:'+i+'" '+
        'title="view '+esc(login)+'\\u2019s card" onclick="openCard(\\''+esc(login)+'\\','+r.score+')">'+
        '<div class="rk'+(r.rank===1?' r1':'')+'">'+(r.rank<10?'0':'')+r.rank+'</div>'+
        avatar(login, r.avatar)+
        '<div><div class="nm"><a href="https://github.com/'+encodeURIComponent(login)+
        '" target="_blank" rel="noopener" style="text-decoration:none" onclick="event.stopPropagation()" title="'+esc(login)+' on GitHub">'+esc(login)+'</a>'+you+agentMark(r)+shareBtnHtml(r, withRoom)+duelBtnHtml(login)+awardsHtml(r)+streak+delta+'</div>'+
        '<div class="meta"><span class="mseg">'+fmt(r.prompts)+' prompts \\u00B7 '+fmt(r.edits)+' edits</span>'+usageBit(r)+'</div></div>'+
        meterHtml(r.score, max)+
        '<div class="sc">'+fmt(r.score)+'</div></div>';
    }).join('');
  }

  // ---- the weekly 25 -------------------------------------------------------
  // Global page only. Three states from /api/global's chart object: a quiet
  // "cooking" strip (tue-sat), the urgent lock strip (sunday), and the Monday
  // drop. Drop choreography (wash, crown, count-up, row cascade) plays once
  // per page load; poll repaints get the .quiet class, same pattern as the
  // board's rise animation.
  // The drop always starts COLLAPSED (just its masthead) on every load — the
  // chart is a click away, never remembered open. Expansion lives only for the
  // current page; a reload hides it again.
  let w25Animated = false, w25Expanded = false, w25Collapsed = true;

  function w25WeekLabel(week){
    const MO = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const a = new Date(week + 'T00:00:00Z');
    const b = new Date(a.getTime() + 6 * 86400000);
    const am = MO[a.getUTCMonth()], bm = MO[b.getUTCMonth()];
    return 'week of ' + am + ' ' + a.getUTCDate() + ' \\u2013 ' +
      (am === bm ? '' : bm + ' ') + b.getUTCDate();
  }
  function w25MvHtml(e){
    if (e.tag) return '<span class="w25mv"><span class="tagb">'+esc(e.tag)+'</span></span>';
    const m = e.movement;
    if (m == null || m === 0) return '<span class="w25mv flat">\\u2014</span>';
    if (m > 0) return '<span class="w25mv up" title="up '+m+' from last week">\\u25B2 '+m+'</span>';
    return '<span class="w25mv down" title="down '+(-m)+' from last week">\\u25BC '+(-m)+'</span>';
  }
  function w25MvText(e){
    if (e.tag === 'NEW') return 'new';
    if (e.tag === 'RE') return 're-entry';
    const m = e.movement;
    if (m == null || m === 0) return '\\u2014';
    return (m > 0 ? '\\u25B2' : '\\u25BC') + Math.abs(m);
  }
  // Is this chart login the current viewer? (login-based, mirrors w25Entry;
  // the leaderboard highlights by numeric id, but chart entries carry login.)
  function w25IsMe(login){
    return !!(ME_WHO && ME_WHO.login &&
      ME_WHO.login.toLowerCase() === String(login).toLowerCase());
  }
  function w25RowsHtml(chart){
    const entries = chart.entries.slice(1, w25Expanded ? 25 : 10);
    const max = chart.entries[0].score;
    return entries.map(function(e, i){
      const mine = w25IsMe(e.login);
      return '<div class="w25row'+(mine ? ' me' : '')+'" style="--d:'+(0.45 + i * 0.05).toFixed(2)+'s">'+
        '<span class="pos">'+(e.position < 10 ? '0' : '')+e.position+'</span>'+
        w25MvHtml(e)+
        avatar(e.login, e.avatar)+
        '<div class="who"><div class="nm"><a href="https://github.com/'+
          encodeURIComponent(e.login)+'" target="_blank" rel="noopener">'+esc(e.login)+'</a>'+
          (mine ? '<span class="youbadge">you</span>' : '')+'</div>'+
        '<div class="meta">'+fmt(e.prompts)+' prompts \\u00B7 '+fmt(e.edits)+' edits</div></div>'+
        '<span class="w25meter">'+meterHtml(e.score, max)+'</span>'+
        '<span class="hist">peak #'+e.peak+' \\u00B7 '+e.weeks+' wk'+(e.weeks > 1 ? 's' : '')+'</span>'+
        '<span class="sc">'+fmt(e.score)+'</span>'+
      '</div>';
    }).join('');
  }
  function w25Toggle(){
    const chart = GLOBAL && GLOBAL.chart;
    if (!chart || !(chart.entries || []).length) return;
    w25Expanded = !w25Expanded;
    const rows = document.getElementById('w25rows');
    const btn = document.getElementById('w25more');
    // Expansion re-renders inside the existing card — no full repaint, no
    // replayed choreography (rows come back quiet via the parent class).
    if (rows) rows.innerHTML = w25RowsHtml(chart);
    if (btn) btn.textContent = w25Expanded ? 'show top 10' : 'see all ' + chart.entries.length;
  }
  // Live countdown to the next drop (Monday 00:00 UTC). One interval per page;
  // it only touches the clock's text node, so it never fights paint().
  function w25NextDropMs(){
    const now = new Date();
    const days = (8 - now.getUTCDay()) % 7 || 7; // next Monday, never today
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days) - now.getTime();
  }
  function w25Clock(){
    let s = Math.max(0, Math.floor(w25NextDropMs() / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const p = function(n){ return (n < 10 ? '0' : '') + n; };
    const hms = p(Math.floor(s / 3600))+':'+p(Math.floor(s / 60) % 60)+':'+p(s % 60);
    return d > 0 ? d + 'd ' + hms : hms;
  }
  let w25Timer = null;
  function w25TickStart(){
    if (w25Timer) return;
    w25Timer = setInterval(function(){
      const el = document.getElementById('w25cd');
      if (el) el.textContent = w25Clock();
    }, 1000);
  }
  function w25CdHtml(lab){
    return '<span class="w25cdw"><span class="lab">'+lab+'</span>'+
      '<span class="cd" id="w25cd">'+w25Clock()+'</span></span>';
  }
  // force=true (the /chart page): always render the latest chart, whatever
  // the day-of-week state — the homepage keeps its Mon/Tue-only drop moment.
  function w25Html(chart, force){
    if (!chart) return '';
    const n = (chart.entries || []).length;
    if (!force && chart.state === 'locks_tonight')
      return '<div class="w25lock"><span class="sq"></span><div class="in">'+
        '<span><b>the weekly 25 locks tonight.</b> '+
        '<span class="sub">whatever the chart says at midnight, it says all week.</span></span>'+
        w25CdHtml('locks in')+'</div></div>';
    if (!force && chart.state !== 'dropped')
      return '<div class="w25tease"><span class="sq"></span>'+
        '<span class="tx"><b>the weekly 25</b> is cooking \\u00B7 '+
        '<span class="sub">every prompt this week is a chart position. top 25 make it.</span></span>'+
        w25CdHtml('drops in')+'</div>';
    if (!n)
      return '<div class="w25tease"><span class="sq"></span>'+
        '<span class="tx"><b>the weekly 25</b> \\u00B7 '+
        '<span class="sub">quiet week. nobody charted. this one\\u2019s wide open.</span></span>'+
        w25CdHtml('next drop')+'</div>';

    const e1 = chart.entries[0];
    const counts = n + ' charted' +
      (chart.debuts ? ' \\u00B7 ' + chart.debuts + ' debut' + (chart.debuts > 1 ? 's' : '') : '') +
      (chart.reentries ? ' \\u00B7 ' + chart.reentries + ' re-entr' + (chart.reentries > 1 ? 'ies' : 'y') : '');
    return '<section class="w25'+(w25Animated ? ' quiet' : '')+(w25Collapsed ? ' collapsed' : '')+'"><div class="w25card">'+
      '<div class="w25wash"><svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
        '<defs><filter id="w25f" x="-20%" y="-20%" width="140%" height="140%">'+
          '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="n"/>'+
          '<feDisplacementMap in="SourceGraphic" in2="n" scale="90"/>'+
          '<feGaussianBlur stdDeviation="9"/></filter>'+
        '<linearGradient id="w25g" x1="0" y1="0" x2="1" y2="1">'+
          '<stop class="wg1" offset="0" stop-color="#E89A72"/>'+
          '<stop class="wg2" offset="1" stop-color="#C05F33"/></linearGradient></defs>'+
        '<rect width="800" height="220" fill="url(#w25g)"/>'+
        '<g filter="url(#w25f)">'+
          '<ellipse class="wb wv1" cx="180" cy="60" rx="230" ry="70" fill="#F9F2E4" opacity=".5"/>'+
          '<ellipse class="wb wb2 wv2" cx="560" cy="160" rx="280" ry="80" fill="#A94E28" opacity=".75"/>'+
          '<ellipse class="wb wb3 wv3" cx="430" cy="40" rx="180" ry="55" fill="#FFF9EC" opacity=".35"/>'+
        '</g></svg>'+
        '<div class="w25head"><span class="k">the drop</span>'+
          '<h2>the weekly 25</h2>'+
          '<span class="d">'+w25WeekLabel(chart.week)+
            ' \\u00B7 the 25 most cracked claude coders alive</span>'+
          '<button class="w25collapse" onclick="w25CollapseToggle()" aria-label="show or hide the chart">'+
            (w25Collapsed ? '\\u25B8 show the 25' : '\\u25BE hide')+'</button></div>'+
      '</div>'+
      '<div class="w25no1">'+
        '<span class="avwrap"><span class="w25crown">'+crownSvg()+'</span>'+
          avatar(e1.login, e1.avatar)+'</span>'+
        '<div class="who"><div class="k">this week\\u2019s most cracked</div>'+
          '<div class="nm"><a href="https://github.com/'+encodeURIComponent(e1.login)+
            '" target="_blank" rel="noopener">'+esc(e1.login)+'</a>'+
            (w25IsMe(e1.login) ? '<span class="youbadge">you</span>' : '')+'</div>'+
          '<div class="meta">'+fmt(e1.prompts)+' prompts \\u00B7 '+fmt(e1.edits)+' edits \\u00B7 '+
            e1.weeks+' wk'+(e1.weeks > 1 ? 's' : '')+' on chart \\u00B7 peak #'+e1.peak+'</div></div>'+
        '<div class="scr"><b class="glint" id="w25score" data-n="'+e1.score+'">'+
          (w25Animated ? fmt(e1.score) : '0')+'</b>'+
          '<span>#1 \\u00B7 '+w25MvText(e1)+'</span></div>'+
      '</div>'+
      '<div id="w25rows">'+w25RowsHtml(chart)+'</div>'+
      '<div class="w25foot"><span>'+counts+' \\u00B7 new chart every monday</span>'+
        '<button onclick="w25CopyImg(this)" style="margin-left:auto">copy img</button>'+
        '<button onclick="w25DlImg(this)" style="margin-left:8px">download</button>'+
        '<button onclick="w25OpenX(this)" style="margin-left:8px">open X</button>'+
        (n > 10 ? '<button id="w25more" onclick="w25Toggle()" style="margin-left:8px">'+
          (w25Expanded ? 'show top 10' : 'see all ' + n)+'</button>' : '')+
      '</div>'+
    '</div></section>';
  }
  // Chart-level share: the Monday poster PNG (/og/chart.png). Three controls —
  // copy the image, download it, or copy-then-open-X. Same promise-flavored
  // ClipboardItem trick as the per-user share (keeps the gesture alive).
  // The poster URL, tagged with ?me=<login> when the viewer is on this chart so
  // the downloaded/copied PNG carries their "YOU" badge (server ignores a me
  // that isn't in the rendered top 10).
  function w25Img(){
    const mine = ME_WHO && ME_WHO.login && w25Entry(ME_WHO.login);
    return location.origin + '/og/chart.png' +
      (mine ? '?me=' + encodeURIComponent(ME_WHO.login) : '');
  }
  async function w25CopyImg(btn){
    const orig = btn.textContent;
    try {
      btn.textContent = 'copying\\u2026';
      const p = fetch(w25Img()).then(function(r){ if (!r.ok) throw 0; return r.blob(); });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]);
      btn.textContent = 'copied. go flex';
    } catch (e) { w25DlImg(btn); return; }
    setTimeout(function(){ btn.textContent = orig; }, 1800);
  }
  function w25DlImg(btn){
    const a = document.createElement('a');
    a.href = w25Img(); a.download = 'ccrank-weekly25.png';
    document.body.appendChild(a); a.click(); a.remove();
    if (btn){ const orig = btn.textContent; btn.textContent = 'downloaded';
      setTimeout(function(){ btn.textContent = orig; }, 1800); }
  }
  async function w25OpenX(btn){
    const orig = btn.textContent;
    let copied = false;
    try {
      btn.textContent = 'copying\\u2026';
      const p = fetch(w25Img()).then(function(r){ if (!r.ok) throw 0; return r.blob(); });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': p })]);
      copied = true;
    } catch (e) {}
    const text = 'the weekly 25 just dropped. the 25 most cracked claude coders alive, '+
      'new every monday.\\n\\n'+location.origin+'/chart';
    const w = window.open('https://x.com/intent/post?text='+encodeURIComponent(text),
      '_blank', 'noopener');
    btn.textContent = copied ? (w ? 'copied. paste it in your post' : 'copied. click again for X')
      : (w ? orig : 'click again for X');
    setTimeout(function(){ btn.textContent = orig; }, 2400);
  }
  // Collapse the whole drop down to just its masthead. The flag is read back in
  // w25Html so a poll repaint keeps it collapsed instead of springing open.
  // Opening tiles the body in; closing tiles it OUT first, then lands
  // display:none once the animation finishes (display can't itself animate).
  function w25CollapseToggle(){
    w25Collapsed = !w25Collapsed;
    const sec = document.querySelector('.w25');
    const btn = document.querySelector('.w25collapse');
    if (btn) btn.textContent = w25Collapsed ? '\\u25B8 show the 25' : '\\u25BE hide';
    if (!sec) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (w25Collapsed){
      // Closing: play the reverse cascade, keep the body visible through it,
      // then hide. reduced-motion collapses instantly.
      sec.classList.remove('w25reveal');
      if (reduce){ sec.classList.add('collapsed'); return; }
      sec.classList.remove('w25collapsing');
      void sec.offsetWidth;
      sec.classList.add('w25collapsing');
      setTimeout(function(){
        // Only land the hide if we're still meant to be collapsed (guards a
        // fast re-open that flipped the flag back mid-animation).
        if (w25Collapsed){ sec.classList.add('collapsed'); }
        sec.classList.remove('w25collapsing');
      }, 460);
    } else {
      // Opening: reveal immediately, replay the tile-in cascade. Strip the
      // class after so a poll repaint doesn't leave it dangling.
      sec.classList.remove('w25collapsing');
      sec.classList.remove('collapsed');
      sec.classList.remove('w25reveal');
      void sec.offsetWidth;
      sec.classList.add('w25reveal');
      setTimeout(function(){ sec.classList.remove('w25reveal'); }, 1500);
    }
  }
  // Count the #1 score up from 0 on the first drop render of this page load.
  function w25AfterPaint(){
    w25TickStart(); // live countdown in the tease/lock strips
    const el = document.getElementById('w25score');
    if (!el || w25Animated){ w25Animated = w25Animated || !!el; return; }
    w25Animated = true;
    const target = Number(el.getAttribute('data-n')) || 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches){
      el.textContent = fmt(target); return;
    }
    const t0 = performance.now(), dur = 1100, delay = 500;
    (function tick(t){
      const p = Math.min(1, Math.max(0, (t - t0 - delay) / dur));
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  // ---- right-rail cards ----------------------------------------------------
  // Abstract Claude starburst — irregular tapering rays around a hollow core.
  function claudeBurst(cls){
    const rays = [[0,30],[27,22],[58,33],[86,24],[113,30],[144,21],[172,32],[199,25],[228,31],[257,22],[286,33],[316,24],[341,28]];
    return '<svg class="'+cls+'" viewBox="0 0 100 100" fill="none" stroke="currentColor" '+
      'stroke-width="6" stroke-linecap="round" aria-hidden="true">'+
      rays.map(function(r){
        return '<line x1="50" y1="34" x2="50" y2="'+(34-r[1])+'" transform="rotate('+r[0]+' 50 50)" />';
      }).join('')+'</svg>';
  }
  // A tiny Claude Code session on loop: launch, paste, you're on the board.
  function termDemo(){
    return '<div class="term" aria-hidden="true">'+
      '<div class="term-bar"><i class="r"></i><i class="y"></i><i class="g"></i>'+
        '<span>claude code</span></div>'+
      '<div class="term-body">'+
        '<span class="tl"><span class="ps">$</span> <b class="t1">claude</b></span>'+
        '<span class="tl"><span class="ps">&gt;</span> <b class="t2">paste the setup prompt</b></span>'+
        '<span class="tl done"><span class="ck">&#10003;</span> you&rsquo;re on the board<span class="caret"></span></span>'+
      '</div></div>';
  }
  function onboardCard(){
    // Known viewer (?me= / localStorage) -> greet them instead of pitching setup.
    const who = ME_WHO && ME_WHO.login ? ME_WHO : null;
    const head = who ? 'You&rsquo;re in as @'+esc(who.login) : 'Get on the board';
    const tag  = who ? 'Signed in' : 'Start here';
    const hint = who
      ? 'Your prompts and edits are scoring on the global board. Keep shipping.'
      : 'One prompt in Claude Code sets this up. Sign in with GitHub (real auth, no typed names) and you&rsquo;re on the global board with every ccrank user.';
    return '<section class="onboard"><div class="onb-in">'+
      '<div class="onb-head">'+claudeBurst('burst-ico')+'<h3>'+head+'</h3>'+
      '<span class="onb-tag">'+tag+'</span></div>'+
      '<div class="pad">'+(who ? '' : termDemo())+
      '<p class="hint">'+hint+'</p>'+
      agentPicker('aOut', 'null')+
      '<div id="aOut" style="margin-bottom:10px"></div>'+
      '</div></div></section>';
  }
  function howCard(){
    return '<section class="card"><div class="cardhead"><h3>How scoring works</h3></div>'+
      '<div class="pad" style="padding-top:6px">'+
      '<div class="scorehow"><kbd>prompt sent</kbd> to Claude Code <span class="pt">+1</span></div>'+
      '<div class="scorehow"><kbd>file edited</kbd> by Claude <span class="pt">+1</span></div>'+
      '<div class="scorehow" style="color:var(--muted)">counts only. your code never leaves your machine</div>'+
      '</div></section>';
  }
  // The code starts behind a frosted-glass veil (anti shoulder-surf /
  // screenshare) — one click melts the glass, then the box is click-to-copy.
  let revealed = false;
  function inviteCard(){
    return '<section class="card"><div class="cardhead"><h3>Invite a friend</h3></div>'+
      '<div class="pad">'+
      '<div class="codebox'+(revealed ? ' open' : '')+'" onclick="copyCode()" '+
        (revealed ? 'title="click to copy"' : '')+'><div class="c codeval">'+esc(CODE)+'</div>'+
        '<div class="h" id="codeHint">invite code &middot; click to copy</div>'+
        (revealed ? '' : '<div class="veil"><button class="reveal" '+
          'onclick="revealCode(event)">Reveal code</button></div>')+
      '</div>'+
      agentPicker('rOut', 'CODE')+
      '<div id="rOut"></div>'+
      '</div></section>';
  }
  function revealCode(e){
    e.stopPropagation();
    revealed = true;
    const box = document.querySelector('.codebox');
    if (!box) return;
    box.classList.add('open');
    box.title = 'click to copy';
    const v = box.querySelector('.veil');
    if (v) setTimeout(function(){ v.remove(); }, 500); // after the melt animation
  }
  function copyCode(){
    if (!revealed) return; // veil intercepts clicks anyway; belt and braces
    navigator.clipboard.writeText(CODE).then(function(){
      document.getElementById('codeHint').textContent = 'copied!';
      setTimeout(function(){
        const el = document.getElementById('codeHint');
        if (el) el.innerHTML = 'invite code &middot; click to copy';
      }, 1500);
    });
  }
  const RACECOLORS = ['var(--accent)', 'var(--amber)', 'var(--up)'];
  function raceCard(today){
    const top = today.slice(0, 3).filter(function(r){ return r.score > 0; });
    const tot = today.reduce(function(s, r){ return s + r.score; }, 0);
    let body;
    if (!top.length){
      body = '<div class="none">No points yet today. The first prompt takes the lead.</div>';
    } else {
      body = top.map(function(r, i){
        const pc = Math.round(r.score / tot * 100);
        const T = 38, filled = Math.max(1, Math.round(pc / 100 * T));
        return '<div class="racerow"><div class="racetop">'+esc(r.name)+
          '<span class="pc" style="color:'+RACECOLORS[i]+'">'+pc+'%</span></div>'+
          '<div class="racebar"><i style="width:'+(filled*7-3)+'px;background:repeating-linear-gradient(90deg,'+
          RACECOLORS[i]+' 0 4px,transparent 4px 7px)"></i></div></div>';
      }).join('');
    }
    return '<section class="card"><div class="cardhead"><h3>Today&rsquo;s race</h3>'+
      '<span class="sub right">share of points</span></div><div class="race">'+body+'</div></section>';
  }

  // ---- sidebar + topbar ----------------------------------------------------
  // Rooms this browser has PROVEN it can reach (visited /r/CODE at least
  // once). Codes are join credentials — they only ever come from the user
  // having typed/followed one, never from an API keyed on public identity.
  function knownRooms(){
    try { return JSON.parse(localStorage.getItem('ccrank_rooms') || '{}'); }
    catch { return {}; }
  }
  function rememberRoom(code, name){
    try {
      const m = knownRooms();
      if (m[name] === code) return;
      m[name] = code;
      localStorage.setItem('ccrank_rooms', JSON.stringify(m));
      renderSide(); // sidebar links light up immediately
    } catch { /* storage unavailable — sidebar stays static */ }
  }
  function renderSide(){
    document.getElementById('navHome').className = 'nav' + (CODE || CHARTPG ? '' : ' on');
    document.getElementById('navChart').className = 'nav' + (CHARTPG ? ' on' : '');
  }
  function renderTop(){
    const crumb = document.getElementById('crumb');
    if (NOTFOUND) crumb.innerHTML = 'Not found';
    // Never render the invite code in the crumb — it's a join credential and
    // the topbar is on screen through every screenshare. Sharing happens via
    // the invite card's deliberate frosted-glass reveal only.
    else if (CODE && ROOM) crumb.innerHTML = esc(ROOM.room.name);
    else if (CODE) crumb.textContent = 'Board';
    else if (DUEL) crumb.textContent = 'Duel';
    else if (CHARTPG) crumb.textContent = 'the weekly 25';
    else crumb.textContent = 'Global';
    document.getElementById('segAll').className = mode==='allTime' ? 'on' : '';
    document.getElementById('segToday').className = mode==='today' ? 'on' : '';
  }

  // ---- duel: the challenge feature ---------------------------------------
  // Any two players on the board can be put head to head at /duel/<a>-vs-<b>.
  // Six stats are rated 45-99 against the current board leader (FUT-style),
  // the winner takes the most stats; ties break on overall. Every number comes
  // from the same board payload the leaderboard uses - nothing extra to fetch.
  const DSTATS = [
    { k: 'PMT', lab: 'prompts',       f: function(r){ return r.prompts || 0; } },
    { k: 'EDT', lab: 'edits',         f: function(r){ return r.edits || 0; } },
    { k: 'LNS', lab: 'lines shipped', f: function(r){ return r.lines || 0; } },
    { k: 'BRN', lab: '~$ burned',     f: function(r){ return r.usd || 0; } },
    { k: 'STK', lab: 'win streak',    f: function(r){ return r.streak || 0; } },
    { k: 'REC', lab: 'receipts',      f: function(r){ return dRecs(r); } }
  ];
  const DWEIGHT = { PMT: .22, EDT: .22, LNS: .18, BRN: .14, STK: .12, REC: .12 };
  // Fencing: two crossed foils with bell guards — the white-jacket, masked
  // sword sport. Used for every duel affordance so the action reads instantly.
  function fenceSvg(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 3.6 14.2 14.8"/><path d="M21 3.6 9.8 14.8"/>' +
      '<circle cx="15.2" cy="15.8" r="1.9"/><circle cx="8.8" cy="15.8" r="1.9"/>' +
      '<path d="M16.5 17.1 19 19.6"/><path d="M7.5 17.1 5 19.6"/>' +
      '<path d="M17.6 20.7 20.9 17.4"/><path d="M6.4 20.7 3.1 17.4"/></svg>';
  }
  function dRecs(r){
    return (r.records || []).reduce(function(t, x){ return t + (x.n || 0); }, 0);
  }
  let dMaxMemo = null, dMaxKey = '';
  function dMax(k){
    const rows = (GLOBAL && GLOBAL.allTime) || [];
    const key = rows.length + ':' + ((rows[0] && rows[0].score) || 0);
    if (dMaxKey !== key){
      dMaxKey = key; dMaxMemo = {};
      DSTATS.forEach(function(st){
        dMaxMemo[st.k] = Math.max.apply(null, [1].concat(rows.map(st.f)));
      });
    }
    return dMaxMemo[k] || 1;
  }
  function dRate(r, st){
    return Math.round(45 + 54 * Math.sqrt(Math.min(1, st.f(r) / dMax(st.k))));
  }
  function dOvr(r){
    return Math.round(DSTATS.reduce(function(t, st){
      return t + dRate(r, st) * DWEIGHT[st.k]; }, 0));
  }
  function dRole(r){
    const p = r.prompts || 0, e = r.edits || 0, l = r.lines || 0;
    if (l / Math.max(1, e) >= 60) return 'HEAVY LIFTER';
    const ratio = e / Math.max(1, p);
    return ratio >= 2.4 ? 'ONE-SHOT' : ratio <= 1.4 ? 'CONDUCTOR' : 'ENGINE';
  }
  const DSTYLE = { 'ONE-SHOT': 'Explosive', 'CONDUCTOR': 'Orchestral',
                   'ENGINE': 'Relentless', 'HEAVY LIFTER': 'Massive' };

  // The card frame. The silhouette is the real FUT cut, traced off the article
  // itself: half the outline in points, mirrored in code so it can never go
  // lopsided. viewBox is 540x820 (the card's own aspect), which is also the
  // coordinate space every label below is positioned in, so the whole face
  // scales from one width and nothing needs a second set of numbers.
  const DHALF = [[226.1,14.8],[207.7,16.5],[184,20],[166.4,23.5],[144.4,28.8],[133,32.3],
    [112.8,39.3],[95.3,46.4],[83.9,53.4],[82.1,56.9],[82.1,62.2],[80.3,69.2],[76.8,78],
    [71.6,86.8],[66.3,93.8],[61,99],[53.1,104.3],[47,107.8],[36.4,111.3],[24.1,113.6],
    [20,118],[20,660],[21.5,682.1],[22.4,689.2],[25.9,696.2],[30.3,703.2],[38.2,710.2],
    [51.4,717.3],[73.3,724.3],[96.1,731.3],[117.2,738.3],[139.2,745.4],[159.4,752.4],
    [179.6,759.4],[197.1,766.4],[213.8,773.5],[229.6,780.5],[241.9,787.5],[254.2,794.5],
    [263,801.6],[269.1,806.8],[270,809]];
  const DOUT = DHALF.concat(DHALF.slice(0, -1).reverse().map(function(p){ return [540 - p[0], p[1]]; }));
  const DSHIELD = 'M' + DOUT.map(function(p){ return p[0] + ' ' + p[1]; }).join('L') + 'Z';
  // The same outline as a CSS mask, so the portrait and the glare sheet get cut
  // to the card instead of overhanging its notched shoulders.
  const DMASK = "url('data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 820" preserveAspectRatio="none">' +
    '<path d="' + DSHIELD + '" fill="#000"/></svg>') + "')";
  // Where the top (portrait) half hands over to the bottom (name + stats) half.
  const DSPLIT = 390;
  // Two finishes, one per corner: the challenger's gold and the champion's dark
  // — same DNA as the board (gold / coral), so a duel reads at a glance which
  // numbers on the scoreline belong to which card.
  const DTONE = {
    a: { up1:'#EEDF9C', up2:'#B9A250', lo1:'#FCF1A8', lo2:'#DDBE5C',
         ink:'#3A2F0D', rule:'rgba(58,47,13,.5)', rim:'#8E7126', rim2:'rgba(255,247,205,.7)',
         seam:'rgba(255,250,214,.85)',
         glow:'rgba(243,214,121,.34)', vig1:'rgba(243,214,121,.22)', vig2:'rgba(140,104,26,.5)',
         wm:'rgba(58,47,13,.085)', mk1:'#4A3C0E', mk2:'#7A6414' },
    b: { up1:'#453626', up2:'#231A11', lo1:'#2B2117', lo2:'#120D07',
         ink:'#F0CE84', rule:'rgba(235,205,91,.4)', rim:'#E6B655', rim2:'rgba(0,0,0,.55)',
         seam:'rgba(235,205,91,.55)',
         glow:'rgba(217,119,87,.4)', vig1:'rgba(217,119,87,.20)', vig2:'rgba(38,17,8,.58)',
         wm:'rgba(240,206,132,.055)', mk1:'#8A7A5E', mk2:'#D97757' }
  };
  // The house mark, drawn once at whatever size the caller wants.
  function dMarkSvg(c1, c2){
    return '<svg viewBox="106 106 300 300" aria-hidden="true">' +
      '<g fill="' + c1 + '"><rect x="118" y="318" width="76" height="76" rx="19"/>' +
      '<rect x="118" y="218" width="76" height="76" rx="19"/>' +
      '<rect x="318" y="318" width="76" height="76" rx="19"/></g>' +
      '<g fill="' + c2 + '"><rect x="218" y="318" width="76" height="76" rx="19"/>' +
      '<rect x="218" y="218" width="76" height="76" rx="19"/>' +
      '<rect x="218" y="118" width="76" height="76" rx="19"/></g></svg>';
  }
  function dFrameSvg(id, t){
    // the house mark, blown up and knocked back — the watermark the portrait sits on
    const wm = '<g transform="translate(75,52) scale(1.3)" fill="' + t.wm + '">' +
      [[12,212],[12,112],[212,212],[112,212],[112,112],[112,12]].map(function(p){
        return '<rect x="' + p[0] + '" y="' + p[1] + '" width="76" height="76" rx="19"/>'; }).join('') +
      '</g>';
    return '<svg class="fcsvg" viewBox="0 0 540 820" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="fu' + id + '" x1="0" y1="0" x2=".42" y2="1">' +
        '<stop offset="0" stop-color="' + t.up1 + '"/>' +
        '<stop offset="1" stop-color="' + t.up2 + '"/></linearGradient>' +
      '<linearGradient id="fl' + id + '" x1="0" y1="0" x2=".92" y2="1">' +
        '<stop offset="0" stop-color="' + t.lo1 + '"/>' +
        '<stop offset="1" stop-color="' + t.lo2 + '"/></linearGradient>' +
      '<linearGradient id="fh' + id + '" x1="0" y1="1" x2="1" y2="0">' +
        '<stop offset=".22" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset=".5" stop-color="#fff" stop-opacity=".14"/>' +
        '<stop offset=".78" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="fk' + id + '"><path d="' + DSHIELD + '"/></clipPath>' +
      '</defs>' +
      '<g clip-path="url(#fk' + id + ')">' +
        '<rect width="540" height="' + (DSPLIT + 1) + '" fill="url(#fu' + id + ')"/>' +
        '<rect y="' + DSPLIT + '" width="540" height="' + (820 - DSPLIT) + '" fill="url(#fl' + id + ')"/>' +
        '<rect y="' + (DSPLIT - 1.2) + '" width="540" height="2.4" fill="' + t.seam + '" opacity=".55"/>' +
        wm +
        '<rect width="540" height="820" fill="url(#fh' + id + ')"/>' +
      '</g>' +
      '<path d="' + DSHIELD + '" fill="none" stroke="' + t.rim + '" stroke-width="7" opacity=".7"/>' +
      '<path d="' + DSHIELD + '" fill="none" stroke="' + t.rim2 + '" stroke-width="1.6"/>' +
      '</svg>';
  }
  // Stat plate: three across, twice down, so the eye reads a row of the card
  // rather than two stacked columns.
  const DSTX = [25, 50, 75];
  const DSTY = [71.4, 80.8];
  function futCardHtml(r, won, tone){
    const t = DTONE[tone];
    const id = tone + String(r.login).replace(/[^a-zA-Z0-9]/g, '');
    const rule = function(l, top, w){
      return '<i class="fcrule" style="left:' + l + '%;top:' + top + '%;width:' + w +
        '%;height:.32cqw"></i>'; };
    const vrule = function(l, top, h){
      return '<i class="fcrule" style="left:' + l + '%;top:' + top + '%;width:.32cqw;height:' +
        h + '%"></i>'; };
    let st = '';
    DSTY.forEach(function(top, row){
      DSTX.forEach(function(left, col){
        const s = DSTATS[row * 3 + col];
        st += '<span class="fcink fcst" style="left:' + left + '%;top:' + top + '%"><b>' +
          dRate(r, s) + '</b><i>' + s.k + '</i></span>';
      });
    });
    // long logins would run off the plate — shrink to fit rather than clip
    const nm = String(r.login).replace(/[-_].*$/, '').slice(0, 13);
    const nsz = (nm.length > 7 ? 11 * 7 / nm.length : 11).toFixed(2);
    const src = r.avatar || ('https://github.com/' + encodeURIComponent(r.login) + '.png?size=200');
    return '<div class="fc ' + tone + (won ? ' win' : '') + '" style="--fcmask:' + DMASK +
        ';--fcink:' + t.ink + ';--fcrule:' + t.rule + ';--fcglow:' + t.glow +
        ';--fcvig1:' + t.vig1 + ';--fcvig2:' + t.vig2 + '">' +
      dFrameSvg(id, t) +
      '<div class="fcav"><div class="fcav1"><div class="fcav2"><div class="fcav3">' +
        '<img src="' + esc(src) + '" alt="" loading="lazy" />' +
        '<div class="fcavig"></div></div></div></div></div>' +
      '<span class="fcink fcovr">' + dOvr(r) + '</span>' +
      '<span class="fcink fcovrl">OVR · #' + (r.rank || '-') + '</span>' +
      vrule(34.6, 50.6, 15) +
      '<span class="fcink fcname" style="font-size:' + nsz + 'cqw">' + esc(nm) + '</span>' +
      '<span class="fcink fcrole">' + dRole(r) + '</span>' +
      rule(10, 67, 80) + st +
      vrule(37.5, 69.8, 17.4) + vrule(62.5, 69.8, 17.4) +
      '<span class="fcmark">' + dMarkSvg(t.mk1, t.mk2) + '</span>' +
      '<div class="fcglare"></div>' +
    '</div>';
  }
  // Both players' rating shapes in ONE hexagon rather than two side by side —
  // the whole point of a duel is the overlap, and you can't see overlap when
  // the shapes live in different boxes.
  function dRadarSvg(A, B){
    const C = 110, CY = 104, R = 66;
    const at = function(i, k){
      const a = (-90 + i * 60) * Math.PI / 180;
      return [(C + Math.cos(a) * R * k).toFixed(1), (CY + Math.sin(a) * R * k).toFixed(1)];
    };
    const ring = function(k){
      return [0,1,2,3,4,5].map(function(i){ return at(i, k).join(','); }).join(' '); };
    const shape = function(r, col, dash){
      const pts = DSTATS.map(function(s, i){
        return at(i, Math.max(.14, Math.min(1, (dRate(r, s) - 40) / 59))); });
      return '<polygon points="' + pts.map(function(p){ return p.join(','); }).join(' ') +
        '" fill="' + col + '" fill-opacity=".14" stroke="' + col + '" stroke-width="2" ' +
        'stroke-linejoin="round"' + (dash ? ' stroke-dasharray="5 3.5"' : '') + '/>' +
        pts.map(function(p){
          return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.7" fill="' + col + '"/>';
        }).join('');
    };
    return '<svg class="dradar" viewBox="0 0 220 208" role="img" ' +
        'aria-label="rating shapes, both players">' +
      '<style>.drlab{font:800 8px var(--mono);letter-spacing:.14em;fill:var(--muted)}</style>' +
      [.34, .67, 1].map(function(k){
        return '<polygon points="' + ring(k) + '" fill="none" stroke="var(--line2)" ' +
          'stroke-width="1" opacity="' + (k === 1 ? '.9' : '.5') + '"/>'; }).join('') +
      [0,1,2].map(function(i){
        const p = at(i, 1), q = at(i + 3, 1);
        return '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] +
          '" stroke="var(--line2)" stroke-width="1" opacity=".4"/>'; }).join('') +
      shape(B, 'var(--accent)', true) + shape(A, 'var(--gold)', false) +
      DSTATS.map(function(s, i){
        const p = at(i, 1.28);
        const anc = i === 0 || i === 3 ? 'middle' : (i === 1 || i === 2 ? 'start' : 'end');
        return '<text x="' + p[0] + '" y="' + (+p[1] + 3) + '" text-anchor="' + anc +
          '" class="drlab">' + s.k + '</text>'; }).join('') + '</svg>';
  }
  function futColHtml(r, won, tone){
    const pills = (r.awards || []).slice(0, 6).map(function(a){
      const bd = BADGES[a.key];
      return bd ? '<span class="award">' + bd.ico + esc(a.label) + '</span>' : ''; }).join('');
    return '<div class="fcol">' + futCardHtml(r, won, tone) +
      '<div class="fcsub"><span class="handle">@' + esc(r.login) + ' · <b>' + dRole(r) +
      '</b> · ' + DSTYLE[dRole(r)] + '</span>' +
      (pills ? '<div class="fcpills">' + pills + '</div>' : '') +
      '<button class="fcsave" data-login="' + esc(r.login) + '" data-tone="' + tone +
        '" onclick="dSaveCard(this)">' + dlSvg() + '<span>Save card</span></button>' +
      '</div></div>';
  }
  // ---- save card as PNG ----------------------------------------------------
  // The DOM card can't be screenshotted from JS, so the export rebuilds it as
  // ONE self-contained SVG in the same 540x820 space every label already lives
  // in (same numbers, no second layout), with the portrait and the webfont
  // inlined as data URIs, then rasterises it at 2x through a canvas.
  function dlSvg(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  }
  async function dDataUrl(url){
    const b = await (await fetch(url)).blob();
    return await new Promise(function(res, rej){
      const fr = new FileReader();
      fr.onload = function(){ res(fr.result); };
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  }
  // Saira Condensed 600/700/800, latin cut, as inline @font-face — an SVG
  // rendered through an <img> can't reach the network, so the bytes ride along.
  let dFontCssCache = null;
  async function dFontCss(){
    if (dFontCssCache !== null) return dFontCssCache;
    try {
      const css = await (await fetch('https://fonts.googleapis.com/css2' +
        '?family=Saira+Condensed:wght@600;700;800&display=swap')).text();
      const out = [];
      const re = /\\/\\* latin \\*\\/\\s*@font-face\\s*\\{([^}]+)\\}/g;
      let m;
      while ((m = re.exec(css))){
        const w = (m[1].match(/font-weight:\\s*(\\d+)/) || [])[1];
        const u = (m[1].match(/url\\((https:[^)]+\\.woff2)\\)/) || [])[1];
        if (!w || !u) continue;
        out.push('@font-face{font-family:SairaC;font-style:normal;font-weight:' + w +
          ';src:url(' + (await dDataUrl(u)) + ') format("woff2")}');
      }
      dFontCssCache = out.join('');
    } catch (e){ dFontCssCache = ''; } // offline: system condensed steps in
    return dFontCssCache;
  }
  function dCardSvg(r, tone, avatar, fontCss){
    const t = DTONE[tone];
    const pc = function(x, y){ return [(x / 100 * 540).toFixed(1), (y / 100 * 820).toFixed(1)]; };
    const F = "font-family:'SairaC','Saira Condensed','Arial Narrow',sans-serif";
    const txt = function(x, y, size, weight, s, extra){
      return '<text x="' + x + '" y="' + y + '" style="' + F + ';font-weight:' + weight +
        ';font-size:' + size + 'px;fill:' + t.ink + '"' + (extra || '') + '>' + s + '</text>';
    };
    // avatar box: .fcav1 = left 11cqw, top 6cqw, 78cqw square (cqw = 5.4px)
    const ax = 59.4, ay = 32.4, aw = 421.2;
    const nm = String(r.login).replace(/[-_].*$/, '').slice(0, 13);
    const nsz = (nm.length > 7 ? 11 * 7 / nm.length : 11) * 5.4;
    let st = '';
    DSTY.forEach(function(top, row){
      DSTX.forEach(function(left, col){
        const s = DSTATS[row * 3 + col];
        const p = pc(left, top);
        st += '<text x="' + p[0] + '" y="' + (+p[1] + 39.5) + '" text-anchor="middle" style="' +
          F + ';fill:' + t.ink + '">' +
          '<tspan style="font-weight:800;font-size:46.4px">' + dRate(r, s) + '</tspan>' +
          '<tspan dx="8.6" style="font-weight:600;font-size:33.5px;letter-spacing:1.7px" ' +
            'opacity=".76">' + s.k + '</tspan></text>';
      });
    });
    const rrect = function(x, y, w, h){
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
        '" fill="' + t.rule + '"/>'; };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="540" height="820" viewBox="0 0 540 820">' +
      '<style>' + fontCss + '</style>' +
      '<defs>' +
        '<clipPath id="xshield"><path d="' + DSHIELD + '"/></clipPath>' +
        // the three portrait feathers, multiplied by nesting the masks
        '<radialGradient id="xgr" gradientUnits="userSpaceOnUse" cx="' + (ax + aw * .5) +
          '" cy="' + (ay + aw * .44) + '" r="' + (aw * .8) + '" ' +
          'gradientTransform="translate(' + (ax + aw * .5) + ' 0) scale(.775 1) translate(-' +
            (ax + aw * .5) + ' 0)">' +
          '<stop offset=".62" stop-color="#fff"/><stop offset=".88" stop-color="#fff" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<linearGradient id="xgh" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".16" stop-color="#fff"/>' +
          '<stop offset=".84" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<linearGradient id="xgv" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset=".01" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/>' +
          '<stop offset=".76" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<radialGradient id="xvig" cx=".52" cy=".4" r=".74">' +
          '<stop offset=".46" stop-color="#000" stop-opacity="0"/>' +
          '<stop offset=".78" stop-color="' + t.vig1 + '"/>' +
          '<stop offset="1" stop-color="' + t.vig2 + '"/>' +
        '</radialGradient>' +
        '<mask id="xm1"><rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + aw +
          '" fill="url(#xgr)"/></mask>' +
        '<mask id="xm2"><rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + aw +
          '" fill="url(#xgh)" mask="url(#xm1)"/></mask>' +
        '<mask id="xm3"><rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + aw +
          '" fill="url(#xgv)" mask="url(#xm2)"/></mask>' +
      '</defs>' +
      dFrameSvg('X', t).replace('class="fcsvg"', 'width="540" height="820"') +
      '<g clip-path="url(#xshield)" mask="url(#xm3)">' +
        (avatar ? '<image href="' + avatar + '" x="' + ax + '" y="' + ay + '" width="' + aw +
          '" height="' + aw + '" preserveAspectRatio="xMidYMid slice"/>' : '') +
        '<rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + aw +
          '" fill="url(#xvig)"/>' +
      '</g>' +
      txt(67.5, 406.7, 102.6, 700, dOvr(r), ' dominant-baseline="text-before-edge" letter-spacing="-1"') +
      txt(72.4, 521.5, 23.8, 800, 'OVR \\u00B7 #' + (r.rank || '-'),
        ' dominant-baseline="text-before-edge" letter-spacing="3.8" opacity=".62"') +
      rrect(186.8, 415, 1.7, 123) +
      txt(207.9, 413.3, nsz, 800, esc(nm.toUpperCase()),
        ' dominant-baseline="text-before-edge" letter-spacing="' + (nsz * .035).toFixed(1) + '"') +
      txt(210.6, 488.7, 30.2, 600, dRole(r),
        ' dominant-baseline="text-before-edge" letter-spacing="3" opacity=".74"') +
      rrect(54, 549.4, 432, 1.7) + st +
      rrect(202.5, 572.4, 1.7, 142.7) + rrect(337.5, 572.4, 1.7, 142.7) +
      '<g transform="translate(248.4,733.1) scale(.144 .1476)" opacity=".8">' +
        // dMarkSvg's viewBox is 106..406: shift into place, then scale 300->43.2x44.3
        '<g transform="translate(-106,-106)">' +
        dMarkSvg(t.mk1, t.mk2).replace('<svg viewBox="106 106 300 300" aria-hidden="true">', '')
          .replace('</svg>', '') +
        '</g></g>' +
      '</svg>';
  }
  async function dSaveCard(btn){
    const login = btn.getAttribute('data-login');
    const tone = btn.getAttribute('data-tone');
    const r = rowOf(login);
    if (!r || btn.classList.contains('busy')) return;
    btn.classList.add('busy');
    try {
      const src = r.avatar || ('https://github.com/' + encodeURIComponent(login) + '.png?size=400');
      let avatar = '';
      try { avatar = await dDataUrl(src); } catch (e){} // no portrait beats no card
      const svg = dCardSvg(r, tone, avatar, await dFontCss());
      const img = new Image();
      await new Promise(function(res, rej){
        img.onload = res; img.onerror = rej;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      const cv = document.createElement('canvas');
      cv.width = 1080; cv.height = 1640;
      const ctx = cv.getContext('2d');
      // solid stage behind the shield: WhatsApp & co. flatten PNG alpha to
      // white, so a transparent surround ships ugly. Same dark as the poster.
      ctx.fillStyle = '#16130E';
      ctx.fillRect(0, 0, 1080, 1640);
      ctx.drawImage(img, 0, 0, 1080, 1640);
      const blob = await new Promise(function(res){ cv.toBlob(res, 'image/png'); });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = login + '-mostcracked-card.png';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    } catch (e){
      console.log('[card export] failed', e);
    } finally {
      btn.classList.remove('busy');
    }
  }

  // ---- save the duel as one poster ----------------------------------------
  // Both cards on a dark 1920x1080 stage: eyebrow, the two names around a big
  // VS, the diagonal blade, final score, handles, site mark. Reuses dCardSvg
  // for each card — ids get a per-side suffix so the two shields' gradients
  // and masks can't collide inside one SVG document.
  function dCardNested(r, tone, avatar, side, x, y, w, h){
    return dCardSvg(r, tone, avatar, '')
      .replace(/(id="|#)x(shield|gr|gh|gv|vig|m1|m2|m3)/g, '$1x' + side + '$2')
      .replace(/(id="|#)f([ulhk])X/g, '$1f$2X' + side)
      .replace('<svg xmlns="http://www.w3.org/2000/svg" width="540" height="820"',
        '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"');
  }
  function dDuelSvg(A, B, avA, avB, fontCss, sc){
    const F = "font-family:'SairaC','Saira Condensed','Arial Narrow',sans-serif";
    const name = function(login, anchor, x, fill){
      const s = String(login).toUpperCase();
      const fs = Math.min(60, Math.round(60 * 13 / Math.max(13, s.length)));
      return '<g transform="translate(' + x + ' 158) skewX(-8)">' +
        '<text text-anchor="' + anchor + '" style="' + F + ';font-weight:800;font-size:' +
        fs + 'px;fill:' + fill + '" letter-spacing="1.5">' + esc(s) + '</text></g>';
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">' +
      '<style>' + fontCss + '</style>' +
      '<defs>' +
        '<radialGradient id="pemb" cx=".5" cy=".45" r=".62">' +
          '<stop offset="0" stop-color="#D97757" stop-opacity=".16"/>' +
          '<stop offset="1" stop-color="#D97757" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="pvs" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset=".18" stop-color="#FFD98A"/><stop offset=".42" stop-color="#E0A32E"/>' +
          '<stop offset=".62" stop-color="#D97757"/><stop offset=".88" stop-color="#FF9E77"/>' +
        '</linearGradient>' +
        '<linearGradient id="pblade" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#E0A32E" stop-opacity="0"/>' +
          '<stop offset=".32" stop-color="#E0A32E"/><stop offset=".68" stop-color="#D97757"/>' +
          '<stop offset="1" stop-color="#D97757" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      '<rect width="1920" height="1080" fill="#16130E"/>' +
      '<rect width="1920" height="1080" fill="url(#pemb)"/>' +
      // the blade yields to the scoreline: two segments, gap over "4 - 0"
      '<g transform="translate(960 585) rotate(18)" fill="url(#pblade)">' +
        '<rect x="-2.5" y="-430" width="5" height="445"/>' +
        '<rect x="-2.5" y="175" width="5" height="255"/></g>' +
      '<text x="960" y="78" text-anchor="middle" style="' + F + ';font-weight:700;font-size:26px' +
        ';fill:#D97757" letter-spacing="9">MOSTCRACKED DUEL</text>' +
      name(A.login, 'end', 900, '#E8B84B') +
      name(B.login, 'start', 1020, '#E28763') +
      dCardNested(A, 'a', avA, 'A', 180, 200, 500, 759) +
      dCardNested(B, 'b', avB, 'B', 1240, 200, 500, 759) +
      '<g transform="translate(960 560) skewX(-12) rotate(-3)">' +
        '<text text-anchor="middle" style="' + F + ';font-weight:800;font-size:180px' +
        ';fill:url(#pvs)">VS</text></g>' +
      '<text x="960" y="680" text-anchor="middle" style="' + F + ';font-weight:800;font-size:84px' +
        ';fill:#F4EFE5">' + sc.wa + ' \\u2013 ' + sc.wb + '</text>' +
      '<text x="960" y="726" text-anchor="middle" style="' + F + ';font-weight:600;font-size:22px' +
        ';fill:#8B867B" letter-spacing="5">ACROSS SIX ROUNDS</text>' +
      '<text x="430" y="1006" text-anchor="middle" style="' + F + ';font-weight:600;font-size:27px' +
        ';fill:rgba(232,184,75,.8)" letter-spacing="2">@' + esc(A.login) + '</text>' +
      '<text x="1490" y="1006" text-anchor="middle" style="' + F + ';font-weight:600;font-size:27px' +
        ';fill:rgba(226,135,99,.85)" letter-spacing="2">@' + esc(B.login) + '</text>' +
      '<text x="960" y="1048" text-anchor="middle" style="' + F + ';font-weight:600;font-size:24px' +
        ';fill:#6B665B" letter-spacing="7">MOSTCRACKED.COM</text>' +
      '</svg>';
  }
  async function dSaveDuel(btn){
    if (!DUEL || btn.classList.contains('busy')) return;
    const A = rowOf(DUEL.a), B = rowOf(DUEL.b);
    if (!A || !B) return;
    btn.classList.add('busy');
    try {
      const av = async function(r){
        try {
          return await dDataUrl(r.avatar ||
            ('https://github.com/' + encodeURIComponent(r.login) + '.png?size=400'));
        } catch (e){ return ''; }
      };
      const svg = dDuelSvg(A, B, await av(A), await av(B), await dFontCss(),
        duelScore || { wa: 0, wb: 0 });
      const img = new Image();
      await new Promise(function(res, rej){
        img.onload = res; img.onerror = rej;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      const cv = document.createElement('canvas');
      cv.width = 2400; cv.height = 1350;
      cv.getContext('2d').drawImage(img, 0, 0, 2400, 1350);
      const blob = await new Promise(function(res){ cv.toBlob(res, 'image/png'); });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = A.login + '-vs-' + B.login + '-duel.png';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    } catch (e){
      console.log('[duel export] failed', e);
    } finally {
      btn.classList.remove('busy');
    }
  }

  // 3D tilt + glare that tracks the pointer (desktop only, pure cosmetics).
  function bindDuelTilt(){
    document.querySelectorAll('.fc').forEach(function(card){
      card.onmousemove = function(e){
        const b = card.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
        card.style.transform = 'perspective(950px) rotateY(' + ((x - .5) * 9).toFixed(2) +
          'deg) rotateX(' + ((.5 - y) * 9).toFixed(2) + 'deg)';
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
      };
      card.onmouseleave = function(){ card.style.transform = ''; };
    });
  }
  function duelHtml(){
    const rows = (GLOBAL && GLOBAL.allTime) || [];
    const A = rowOf(DUEL.a), B = rowOf(DUEL.b);
    if (!A || !B){
      const miss = !A ? DUEL.a : DUEL.b;
      return '<section class="card"><div class="duelempty"><b>' + esc(miss) +
        '</b> isn’t on the board yet.<br><a href="/">Back to the leaderboard</a></div></section>';
    }
    const ra = DSTATS.map(function(s){ return dRate(A, s); });
    const rb = DSTATS.map(function(s){ return dRate(B, s); });
    let wa = 0, wb = 0;
    ra.forEach(function(v, i){ if (v > rb[i]) wa++; else if (v < rb[i]) wb++; });
    const aWins = wa === wb ? dOvr(A) >= dOvr(B) : wa > wb;
    const ta = ra.reduce(function(x, y){ return x + y; }, 0);
    const tb = rb.reduce(function(x, y){ return x + y; }, 0);
    const pa = Math.round(100 * ta / (ta + tb));
    const bars = DSTATS.map(function(s, i){
      const side = ra[i] > rb[i] ? 'a' : ra[i] < rb[i] ? 'b' : 't';
      return '<div class="dsrow" data-win="' + side + '"><span class="dsv a' +
          (side === 'a' ? ' w' : '') + '">' + ra[i] + '<i class="pip"></i></span>' +
        '<span class="dsbar l"><i data-w="' + ra[i] + '"></i></span>' +
        '<span class="dslab">' + s.k + '</span>' +
        '<span class="dsbar r"><i data-w="' + rb[i] + '"></i></span>' +
        '<span class="dsv b' + (side === 'b' ? ' w' : '') + '"><i class="pip"></i>' +
          rb[i] + '</span></div>'; }).join('');
    const recs = DSTATS.map(function(s){
      const va = s.f(A), vb = s.f(B);
      const shown = function(v){ return s.k === 'BRN' ? '~$' + Math.round(v) :
        s.k === 'STK' ? v + 'd' : fmt(v); };
      return '<div class="drecrow"><b class="l' + (va >= vb ? ' win' : '') + '">' + shown(va) + '</b>' +
        '<span class="c">' + s.lab + '</span>' +
        '<b class="r' + (vb >= va ? ' win' : '') + '">' + shown(vb) + '</b></div>'; }).join('');
    const winner = aWins ? A : B;
    // each corner of the poster: name, then how they got here
    const corner = function(side, r){
      return '<button class="dcorner ' + side + '" data-who="' + esc(r.login) + '">' +
        '<span class="duelname">' + esc(r.login) + '</span>' +
        '<span class="seed">Global #' + (r.rank || '-') + ' · ' + dOvr(r) + ' OVR</span>' +
        '</button>'; };
    // How it was settled, in the language of the game: a clean stat win, or a
    // dead-level six that overall rating had to break.
    const drawn = wa === wb;
    duelScore = { wa: wa, wb: wb, pa: pa };
    return '<section class="duelpg">' +
      '<div class="duelhd"><div class="deyebrow">mostcracked duel</div><div class="dband">' +
          corner('a', A) + '<span class="vsbolt"><b>VS</b></span>' + corner('b', B) +
        '</div></div>' +
      '<div class="duelstage">' +
        '<div class="dcol-a">' + futColHtml(A, aWins, 'a') + '</div>' +
        '<div class="dmid">' +
          '<div class="dft">Full time · six rounds</div>' +
          '<div class="dscore"><span id="dscA">0</span><em>–</em><span id="dscB">0</span></div>' +
          '<div class="dpips">' + DSTATS.map(function(s, i){
            return '<i class="dpip" data-win="' + (ra[i] > rb[i] ? 'a' : ra[i] < rb[i] ? 'b' : 't') +
              '" title="' + s.lab + '"></i>'; }).join('') + '</div>' +
          '<div class="ddomhd"><span class="a">' + pa + '%</span>' +
            '<span class="lab">Dominance</span>' +
            '<span class="b">' + (100 - pa) + '%</span></div>' +
          '<div class="ddom"><i id="ddomBar" data-w="' + pa + '%"></i></div>' +
          '<div class="dradarwrap">' + dRadarSvg(A, B) + '</div>' +
          '<div class="dsrows">' + bars + '</div>' +
          '<div class="dwin dreveal"><div class="dft">' +
              (drawn ? 'After penalties' : 'Most cracked') + '</div>' +
            '<div class="dwinname' + (aWins ? '' : ' b') + '">' + esc(winner.login) + '</div>' +
            '<div class="dwinsub">' + (drawn
              ? 'dead level — ' + dOvr(winner) + ' OVR settles it from the spot'
              : wa + '–' + wb + ' across the six stats') + '</div></div>' +
          '<div class="drec dreveal"><div class="dreccap">— The receipts —</div>' + recs + '</div>' +
          '<div class="dreveal">' +
            '<button class="dshare" onclick="dShare(event)">' + shareSvg() +
              '<span>Share the duel</span></button>' +
            '<button class="dshare ghost" onclick="dSaveDuel(this)">' + dlSvg() +
              '<span>Save the duel card</span></button>' +
            '<div class="dactions">' +
              '<button class="dbtn" onclick="dPick()">' + fenceSvg() + '<span>New rival</span></button>' +
              '<button class="dbtn" onclick="dSwap()">' + swapSvg() + '<span>Swap corners</span></button>' +
              '<button class="dbtn dback">' + backSvg() + '<span>The board</span></button>' +
            '</div>' +
          '</div>' +
          '<div id="dpick"></div>' +
        '</div>' +
        '<div class="dcol-b">' + futColHtml(B, !aWins, 'b') + '</div>' +
      '</div>' + duelInviteHtml() + '</section>';
  }
  function shareSvg(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
      '<path d="M8.6 13.5 15.4 17.5"/><path d="M15.4 6.5 8.6 10.5"/></svg>';
  }
  function swapSvg(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 8h13l-3.5-3.5"/><path d="M20 16H7l3.5 3.5"/></svg>';
  }
  function backSvg(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>';
  }
  // The conversion moment: a stranger landed here from a shared link. Getting a
  // card runs entirely through the agent prompt — nobody types a command.
  function duelInviteHtml(){
    return '<section class="dinv">' +
      '<div class="dinv-eyebrow">Your turn</div>' +
      '<h2 class="dinv-h">No card. No comeback.</h2>' +
      '<p class="dinv-sub">Get on the board and you get your own card, same six stats. ' +
        'Then send the link back and let the numbers do the trash talk.</p>' +
      '<ol class="dinv-steps">' +
        '<li><b>1</b><span>Copy the prompt below. One click, nothing to read.</span></li>' +
        '<li><b>2</b><span>Paste it into Claude Code or Codex. It sets itself up.</span></li>' +
        '<li><b>3</b><span>Your card goes live. Pick a target and duel back.</span></li>' +
      '</ol>' +
      '<div class="dinv-cta">' + agentPicker('dinvOut', 'null') +
        '<div id="dinvOut" class="dinv-out"></div></div>' +
      '<p class="dinv-foot">Only counts leave your machine. ' +
        'Never your code, your prompts, or your file contents.</p>' +
    '</section>';
  }
  // Round-by-round reveal: the six stats land one at a time, the winner's
  // number pops, the LOSER's card takes a hit (shake), and the score ticks up.
  // Plays once per load; a poll repaint lands on the finished state instead of
  // replaying it. Reduced motion jumps straight to the result.
  let duelAnimated = false, duelScore = { wa: 0, wb: 0, pa: 50 };
  function duelPlay(wa, wb, pa){
    const rows = [].slice.call(document.querySelectorAll('.dsrow'));
    const scA = document.getElementById('dscA'), scB = document.getElementById('dscB');
    const cards = document.querySelectorAll('.fc');
    const pips = [].slice.call(document.querySelectorAll('.dpip'));
    const finish = function(){
      if (scA) scA.textContent = wa;
      if (scB) scB.textContent = wb;
      rows.forEach(function(r){ r.classList.add('on'); });
      pips.forEach(function(p){ p.classList.add('on'); });
      document.querySelectorAll('.dsbar i').forEach(function(el){
        el.style.width = ((+el.getAttribute('data-w') - 40) / 59 * 100) + '%'; });
      const db = document.getElementById('ddomBar');
      if (db) db.style.width = pa + '%';
      document.querySelectorAll('.dreveal').forEach(function(el){ el.classList.add('shown'); });
    };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (duelAnimated || reduced || !rows.length) return finish();
    duelAnimated = true;
    let a = 0, b = 0, i = 0;
    const step = function(){
      if (i >= rows.length){
        setTimeout(function(){
          const db = document.getElementById('ddomBar');
          if (db) db.style.width = pa + '%';
          document.querySelectorAll('.dreveal').forEach(function(el, n){
            setTimeout(function(){ el.classList.add('shown'); }, n * 130);
          });
        }, 260);
        return;
      }
      const row = rows[i], side = row.getAttribute('data-win');
      row.classList.add('on');
      if (pips[i]) pips[i].classList.add('on');
      row.querySelectorAll('.dsbar i').forEach(function(el){
        el.style.width = ((+el.getAttribute('data-w') - 40) / 59 * 100) + '%'; });
      // the punch lands a beat after the bars start moving
      setTimeout(function(){
        if (side === 't'){ row.classList.add('even'); }
        else {
          const win = row.querySelector(side === 'a' ? '.dsv:first-child' : '.dsv:last-child');
          if (win) win.classList.add('hit');
          const loser = cards[side === 'a' ? 1 : 0];
          if (loser){
            loser.classList.add('shake');
            setTimeout(function(){ loser.classList.remove('shake'); }, 460);
          }
          if (side === 'a'){ a++; if (scA){ scA.textContent = a; bump(scA); } }
          else { b++; if (scB){ scB.textContent = b; bump(scB); } }
        }
      }, 300);
      i++;
      setTimeout(step, 640);
    };
    setTimeout(step, 420);
  }
  function bump(el){
    el.classList.remove('bump');
    void el.offsetWidth; // restart the animation
    el.classList.add('bump');
  }
  // Clicking either name opens that player's card, right here, no navigation.
  document.addEventListener('click', function(ev){
    if (!ev.target.closest) return;
    if (ev.target.closest('.dback')) return duelNav('/', null);
    const b = ev.target.closest('.dcorner');
    if (!b) return;
    const r = rowOf(b.getAttribute('data-who'));
    if (r) openCard(r.login, r.score || 0);
  });
  function dSwap(){
    goDuel(DUEL.b, DUEL.a);
    return false;
  }
  function dShare(ev){
    // the label lives in a <span> next to the icon — swap only that, so the
    // icon survives the "Copied!" flash
    const btn = ev && ev.currentTarget;
    const lab = btn && (btn.querySelector('span') || btn);
    const url = location.origin + '/duel/' + encodeURIComponent(DUEL.a) + '-vs-' + encodeURIComponent(DUEL.b);
    const flash = function(t){
      if (!lab) return;
      const was = lab.textContent; lab.textContent = t;
      setTimeout(function(){ lab.textContent = was; }, 1600);
    };
    navigator.clipboard.writeText(url).then(function(){ flash('Copied!'); },
      function(){ flash('Couldn\u2019t copy'); });
  }
  // Opponent picker: the board, minus whoever is already in this duel.
  function dPick(){
    const host = document.getElementById('dpick');
    if (!host) return;
    if (host.innerHTML){ host.innerHTML = ''; return; }
    // "someone else" means neither of the two already in this duel
    const rows = ((GLOBAL && GLOBAL.allTime) || []).filter(function(r){
      return r.login !== DUEL.a && r.login !== DUEL.b; }).slice(0, 24);
    host.innerHTML = '<div class="chalgrid">' + rows.map(function(r){
      return '<button class="chal" data-foe="' + esc(r.login) + '">' +
        avatar(r.login, r.avatar) + esc(r.login) +
        '<span class="r">' + dOvr(r) + '</span></button>'; }).join('') + '</div>';
    host.querySelectorAll('.chal').forEach(function(btn){
      btn.addEventListener('click', function(){
        goDuel(DUEL.a, btn.getAttribute('data-foe'));
      });
    });
  }
  // "Duel" from a profile card: challenger is the signed-in viewer when we know
  // them (?me=), otherwise the board leader, so the link always works.
  function duelFrom(login){
    const rows = (GLOBAL && GLOBAL.allTime) || [];
    const me = (ME_WHO && ME_WHO.login) || null;
    // Looking at someone else and we know who you are -> you vs them.
    if (me && me !== login) return goDuel(me, login);
    // Looking at your OWN card -> the rivalry that actually motivates: the
    // player one rung above you. At #1 there's nobody above, so take the chaser.
    const i = rows.findIndex(function(r){ return r.login === login; });
    const foe = i > 0 ? rows[i - 1] : rows[i + 1] || rows.find(function(r){ return r.login !== login; });
    if (!foe) return;
    goDuel(login, foe.login);
  }
  // "duel" on a leaderboard row: this player takes the left corner, the modal
  // lists everyone else on the board to fill the right one. If the viewer is
  // on the board (and isn't the challenger) they float to the top — the duel
  // you actually want is almost always "them vs me".
  let dpkEl = null;
  function dpkClose(){
    if (!dpkEl) return;
    dpkEl.remove(); dpkEl = null;
    document.removeEventListener('keydown', dpkKey);
  }
  function dpkKey(ev){ if (ev.key === 'Escape') dpkClose(); }
  function duelPick(login){
    dpkClose();
    const me = (ME_WHO && ME_WHO.login) || null;
    let rows = ((GLOBAL && GLOBAL.allTime) || []).filter(function(r){
      return r.login !== login; });
    if (me && me !== login){
      rows = rows.filter(function(r){ return r.login === me; })
        .concat(rows.filter(function(r){ return r.login !== me; }));
    }
    const list = rows.length ? rows.map(function(r){
      return '<button class="dpk-row" data-foe="'+esc(r.login)+'">'+
        avatar(r.login, r.avatar)+
        '<span class="who"><b>'+esc(r.login)+(me === r.login ? ' \\u00B7 you' : '')+'</b>'+
        '<span>Global #'+(r.rank || '-')+' \\u00B7 '+fmt(r.score)+' pts</span></span>'+
        '<span class="ovr">'+dOvr(r)+' OVR</span></button>';
    }).join('') : '<div class="dpk-empty">Nobody else on the board yet.</div>';
    const m = document.createElement('div');
    m.className = 'dpk';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', 'pick a rival for '+login);
    m.innerHTML = '<div class="dpk-panel">'+
      '<div class="dpk-hd">'+fenceSvg()+
        '<span class="t"><b>Pick a rival</b><span>'+esc(login)+' vs \\u2026</span></span>'+
        '<button class="dpk-x" aria-label="close">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '+
          'stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>'+
      '</div>'+
      '<div class="dpk-list">'+list+'</div></div>';
    m.addEventListener('click', function(ev){
      if (ev.target === m) return dpkClose();
      if (ev.target.closest('.dpk-x')) return dpkClose();
      const btn = ev.target.closest('.dpk-row');
      if (!btn) return;
      const foe = btn.getAttribute('data-foe');
      dpkClose();
      goDuel(login, foe);
    });
    document.body.appendChild(m);
    dpkEl = m;
    document.addEventListener('keydown', dpkKey);
    requestAnimationFrame(function(){ m.classList.add('on'); });
  }
  // Hero action. Signed in (we learn who you are from the ?me= link the CLI
  // opens): you vs a random player. Otherwise two random players, so a stranger
  // still sees what a duel looks like before installing anything.
  function duelRandom(){
    const rows = ((GLOBAL && GLOBAL.allTime) || []).filter(function(r){ return (r.score || 0) > 0; });
    if (rows.length < 2) return;
    const me = (ME_WHO && ME_WHO.login) || null;
    const mine = me && rows.some(function(r){ return r.login === me; });
    if (mine){
      const foes = rows.filter(function(r){ return r.login !== me; });
      return goDuel(me, foes[Math.floor(Math.random() * foes.length)].login);
    }
    const i = Math.floor(Math.random() * rows.length);
    let j = Math.floor(Math.random() * (rows.length - 1));
    if (j >= i) j++;
    goDuel(rows[i].login, rows[j].login);
  }
  function goDuel(a, b){
    duelNav('/duel/' + encodeURIComponent(a) + '-vs-' + encodeURIComponent(b), { a: a, b: b });
  }
  // Client-side navigation. The duel is just another view of the board data we
  // already hold, so there is nothing to fetch — swap the state, push the URL
  // (so refresh/share/back still work), and repaint. duelAnimated resets, so
  // every new match plays its rounds out instead of snapping to the result.
  function duelNav(url, duel){
    if (cardEl) closeCard();
    DUEL = duel;
    duelAnimated = false;
    try { history.pushState({ duel: duel }, '', url); } catch (e) {}
    lastKey = '';
    paint();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (e) { window.scrollTo(0, 0); }
  }
  // Back/forward: re-read the URL and repaint the matching view.
  window.addEventListener('popstate', function(){
    const m = new RegExp('^/duel/([A-Za-z0-9-]{1,39})-vs-([A-Za-z0-9-]{1,39})$').exec(location.pathname);
    DUEL = m ? { a: m[1], b: m[2] } : null;
    duelAnimated = false;
    lastKey = '';
    paint();
  });

  // ---- landing hero --------------------------------------------------------
  // A fake Claude Code session on the water wash — the product as it actually
  // appears: you prompt, Claude edits, and the ccrank statusline at the bottom
  // shows your rank (user count is the REAL live number). Types once, then
  // stays put (noanim) so polling repaints don't replay the intro.
  let heroPlayed = false;
  function heroHtml(){
    const users = Math.max(1, (GLOBAL && GLOBAL.stats || {}).players || 0);
    const lines =
      '<span class="hl hfade" style="--d:1.75s"><span class="hok">\\u25CF</span> 3 files edited</span>'+
      '<div class="slwrap hfade" style="--d:2.35s">'+
        '<span class="sl"><b class="hrank">CC-Rank #1/'+fmt(users)+'</b> <i class="hd">\\u00B7</i> '+
          '<i class="lnk">leaderboard \\u2197</i></span>'+
      '</div>'+
      '<span class="hl hfade" style="--d:3.15s"><span class="ps">&gt;</span> <span class="caret"></span></span>';
    const html =
      '<section class="hero">'+
        '<svg class="liq" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
          '<defs>'+
            '<filter id="liqf" x="-25%" y="-25%" width="150%" height="150%">'+
              '<feTurbulence type="fractalNoise" baseFrequency="0.004 0.002" numOctaves="2" seed="8" result="n"/>'+
              '<feDisplacementMap in="SourceGraphic" in2="n" scale="300" xChannelSelector="R" yChannelSelector="G"/>'+
            '</filter>'+
            '<linearGradient id="liqg" x1="0" y1="0" x2="1" y2="1">'+
              '<stop offset="0" stop-color="#E89A72"/><stop offset=".5" stop-color="#D97757"/>'+
              '<stop offset="1" stop-color="#C05F33"/></linearGradient>'+
          '</defs>'+
          '<g filter="url(#liqf)">'+
            '<rect x="-300" y="-300" width="1800" height="1200" fill="url(#liqg)"/>'+
            '<ellipse class="lq1" cx="230" cy="140" rx="400" ry="240" fill="#FBF6EB" opacity=".95"/>'+
            '<ellipse class="lq2" cx="960" cy="480" rx="340" ry="210" fill="#F9F2E4" opacity=".9"/>'+
            '<ellipse class="lq3" cx="1060" cy="110" rx="310" ry="200" fill="#A94E28" opacity=".85"/>'+
            '<ellipse class="lq4" cx="520" cy="560" rx="280" ry="170" fill="#8F5B41" opacity=".55"/>'+
            '<ellipse class="lq5" cx="660" cy="240" rx="460" ry="95" fill="#FFF9EC" opacity=".75"/>'+
            '<ellipse class="lq6" cx="330" cy="430" rx="240" ry="80" fill="#EFB08C" opacity=".8"/>'+
          '</g></svg>'+
        '<div class="hero-head"><h1>Every prompt counts.</h1>'+
          '<p><span>One global board, ranked live \\u2014 duel anyone on it.</span></p></div>'+
        '<div class="heroterm'+(heroPlayed ? ' noanim' : '')+'" role="img" '+
          'aria-label="Claude Code session with the ccrank statusline showing your live rank">'+
          '<div class="term-bar"><i class="r"></i><i class="y"></i><i class="g"></i>'+
            '<span>claude code</span></div>'+
          '<div class="ht-body">'+
            '<span class="hl"><span class="ps">&gt;</span> <b class="htype">make the checkout page responsive</b></span>'+
            lines+
          '</div></div>'+
        '<div class="hero-copyrow">'+
          '<div class="hero-pills hero-agents">'+
            heroPill('claude', 'Copy Claude Code prompt', heroCcGlyph())+
            heroPill('codex', 'Copy Codex prompt', '<span class="hpill-cx">'+openaiSvg()+'</span>')+
            heroPill('both', 'Copy Both prompt', heroCcGlyph()+'<span class="hpill-cx">'+openaiSvg()+'</span>')+
          '</div>'+
        '</div>'+
        '<div class="hero-pills">'+
          '<button class="hpill hduel" onclick="duelRandom()">'+fenceSvg()+
            (ME_WHO && ME_WHO.login ? 'Duel a random rival' : 'Watch a random duel')+'</button>'+
        '</div>'+
      '</section>';
    heroPlayed = true;
    return html;
  }
  function heroCcGlyph(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '+
      'stroke-linecap="round" stroke-linejoin="round"><path d="M5 16l4-4-4-4M11 17h7"/></svg>';
  }
  function heroPill(agent, label, glyph){
    return '<button class="hpill hagent'+(agent==='claude'?' on':'')+'" data-agent="'+agent+'" '+
      'onclick="copyHeroFor(this,\\''+agent+'\\')">'+glyph+
      '<span class="hlbl">'+label+'</span></button>';
  }
  function copyHeroFor(btn, agent){
    PICKED_AGENT = agent;
    const grp = btn.parentElement;
    if (grp) grp.querySelectorAll('.hagent').forEach(function(b){ b.classList.toggle('on', b === btn); });
    const label = btn.querySelector('.hlbl');
    const orig = agent === 'codex' ? 'Copy Codex prompt' : agent === 'both' ? 'Copy Both prompt' : 'Copy Claude Code prompt';
    navigator.clipboard.writeText(agentPrompt(null, agent)).then(function(){
      if (label){ label.textContent = 'Copied!'; setTimeout(function(){ label.textContent = orig; }, 2000); }
    });
  }

  // ---- skeleton loading ----------------------------------------------------
  // Ghost placeholders shown while the first /api response is in flight.
  // Mirrors the real grid (activity card + leaderboard + rail) so the layout
  // is stable and swaps cleanly to real data — see paint()'s null branch.
  function skeletonHtml(){
    const hw = heatWeeks();                 // same geometry as the real chart
    const gridH = 7 * hw.cell + 6 * 4;      // 7 weekday rows + 6 gaps
    const wd = ['','Mon','','Wed','','Fri',''];
    const chart =
      '<div class="chartrow">'+
        '<div class="wdays">'+wd.map(function(l){ return '<span>'+l+'</span>'; }).join('')+'</div>'+
        '<div class="chartscroll"><div style="position:relative;padding-top:22px">'+
          '<div class="months" style="top:0;height:18px;line-height:18px"></div>'+
          '<div class="sk skblk" style="height:'+gridH+'px;border-radius:8px"></div>'+
          '<div class="heatfoot"><span>less</span>'+
            [0,1,2,3,4].map(function(){ return '<i class="sk"></i>'; }).join('')+
            '<span>more</span></div>'+
        '</div></div></div>';
    const strip =
      '<div class="mstrip">'+[0,1,2].map(function(){
        return '<div class="mcell">'+
          '<div class="mlab"><span class="sk" style="width:22px;height:22px;border-radius:6px"></span>'+
            '<span class="sk" style="width:48px;height:12px"></span></div>'+
          '<span class="sk skblk" style="width:66px;height:22px"></span>'+
          '<span class="sk skblk" style="width:82px;height:11px;margin-top:12px"></span>'+
        '</div>';
      }).join('')+'</div>';
    // widths jitter a touch so the rows read as data, not a stamped template
    const nmW = [130,104,150,96,120], scW = [46,38,52,34,44];
    const rows = [0,1,2,3,4].map(function(i){
      return '<div class="lrow" style="--i:'+i+'">'+
        '<span class="sk" style="width:18px;height:13px"></span>'+
        '<span class="sk" style="width:30px;height:30px;border-radius:50%"></span>'+
        '<div><span class="sk skblk" style="width:'+nmW[i]+'px;height:13px"></span>'+
          '<span class="sk skblk" style="width:92px;height:12px;margin-top:7px"></span></div>'+
        '<span class="sk" style="width:108px;height:10px"></span>'+
        '<span class="sk" style="width:'+scW[i]+'px;height:15px;margin-left:auto"></span>'+
      '</div>';
    }).join('');
    function railCard(bars){
      return '<section class="card"><div class="cardhead">'+
        '<span class="sk" style="width:150px;height:15px"></span></div>'+
        '<div class="pad">'+bars+'</div></section>';
    }
    const railA = railCard(
      '<span class="sk skblk" style="width:100%;height:96px;border-radius:10px;margin-bottom:14px"></span>'+
      '<span class="sk skblk" style="width:100%;height:12px;margin-bottom:8px"></span>'+
      '<span class="sk skblk" style="width:70%;height:12px;margin-bottom:16px"></span>'+
      '<span class="sk skblk" style="width:100%;height:42px;border-radius:10px"></span>');
    const railB = railCard(
      [0,1,2,3].map(function(i){
        return '<span class="sk skblk" style="width:'+[88,80,94,72][i]+'%;height:13px;margin-bottom:12px"></span>';
      }).join(''));
    return '<div class="grid">'+
      '<section class="card span2">'+
        '<div class="cardhead" style="padding-bottom:12px"><h3>Leaderboard</h3>'+
          '<span class="sk right" style="width:120px;height:11px;margin-left:auto"></span></div>'+
        rows+
      '</section>'+
      '<section class="card">'+
        '<div class="cardhead"><h3>Activity</h3>'+
          '<span class="sk" style="width:132px;height:11px"></span></div>'+
        '<div class="chartwrap">'+chart+'</div>'+
        strip+
      '</section>'+
      '<div class="rail">'+railA+railB+'</div>'+
    '</div>';
  }

  // Duel skeleton: same poster + stage geometry as duelHtml(). The two names
  // are already real (they come from the URL), so the header paints final on
  // first frame; ghost blocks hold the spots where cards and stats will land.
  function duelSkeletonHtml(){
    const corner = function(side, login){
      return '<button class="dcorner ' + side + '" data-who="' + esc(login) + '">' +
        '<span class="duelname">' + esc(login) + '</span>' +
        '<span class="sk" style="width:118px;height:10px"></span></button>'; };
    const card = function(){
      return '<div class="fcol">' +
        '<div style="position:relative;width:100%;max-width:300px;aspect-ratio:540/820;' +
          '-webkit-mask-image:' + DMASK + ';mask-image:' + DMASK + ';' +
          '-webkit-mask-size:100% 100%;mask-size:100% 100%">' +
          '<span class="sk skblk" style="position:absolute;inset:0;border-radius:0"></span>' +
        '</div>' +
        '<div class="fcsub"><span class="sk" style="width:170px;height:12px"></span></div>' +
      '</div>'; };
    const srow = function(){
      return '<div class="dsrow">' +
        '<span class="dsv a"><span class="sk" style="width:22px;height:13px"></span></span>' +
        '<span class="dsbar l"></span>' +
        '<span class="dslab"><span class="sk" style="width:26px;height:9px"></span></span>' +
        '<span class="dsbar r"></span>' +
        '<span class="dsv b"><span class="sk" style="width:22px;height:13px"></span></span>' +
      '</div>'; };
    return '<section class="duelpg">' +
      '<div class="duelhd"><div class="deyebrow">mostcracked duel</div><div class="dband">' +
        corner('a', DUEL.a) + '<span class="vsbolt"><b>VS</b></span>' + corner('b', DUEL.b) +
      '</div></div>' +
      '<div class="duelstage">' +
        '<div class="dcol-a">' + card() + '</div>' +
        '<div class="dmid">' +
          '<div class="dft">Full time · six rounds</div>' +
          '<div class="dscore" style="display:flex;align-items:center;justify-content:center">' +
            '<span class="sk" style="width:.62em;height:.78em"></span><em>–</em>' +
            '<span class="sk" style="width:.62em;height:.78em"></span></div>' +
          '<div class="dpips">' + [0,1,2,3,4,5].map(function(){
            return '<i class="dpip"></i>'; }).join('') + '</div>' +
          '<div class="ddomhd"><span class="sk" style="width:30px;height:10px"></span>' +
            '<span class="lab">Dominance</span>' +
            '<span class="sk" style="width:30px;height:10px"></span></div>' +
          '<div class="ddom" style="background:var(--track)"></div>' +
          '<div class="dradarwrap"><span class="sk" style="width:min(220px,72%);' +
            'aspect-ratio:220/208;border-radius:24%"></span></div>' +
          '<div class="dsrows">' + [0,1,2,3,4,5].map(srow).join('') + '</div>' +
        '</div>' +
        '<div class="dcol-b">' + card() + '</div>' +
      '</div></section>';
  }

  // ---- page paint ----------------------------------------------------------
  function totalsFromRows(rows){
    return rows.reduce(function(t, r){
      t.prompts += r.prompts; t.edits += r.edits; t.score += r.score; return t;
    }, { prompts: 0, edits: 0, score: 0 });
  }
  function paint(){
    const data = CODE ? ROOM : GLOBAL;
    const key = JSON.stringify([CODE, mode, metric, NOTFOUND, ME, ME_WHO, data, DUEL]);
    if (key === lastKey) return; // nothing changed — don't repaint the poll
    lastKey = key;
    measure(); // fluid chart + meter sizing from the current viewport
    renderSide(); renderTop();
    const content = document.getElementById('content');
    if (NOTFOUND){
      content.innerHTML = '<section class="card notfound"><b>Nothing lives at '+esc(CODE)+'.</b>'+
        '<span>Double-check the link, or head <a href="/">back to the board</a>.</span></section>';
      return;
    }
    if (!data){ // first fetch still in flight — show skeletons, not a blank page
      content.innerHTML = DUEL ? duelSkeletonHtml()
        : (CODE || CHARTPG ? '' : heroHtml()) + skeletonHtml();
      return;
    }
    const rows = (mode === 'today' ? data.today : data.allTime) || [];
    const totals = CODE
      ? totalsFromRows(data.allTime || [])
      : { prompts: (data.stats||{}).prompts||0, edits: (data.stats||{}).edits||0,
          score: ((data.stats||{}).prompts||0) + ((data.stats||{}).edits||0) };
    const boardSub = CODE
      ? fmt((data.allTime||[]).length)+' members \\u00B7 ranked by global score'
      : fmt((GLOBAL && GLOBAL.stats || {}).players)+' users \\u00B7 one global score';

    if (DUEL){
      content.innerHTML = duelHtml();
      bindDuelTilt();
      const sc = duelScore;
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        duelPlay(sc.wa, sc.wb, sc.pa);
      }); });
      return;
    }
    const chartBlock = chartHtml(data.series); // sets DIMS.weeks for the header
    content.innerHTML =
      (CODE || CHARTPG || DUEL ? '' : heroHtml())+
      // On the /chart page the weekly 25 IS the content, so it leads. On the
      // homepage it sits under the leaderboard grid — the board is the point.
      (CODE || !CHARTPG ? '' : w25Html(GLOBAL && GLOBAL.chart, CHARTPG))+
      '<div class="grid">'+
      // Entrance animations play once; poll repaints swap in place ("quiet")
      // so live score updates don't re-run the whole rise choreography.
      '<section class="card span2'+(boardAnimated ? ' quiet' : '')+'">'+
        '<div class="cardhead" style="padding-bottom:12px"><h3>Leaderboard</h3>'+
        '<span class="sub right">'+boardSub+'</span></div>'+
        boardHtml(rows, !CODE)+
      '</section>'+
      '<section class="card">'+
        '<div class="cardhead"><h3>Activity</h3><span class="sub">'+
          DIMS.span+' &middot; UTC days</span></div>'+
        '<div class="chartwrap">'+chartBlock+'</div>'+
        stripHtml(data.series, totals)+
      '</section>'+
      '<div class="rail">'+(CODE ? inviteCard()+raceCard(data.today||[]) : onboardCard()+howCard())+'</div>'+
      '</div>'+
      (CODE || CHARTPG ? '' : w25Html(GLOBAL && GLOBAL.chart, false));
    bindChart();
    if (!CODE) w25AfterPaint();
    boardAnimated = true;
    // Legacy ?join=CODE invite links: the join UI is gone from the homepage,
    // so send the visitor straight to the board it unlocks.
    if (!CODE){
      const pre = new URLSearchParams(location.search).get('join');
      if (pre && !prefilled){ prefilled = true;
        if (/^[A-Za-z0-9]{1,6}$/.test(pre)) location.replace('/r/' + pre.toUpperCase());
      }
    }
  }
  let prefilled = false;

  // ---- data loops ----------------------------------------------------------
  async function loadGlobal(){
    try {
      const res = await fetch('/api/global');
      if (!res.ok) return;
      GLOBAL = await res.json();
      paint();
    } catch { /* keep last render */ }
  }
  async function loadRoom(){
    try {
      const res = await fetch('/api/rooms/' + CODE);
      if (!res.ok){ NOTFOUND = true; paint(); return; }
      NOTFOUND = false;
      ROOM = await res.json();
      if (ROOM && ROOM.room) rememberRoom(CODE, ROOM.room.name);
      paint();
    } catch { /* keep last render */ }
  }

  let rt = 0;
  window.addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(function(){ lastKey = ''; paint(); }, 180);
  });

  themeBtnIcon();                            // sun/moon reflects the pre-paint theme
  loadWho();                                 // viewer identity greeting (if any)
  loadGlobal();                              // sidebar + landing need it everywhere
  if (CODE){ loadRoom(); setInterval(loadRoom, 5000); setInterval(loadGlobal, 30000); }
  else setInterval(loadGlobal, 8000);
</script>
</body>
</html>`;
}
