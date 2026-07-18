// Self-contained dashboard page. Only external asset: GitHub avatar images
// (identity is a GitHub login), with a letter fallback when they 404.
// Visual language lives in /DESIGN.md — warm product dashboard, app shell,
// white cards, square-dot chart, mono numerals, one orange accent.
export function dashboardHtml(code: string | null): string {
  // Defense-in-depth: even though the caller only passes a CODE_RE-validated
  // code, harden the serializer so a value could never break out of the inline
  // <script>. JSON.stringify quotes/escapes it, then we unicode-escape <, > and
  // / so a literal </script> can't appear in the source.
  const initial = code
    ? JSON.stringify(code).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\//g, "\\u002f")
    : "null";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#F4F3EF" />
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='106 106 300 300'%3E%3Cg fill='%23736C5D'%3E%3Crect x='118' y='318' width='76' height='76' rx='19'/%3E%3Crect x='118' y='218' width='76' height='76' rx='19'/%3E%3Crect x='318' y='318' width='76' height='76' rx='19'/%3E%3C/g%3E%3Cg fill='%23D97757'%3E%3Crect x='218' y='318' width='76' height='76' rx='19'/%3E%3Crect x='218' y='218' width='76' height='76' rx='19'/%3E%3Crect x='218' y='118' width='76' height='76' rx='19'/%3E%3C/g%3E%3C/svg%3E" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<title>ccrank · the global Claude Code leaderboard</title>
<script>
  // Theme before first paint (no light flash): stored choice, else system.
  (function(){
    var t; try { t = localStorage.getItem('ccrank_theme'); } catch (e) {}
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
  .mark { display: grid; place-items: center; flex: none; }
  .mark svg { width: 26px; height: 26px; display: block; }
  .brand b { font-size: 15px; letter-spacing: -.01em; }
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
  .peek { display: flex; gap: 6px; padding: 0 4px; }
  .peek input { flex: 1; width: 40px; font: 12px/1 var(--mono); letter-spacing: .08em;
                text-transform: uppercase; padding: 8px 10px; border-radius: 8px;
                border: 1px solid var(--line2); background: var(--card); color: var(--ink); }
  .peek input::placeholder { color: var(--faint); }
  .peek input:focus { outline: none; border-color: var(--ink); }
  .peek button { border: 1px solid var(--line2); background: var(--card); border-radius: 8px;
                 width: 34px; cursor: pointer; color: var(--muted); }
  .peek button:hover { color: var(--ink); border-color: var(--ink); }
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
  .chartscroll { overflow-x: auto; flex: 1; min-width: 0; scrollbar-width: none; }
  .chartscroll::-webkit-scrollbar { display: none; }
  /* Activity heatmap — GitHub's contribution graph in Claude coral: columns
     are weeks, rows are weekdays, cell shade = that day's intensity. */
  .heat { position: relative; display: flex; justify-content: space-between;
          width: 100%; min-width: max-content; --cell: 12px; }
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
  .chip { font: 10px/1 var(--mono); color: var(--muted); border: 1px solid var(--line2);
          border-radius: 999px; padding: 3px 7px; text-decoration: none; white-space: nowrap; }
  .streak { font: 700 10.5px/1 var(--mono); color: var(--accent-deep);
            background: var(--accent-soft); border-radius: 999px; padding: 3px 7px; white-space: nowrap; }
  /* viewer's own row (?me= / localStorage) — subtle, matches the accent system */
  .lrow.me { background: var(--me); }
  .lrow.me:hover { background: var(--me-hov); }
  .youbadge { font: 700 9.5px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase;
              color: #fff; background: var(--accent); border-radius: 999px; padding: 3px 7px; }
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
           padding: 3px; background: var(--card);
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
           overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .podnm a { color: var(--ink); text-decoration: none; }
  .podnm a:hover { color: var(--accent); }
  .podnm .youbadge { margin-left: 5px; vertical-align: 1px; }
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
    .shell { grid-template-columns: 1fr; }
    .side { position: static; height: auto; flex-direction: row; align-items: center;
            flex-wrap: wrap; padding: 10px 16px; overflow: visible; }
    .brand { padding: 0; }
    .navsec, .nav:not(.on), .sidefoot, .side .spacer { display: none; }
    .nav.on { margin-left: 10px; }
    .peek { margin-left: auto; }
    .topbar, .content { padding-left: 16px; padding-right: 16px; }
    .grid { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
<div class="shell">

  <aside class="side">
    <div class="brand"><span class="mark" aria-hidden="true"><svg viewBox="106 106 300 300"><g fill="#736C5D"><rect x="118" y="318" width="76" height="76" rx="19"/><rect x="118" y="218" width="76" height="76" rx="19"/><rect x="318" y="318" width="76" height="76" rx="19"/></g><g fill="#D97757"><rect x="218" y="318" width="76" height="76" rx="19"/><rect x="218" y="218" width="76" height="76" rx="19"/><rect x="218" y="118" width="76" height="76" rx="19"/></g></svg></span><b>ccrank</b>
      <span class="livechip"><span class="dot"></span>LIVE</span></div>
    <div class="navsec">Menu</div>
    <a class="nav" id="navHome" href="/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="9" width="4" height="12" rx="1"/></svg>
      Global</a>
    <div class="navsec">Rooms <span class="cnt" id="roomCnt"></span></div>
    <div id="navRooms"></div>
    <div class="spacer"></div>
    <form class="peek" onsubmit="go(event)" title="view any room by code">
      <input id="codeInput" placeholder="CODE" maxlength="6" autocomplete="off" />
      <button type="submit" aria-label="view board">&#8594;</button>
    </form>
    <div class="sidefoot"><a href="https://github.com/codiejay/cc-rank">github &#8599;</a>
      &nbsp;&middot;&nbsp; counts only, never code</div>
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

  function go(e){ e.preventDefault();
    const v = document.getElementById('codeInput').value.trim().toUpperCase();
    if (v) location.href = '/r/' + v;
  }

  // ---- small utils ---------------------------------------------------------
  function shq(s){ return /[^A-Za-z0-9_.-]/.test(s) ? '"' + s.replace(/"/g,'') + '"' : s; }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function fmt(n){ return String(n == null ? 0 : n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); }
  function hue(s){ let h = 0; for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) % 360; return h; }
  // Identity is a verified GitHub account — real avatar (server-provided
  // avatar_url, else github.com/<login>.png), letter fallback if it 404s.
  function avatar(login, url){
    const h = hue(login.toLowerCase());
    // Pastel fallback tints per theme: light chips on light, deep muted chips
    // with lifted text on dark — same hue hash, so identity color is stable.
    const dk = themeNow() === 'dark';
    const bg = dk ? 'hsl('+h+',30%,25%)' : 'hsl('+h+',62%,91%)';
    const fg = dk ? 'hsl('+h+',55%,78%)' : 'hsl('+h+',48%,32%)';
    const src = url || ('https://github.com/'+encodeURIComponent(login)+'.png?size=64');
    return '<span class="ava" style="background:'+bg+';color:'+fg+'">'+
      esc(login.charAt(0).toUpperCase())+
      '<img src="'+esc(src)+'" alt="" loading="lazy" onerror="this.remove()">'+
      '</span>';
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
  function agentPrompt(code, roomName){
    const S = location.origin;
    const head = code
      ? 'Help me join a ccrank room (a Claude Code leaderboard). Room code: '+code+'. My flow is JOIN, so skip the flow question.'
      : roomName
      ? 'Help me set up ccrank (the global Claude Code leaderboard). My flow is CREATE with the room name \\"'+String(roomName).replace(/"/g, '')+'\\". Skip the flow question and do not ask me for a name.'
      : 'Help me set up ccrank (the global Claude Code leaderboard). First ask me ONE question and wait for my answer. Which flow do I want:\\n  (a) GET ON THE BOARD (the default): sign in with GitHub; I compete on the global leaderboard with every ccrank user. No room needed.\\n  (b) JOIN a private room: then ask me for the 6-character room code.\\n  (c) CREATE a private room for my crew: then ask me what to call it (if I defer with something like \\"you pick\\", choose a short fun room name yourself, no need to ask again).';
    return head + '\\nServer: '+S+'\\n\\nccrank identity = my real GitHub account, verified by GitHub sign-in. NEVER ask me for, type, or guess a username. GitHub itself determines who I am during sign-in. One user, one global score; rooms are optional private groups viewing the same per-user stream. Whenever you ask me to pick between fixed options (like the flow choice), use your interactive multiple-choice question tool (AskUserQuestion) so I can select with the arrow keys and Enter instead of typing. Only fall back to a plain typed question for free-text answers like a room name.\\n\\nFollow these steps exactly, in order:\\n'+
      '1. If CREATE: check the room name is free with GET '+S+'/api/check-room?name=<ROOM NAME, url-encoded>. If \\"reason\\":\\"room_name_taken\\" -> tell me that room name is taken (they are globally unique), ask for another, and re-check until \\"ok\\":true.\\n'+
      '2. If JOIN: verify the room exists with GET '+S+'/api/rooms/<CODE>/check. If \\"reason\\":\\"room_not_found\\" -> tell me the code looks wrong and stop.\\n'+
      '3. Run the setup IN THE BACKGROUND so you can read its output while it waits. GET ON THE BOARD: npx github:codiejay/cc-rank login. JOIN: npx github:codiejay/cc-rank join <CODE>. CREATE: npx github:codiejay/cc-rank create --name \\"<ROOM NAME>\\" (creating auto-joins me, so no separate join needed).\\n'+
      '4. MANDATORY, before any polling or other action: wait ~3 seconds after starting the command, read its output, find the line \\"Code:  XXXX-XXXX\\", and send me a message in EXACTLY this shape (fill in the real code): \\"GitHub sign-in is ready. A GitHub page just opened in your browser and the code is in your clipboard, so just paste it. Code if you need it: XXXX-XXXX. (Green button takes a second to wake up.)\\" You may not skip, summarize, or reorder this. I am blind until you send it. If the output has no Code line yet, wait 2 more seconds and read again.\\n'+
      '5. Only AFTER sending that message, check the command output every ~15 seconds. NEVER say setup succeeded until the output literally contains \\"Signed in as\\". If it says the sign-in timed out or was denied, tell me plainly and offer to run it again. Do not invent progress.\\n'+
      '6. When it finishes, show me what it printed: my verified GitHub login, plus the room code + dashboard link if a room was involved (global board link otherwise).\\n'+
      '7. Tell me to restart Claude Code so my prompts and edits start counting.';
  }
  function copyAgent(code, outId){
    const out = document.getElementById(outId);
    navigator.clipboard.writeText(agentPrompt(code)).then(function(){
      msg(out, 'ok', 'copied. paste it into Claude Code');
    }, function(){ msg(out, 'err', 'couldn\\u2019t copy. is the page focused?'); });
    return false;
  }

  // Prompt-first (James: "it's a prompt!"): these panels validate the input,
  // then copy the AGENT PROMPT with the room baked in — never a raw command.
  async function genJoin(){
    const out = document.getElementById('jOut');
    const code = document.getElementById('jCode').value.trim().toUpperCase();
    if (!code) return msg(out, 'err', 'Enter the room code first.');
    msg(out, 'ok', 'checking…');
    try {
      const room = await (await fetch('/api/rooms/'+code+'/check')).json();
      if (room.reason === 'room_not_found') return msg(out, 'err', 'Room '+code+' not found. Double-check the code.');
      navigator.clipboard.writeText(agentPrompt(code)).then(function(){
        msg(out, 'ok', 'Prompt copied. Paste it into Claude Code. You\\u2019re joining '+(room.roomName||code)+', and your global score comes with you.');
      }, function(){ msg(out, 'err', 'Couldn\\u2019t copy. Is the page focused?'); });
    } catch { msg(out, 'err', 'Couldn\\u2019t reach the server. Try again.'); }
  }

  async function genCreate(){
    const out = document.getElementById('cOut');
    const room = document.getElementById('cRoom').value.trim();
    if (!room) return msg(out, 'err', 'Give your room a name.');
    msg(out, 'ok', 'checking…');
    try {
      const r = await (await fetch('/api/check-room?name='+encodeURIComponent(room))).json();
      if (r.reason === 'room_name_taken') return msg(out, 'err', 'A room called "'+room+'" already exists. Room names are unique, so pick another.');
      navigator.clipboard.writeText(agentPrompt(null, room)).then(function(){
        msg(out, 'ok', 'Prompt copied. Paste it into Claude Code to create \\u201C'+room+'\\u201D.');
      }, function(){ msg(out, 'err', 'Couldn\\u2019t copy. Is the page focused?'); });
    } catch { msg(out, 'err', 'Couldn\\u2019t reach the server. Try again.'); }
  }

  // ---- chart: daily columns of stacked square dots -------------------------
  // Fluid: the number of days shown and the dot size grow with the card so the
  // chart always fills its width (the API sends up to 120 days).
  let DIMS = { avail: 760, weeks: 12 };
  let MT = 15; // leaderboard meter ticks
  function measure(){
    const w = document.getElementById('content').clientWidth || 940;
    // The Activity card no longer spans the full row — it shares the grid with
    // the 340px rail (20px gap) above 960px viewport, and stacks full-width
    // below it. Subtract the rail there so the heatmap fits its real card and
    // today's column (far right) isn't pushed past the scroll edge.
    const rail = window.innerWidth > 960 ? 340 + 20 : 0;
    DIMS.avail = Math.max(380, w - 64 /*content pad*/ - 44 /*card pad*/ - 42 /*y-axis*/ - rail);
    MT = w > 1250 ? 22 : w < 600 ? 9 : 15;
  }
  function seriesMap(series){
    const m = {};
    (series || []).forEach(function(r){
      m[r.day] = { p: r.prompts||0, e: r.edits||0, w: r.who||[], wm: r.whoMore||0 }; });
    return m;
  }
  function metricOf(v){ return metric === 'prompts' ? v.p : metric === 'edits' ? v.e : v.p + v.e; }
  // GitHub-style grid: columns are weeks (Sunday-first), ending on the week
  // that contains today. As many weeks as fit the card, up to a full year.
  function heatWeeks(){
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const maxWeeks = Math.min(53, Math.max(8, Math.floor(DIMS.avail / 14)));
    const lastSunday = today - new Date(today).getUTCDay()*86400000;
    const weeks = [];
    for (let w = maxWeeks - 1; w >= 0; w--){
      const col = [];
      for (let d = 0; d < 7; d++){
        const t = lastSunday - w*7*86400000 + d*86400000;
        col.push(t > today ? null : new Date(t).toISOString().slice(0,10));
      }
      weeks.push(col);
    }
    DIMS.weeks = maxWeeks;
    const cell = Math.min(20, Math.max(10, Math.floor(DIMS.avail / maxWeeks) - 4));
    return { weeks: weeks, cell: cell };
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
        const v = sm[d] || {p:0,e:0};
        return '<i class="l'+levelFor(metricOf(v), q)+'" style="--i:'+(wi+di)+
          '" data-d="'+d+'" data-p="'+v.p+'" data-e="'+v.e+'"></i>';
      }).join('')+'</div>';
    }).join('');
    // month labels above the first week-column of each month
    let months = '';
    let prev = '';
    h.weeks.forEach(function(col, wi){
      const d = col[0] || '';
      if (!d) return;
      const m = d.slice(0,7);
      if (m !== prev){ prev = m;
        if (wi > 0 && wi < h.weeks.length - 1)
          months += '<span style="left:'+(wi/(h.weeks.length-1)*100).toFixed(2)+'%">'+
            new Date(d+'T00:00:00Z').toLocaleDateString('en-US',{month:'short'})+'</span>';
      }
    });
    const none = vals.length ? '' : '<div class="chna">no activity in this window yet</div>';
    const wd = ['','Mon','','Wed','','Fri',''];
    return '<div class="chartrow">'+
      '<div class="wdays">'+wd.map(function(l){ return '<span>'+l+'</span>'; }).join('')+'</div>'+
      '<div class="chartscroll"><div style="position:relative;padding-top:22px">'+
        '<div class="months" style="top:0;height:18px;line-height:18px">'+months+'</div>'+
        '<div class="heat'+(chartAnimated ? '' : ' anim')+'" style="--cell:'+h.cell+'px" id="dotchart">'+cols+none+'</div>'+
        '<div class="heatfoot"><span>less</span>'+
          [0,1,2,3,4].map(function(l){ return '<i class="l'+l+'"></i>'; }).join('')+
          '<span>more</span></div>'+
        '<div class="tip" id="tip"></div>'+
      '</div></div></div>';
  }
  function bindChart(){
    const chart = document.getElementById('dotchart'), tip = document.getElementById('tip');
    if (!chart || !tip) return;
    if (chart.classList.contains('anim')) chartAnimated = true; // first mount only
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
  // Top-3 podium: 2nd | 1st | 3rd, the leader centered and raised.
  function podiumHtml(top, withRoom){
    return '<div class="podium">'+top.map(function(r){
      const login = r.login || r.name;
      const isMe = ME != null && r.id === ME;
      const you = isMe ? '<span class="youbadge">you</span>' : '';
      return '<div class="pod p'+r.rank+(isMe?' me':'')+'" style="--i:'+(r.rank-1)+'">'+
        '<span class="podcrown">'+crownSvg()+'</span>'+
        '<a class="podav" href="https://github.com/'+encodeURIComponent(login)+
          '" target="_blank" rel="noopener">'+avatar(login, r.avatar)+
          '<span class="medal">'+r.rank+'</span></a>'+
        '<div class="podnm"><a href="https://github.com/'+encodeURIComponent(login)+
          '" target="_blank" rel="noopener">'+esc(login)+'</a>'+you+'</div>'+
        '<div class="podsc">'+fmt(r.score)+'</div>'+
        '<div class="podmeta">'+fmt(r.prompts)+' prompts \\u00B7 '+fmt(r.edits)+' edits</div>'+
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
      // Room chips are labels only — no links, no codes. Codes are join
      // credentials: you get one from a friend, never from this page.
      const chips = withRoom
        ? (r.rooms || []).map(function(nm){
            return '<span class="chip">'+esc(nm)+'</span>';
          }).join('') : '';
      const streak = r.streak >= 2 ? '<span class="streak">\\uD83D\\uDD25 '+r.streak+'d</span>' : '';
      let delta = '';
      if (r.delta != null && r.delta > 0) delta = '<span class="delta up" title="up '+r.delta+' since yesterday">\\u25B2'+r.delta+'</span>';
      else if (r.delta != null && r.delta < 0) delta = '<span class="delta down" title="down '+(-r.delta)+' since yesterday">\\u25BC'+(-r.delta)+'</span>';
      const login = r.login || r.name;
      const isMe = ME != null && r.id === ME;
      const you = isMe ? '<span class="youbadge">you</span>' : '';
      return '<div class="lrow'+(isMe?' me':'')+'" style="--i:'+i+'">'+
        '<div class="rk'+(r.rank===1?' r1':'')+'">'+(r.rank<10?'0':'')+r.rank+'</div>'+
        avatar(login, r.avatar)+
        '<div><div class="nm"><a href="https://github.com/'+encodeURIComponent(login)+
        '" target="_blank" rel="noopener" style="text-decoration:none">'+esc(login)+'</a>'+you+chips+streak+delta+'</div>'+
        '<div class="meta">'+fmt(r.prompts)+' prompts \\u00B7 '+fmt(r.edits)+' edits</div></div>'+
        meterHtml(r.score, max)+
        '<div class="sc">'+fmt(r.score)+'</div></div>';
    }).join('');
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
      ? 'Your prompts and edits are scoring on the global board. Want a private view for your crew? Make a room below.'
      : 'One prompt in Claude Code sets this up. Sign in with GitHub (real auth, no typed names) and you&rsquo;re on the global board with every ccrank user.';
    return '<section class="onboard"><div class="onb-in">'+
      '<div class="onb-head">'+claudeBurst('burst-ico')+'<h3>'+head+'</h3>'+
      '<span class="onb-tag">'+tag+'</span></div>'+
      '<div class="pad">'+(who ? '' : termDemo())+
      '<p class="hint">'+hint+'</p>'+
      '<button class="btn dark glow" onclick="copyAgent(null, \\'aOut\\')">Copy the agent prompt</button>'+
      '<div id="aOut" style="margin-bottom:10px"></div>'+
      '<details><summary>Join a room by hand</summary><div class="fields">'+
        '<input id="jCode" class="up" placeholder="ROOM CODE" maxlength="6" autocomplete="off" />'+
        '<button class="btn ghost" onclick="genJoin()">Copy the agent prompt</button>'+
        '<div id="jOut"></div></div></details>'+
      '<details><summary>Create a room</summary><div class="fields">'+
        '<input id="cRoom" placeholder="room name" maxlength="60" autocomplete="off" />'+
        '<button class="btn ghost" onclick="genCreate()">Copy the agent prompt</button>'+
        '<div id="cOut"></div></div></details>'+
      '</div></div></section>';
  }
  function howCard(){
    return '<section class="card"><div class="cardhead"><h3>How scoring works</h3></div>'+
      '<div class="pad" style="padding-top:6px">'+
      '<div class="scorehow"><kbd>prompt sent</kbd> to Claude Code <span class="pt">+1</span></div>'+
      '<div class="scorehow"><kbd>file edited</kbd> by Claude <span class="pt">+1</span></div>'+
      '<div class="scorehow" style="color:var(--muted)">one global score, the same in every room</div>'+
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
        '<div class="h" id="codeHint">room code &middot; click to copy</div>'+
        (revealed ? '' : '<div class="veil"><button class="reveal" '+
          'onclick="revealCode(event)">Reveal code</button></div>')+
      '</div>'+
      '<button class="btn dark" onclick="copyAgent(CODE, \\'rOut\\')">Copy the agent prompt</button>'+
      '<a class="btn ghost" href="/?join='+esc(CODE)+'">Open the join page</a>'+
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
        if (el) el.innerHTML = 'room code &middot; click to copy';
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
    document.getElementById('navHome').className = 'nav' + (CODE ? '' : ' on');
    if (!GLOBAL){ // first fetch in flight — ghost room pills, not an empty list
      document.getElementById('roomCnt').textContent = '';
      document.getElementById('navRooms').innerHTML = [70,54,84].map(function(w){
        return '<div class="nav static"><span class="sk" style="width:9px;height:9px;border-radius:3px;flex:none"></span>'+
          '<span class="sk" style="width:'+w+'px;height:11px"></span></div>';
      }).join('');
      return;
    }
    // Directory shows room NAMES only. Entries become links only for rooms
    // this browser already knows the code to (currently viewed, or visited
    // before and remembered locally).
    const rooms = (GLOBAL && GLOBAL.roomsList) || [];
    document.getElementById('roomCnt').textContent = rooms.length || '';
    const current = (CODE && ROOM && ROOM.room) ? ROOM.room.name : null;
    const known = knownRooms();
    document.getElementById('navRooms').innerHTML = rooms.map(function(r){
      const h = hue(String(r.name).toLowerCase());
      const dot = '<span class="rdot" style="background:hsl('+h+',55%,62%)"></span>';
      if (current && r.name === current)
        return '<a class="nav on" href="/r/'+encodeURIComponent(CODE)+'">'+dot+esc(r.name)+
          '</a>';
      if (known[r.name])
        return '<a class="nav" href="/r/'+encodeURIComponent(known[r.name])+'">'+dot+esc(r.name)+'</a>';
      return '<div class="nav static" title="joining needs a code from a member">'+dot+esc(r.name)+'</div>';
    }).join('');
    document.getElementById('navHome').className = 'nav' + (CODE ? '' : ' on');
  }
  function renderTop(){
    const crumb = document.getElementById('crumb');
    if (NOTFOUND) crumb.innerHTML = 'Room not found';
    // Never render the room code in the crumb — it's a join credential and
    // the topbar is on screen through every screenshare. Sharing happens via
    // the invite card's deliberate frosted-glass reveal only.
    else if (CODE && ROOM) crumb.innerHTML = esc(ROOM.room.name);
    else if (CODE) crumb.textContent = 'Room';
    else crumb.textContent = 'Global';
    document.getElementById('segAll').className = mode==='allTime' ? 'on' : '';
    document.getElementById('segToday').className = mode==='today' ? 'on' : '';
  }

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
          '<p><span>Every Claude Code user on one board. Every prompt you send and file Claude edits scores you a point, live.</span><br>'+
            '<span>Want a board that\\u2019s just your crew? Make a private room.</span></p></div>'+
        '<div class="heroterm'+(heroPlayed ? ' noanim' : '')+'" role="img" '+
          'aria-label="Claude Code session with the ccrank statusline showing your live rank">'+
          '<div class="term-bar"><i class="r"></i><i class="y"></i><i class="g"></i>'+
            '<span>claude code</span></div>'+
          '<div class="ht-body">'+
            '<span class="hl"><span class="ps">&gt;</span> <b class="htype">make the checkout page responsive</b></span>'+
            lines+
          '</div></div>'+
        '<div class="hero-pills">'+
          '<button class="hpill" onclick="copyHero(this)">'+
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'+
            'Copy the agent prompt</button>'+
          '<button class="hpill" onclick="jumpTo(\\'join\\')">'+
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>'+
            'Join a room</button>'+
          '<button class="hpill" onclick="jumpTo(\\'create\\')">'+
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'+
            'Create a room</button>'+
        '</div>'+
      '</section>';
    heroPlayed = true;
    return html;
  }
  function copyHero(btn){
    navigator.clipboard.writeText(agentPrompt(null)).then(function(){
      const label = btn.childNodes[btn.childNodes.length - 1];
      label.textContent = 'Copied. Paste it into Claude Code';
      setTimeout(function(){ label.textContent = 'Copy the agent prompt'; }, 2400);
    });
  }
  function jumpTo(which){
    const d = document.querySelectorAll('.onboard details')[which === 'join' ? 0 : 1];
    if (d) d.open = true;
    const card = document.querySelector('.onboard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const inp = document.getElementById(which === 'join' ? 'jCode' : 'cRoom');
    if (inp) setTimeout(function(){ inp.focus({ preventScroll: true }); }, 450);
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

  // ---- page paint ----------------------------------------------------------
  function totalsFromRows(rows){
    return rows.reduce(function(t, r){
      t.prompts += r.prompts; t.edits += r.edits; t.score += r.score; return t;
    }, { prompts: 0, edits: 0, score: 0 });
  }
  function paint(){
    const data = CODE ? ROOM : GLOBAL;
    // GLOBAL.roomsList must be part of the key: on room pages the sidebar is
    // fed by GLOBAL while the main content is ROOM — if the room fetch wins
    // the race, the later GLOBAL arrival must still trigger a repaint or the
    // sidebar stays skeleton forever.
    const key = JSON.stringify([CODE, mode, metric, NOTFOUND, ME, ME_WHO, data,
      GLOBAL && GLOBAL.roomsList]);
    if (key === lastKey) return; // nothing changed — don't repaint the poll
    lastKey = key;
    measure(); // fluid chart + meter sizing from the current viewport
    renderSide(); renderTop();
    const content = document.getElementById('content');
    if (NOTFOUND){
      content.innerHTML = '<section class="card notfound"><b>No room answers to '+esc(CODE)+'.</b>'+
        '<span>Double-check the code, or <a href="/">start a new room</a>.</span></section>';
      return;
    }
    if (!data){ // first fetch still in flight — show skeletons, not a blank page
      content.innerHTML = (CODE ? '' : heroHtml()) + skeletonHtml();
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

    const chartBlock = chartHtml(data.series); // sets DIMS.weeks for the header
    content.innerHTML =
      (CODE ? '' : heroHtml())+
      '<div class="grid">'+
      '<section class="card span2">'+
        '<div class="cardhead" style="padding-bottom:12px"><h3>Leaderboard</h3>'+
        '<span class="sub right">'+boardSub+'</span></div>'+
        boardHtml(rows, !CODE)+
      '</section>'+
      '<section class="card">'+
        '<div class="cardhead"><h3>Activity</h3><span class="sub">last '+
          DIMS.weeks+' weeks &middot; UTC days</span></div>'+
        '<div class="chartwrap">'+chartBlock+'</div>'+
        stripHtml(data.series, totals)+
      '</section>'+
      '<div class="rail">'+(CODE ? inviteCard()+raceCard(data.today||[]) : onboardCard()+howCard())+'</div>'+
      '</div>';
    bindChart();
    // Arriving via an invite link? Prefill the join code inside the details.
    if (!CODE){
      const pre = new URLSearchParams(location.search).get('join');
      if (pre && !prefilled){ prefilled = true;
        // Scrub ?join=CODE from the address bar immediately — the code now
        // lives only in the input below. Same hygiene as ?me=: nothing
        // sensitive lingers in the URL for screenshares or copied links.
        try {
          const u = new URL(location.href);
          u.searchParams.delete('join');
          history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
        } catch { /* cosmetic */ }
        const d = document.querySelectorAll('details')[0];
        if (d) d.open = true;
        const jc = document.getElementById('jCode');
        if (jc){ jc.value = pre.toUpperCase(); jc.focus(); }
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
