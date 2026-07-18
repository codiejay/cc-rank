# RESET — backup, wipe, and re-init the prod DB before launch

Run from `server/`. `ccrank` is the D1 database name. **Do these in order.**
Never run step 3 before step 1+2 have succeeded.

## 1. Back up prod (do this FIRST, every time)

```bash
cd server
npm run db:backup      # -> backup-YYYYMMDD-HHMMSS.sql (from --remote)
ls -lh backup-*.sql    # confirm it's non-empty
```

## 2. Prove the backup restores (a backup you can't restore is not a backup)

```bash
# create a throwaway local DB and load the backup into it
npx wrangler d1 execute ccrank --local --file=./backup-*.sql
# sanity check the data came back
npx wrangler d1 execute ccrank --local --command "SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS events FROM events;"
```

If that prints your row counts, the backup is real. Proceed.

## 3. Wipe prod clean, then re-init schema (gets the new unique index)

```bash
# WIPE — irreversible without the backup from step 1. Order: delete, then schema.
npx wrangler d1 execute ccrank --remote --command \
  "DELETE FROM events; DELETE FROM memberships; DELETE FROM rooms; DELETE FROM users;"

# re-apply schema (idempotent; adds idx_rooms_name if missing)
npm run db:init        # wrangler d1 execute ccrank --remote --file=./schema.sql
```

## 4. Confirm clean state

```bash
npx wrangler d1 execute ccrank --remote --command \
  "SELECT (SELECT COUNT(*) FROM users) u, (SELECT COUNT(*) FROM events) e, (SELECT COUNT(*) FROM rooms) r;"
# expect u=0 e=0 r=0
```

> Note: after any deploy of the token-hashing change, ALL existing sessions are
> dead anyway — a wipe just also clears test data. You (and everyone) re-run
> `ccrank login` afterward.
