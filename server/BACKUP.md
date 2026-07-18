# ccrank — database backups

The ccrank data lives in a single Cloudflare D1 database (`ccrank`). D1 has
point-in-time recovery on paid plans, but an explicit, off-Cloudflare export is
cheap insurance. This doc covers three levels, simplest first.

## 1. Manual backup (do this before any risky migration)

```sh
cd server
npm run db:backup
```

That runs:

```sh
wrangler d1 export ccrank --output=backup-$(date +%Y%m%d-%H%M%S).sql --remote
```

It writes a timestamped `.sql` dump (schema + data) of the **remote** database
into the current directory, e.g. `backup-20260718-143022.sql`. Restore into a
fresh DB with `wrangler d1 execute ccrank --remote --file=backup-<stamp>.sql`.

> Keep the dumps OUT of git — they contain user rows (incl. hashed session
> tokens). Add `server/backup-*.sql` to `.gitignore` if you run this in-tree.

## 2. Scheduling it externally (cron)

The simplest reliable schedule is a cron job on any machine that has this repo
checked out and `wrangler` authenticated (`wrangler login`, or a
`CLOUDFLARE_API_TOKEN` env var with D1 read access).

Daily at 03:15, keeping dumps in `~/ccrank-backups`:

```sh
# crontab -e
15 3 * * * cd /path/to/cc-rank/server && \
  wrangler d1 export ccrank --output="$HOME/ccrank-backups/backup-$(date +\%Y\%m\%d-\%H\%M\%S).sql" --remote \
  >> "$HOME/ccrank-backups/backup.log" 2>&1
```

(Percent signs are escaped as `\%` because cron treats a bare `%` as a newline.)
Prune old dumps with a second cron line, e.g.
`find "$HOME/ccrank-backups" -name 'backup-*.sql' -mtime +30 -delete`.

## 3. OPTIONAL — scheduled Worker + R2 (fully in-Cloudflare)

You can also let Cloudflare back itself up on a cron trigger, storing dumps in an
R2 bucket. **This is NOT wired up in this repo** — it requires edits to
`server/wrangler.toml`, and that file is intentionally left untouched here
(it holds an uncommitted secret). If you want it, do the following yourself.

1. Create the bucket:

   ```sh
   wrangler r2 bucket create ccrank-backups
   ```

2. Add these blocks to `server/wrangler.toml` (paste as-is):

   ```toml
   [triggers]
   crons = ["15 3 * * *"]   # daily 03:15 UTC

   [[r2_buckets]]
   binding = "BACKUPS"
   bucket_name = "ccrank-backups"
   ```

3. Add a `scheduled` handler to the Worker. Note: the D1 `export` HTTP API is
   the mechanism a Worker would use (the `wrangler d1 export` CLI wraps it);
   at minimum a Worker can snapshot critical tables itself, e.g.:

   ```ts
   export default {
     ...app,  // keep the Hono fetch handler
     async scheduled(_e: ScheduledEvent, env: Bindings & { BACKUPS: R2Bucket }, _c: ExecutionContext) {
       const dump = await env.DB.prepare("SELECT * FROM users").all();
       const stamp = new Date().toISOString().replace(/[:.]/g, "-");
       await env.BACKUPS.put(`users-${stamp}.json`, JSON.stringify(dump.results));
       // ...repeat for rooms, memberships, events, or call the D1 export API.
     },
   };
   ```

   (Adjust the export type your `Bindings`/Hono setup expects.)

Until wrangler.toml is edited by hand, only levels **1** and **2** are active.
