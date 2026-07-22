# 🏆 ccrank

The global **Claude Code leaderboard**. Sign in with GitHub, and every prompt
you send and every file Claude edits scores you a point. One global board,
every ccrank user, live in your terminal statusline and on a web dashboard.
Want a board that's just your crew? Create a private room.

It counts **prompts** and **file edits** via Claude Code's own hooks. It sends
**counts and metadata only, never your code**.

```
🥇  jay      prompts 128   edits 94   score 222
🥈  ada      prompts 111   edits 80   score 191
🥉  linus    prompts  76   edits 60   score 136
```

---

## Get on the board

```bash
npx github:codiejay/cc-rank login
```

Sign in with GitHub (device flow: enter a one-time code at
`github.com/login/device`, or reuse your `gh` CLI session), restart Claude
Code, and your prompts and edits start counting on the global board. Check
your rank anytime with `ccrank status` or on the dashboard at
`https://<the-server>/`.

New machine? Just `ccrank login` again. GitHub is your identity, so there's
nothing else to recover.

**No fresh start at the bottom:** on sign-in, ccrank offers to backfill your
last 7 days from your local Claude Code history (`~/.claude/projects`
transcripts). It sends per-day **counts only, never your code** — one shot per
account, only for days with no tracked events yet, normal daily caps apply.
Missed it? `npx github:codiejay/cc-rank backfill`.

To stop: `npx github:codiejay/cc-rank leave`.

**Stays fresh by itself:** once a day the installed hook checks this repo's
latest commit (via the ccrank server, repo hard-pinned client-side) and
silently re-runs the installer when there's something new. You never run
`update` by hand again after this version.

> The client defaults to the maintainer's deployed server. To point at your own,
> set `CCRANK_SERVER=https://your-worker.workers.dev` or pass `--server`.

---

## Rooms (optional)

Same global scores, filtered to your people: friends, teammates, coworkers.

```bash
# create one. prints a 6-character code to share
npx github:codiejay/cc-rank create --name "The Squad"

# everyone else joins with the code (signs them in if needed)
npx github:codiejay/cc-rank join ABC123
```

The room board lives at `https://<the-server>/r/ABC123`. Your score is the
same everywhere. Rooms are just a private view of the global board.

---

## How it works

Claude Code fires shell hooks on lifecycle events. ccrank installs two tiny ones:

| Event | Fires on | Counts as |
|-------|----------|-----------|
| `UserPromptSubmit` | every prompt you send | +1 prompt |
| `PostToolUse` (Edit/Write/MultiEdit) | every file change | +1 edit (weighted by lines) |

Each hook POSTs a count to a small **Cloudflare Worker** (free tier, always-on),
which aggregates per user and serves the standings. A statusline script shows
your live rank; if you already had a statusline, ccrank runs it first and just
appends the rank so nothing is lost.

```
your machine                          the server (Cloudflare Worker + D1)
┌────────────────────┐               ┌──────────────────────────┐
│ Claude Code         │  POST count  │ /api/events  → D1         │
│  hook ──────────────┼─────────────▶│ /api/rooms/:code (board)  │
│  statusline ◀───────┼──── rank ────┤ /api/me      (your rank)  │
└────────────────────┘               │ /r/:code     (dashboard)  │
                                     └──────────────────────────┘
```

---

## Host your own server (one-time, free, ~5 min)

Requires a free [Cloudflare account](https://dash.cloudflare.com/sign-up), no
domain, no credit card.

```bash
cd server
npm install
npx wrangler login

# create the D1 database, then paste the printed database_id into wrangler.toml
npm run db:create

# create the tables
npm run db:init

# deploy. prints your https://ccrank.<you>.workers.dev URL
npm run deploy
```

Then set that URL as the client default: edit `DEFAULT_SERVER` in
[`bin/ccrank.mjs`](bin/ccrank.mjs), or just have everyone export
`CCRANK_SERVER=https://ccrank.<you>.workers.dev`.

Get on your board:

```bash
CCRANK_SERVER=https://ccrank.<you>.workers.dev npx github:codiejay/cc-rank login
```

---

## Commands

```
ccrank login                         sign in with GitHub, get on the global board
ccrank join <CODE>                   join a private room (signs you in if needed)
ccrank create --name "Room name"     create a room, auto-joins you
ccrank update                        pull the latest scripts (no re-auth)
ccrank status                        show your global rank + rooms
ccrank leave                         remove the hooks
```

---

## Privacy

- Hooks send **counts and metadata only** (`prompt`/`edit`, a line count). Your
  prompts, file contents, and diffs **never leave your machine**.
- Identity is your real GitHub account, verified server-side via GitHub's
  device flow. Scope `read:user`, public profile only. ccrank can't touch
  your code, repos, or orgs.
- Numbers are self-reported (hooks run on your machine), so this is built for
  **bragging rights**, not tamper-proof competition. Be cool.

## License

MIT
