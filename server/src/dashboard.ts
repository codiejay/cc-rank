// Self-contained dashboard page. Only external asset: GitHub avatar images
// (identity is a GitHub login), with a letter fallback when they 404.
// Visual language lives in /DESIGN.md — warm product dashboard, app shell,
// white cards, square-dot chart, mono numerals, one orange accent.
export function dashboardHtml(code: string | null): string {
  const initial = code ? JSON.stringify(code) : "null";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#F4F3EF" />
<title>ccrank — the global Claude Code leaderboard</title>
<style>
  :root {
    color-scheme: light;
    --side:#F4F3EF; --bg:#FAFAF8; --card:#FFFFFF;
    --ink:#221F1A; --muted:#8B867B; --faint:#C9C5BB;
    --line:#EAE8E1; --line2:#DEDBD2;
    --accent:#D97757; --accent-deep:#B05730; --accent-soft:#F7E7DE; --edits:#7C6455;
    --up:#12A150; --down:#D92D20; --amber:#F5B301;
    --mono: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    --sans: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
    --shadow: 0 1px 2px rgba(35,28,15,.04), 0 0 0 1px var(--line);
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
  .mark { width: 28px; height: 28px; border-radius: 8px; background: var(--ink);
          color: #fff; display: grid; place-items: center;
          font: 700 12px/1 var(--mono); letter-spacing: -.02em; flex: none; }
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
         border-radius: 9px; text-decoration: none; font-weight: 500; color: #4A463E;
         border: 1px solid transparent; }
  .nav svg { width: 16px; height: 16px; flex: none; color: var(--muted); }
  .nav:hover { background: rgba(255,255,255,.6); }
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
  .seg { margin-left: auto; display: flex; background: #EEEDE7; border-radius: 10px; padding: 3px; }
  .seg button { border: 0; background: transparent; border-radius: 8px; padding: 6px 14px;
                font-size: 12.5px; font-weight: 600; color: var(--muted); cursor: pointer; }
  .seg button.on { background: var(--card); color: var(--ink);
                   box-shadow: 0 1px 2px rgba(35,28,15,.08), 0 0 0 1px var(--line); }

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
                         background: #F0EDE6; flex: none; display: block; }
  .heat i.off { background: transparent; }
  i.l0 { background: #F0EDE6; }
  i.l1 { background: #F6DFD2; }
  i.l2 { background: #EDB795; }
  i.l3 { background: var(--accent); }
  i.l4 { background: #8C3D1D; }
  .heat i[data-d] { cursor: crosshair; }
  .heat i[data-d]:hover { outline: 1.5px solid rgba(34,31,26,.45); outline-offset: -1px; }
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

  /* ---- metric strip ---- */
  .mstrip { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line);
            margin-top: 16px; }
  .mcell { border-left: 1px solid var(--line); padding: 14px 22px 18px; cursor: pointer;
           border-top: 2px solid transparent; margin-top: -1px; background: none; text-align: left; border-bottom:0; border-right:0; }
  .mcell:first-child { border-left: 0; border-bottom-left-radius: 14px; }
  .mcell:last-child { border-bottom-right-radius: 14px; }
  .mcell.on { border-top-color: var(--ink); background: #FBFAF7; }
  .mlab { display: flex; align-items: center; gap: 8px; color: #55514A; font-size: 12.5px;
          font-weight: 550; margin-bottom: 10px; }
  .mico { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center;
          background: #F1F0EA; color: #55514A; flex: none; }
  .mcell.on .mico { background: var(--ink); color: #fff; }
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
  .lrow:hover { background: #FBFAF7; }
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
          background: linear-gradient(110deg, #4A463E 0 40%, var(--accent) 50%, #4A463E 60% 100%);
          background-size: 230% 100%; -webkit-background-clip: text; background-clip: text;
          color: transparent; animation: glint 3.6s ease-in-out infinite;
          animation-delay: calc(var(--i, 0) * .3s); }
  @keyframes glint { 0% { background-position: 115% 0; } 100% { background-position: -115% 0; } }
  @media (prefers-reduced-motion: reduce) { .meta { color: #4A463E; background: none; } }
  .chip { font: 10px/1 var(--mono); color: var(--muted); border: 1px solid var(--line2);
          border-radius: 999px; padding: 3px 7px; text-decoration: none; white-space: nowrap; }
  .streak { font: 700 10.5px/1 var(--mono); color: var(--accent-deep);
            background: var(--accent-soft); border-radius: 999px; padding: 3px 7px; white-space: nowrap; }
  .delta { font: 700 10.5px/1 var(--mono); }
  .delta.up { color: var(--up); } .delta.down { color: var(--down); }
  .meter { position: relative; width: 108px; height: 10px; overflow: hidden;
           background: repeating-linear-gradient(90deg, #EDEBE4 0 4px, transparent 4px 7px); }
  .meter i { position: absolute; inset: 0 auto 0 0;
             background: repeating-linear-gradient(90deg, var(--accent) 0 4px, transparent 4px 7px);
             transition: width .6s cubic-bezier(.22,1,.36,1); }
  .sc { font: 700 15px/1 var(--mono); text-align: right; font-variant-numeric: tabular-nums; }
  .lempty { padding: 34px 22px 38px; border-top: 1px solid var(--line); }
  .lempty b { display: block; font-size: 14px; margin-bottom: 4px; }
  .lempty span { color: var(--muted); font-size: 12.5px; }

  /* ---- right rail ---- */
  .rail { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
  .card .pad { padding: 16px 20px 20px; }
  .card .pad p.hint { margin: 0 0 14px; color: var(--muted); font-size: 12.5px; }
  .btn { display: block; width: 100%; border: 0; border-radius: 10px; padding: 11px 14px;
         font-size: 13px; font-weight: 600; cursor: pointer; text-align: center;
         text-decoration: none; }
  .btn.dark { background: var(--ink); color: #fff; }
  .btn.dark:hover { background: #000; }
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
  .cmd { margin-top: 4px; background: #23201A; color: #F4EFE5; border-radius: 10px;
         padding: 12px 14px; font: 11.5px/1.65 var(--mono); word-break: break-all; cursor: pointer; }
  .cmd::before { content: "$ "; color: var(--accent); }
  .cmd .copyhint { display: block; color: rgba(244,239,229,.5); margin-top: 6px; font-size: 10px; }
  .msg { margin-top: 8px; font: 11.5px/1.5 var(--mono); }
  .msg.err { color: var(--down); }
  .msg.ok { color: var(--up); }
  .codebox { position: relative; overflow: hidden; border: 1.5px dashed var(--line2);
             border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 14px; }
  .codebox.open { cursor: pointer; }
  .codebox.open:hover { border-color: var(--accent); }
  /* Frosted glass: the code must stay VISIBLE as a blurry ghost behind it. */
  .codeval { filter: blur(4px); opacity: .8; color: var(--accent-deep);
             transition: filter .55s cubic-bezier(.22,1,.36,1), opacity .55s; }
  .codebox.open .codeval { filter: none; opacity: 1; color: var(--ink); }
  .veil { position: absolute; inset: 0; display: grid; place-items: center;
          background: linear-gradient(115deg, rgba(255,255,255,.28), rgba(255,255,255,.08));
          backdrop-filter: blur(2px) saturate(1.1);
          -webkit-backdrop-filter: blur(2px) saturate(1.1);
          transition: opacity .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1); }
  .codebox.open .veil { opacity: 0; transform: scale(1.12); pointer-events: none; }
  .reveal { border: 0; background: var(--ink); color: #fff; border-radius: 999px;
            padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
            box-shadow: 0 4px 14px rgba(35,28,15,.22); }
  .reveal:hover { background: #000; }
  .codebox .c { font: 700 24px/1 var(--mono); letter-spacing: .22em; text-indent: .22em; }
  .codebox .h { font: 10px/1 var(--mono); color: var(--muted); margin-top: 8px;
                letter-spacing: .08em; text-transform: uppercase; }
  .scorehow { display: flex; align-items: center; gap: 10px; padding: 9px 0;
              border-top: 1px solid var(--line); font-size: 12.5px; color: #55514A; }
  .scorehow:first-of-type { border-top: 0; }
  .scorehow kbd { font: 10.5px/1 var(--mono); background: #F1F0EA; border-radius: 6px;
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
  .term { margin: 8px 0 14px; background: #1E1913; border-radius: 11px; overflow: hidden;
          box-shadow: 0 12px 26px rgba(35,28,15,.30); }
  .term-bar { display: flex; align-items: center; gap: 6px; padding: 9px 12px;
              background: #2A241C; border-bottom: 1px solid rgba(255,255,255,.06); }
  .term-bar i { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .term-bar i.r { background: #FF5F57; } .term-bar i.y { background: #FEBC2E; }
  .term-bar i.g { background: #28C840; }
  .term-bar span { margin-left: 6px; font: 600 10px/1 var(--mono); letter-spacing: .08em;
                   color: rgba(244,239,229,.55); }
  .term-body { padding: 11px 14px 13px; font: 12px/1.9 var(--mono); color: #F4EFE5; }
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
     James-sanctioned exception to the no-gradient rule: the landing hero sits
     on a slowly drifting "liquid" wash (blurred warm blobs + a rotating streak
     layer). The terminal on top replays a fake ccrank session that prints the
     REAL live global top 5. */
  .hero { position: relative; border-radius: 18px; overflow: hidden; margin-bottom: 20px;
          padding: clamp(30px, 5vw, 56px) 20px clamp(24px, 4vw, 40px);
          background: #EDEAE2; box-shadow: var(--shadow); }
  .liq { position: absolute; inset: -30%; filter: blur(30px) saturate(1.12);
         pointer-events: none; }
  .liq i { position: absolute; border-radius: 42% 58% 55% 45% / 55% 44% 56% 45%; }
  .liq .b1 { width: 58%; height: 62%; left: -8%; top: -12%; background: #FDFBF5;
             animation: drift1 34s ease-in-out -8s infinite alternate; }
  .liq .b2 { width: 48%; height: 54%; right: -6%; top: 2%; background: rgba(224,122,82,.9);
             animation: drift2 41s ease-in-out -20s infinite alternate; }
  .liq .b3 { width: 42%; height: 48%; left: 14%; bottom: -14%; background: rgba(158,124,98,.8);
             animation: drift3 47s ease-in-out -33s infinite alternate; }
  .liq .b4 { width: 28%; height: 32%; right: 22%; bottom: -6%; background: rgba(196,86,48,.7);
             animation: drift1 29s ease-in-out -14s infinite alternate-reverse; }
  .liq .b5 { width: 34%; height: 38%; left: 36%; top: -10%; background: #F8F3E8;
             animation: drift2 38s ease-in-out -5s infinite alternate-reverse; }
  .liq .b6 { width: 22%; height: 40%; left: 2%; top: 34%; background: rgba(233,158,120,.75);
             animation: drift3 36s ease-in-out -11s infinite alternate-reverse; }
  @keyframes drift1 { to { transform: translate(10%, 15%) scale(1.2) rotate(14deg); } }
  @keyframes drift2 { to { transform: translate(-13%, 10%) scale(.84) rotate(26deg); } }
  @keyframes drift3 { to { transform: translate(11%, -13%) scale(1.16) rotate(-22deg); } }
  /* two counter-rotating streak layers under the blur = slow marbling */
  .liq::before, .liq::after { content: ""; position: absolute; inset: 0; }
  .liq::before { background: conic-gradient(from 0deg at 52% 46%,
                  transparent 0 34deg, rgba(255,255,255,.75) 58deg 86deg, transparent 118deg 196deg,
                  rgba(217,119,87,.4) 226deg 258deg, transparent 296deg 360deg);
                animation: liqspin 90s linear infinite; }
  .liq::after { background: conic-gradient(from 140deg at 42% 58%,
                  transparent 0 50deg, rgba(250,246,236,.65) 74deg 96deg, transparent 130deg 230deg,
                  rgba(124,100,85,.3) 258deg 284deg, transparent 320deg 360deg);
                animation: liqspin 120s linear infinite reverse; }
  @keyframes liqspin { to { transform: rotate(360deg); } }

  .hero-head { position: relative; text-align: center; margin: 0 auto 26px;
               text-shadow: 0 1px 10px rgba(253,251,245,.85), 0 0 3px rgba(253,251,245,.7); }
  .hero-head h1 { margin: 0; font-size: clamp(24px, 3.4vw, 33px); font-weight: 750;
                  letter-spacing: -.02em; }
  .hero-head p { margin: 8px 0 0; color: #55514A; font-size: 13.5px; }

  .heroterm { position: relative; width: min(620px, 100%); margin: 0 auto;
              background: #1E1913; border-radius: 14px; overflow: hidden; text-align: left;
              box-shadow: 0 24px 60px rgba(35,28,15,.34), 0 2px 8px rgba(35,28,15,.18); }
  .ht-body { padding: 13px 18px 15px; font: 12.5px/2 var(--mono); color: #F4EFE5; }
  .hl { display: block; white-space: nowrap; overflow: hidden; }
  .htype { display: inline-block; overflow: hidden; white-space: nowrap; vertical-align: bottom;
           animation: htype .8s steps(10, end) .35s both; }
  @keyframes htype { from { width: 0; } to { width: 10ch; } }
  .hfade { animation: hfade .45s ease-out both; animation-delay: var(--d, 0s); }
  @keyframes hfade { from { opacity: 0; } to { opacity: 1; } }
  .hmut { color: rgba(244,239,229,.45); }
  .hok { color: #5BD98A; font-weight: 700; }
  .hrow { display: grid; grid-template-columns: 3ch minmax(0,1fr) auto 7ch; gap: 12px;
          align-items: center; animation: hrise .5s cubic-bezier(.22,1,.36,1) both;
          animation-delay: var(--d, 0s); }
  @keyframes hrise { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
  .hrk { font-weight: 600; color: rgba(244,239,229,.4); font-variant-numeric: tabular-nums; }
  .hrk.one { color: var(--accent); font-weight: 700; }
  .hnm { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hnm i { font-style: normal; font-size: 10.5px; color: var(--accent); margin-left: 6px; }
  .htick { display: inline-flex; gap: 3px; }
  .htick i { width: 5px; height: 10px; border-radius: 1px; background: rgba(244,239,229,.13); }
  .htick i.on { background: var(--accent); }
  .hsc { font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
  .heroterm.noanim .htype, .heroterm.noanim .hfade, .heroterm.noanim .hrow {
    animation: none; width: auto; opacity: 1; transform: none; }

  .hero-pills { position: relative; display: flex; flex-wrap: wrap; gap: 10px;
                justify-content: center; margin-top: 24px; }
  .hpill { display: inline-flex; align-items: center; gap: 8px; background: #1E1913;
           color: #F4EFE5; border: 0; border-radius: 10px; padding: 10px 16px;
           font-size: 12.5px; font-weight: 600; cursor: pointer;
           box-shadow: 0 8px 20px rgba(35,28,15,.22);
           transition: transform .15s ease-out, background .15s; }
  .hpill:hover { transform: translateY(-1px); background: #000; }
  .hpill svg { width: 13px; height: 13px; color: var(--accent); flex: none; }
  @media (prefers-reduced-motion: reduce) {
    .htype { width: 10ch; } .hfade, .hrow { opacity: 1; transform: none; }
  }

  /* ---- today's race bars ---- */
  .race { padding: 4px 20px 18px; }
  .racerow { padding: 9px 0; }
  .racetop { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; font-weight: 600; }
  .racetop .pc { margin-left: auto; font: 700 12px/1 var(--mono); }
  .racebar { margin-top: 7px; height: 10px; overflow: hidden; position: relative;
             background: repeating-linear-gradient(90deg, #EDEBE4 0 4px, transparent 4px 7px); }
  .racebar i { position: absolute; inset: 0 auto 0 0;
               transition: width .6s cubic-bezier(.22,1,.36,1); }
  .race .none { color: var(--muted); font-size: 12.5px; padding: 8px 0 6px; }

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
    <div class="brand"><span class="mark">cc</span><b>ccrank</b>
      <span class="livechip"><span class="dot"></span>LIVE</span></div>
    <div class="navsec">Menu</div>
    <a class="nav" id="navHome" href="/">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="9" width="4" height="12" rx="1"/></svg>
      Overview</a>
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
      <div class="crumb" id="crumb">Overview</div>
      <div class="seg" id="seg">
        <button id="segAll" class="on" onclick="setMode('allTime')">All-time</button>
        <button id="segToday" onclick="setMode('today')">Today</button>
      </div>
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
    const src = url || ('https://github.com/'+encodeURIComponent(login)+'.png?size=64');
    return '<span class="ava" style="background:hsl('+h+',62%,91%);color:hsl('+h+',48%,32%)">'+
      esc(login.charAt(0).toUpperCase())+
      '<img src="'+esc(src)+'" alt="" loading="lazy" onerror="this.remove()">'+
      '</span>';
  }
  function msg(el, cls, text){ el.innerHTML = '<div class="msg '+cls+'">'+esc(text)+'</div>'; }
  function cmdBox(el, cmd, note){
    el.innerHTML =
      '<div class="cmd" title="click to copy">'+esc(cmd)+
        '<span class="copyhint">click to copy &mdash; paste it in your terminal, then restart Claude Code</span></div>'+
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
  function agentPrompt(code){
    const S = location.origin;
    const head = code
      ? 'Help me join a ccrank room (a Claude Code leaderboard). Room code: '+code+'. My flow is JOIN.'
      : 'Help me set up ccrank (the global Claude Code leaderboard). First ask me ONE question and wait for my answer — which flow do I want:\\n  (a) GET ON THE BOARD (the default) — sign in with GitHub; I compete on the global leaderboard with every ccrank user. No room needed.\\n  (b) JOIN a private room — then ask me for the 6-character room code.\\n  (c) CREATE a private room for my crew — then ask me what to call it (if I defer with something like \\"you pick\\", choose a short fun room name yourself, no need to ask again).';
    return head + '\\nServer: '+S+'\\n\\nccrank identity = my real GitHub account, verified by GitHub sign-in. NEVER ask me for, type, or guess a username — GitHub itself determines who I am during sign-in. One user, one global score; rooms are optional private groups viewing the same per-user stream. Whenever you ask me to pick between fixed options (like the flow choice), use your interactive multiple-choice question tool (AskUserQuestion) so I can select with the arrow keys and Enter instead of typing. Only fall back to a plain typed question for free-text answers like a room name.\\n\\nFollow these steps exactly, in order:\\n'+
      '1. If CREATE: check the room name is free with GET '+S+'/api/check-room?name=<ROOM NAME, url-encoded>. If \\"reason\\":\\"room_name_taken\\" -> tell me that room name is taken (they are globally unique), ask for another, and re-check until \\"ok\\":true.\\n'+
      '2. If JOIN: verify the room exists with GET '+S+'/api/rooms/<CODE>/check. If \\"reason\\":\\"room_not_found\\" -> tell me the code looks wrong and stop.\\n'+
      '3. Run the setup IN THE BACKGROUND so you can read its output while it waits. GET ON THE BOARD: npx github:codiejay/cc-rank login. JOIN: npx github:codiejay/cc-rank join <CODE>. CREATE: npx github:codiejay/cc-rank create --name \\"<ROOM NAME>\\" (creating auto-joins me — no separate join needed).\\n'+
      '4. The command signs me in with GitHub device flow: it prints a one-time code and the URL github.com/login/device — read BOTH from the command output, show them to me clearly, and wait while I authorize in my browser. (If my gh CLI is signed in, the command may offer to skip the browser — either path is fine.)\\n'+
      '5. When it finishes, show me what it printed: my verified GitHub login, plus the room code + dashboard link if a room was involved (global board link otherwise).\\n'+
      '6. Tell me to restart Claude Code so my prompts and edits start counting.';
  }
  function copyAgent(code, outId){
    const out = document.getElementById(outId);
    navigator.clipboard.writeText(agentPrompt(code)).then(function(){
      msg(out, 'ok', 'copied — paste it into Claude Code');
    }, function(){ msg(out, 'err', 'could not copy — is the page focused?'); });
    return false;
  }

  async function genJoin(){
    const out = document.getElementById('jOut');
    const code = document.getElementById('jCode').value.trim().toUpperCase();
    if (!code) return msg(out, 'err', 'Enter the room code first.');
    msg(out, 'ok', 'checking…');
    try {
      const room = await (await fetch('/api/rooms/'+code+'/check')).json();
      if (room.reason === 'room_not_found') return msg(out, 'err', 'Room '+code+' not found — double-check the code.');
      cmdBox(out, 'npx github:codiejay/cc-rank join '+code,
        'You\\u2019re joining '+(room.roomName||code)+' \\u2014 a private view of the global board; your global score comes with you. It signs you in with GitHub — no username to type. Needs Node.js.');
    } catch { msg(out, 'err', 'Could not reach the server — try again.'); }
  }

  async function genCreate(){
    const out = document.getElementById('cOut');
    const room = document.getElementById('cRoom').value.trim();
    if (!room) return msg(out, 'err', 'Give your room a name.');
    msg(out, 'ok', 'checking…');
    try {
      const r = await (await fetch('/api/check-room?name='+encodeURIComponent(room))).json();
      if (r.reason === 'room_name_taken') return msg(out, 'err', 'A room called "'+room+'" already exists — room names are unique. Pick another.');
      cmdBox(out, 'npx github:codiejay/cc-rank create --name '+shq(room),
        'It signs you in with GitHub, creates the room, joins you, and prints the code to share. Needs Node.js.');
    } catch { msg(out, 'err', 'Could not reach the server — try again.'); }
  }

  // ---- chart: daily columns of stacked square dots -------------------------
  // Fluid: the number of days shown and the dot size grow with the card so the
  // chart always fills its width (the API sends up to 120 days).
  let DIMS = { avail: 760, weeks: 12 };
  let MT = 15; // leaderboard meter ticks
  function measure(){
    const w = document.getElementById('content').clientWidth || 940;
    DIMS.avail = Math.max(380, w - 64 /*content pad*/ - 44 /*card pad*/ - 42 /*y-axis*/);
    MT = w > 1250 ? 22 : w < 600 ? 9 : 15;
  }
  function seriesMap(series){
    const m = {};
    (series || []).forEach(function(r){ m[r.day] = { p: r.prompts||0, e: r.edits||0 }; });
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
  function chartHtml(series){
    const sm = seriesMap(series);
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
    const cols = h.weeks.map(function(col){
      return '<div class="ccol">'+col.map(function(d){
        if (!d) return '<i class="off"></i>';
        const v = sm[d] || {p:0,e:0};
        return '<i class="l'+levelFor(metricOf(v), q)+'" data-d="'+d+
          '" data-p="'+v.p+'" data-e="'+v.e+'"></i>';
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
        '<div class="heat" style="--cell:'+h.cell+'px" id="dotchart">'+cols+none+'</div>'+
        '<div class="heatfoot"><span>less</span>'+
          [0,1,2,3,4].map(function(l){ return '<i class="l'+l+'"></i>'; }).join('')+
          '<span>more</span></div>'+
        '<div class="tip" id="tip"></div>'+
      '</div></div></div>';
  }
  function bindChart(){
    const chart = document.getElementById('dotchart'), tip = document.getElementById('tip');
    if (!chart || !tip) return;
    chart.addEventListener('mouseover', function(ev){
      const cell = ev.target.closest ? ev.target.closest('i[data-d]') : null;
      if (!cell) return;
      const d = cell.getAttribute('data-d'), p = +cell.getAttribute('data-p'), e = +cell.getAttribute('data-e');
      const nice = new Date(d+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      tip.innerHTML = '<div class="d">'+nice+'</div><div class="v">'+fmt(p+e)+
        ' <small>pts &middot; '+fmt(p)+' prompts &middot; '+fmt(e)+' edits</small></div>';
      // Keep the tip INSIDE the scroll container — anything outside its box
      // gets clipped by overflow and never shows.
      tip.style.display = 'block';
      const cr = chart.getBoundingClientRect(), r = cell.getBoundingClientRect();
      const x = r.left - cr.left + r.width/2;
      tip.style.left = Math.max(95, Math.min(x, cr.width - 95)) + 'px';
      tip.style.top = '0px'; tip.style.transform = 'translate(-50%,0)';
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
  function rowsHtml(rows, withRoom){
    if (!rows.length) return '<div class="lempty"><b>Nothing counted yet'+(mode==='today'?' today':'')+'.</b>'+
      '<span>Restart Claude Code, send a prompt &mdash; it lands here in seconds.</span></div>';
    const max = rows[0].score;
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
      return '<div class="lrow" style="--i:'+i+'">'+
        '<div class="rk'+(r.rank===1?' r1':'')+'">'+(r.rank<10?'0':'')+r.rank+'</div>'+
        avatar(login, r.avatar)+
        '<div><div class="nm"><a href="https://github.com/'+encodeURIComponent(login)+
        '" target="_blank" rel="noopener" style="text-decoration:none">'+esc(login)+'</a>'+chips+streak+delta+'</div>'+
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
    return '<section class="onboard"><div class="onb-in">'+
      '<div class="onb-head">'+claudeBurst('burst-ico')+'<h3>Get on the board</h3>'+
      '<span class="onb-tag">Start here</span></div>'+
      '<div class="pad">'+termDemo()+
      '<p class="hint">One prompt in Claude Code sets everything up &mdash; sign in with GitHub (real auth, no typed names) and you&rsquo;re on the global board with every ccrank user.</p>'+
      '<button class="btn dark glow" onclick="copyAgent(null, \\'aOut\\')">Copy the agent prompt</button>'+
      '<div id="aOut" style="margin-bottom:10px"></div>'+
      '<details><summary>Join a room by hand</summary><div class="fields">'+
        '<input id="jCode" class="up" placeholder="ROOM CODE" maxlength="6" autocomplete="off" />'+
        '<button class="btn ghost" onclick="genJoin()">Get my join command</button>'+
        '<div id="jOut"></div></div></details>'+
      '<details><summary>Create a room</summary><div class="fields">'+
        '<input id="cRoom" placeholder="room name" maxlength="60" autocomplete="off" />'+
        '<button class="btn ghost" onclick="genCreate()">Get my create command</button>'+
        '<div id="cOut"></div></div></details>'+
      '</div></div></section>';
  }
  function howCard(){
    return '<section class="card"><div class="cardhead"><h3>How scoring works</h3></div>'+
      '<div class="pad" style="padding-top:6px">'+
      '<div class="scorehow"><kbd>prompt sent</kbd> to Claude Code <span class="pt">+1</span></div>'+
      '<div class="scorehow"><kbd>file edited</kbd> by Claude <span class="pt">+1</span></div>'+
      '<div class="scorehow" style="color:var(--muted)">one global score &mdash; every room shows the same totals</div>'+
      '<div class="scorehow" style="color:var(--muted)">counts only &mdash; code never leaves your machine</div>'+
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
      body = '<div class="none">No points yet today &mdash; the first prompt takes the lead.</div>';
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
  function renderSide(){
    // Directory shows room NAMES only. The one room we may link to is the one
    // being viewed — reaching it required knowing its code already.
    const rooms = (GLOBAL && GLOBAL.roomsList) || [];
    document.getElementById('roomCnt').textContent = rooms.length || '';
    const current = (CODE && ROOM && ROOM.room) ? ROOM.room.name : null;
    document.getElementById('navRooms').innerHTML = rooms.map(function(r){
      const h = hue(String(r.name).toLowerCase());
      const dot = '<span class="rdot" style="background:hsl('+h+',55%,62%)"></span>';
      if (current && r.name === current)
        return '<a class="nav on" href="/r/'+encodeURIComponent(CODE)+'">'+dot+esc(r.name)+
          '<span class="code">'+esc(CODE)+'</span></a>';
      return '<div class="nav static" title="joining needs a code from a member">'+dot+esc(r.name)+'</div>';
    }).join('');
    document.getElementById('navHome').className = 'nav' + (CODE ? '' : ' on');
  }
  function renderTop(){
    const crumb = document.getElementById('crumb');
    if (NOTFOUND) crumb.innerHTML = 'Room not found';
    else if (CODE && ROOM) crumb.innerHTML = esc(ROOM.room.name)+' <span class="codechip">'+esc(CODE)+'</span>';
    else if (CODE) crumb.innerHTML = '<span class="codechip">'+esc(CODE)+'</span>';
    else crumb.textContent = 'Overview';
    document.getElementById('segAll').className = mode==='allTime' ? 'on' : '';
    document.getElementById('segToday').className = mode==='today' ? 'on' : '';
  }

  // ---- landing hero --------------------------------------------------------
  // A fake "ccrank top" session on a slow liquid wash — but the board it
  // prints is the REAL live global top 5. Types once, then stays put
  // (noanim) so polling repaints don't replay the intro.
  let heroPlayed = false;
  const HTICKS = 12;
  function heroRow(r, i, max, d){
    const filled = (max > 0 && r.score > 0) ? Math.max(1, Math.round(r.score / max * HTICKS)) : 0;
    let ticks = '';
    for (let k = 0; k < HTICKS; k++) ticks += '<i class="'+(k < filled ? 'on' : '')+'"></i>';
    const login = r.login || r.name;
    const streak = r.streak >= 2 ? '<i>\\uD83D\\uDD25'+r.streak+'d</i>' : '';
    return '<span class="hrow" style="--d:'+d.toFixed(2)+'s">'+
      '<b class="hrk'+(r.rank === 1 ? ' one' : '')+'">'+(r.rank < 10 ? '0' : '')+r.rank+'</b>'+
      '<span class="hnm">'+esc(login)+streak+'</span>'+
      '<span class="htick" aria-hidden="true">'+ticks+'</span>'+
      '<b class="hsc">'+fmt(r.score)+'</b></span>';
  }
  function heroHtml(){
    const rows = ((GLOBAL && GLOBAL.allTime) || []).slice(0, 5);
    const users = (GLOBAL && GLOBAL.stats || {}).players || 0;
    const max = rows.length ? rows[0].score : 0;
    let d = 1.35, lines = '<span class="hl hfade" style="--d:1.15s"><span class="hmut">'+
      (rows.length
        ? '<span class="hok">\\u2713</span> global board \\u00B7 '+fmt(users)+' user'+(users===1?'':'s')+' \\u00B7 live'
        : '<span class="hok">\\u2713</span> connected \\u00B7 board is empty \\u2014 rank 01 is free')+
      '</span></span>';
    rows.forEach(function(r, i){ lines += heroRow(r, i, max, d += .18); });
    lines += '<span class="hl hfade" style="--d:'+(d + .4).toFixed(2)+
      's"><span class="ps">$</span> <span class="caret"></span></span>';
    const html =
      '<section class="hero">'+
        '<div class="liq" aria-hidden="true"><i class="b1"></i><i class="b2"></i>'+
          '<i class="b3"></i><i class="b4"></i><i class="b5"></i><i class="b6"></i></div>'+
        '<div class="hero-head"><h1>Every prompt counts.</h1>'+
          '<p>One global board for every Claude Code user \\u2014 prompts and edits, ranked live. Rooms if you want your own crew.</p></div>'+
        '<div class="heroterm'+(heroPlayed ? ' noanim' : '')+'" role="img" '+
          'aria-label="terminal showing the live global leaderboard">'+
          '<div class="term-bar"><i class="r"></i><i class="y"></i><i class="g"></i>'+
            '<span>ccrank \\u00B7 live</span></div>'+
          '<div class="ht-body">'+
            '<span class="hl"><span class="ps">$</span> <b class="htype">ccrank top</b></span>'+
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
      label.textContent = 'Copied \\u2014 paste it in Claude Code';
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

  // ---- page paint ----------------------------------------------------------
  function totalsFromRows(rows){
    return rows.reduce(function(t, r){
      t.prompts += r.prompts; t.edits += r.edits; t.score += r.score; return t;
    }, { prompts: 0, edits: 0, score: 0 });
  }
  function paint(){
    const data = CODE ? ROOM : GLOBAL;
    const key = JSON.stringify([CODE, mode, metric, NOTFOUND, data]);
    if (key === lastKey) return; // nothing changed — don't repaint the poll
    lastKey = key;
    measure(); // fluid chart + meter sizing from the current viewport
    renderSide(); renderTop();
    const content = document.getElementById('content');
    if (NOTFOUND){
      content.innerHTML = '<section class="card notfound"><b>No room answers to '+esc(CODE)+'.</b>'+
        '<span>Double-check the code &mdash; or <a href="/">start a new room</a>.</span></section>';
      return;
    }
    if (!data){ return; } // first fetch still in flight
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
        '<div class="cardhead"><h3>Activity</h3><span class="sub">last '+
          DIMS.weeks+' weeks &middot; UTC days</span></div>'+
        '<div class="chartwrap">'+chartBlock+'</div>'+
        stripHtml(data.series, totals)+
      '</section>'+
      '<section class="card">'+
        '<div class="cardhead" style="padding-bottom:12px"><h3>Leaderboard</h3>'+
        '<span class="sub right">'+boardSub+'</span></div>'+
        rowsHtml(rows, !CODE)+
      '</section>'+
      '<div class="rail">'+(CODE ? inviteCard()+raceCard(data.today||[]) : onboardCard()+howCard())+'</div>'+
      '</div>';
    bindChart();
    // Arriving via an invite link? Prefill the join code inside the details.
    if (!CODE){
      const pre = new URLSearchParams(location.search).get('join');
      if (pre && !prefilled){ prefilled = true;
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
      paint();
    } catch { /* keep last render */ }
  }

  let rt = 0;
  window.addEventListener('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(function(){ lastKey = ''; paint(); }, 180);
  });

  loadGlobal();                              // sidebar + landing need it everywhere
  if (CODE){ loadRoom(); setInterval(loadRoom, 5000); setInterval(loadGlobal, 30000); }
  else setInterval(loadGlobal, 8000);
</script>
</body>
</html>`;
}
