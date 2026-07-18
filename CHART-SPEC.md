# the weekly 25 — spec

The weekly chart. ccrank's Hot 100. Top 25 Claude Coders of the week, drops
every Monday.

## Names (locked)

- Chart name: **the weekly 25**
- People who chart: **cracked** ("this week's cracked")
- The #1: **most cracked** (headline: "jay is this week's most cracked")
- Copy voice: lowercase, casual, James's voice (same as badges). Never
  corporate, never AI-sounding.

## Chart week

- Week = **Monday 00:00 UTC → Sunday 23:59:59 UTC**.
- Chart **drops Monday**. During the week, weekly standings are HIDDEN
  (tease only) — the drop must feel like a drop.
- Week id format: ISO week string `2026-W30` (or the Monday date
  `2026-07-20` — pick one, use everywhere).

## Scoring + integrity

- Weekly score = prompts + edits inside the chart week (same scoring as
  global, just windowed).
- **Daily cap (prerequisite): max 500 counted events per user per UTC day.**
  Events past the cap still insert (keep raw data) but are excluded from all
  scores — add `capped INTEGER DEFAULT 0` to events, set at insert time by
  counting today's rows, filter `capped = 0` in every score query (global
  board too, not just chart).
- Ties break by earlier `created_at` (same as global board).

## Data

New table:

```sql
CREATE TABLE chart_weeks (
  week      TEXT NOT NULL,     -- '2026-07-20' (that week's Monday)
  user_id   INTEGER NOT NULL,  -- github_id
  position  INTEGER NOT NULL,  -- 1..25
  score     INTEGER NOT NULL,
  prompts   INTEGER NOT NULL,
  edits     INTEGER NOT NULL,
  PRIMARY KEY (week, user_id)
);
CREATE INDEX idx_chart_user ON chart_weeks(user_id, week);
```

Derived at read time by joining current week vs history (no extra columns):

- **movement**: position vs last week (`▲n` / `▼n` / `—`)
- **NEW**: user has no prior row in chart_weeks
- **RE**: user has prior rows but not last week
- **peak**: MIN(position) over all their rows
- **weeks on chart**: COUNT of their rows

## Finalizing a week (no cron)

Lazy finalize: on any request that needs the chart, if the latest completed
week has no rows in `chart_weeks`, compute it from `events` (capped=0,
week window, top 25) and insert. Idempotent — INSERT OR IGNORE keyed on
(week, user_id). Concurrent requests are safe because the PK dedupes.
Fewer than 25 active users that week → chart is just shorter, fine.

## API

- Extend `/api/global` payload with a `chart` object:
  - `state`: `"cooking" | "locks_tonight" | "dropped"` (dropped = Mon+Tue,
    then back to cooking Wed)
  - `week`, `daysLeft`
  - `entries` (only when latest finalized week exists): `[{position, login,
    avatar, prompts, edits, score, movement, tag: "NEW"|"RE"|null, peak,
    weeks}]` — always from the FINALIZED week, never live standings.
- `/api/chart/:week` (optional, later): past charts archive.

## UI (dashboard)

Banner above the leaderboard, three states:

1. **Tue–Sat — cooking**: quiet strip.
   copy: `the weekly 25 is cooking · drops monday · 4 days left`
   No standings shown. No spoilers.
2. **Sunday — locks tonight**: same strip, urgent accent.
   copy: `the weekly 25 locks tonight · last chance to move`
3. **Mon–Tue — the drop**: expanded banner.
   - Headline: most cracked — big avatar, login (links to github.com/login),
     `prompts · edits · score`, crown treatment (reuse podium gold styling).
     copy: `jay is this week's most cracked`
   - Below: rows 2–10 compact: `#2 ▲4 ada · 1,204 pts · NEW`
   - "see all 25" expands the full chart.
   - Movement arrows: ▲ green, ▼ red, — muted. Mono numerals per DESIGN.md.
   - Full row: `#7  ▲3  [avatar] jay  prompts 128  edits 94  1,222 pts
     peak #3 · 6 wks`
4. Dark mode: token pairs only, per DESIGN.md. No new hardcoded hexes.

## Share cards (og-service, reuse existing pipeline)

1. **Chart card** — the Monday poster: "the weekly 25 · week of jul 20",
   top 10 with movement arrows, most-cracked spotlight up top. Route:
   `/og/chart.png` (+ `/chart` page carrying the meta tags). This is the
   card that gets posted to X every Monday.
2. **Personal chart card** — added to the existing share menu when the
   viewer charted: rank medallion style, `debuted at #7` or `#3 · ▲2 ·
   peak #1 · 6 wks on chart`, their week's prompts/edits, heatmap strip.
   Route: `/og/chart/:login.png`.

## README badge (separate, ships first)

- `GET /badge/:login.svg` — pure SVG on the Worker, no Vercel, no satori.
- Variants via query param:
  - default: `ccrank | #14 · 12,847 pts` (all-time global rank)
  - `?chart`: `ccrank weekly | #7 ▲3` — last finalized chart position;
    `ccrank weekly | didn't chart` if absent.
- Style: shields flat look, coral #F1590F accent, mono numerals.
- Unknown login / zero events → render `ccrank | unranked` (never 404 —
  don't break READMEs).
- `Cache-Control: public, max-age=3600` + Worker edge cache.
- Dashboard share menu gets **copy README badge** → copies markdown:
  `[![ccrank](https://<server>/badge/jay.svg)](https://<server>/u/jay)`

## Build order

1. README badge (ships alone, immediate value)
2. Daily cap (`capped` column + insert logic + filter every score query)
3. `chart_weeks` table + lazy finalize + `chart` in /api/global
4. Banner (3 states) + full chart UI
5. OG chart cards + share-menu entries
