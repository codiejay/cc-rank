# 🏆 ccrank

A **Claude Code leaderboard** for you and your friends. Create a room, share the
code, and as everyone uses Claude Code, ccrank ranks who's shipping the most —
right in the terminal statusline and on a live web dashboard.

It counts **prompts** and **file edits** via Claude Code's own hooks. It sends
**only counts and metadata — never your code**.

```
🥇  jay      prompts 128   edits 94   score 222
🥈  ada      prompts 111   edits 80   score 191
🥉  linus    prompts  76   edits 60   score 136
```

---

## How it works

Claude Code fires shell hooks on lifecycle events. ccrank installs two tiny ones:

| Event | Fires on | Counts as |
|-------|----------|-----------|
| `UserPromptSubmit` | every prompt you send | +1 prompt |
| `PostToolUse` (Edit/Write/MultiEdit) | every file change | +1 edit (weighted by lines) |

Each hook POSTs a count to a small **Cloudflare Worker** (free tier, always-on),
which aggregates per room and serves the standings. A statusline script shows
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

## Play (for your friends)

Once someone has created a room and shared the code:

```bash
npx github:codiejay/cc-rank join ABC123 --name YOUR_NAME
```

That's it — restart Claude Code and your prompts/edits start counting. Check
standings anytime at `https://<the-server>/r/ABC123` or run `ccrank status`.

To stop: `npx github:codiejay/cc-rank leave`.

> The client defaults to the maintainer's deployed server. To point at your own,
> set `CCRANK_SERVER=https://your-worker.workers.dev` or pass `--server`.

---

## Host your own server (one-time, free, ~5 min)

Requires a free [Cloudflare account](https://dash.cloudflare.com/sign-up) — no
domain, no credit card.

```bash
cd server
npm install
npx wrangler login

# create the D1 database, then paste the printed database_id into wrangler.toml
npm run db:create

# create the tables
npm run db:init

# deploy — prints your https://ccrank.<you>.workers.dev URL
npm run deploy
```

Then set that URL as the client default: edit `DEFAULT_SERVER` in
[`bin/ccrank.mjs`](bin/ccrank.mjs), or just have everyone export
`CCRANK_SERVER=https://ccrank.<you>.workers.dev`.

Create the first room:

```bash
CCRANK_SERVER=https://ccrank.<you>.workers.dev npx github:codiejay/cc-rank create --name "The Squad"
```

---

## Commands

```
ccrank create --name "Room name"     create a room, get a share code
ccrank join <CODE> --name YOU        join a room + start counting
ccrank status                        show your current rank
ccrank leave                         remove the hooks
```

---

## Privacy

- Hooks send **counts and metadata only** (`prompt`/`edit`, a line count). Your
  prompts, file contents, and diffs **never leave your machine**.
- Rooms are just a code + a nickname. No accounts, no email, no OAuth.
- Numbers are self-reported (hooks run on your machine), so this is built for
  **friends having fun**, not tamper-proof competition. Be cool.

## License

MIT
