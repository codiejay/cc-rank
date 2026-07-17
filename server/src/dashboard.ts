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
  .opts { width: 100%; max-width: 640px; display: grid; gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); text-align: left; }
  .opt { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 18px; }
  .opt h3 { margin: 0 0 4px; font-size: 15px; }
  .opt .hint { color: #7d8590; font-size: 12px; margin-bottom: 12px; }
  .opt input { width: 100%; margin-bottom: 8px; }
  .opt button.go { width: 100%; }
  .cmd { margin-top: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px;
         padding: 10px 12px; font-size: 12px; color: #58a6ff; word-break: break-all;
         cursor: pointer; position: relative; }
  .cmd:hover { border-color: #58a6ff; }
  .cmd .copyhint { display: block; color: #7d8590; margin-top: 6px; font-size: 11px; }
  .msg { margin-top: 10px; font-size: 12px; }
  .msg.err { color: #f85149; }
  .msg.ok { color: #3fb950; }
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

  <div id="picker" style="width:100%;max-width:640px;margin-bottom:20px">
    <div class="opts">
      <div class="opt">
        <h3>Join a room</h3>
        <div class="hint">Got a code from a friend? Enter it and pick your player name.</div>
        <input id="jCode" placeholder="room code" maxlength="6"
               style="text-transform:uppercase" autocomplete="off" />
        <input id="jName" placeholder="your name" maxlength="40" autocomplete="off" />
        <button class="go" onclick="genJoin()">get my join command</button>
        <div id="jOut"></div>
      </div>
      <div class="opt">
        <h3>Create a room</h3>
        <div class="hint">Start your own leaderboard and invite friends.</div>
        <input id="cRoom" placeholder="room name" maxlength="60" autocomplete="off" />
        <input id="cName" placeholder="your name" maxlength="40" autocomplete="off" />
        <button class="go" onclick="genCreate()">get my create command</button>
        <div id="cOut"></div>
      </div>
      <div class="opt">
        <h3>Using a coding agent?</h3>
        <div class="hint">Paste one prompt into Claude Code — it asks your name, checks
          it&#39;s free, and runs the setup for you.</div>
        <button class="go" onclick="copyAgent(null, 'aOut')">copy agent prompt</button>
        <div id="aOut"></div>
      </div>
    </div>
    <div class="join" style="margin-top:16px">
      <form onsubmit="go(event)" style="display:inline">
        just looking? <input id="codeInput" placeholder="room code" maxlength="6"
               style="text-transform:uppercase;width:110px" autocomplete="off" />
        <button class="go" type="submit">view board</button>
      </form>
    </div>
  </div>

  <div id="app" style="width:100%; display:flex; flex-direction:column; align-items:center"></div>

<script>
  let CODE = ${initial};
  let mode = "allTime";

  function go(e){ e.preventDefault();
    const v = document.getElementById('codeInput').value.trim().toUpperCase();
    if (v) location.href = '/r/' + v;
  }

  // Quote a value for a shell command if it needs it.
  function shq(s){ return /[^A-Za-z0-9_.-]/.test(s) ? '"' + s.replace(/"/g,'') + '"' : s; }
  function msg(el, cls, text){ el.innerHTML = '<div class="msg '+cls+'">'+esc(text)+'</div>'; }
  function cmdBox(el, cmd, note){
    el.innerHTML =
      '<div class="cmd" title="click to copy">'+esc(cmd)+
        '<span class="copyhint">click to copy — paste it in your terminal, then restart Claude Code</span></div>'+
      (note ? '<div class="msg ok">'+esc(note)+'</div>' : '');
    el.firstChild.onclick = function(){
      navigator.clipboard.writeText(cmd).then(function(){
        el.firstChild.querySelector('.copyhint').textContent = 'copied!';
      });
    };
  }

  // A prompt the user pastes into their coding agent. It makes the agent ask
  // the user for their name (instead of inventing one), verify it against the
  // check endpoint, then run the real npx command.
  function agentPrompt(code){
    const S = location.origin;
    const head = code
      ? 'Help me join a ccrank room (a Claude Code leaderboard for friends). Room code: '+code+'.'
      : 'Help me set up ccrank (a Claude Code leaderboard for friends). First ask me one question and wait for my answer: do I want to JOIN an existing room (then ask me for the 6-character room code) or CREATE a new room (then ask me what to call it — and if I defer with something like \\"you pick\\", just pick a short fun room name yourself, no need to ask again)?';
    return head + '\\nServer: '+S+'\\n\\nWhenever you ask me to pick between fixed options (like JOIN vs CREATE), use your interactive multiple-choice question tool (AskUserQuestion) so I can select with the arrow keys and Enter instead of typing. Only fall back to a plain typed question for free-text answers like a room name or player name.\\n\\nFollow these steps exactly, in order:\\n'+
      '1. Ask me what player name I want on the leaderboard, and WAIT for my actual reply. Never invent, guess, or auto-fill my PLAYER name — that rule applies only to the player name; a deferred room name you may choose.\\n'+
      '2. If CREATING: check the room name is free with GET '+S+'/api/check-room?name=<ROOM NAME, url-encoded>. If \\"reason\\":\\"room_name_taken\\" -> tell me that room name is taken (they are globally unique), ask for another, and re-check until \\"ok\\":true.\\n'+
      '3. If JOINING: verify my player name is free with GET '+S+'/api/rooms/<CODE>/check?name=<NAME, url-encoded>.\\n'+
      '   - \\"reason\\":\\"name_taken\\" -> tell me, ask for a different name, re-check until \\"ok\\":true.\\n'+
      '   - \\"reason\\":\\"room_not_found\\" -> tell me the code looks wrong and stop.\\n'+
      '4. Run the setup. JOIN: npx github:codiejay/cc-rank join <CODE> --name \\"<NAME>\\". CREATE: npx github:codiejay/cc-rank create --name \\"<ROOM NAME>\\" --by \\"<NAME>\\", then join the printed code with the join command.\\n'+
      '5. The join prints a recovery code (like XXXX-XXXX). Do BOTH: (a) show it to me clearly, and (b) save it to your own memory as a fact — e.g. \\"my ccrank recovery code for room <CODE> is <CODE>\\" — and tell me explicitly: \\"I have saved your recovery code in my memory so I can give it back to you later; also keep your own copy.\\" It is the only way to reclaim my name from another machine.\\n'+
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
    const name = document.getElementById('jName').value.trim();
    if (!code) return msg(out, 'err', 'Enter the room code first.');
    if (!name) return msg(out, 'err', 'Pick your player name — it goes on the board.');
    msg(out, 'ok', 'checking…');
    try {
      const r = await (await fetch('/api/rooms/'+code+'/check?name='+encodeURIComponent(name))).json();
      if (r.reason === 'room_not_found') return msg(out, 'err', 'Room '+code+' not found — double-check the code.');
      if (r.reason === 'name_taken') return msg(out, 'err', '"'+name+'" is already taken in '+(r.roomName||code)+' — pick another name. (Is it you on a new machine? Rejoin with your recovery code.)');
      cmdBox(out, 'npx github:codiejay/cc-rank join '+code+' --name '+shq(name),
        'You\\u2019re joining '+(r.roomName||code)+'. Needs Node.js installed.');
    } catch { msg(out, 'err', 'Could not reach the server — try again.'); }
  }

  async function genCreate(){
    const out = document.getElementById('cOut');
    const room = document.getElementById('cRoom').value.trim();
    const name = document.getElementById('cName').value.trim();
    if (!room) return msg(out, 'err', 'Give your room a name.');
    if (!name) return msg(out, 'err', 'Enter your name — friends see who invited them.');
    msg(out, 'ok', 'checking…');
    try {
      const r = await (await fetch('/api/check-room?name='+encodeURIComponent(room))).json();
      if (r.reason === 'room_name_taken') return msg(out, 'err', 'A room called "'+room+'" already exists — room names are unique. Pick another.');
      cmdBox(out, 'npx github:codiejay/cc-rank create --name '+shq(room)+' --by '+shq(name),
        'It prints a room code — then join it yourself and share it. Needs Node.js installed.');
    } catch { msg(out, 'err', 'Could not reach the server — try again.'); }
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
      '<div class="join">invite a friend: share <code>'+CODE+'</code>, send them to ' +
        '<a href="/?join='+CODE+'" style="color:#58a6ff">the join page</a>, or ' +
        '<a href="#" style="color:#58a6ff" onclick="copyAgent(CODE, \\'rOut\\'); return false">copy an agent prompt</a>' +
        ' <span id="rOut" style="display:inline-block"></span></div>';
  }
  function setMode(m){ mode = m; load(); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }

  if (CODE){ load(); setInterval(load, 5000); }
  else {
    // Arriving via a room page's "invite a friend" link? Prefill the code.
    const pre = new URLSearchParams(location.search).get('join');
    if (pre) { document.getElementById('jCode').value = pre.toUpperCase();
               document.getElementById('jName').focus(); }
  }
</script>
</body>
</html>`;
}
