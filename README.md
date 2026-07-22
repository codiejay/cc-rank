# mostcracked

The global **coding-agent leaderboard** — [mostcracked.com](https://mostcracked.com).

Sign in with GitHub, and every prompt you send and every file your agent edits
scores you a point. Works with Claude Code and Codex. Live on the web dashboard
and right in your terminal statusline.

It counts **prompts** and **file edits** via your agent's own hooks. It sends
**counts and metadata only, never your code**.

```
🥇  jay      prompts 128   edits 94   score 222
🥈  ada      prompts 111   edits 80   score 191
🥉  linus    prompts  76   edits 60   score 136
```

## Get on the board

```bash
npx mostcracked login
```

Sign in with GitHub (device flow: enter a one-time code at
`github.com/login/device`, or reuse your `gh` CLI session), restart your agent,
and your prompts and edits start counting. Check your rank anytime with
`npx mostcracked status` or at [mostcracked.com](https://mostcracked.com).

New machine? Just `npx mostcracked login` again. GitHub is your identity, so
there's nothing else to recover.

**No fresh start at the bottom:** on sign-in it offers to backfill your last 7
days from your local agent history — per-day **counts only, never your code**,
one shot per account.

**Stays fresh by itself:** the installed hook quietly picks up new versions of
these scripts. You never run `update` by hand.

To stop: `npx mostcracked leave`.

## Privacy

- Identity is real GitHub auth (`read:user` scope — public profile only). It
  can't touch your code, repos, or orgs.
- Only event counts leave your machine. No prompts, no diffs, no file
  contents. Ever.
