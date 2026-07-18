# ccrank design guide

The UI law for ccrank, distilled from six reference designs — the Autumn
insights dashboard is the primary north star (app shell, cards, dot chart,
metric strip); Signal Sales, the client-relationships board, and Relay supply
the supporting details. Every screen we ship should pass this file.

**Direction in one line:** a warm, precise product dashboard — greige app
shell, white cards, discrete square-dot data, mono numerals, one hot orange
accent.

---

## 1. Principles (extracted from the references)

1. **App shell, always.** Left sidebar on warm greige (`--side`) with brand
   mark, mono-caps section labels (MENU / ROOMS), and nav items; the active
   item is a white pill with hairline border + soft shadow. Main area on
   near-white with a sticky topbar (page title left, segmented control right).
2. **White cards on warm ground.** Content lives in white cards, 14px radius,
   hairline border + whisper shadow. One level deep — never card-in-card.
3. **Data is drawn in discrete units.** The hero chart is columns of small
   squares (6px, 1.5px radius, 3px gap) — orange for the selected metric,
   warm gray for context. Meters and share-bars are 4px ticks with the
   unfilled track visible. Never smooth gradient bars, never line charts.
4. **Metric strip under the chart.** Icon chip + label, big mono number,
   small mono `+x% vs prior…` delta. Cells are clickable tabs; the active one
   gets a 2px ink top border and a faintly tinted background (Autumn).
5. **Numbers are mono, everywhere.** Scores, counts, codes, deltas, axis
   labels, timestamps — `ui-monospace` with `tabular-nums`. UI text is the
   system sans. No display font needed in the app shell.
6. **One accent.** Autumn orange `#F1590F` carries brand + primary data.
   Green/red only as semantic deltas; amber/green may join orange in ranked
   share-bars. Everything else is ink and warm gray. No gradients, no glow.
7. **Segmented control for range** (All-time / Today): gray inset group,
   active segment white with shadow. Small mono metadata right-aligned in
   card headers ("4 players", "share of points").
8. **People get avatars.** Initial in a soft pastel circle, hue hashed from
   the name so it's stable. Rooms get small colored square dots in the nav.
9. **Actions:** primary = ink block button (10px radius); secondary = white
   with inset hairline; tertiary = text link. One primary per card. Copyable
   things look copyable: dashed-border code box, dark `$`-prefixed terminal
   block for commands.
10. **Progressive disclosure.** The recommended path (agent prompt) is the
    visible primary; manual join/create fold behind `<details>` rows.

## 2. Tokens

```css
--side:  #F4F3EF;  /* sidebar greige */
--bg:    #FAFAF8;  /* main ground */
--card:  #FFFFFF;
--ink:   #221F1A;  /* never pure black */
--muted: #8B867B;  --faint: #C9C5BB;
--line:  #EAE8E1;  --line2: #DEDBD2;
--accent:#D97757;  --accent-deep:#B05730;  --accent-soft:#F7E7DE;  /* Claude Code coral */
--edits: #7C6455;  /* umber — the second data tone (edits) */
--up:    #12A150;  --down:#D92D20;  --amber:#F5B301;
--term:  #23201A;  /* terminal command block */
--shadow: 0 1px 2px rgba(35,28,15,.04), 0 0 0 1px var(--line);
```

Type: system sans for UI (13–15px), `ui-monospace` for all data. Big metric
numbers 24px/700 mono, tight letter-spacing. Self-contained page — no
external fonts or assets, ever (CSP-friendly).

### Dark mode (added 2026-07-18)

Warm charcoal, same DNA — never neon, never cool grays. All surface colors go
through CSS variables; `:root[data-theme="dark"]` overrides them (espresso
greige grounds `#161511/#1B1915/#242119`, cream ink `#F1EDE3`, same coral
accent; `--accent-deep` brightens to `#E89A72` since it's *text* on dark).
Rules for new UI:

- **Never hardcode a surface/text hex in a component rule** — add a token pair
  (light + dark) to the two `:root` blocks. Existing pairs cover hovers, chip
  bgs, tick tracks (`--track`), skeletons, heatmap ramp (`--h0..--h4` —
  dark runs ember-dark → bright coral, brightest = most), terminals
  (`--term/--termbar/--termink`), ink-block buttons (`--onink`: buttons that
  are ink-on-light become cream-on-dark automatically).
- Theme boots pre-paint from a `<head>` script (localStorage `ccrank_theme`,
  else `prefers-color-scheme`) — no flash. Sun/moon toggle in the topbar,
  synced across tabs via the storage event; toggling repaints so JS-computed
  colors re-derive.
- `avatar()` fallback tints are theme-aware (same hue hash; deep chips +
  lifted text on dark). Any new JS-computed color must check `themeNow()`.
- Floating dark blocks (terminals, pills, tooltips) get a faint
  `rgba(255,255,255,.08)` ring in dark so they don't melt into the cards.
- The hero wash deepens to night water via `[data-theme="dark"]` overrides on
  the SVG gradient stops + vein ellipse fills — palette tones only, as ever.

## 3. Components

- **Sidebar** — brand (ink rounded square, mono "cc"), pulsing LIVE dot,
  MENU/ROOMS mono-caps sections, room rows with hue dot + right-aligned mono
  code, spectate code input at the bottom.
- **Topbar** — 16px/650 title (+ mono code chip on room pages), segmented
  All-time/Today control.
- **Activity card — GitHub contribution heatmap in coral (James's FINAL
  pick, 2026-07-18; chosen over gradient-flow-lines and honeycomb concepts —
  don't redesign this chart again).** Columns are weeks (Sunday-first) ending
  on the current week, rows are the 7 weekdays; as many weeks as fit the card
  edge-to-edge, up to 53. Cell intensity = quartiles of the selected metric's
  non-zero days on a 5-step scale: #F0EDE6 → #F6DFD2 → #EDB795 → --accent →
  #8C3D1D. Mon/Wed/Fri labels left, month labels on top, `less → more`
  legend bottom-right, white tooltip on cell hover (kept INSIDE the scroll
  container — outside gets clipped), metric strip below; the active metric
  tab re-shades the grid.
- **Leaderboard card** — rows: zero-padded mono rank (`01`, #1 orange),
  avatar, semibold name + inline chips (room links / 🔥 streak / ▲▼ delta),
  mono `x prompts · y edits` meta, 15-unit tick meter scaled to the leader,
  bold mono score.
- **Rail cards** — landing: Get on the board (agent prompt primary +
  folded manual flows) and How scoring works; room: Invite a friend (dashed
  code box, agent prompt, join link) and Today's race (top-3 share tick-bars
  in coral/amber/green).
- **Code veil** — the room code sits behind a frosted-glass overlay
  (backdrop blur + blurred text fallback) with a single "Reveal code" pill;
  clicking melts the glass (opacity + scale), then the box is click-to-copy.
- **Stat glint** — the `x prompts · y edits` line is the product: bold mono,
  ink-toned, with a slow coral glint sweeping through (staggered per row).
  This is the ONE sanctioned use of gradient-clipped text; reduced-motion
  gets plain ink.
- **Empty states teach** — "Restart Claude Code, send a prompt — it lands
  here in seconds."

- **Landing hero (James-requested, 2026-07-18)** — the ONE sanctioned
  gradient-background exception: a full-width panel on `/` with an animated
  coral "water" wash. Built as an inline SVG marble: a coral gradient field
  (Claude coral dominant) with cream-vein and deep-coral ellipses drifting via
  CSS transforms through a FIXED feTurbulence + feDisplacementMap noise field
  (scale ~300, 13px blur on top) — the displacement warps the moving shapes so
  they flow like liquid. All motion is CSS keyframes (no SMIL) so the global
  reduced-motion rule freezes it; negative delays hide repaint restarts.
  James's refs: first a green liquid-bg hero shot, then "look like water, more
  of Claude primary color, and animate". Floating on it: a
  dark terminal that replays a fake `ccrank top` session printing the REAL
  live global top 5 (mono rows: rank / name / 🔥 streak / tick meter / score),
  ending on a blinking caret. It types once per page load, then repaints go
  static (`noanim`). Black pill shortcuts underneath (copy agent prompt /
  join / create). Keep the wash in palette tones only — never other hues.

## 4. Motion

- Leaderboard rows rise+fade with 40ms stagger, `cubic-bezier(.22,1,.36,1)`.
  Meters transition width. LIVE dot pulses. Re-renders skip when data is
  unchanged (no flicker on polling). `prefers-reduced-motion` kills all of it.

## 5. Never

Sparkle/wand icons. Identical stat-tile grids. Gradient text or backgrounds
(sole exception: the stat glint above). Dark-mode-with-neon. Smooth progress
bars. Emoji as structure (🔥 in a streak chip is fine; medals as rank glyphs
are not). Nested cards. External assets. Copying a reference chart 1:1.
Dead space on big screens — content is centered at max-width ~1400px and the
chart/meters scale fluidly to fill it (never left-hug a wide viewport).
