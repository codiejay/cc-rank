# LAUNCH CHECKLIST

Run top to bottom. Don't tweet until every box is checked against **prod**.

## A. Fresh-user end-to-end (do this as if you were a stranger)

```bash
# start clean on this machine
mv ~/.ccrank ~/.ccrank.bak 2>/dev/null || true
cp ~/.claude/settings.json ~/.claude/settings.json.bak 2>/dev/null || true
# remove ccrank from your authorized GitHub apps first:
#   https://github.com/settings/applications  -> revoke "ccrank"
```

- [ ] `npx github:codiejay/cc-rank login` → full GitHub device flow completes
- [ ] statusline shows `CC-Rank #n/total` after restarting Claude Code
- [ ] send a prompt → score +1 on the dashboard within ~10s
- [ ] make an edit → edit count goes up
- [ ] `ccrank create --name "Test Crew"` → prints a code, room page loads
- [ ] `ccrank join <CODE>` from a second GitHub identity (or a friend) → they appear
- [ ] invite link (`/?join=CODE`) prefills the code
- [ ] `ccrank leave` → your original statusline is restored (check settings.json)

```bash
# restore your real setup after testing
rm -rf ~/.ccrank && mv ~/.ccrank.bak ~/.ccrank 2>/dev/null || true
```

## B. Adversarial re-test against PROD (replace $SRV)

```bash
SRV=https://ccrank.ccrank.workers.dev
```

- [ ] **XSS:** `curl -s "$SRV/r/%3C%2FSCRIPT%3EX" | grep -o 'let CODE = [^;]*;'` → must be `let CODE = null;` (no raw `</SCRIPT>`)
- [ ] **CSP shipped:** `curl -sD - -o /dev/null "$SRV/" | grep -i content-security-policy` → present
- [ ] **events cap:** loop-POST >2000 events with your token → dashboard score stops climbing at 2000/day
- [ ] **rate limits:** hammer `/api/rooms/AAAAA/check` fast → starts returning 429
- [ ] **no code leak:** `curl -s "$SRV/api/global"` → room *names* only, no 6-char codes; check `/api/me` only returns YOUR rooms' codes
- [ ] **page renders:** open `$SRV/` in a browser, board + hero + Copy/Reveal buttons all work (CSP didn't break inline handlers)

## C. Ops gate (before the tweet)

- [ ] backups tested and restorable (see RESET.md)
- [ ] OAuth app moved to org (if doing it) AND login re-tested afterward
- [ ] you know the D1 free-tier read ceiling vs. an expected traffic spike
- [ ] some way to see errors (wrangler tail running, or Logpush)

## D. Launch
- [ ] tweet / IG
