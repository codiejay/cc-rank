# ccrank analytics — saved queries

Where to run these: **dash.cloudflare.com → Storage & Databases → D1 → ccrank →
Console** — paste any query below and hit run. (Or ask Claude in a session.)

Two tables feed the metrics:

- **`events`** — CLI activity (the leaderboard stream): one row per prompt/edit,
  with `user_id` and UTC `day`. This is the *product usage* source of truth.
- **`analytics`** — the web funnel: visits, signups vs returning logins, room
  creates/joins, share-card unfurls. `actor` is a hash (`u:` = signed-in,
  stable; `v:` = anonymous, rotates daily). **Always filter `is_bot = 0` for
  human metrics** — bot rows are kept on purpose (crawler hits on share pages
  = link unfurls).

All days are UTC (`YYYY-MM-DD`).

---

## THE ONE QUERY — full daily overview (start here)

One row per day, everything at once: usage, growth, funnel, virality, geo,
referrers. This is the only query you need for a routine check-in.

```sql
WITH days AS (
  SELECT DISTINCT day FROM events
  UNION
  SELECT DISTINCT day FROM analytics
  UNION
  SELECT DISTINCT date(created_at/1000,'unixepoch') FROM users
)
SELECT d.day,
  (SELECT COUNT(DISTINCT user_id) FROM events e WHERE e.day = d.day)                                         AS active_players,
  (SELECT COUNT(DISTINCT user_id) FROM events e WHERE e.day BETWEEN date(d.day,'-6 days') AND d.day)         AS wau,
  (SELECT COUNT(*) FROM events e WHERE e.day = d.day AND e.kind='prompt')                                    AS prompts,
  (SELECT COUNT(*) FROM events e WHERE e.day = d.day AND e.kind='edit')                                      AS edits,
  (SELECT COUNT(*) FROM users u WHERE date(u.created_at/1000,'unixepoch') = d.day)                           AS new_signups,
  (SELECT COUNT(*) FROM users u WHERE date(u.created_at/1000,'unixepoch') <= d.day)                          AS total_players,
  (SELECT COUNT(DISTINCT actor) FROM analytics a WHERE a.day = d.day AND a.event='page_view' AND a.is_bot=0) AS unique_visitors,
  (SELECT COUNT(*) FROM analytics a WHERE a.day = d.day AND a.event='login')                                 AS returning_logins,
  (SELECT COUNT(*) FROM analytics a WHERE a.day = d.day AND a.event='room_create')                           AS rooms_created,
  (SELECT COUNT(*) FROM analytics a WHERE a.day = d.day AND a.event='room_join')                             AS room_joins,
  (SELECT COUNT(*) FROM analytics a WHERE a.day = d.day AND a.event='page_view' AND a.is_bot=0
     AND a.props LIKE '%"share"%')                                                                           AS share_page_views,
  (SELECT COUNT(*) FROM analytics a WHERE a.day = d.day AND a.event='og_card' AND a.is_bot=1)                AS crawler_unfurls,
  (SELECT GROUP_CONCAT(x.country || ':' || x.n, '  ') FROM (
     SELECT country, COUNT(DISTINCT actor) AS n FROM analytics a
     WHERE a.day = d.day AND a.event='page_view' AND a.is_bot=0 AND country IS NOT NULL
     GROUP BY country ORDER BY n DESC LIMIT 3) x)                                                            AS top_countries,
  (SELECT GROUP_CONCAT(x.ref || ':' || x.n, '  ') FROM (
     SELECT ref, COUNT(*) AS n FROM analytics a
     WHERE a.day = d.day AND a.event='page_view' AND a.is_bot=0 AND ref IS NOT NULL
     GROUP BY ref ORDER BY n DESC LIMIT 3) x)                                                                AS top_referrers
FROM days d
ORDER BY d.day DESC
LIMIT 60;
```

The queries below are the deep-dives (retention cohorts, per-player
stickiness) that don't fit a one-row-per-day shape.

## Headline numbers (the investor slide)

### DAU — players who actually used the CLI, per day (last 30 days)
```sql
SELECT day, COUNT(DISTINCT user_id) AS active_players
FROM events
WHERE day >= date('now', '-30 days')
GROUP BY day ORDER BY day DESC;
```

### WAU / MAU (as of today)
```sql
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM events WHERE day >= date('now', '-7 days'))  AS wau,
  (SELECT COUNT(DISTINCT user_id) FROM events WHERE day >= date('now', '-30 days')) AS mau,
  (SELECT COUNT(*) FROM users) AS total_signups;
```

### Signups per day
```sql
SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS signups
FROM users
GROUP BY day ORDER BY day DESC;
```

## Retention

### Day-7 retention by signup cohort
Of the people who signed up on a given day, how many were still submitting
events 7+ days later? (The number a buyer will ask for first.)
```sql
WITH cohort AS (
  SELECT github_id, date(created_at / 1000, 'unixepoch') AS cohort_day
  FROM users
)
SELECT c.cohort_day,
       COUNT(*) AS signups,
       SUM(EXISTS (
         SELECT 1 FROM events e
         WHERE e.user_id = c.github_id
           AND e.day >= date(c.cohort_day, '+7 days')
       )) AS retained_d7
FROM cohort c
WHERE c.cohort_day <= date('now', '-7 days')
GROUP BY c.cohort_day ORDER BY c.cohort_day DESC;
```

### Stickiness — distinct active days per player (last 30 days)
```sql
SELECT u.login, COUNT(DISTINCT e.day) AS active_days
FROM events e JOIN users u ON u.github_id = e.user_id
WHERE e.day >= date('now', '-30 days')
GROUP BY e.user_id ORDER BY active_days DESC LIMIT 50;
```

## Funnel (needs the `analytics` table — data starts 2026-07-18)

### Visit → signup, per day
```sql
SELECT day,
  COUNT(DISTINCT CASE WHEN event = 'page_view' THEN actor END) AS unique_visitors,
  SUM(event = 'signup') AS signups,
  SUM(event = 'login')  AS returning_logins,
  SUM(event = 'room_create') AS rooms_created,
  SUM(event = 'room_join')   AS room_joins
FROM analytics
WHERE is_bot = 0
GROUP BY day ORDER BY day DESC;
```

### Where is traffic coming from? (external referrers)
```sql
SELECT ref, COUNT(*) AS visits, COUNT(DISTINCT actor) AS visitors
FROM analytics
WHERE event = 'page_view' AND is_bot = 0 AND ref IS NOT NULL
GROUP BY ref ORDER BY visits DESC;
```

### Geography
```sql
SELECT country, COUNT(DISTINCT actor) AS visitors
FROM analytics
WHERE event = 'page_view' AND is_bot = 0 AND day >= date('now', '-30 days')
GROUP BY country ORDER BY visitors DESC;
```

### Virality — share pages & card unfurls
`page_view` with page=share and `og_card` bot hits = links being pasted into
X/Slack/WhatsApp (each unfurl means someone shared their card somewhere).
```sql
SELECT day,
  SUM(event = 'page_view' AND props LIKE '%"share"%' AND is_bot = 0) AS human_share_views,
  SUM(event = 'og_card' AND is_bot = 1) AS crawler_unfurls
FROM analytics
GROUP BY day ORDER BY day DESC;
```

## Volume / health

### Events per day (leaderboard stream)
```sql
SELECT day,
  SUM(kind = 'prompt') AS prompts,
  SUM(kind = 'edit')   AS edits,
  COUNT(*) AS total
FROM events
GROUP BY day ORDER BY day DESC LIMIT 30;
```
