// Self-contained dashboard page. No external assets (CSP-friendly).
export function dashboardHtml(code: string | null): string {
  const initial = code ? JSON.stringify(code) : "null";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ccrank — Claude Code leaderboard</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #0d1117; color: #e6edf3;
    font: 15px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    display: flex; flex-direction: column; align-items: center; padding: 24px 16px;
  }
  h1 { font-size: 20px; margin: 4px 0 2px; letter-spacing: .5px; }
  h1 span { color: #d29922; }
  .sub { color: #7d8590; font-size: 13px; margin-bottom: 20px; }
  .card { width: 100%; max-width: 640px; background: #161b22; border: 1px solid #30363d;
          border-radius: 12px; padding: 8px; margin-bottom: 16px; }
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
  .tab { cursor: pointer; padding: 6px 14px; border-radius: 999px; border: 1px solid #30363d;
         color: #7d8590; background: transparent; font: inherit; }
  .tab.active { color: #0d1117; background: #d29922; border-color: #d29922; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 12px; }
  th { color: #7d8590; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
  tr + tr td { border-top: 1px solid #21262d; }
  .rank { width: 40px; color: #7d8590; }
  .medal { font-size: 18px; }
  .name { font-weight: 600; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .score { color: #d29922; font-weight: 700; }
  .muted { color: #7d8590; }
  .join { max-width: 640px; width: 100%; text-align: center; color: #7d8590; font-size: 13px; }
  .join code { color: #58a6ff; background: #161b22; padding: 2px 8px; border-radius: 6px; }
  input { font: inherit; padding: 8px 12px; border-radius: 8px; border: 1px solid #30363d;
          background: #0d1117; color: #e6edf3; }
  button.go { font: inherit; padding: 8px 16px; border-radius: 8px; border: 0; cursor: pointer;
              background: #238636; color: #fff; font-weight: 600; }
  .empty { text-align: center; color: #7d8590; padding: 28px; }
</style>
</head>
<body>
  <h1>🏆 <span>ccrank</span></h1>
  <div class="sub">who's shipping the most in Claude Code</div>

  <div id="picker" class="join" style="margin-bottom:20px">
    <form onsubmit="go(event)">
      <input id="codeInput" placeholder="room code" maxlength="6"
             style="text-transform:uppercase" autocomplete="off" />
      <button class="go" type="submit">view</button>
    </form>
  </div>

  <div id="app" style="width:100%; display:flex; flex-direction:column; align-items:center"></div>

<script>
  let CODE = ${initial};
  let mode = "allTime";

  function go(e){ e.preventDefault();
    const v = document.getElementById('codeInput').value.trim().toUpperCase();
    if (v) location.href = '/r/' + v;
  }
  function medal(r){ return r===1?'🥇':r===2?'🥈':r===3?'🥉':r; }

  async function load(){
    if (!CODE) return;
    document.getElementById('picker').style.display = 'none';
    try {
      const res = await fetch('/api/rooms/' + CODE);
      if (!res.ok) { render(null); return; }
      render(await res.json());
    } catch { /* keep last render */ }
  }

  function render(data){
    const app = document.getElementById('app');
    if (!data){ app.innerHTML = '<div class="empty">Room <b>'+CODE+'</b> not found.</div>'; return; }
    const rows = (mode === 'today' ? data.today : data.allTime);
    const tabs =
      '<div class="tabs">' +
      '<button class="tab '+(mode==='allTime'?'active':'')+'" onclick="setMode(\\'allTime\\')">all-time</button>' +
      '<button class="tab '+(mode==='today'?'active':'')+'" onclick="setMode(\\'today\\')">today</button>' +
      '</div>';
    const body = rows.length ? rows.map(function(r){
      return '<tr>' +
        '<td class="rank medal">'+medal(r.rank)+'</td>' +
        '<td class="name">'+esc(r.name)+'</td>' +
        '<td class="num muted">'+r.prompts+'</td>' +
        '<td class="num muted">'+r.edits+'</td>' +
        '<td class="num score">'+r.score+'</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="5" class="empty">No activity yet — go write some code!</td></tr>';

    app.innerHTML =
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px">'+esc(data.room.name)+
        ' <span class="muted" style="font-weight:400">· '+CODE+'</span></div>' +
      tabs +
      '<div class="card"><table>' +
        '<tr><th class="rank">#</th><th>player</th><th class="num">prompts</th>' +
        '<th class="num">edits</th><th class="num">score</th></tr>' +
        body +
      '</table></div>' +
      '<div class="join">share this room: <code>ccrank join '+CODE+' --name YOU</code></div>';
  }
  function setMode(m){ mode = m; load(); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }

  if (CODE){ load(); setInterval(load, 5000); }
</script>
</body>
</html>`;
}
