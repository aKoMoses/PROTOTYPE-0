# PROTOTYPE 0 - Latest Updates Log

## Rules
- Add the newest entry at the top.
- Keep each entry short and concrete.
- Always include: date, time, author, branch, and what changed.

---

## 2026-04-06 17:14:32
- **Author:** Codex
- **Branch:** `codex/gameplay-foundation`
- **Type:** Pass 2 - AI Survival And Combat Expansion

### Summary
- Added `Survival / Wave Gauntlet` as a new playable mode in the prematch flow.
- Expanded the status system with `Burn`, `Freeze`, `Poison`, and `Shock`, plus readable synergy interactions.
- Added two new playable weapons: `Charge Lance` and `Heavy Cannon`, both with alt-fire support.
- Expanded bot loadouts and AI logic so hunter builds adapt more to player style, difficulty, and survival wave scaling.
- Added duel rule support for `BO5`, round timers, sudden death, and mirror match testing.
- Extended the Build Lab and in-game weapon flow so the new content is visible, explainable, and testable.

### Files
- `index.html`
- `main.js`
- `styles.css`

### Notes
- `WORKSTREAM_SPLIT.md` remains local and is not part of this push.

## 2026-04-06 16:13:20
- **Author:** Codex
- **Branch:** `codex/gameplay-foundation`
- **Type:** Competitive Core Pass 1

### Summary
- Reworked the in-game HUD hierarchy so player HP is easier to read during combat.
- Improved Build Lab tooltips with real gameplay values: damage, cooldowns, CC durations, healing, and ranges.
- Fixed and cleaned rune tree progression logic so points can be added and removed more reliably.
- Strengthened Rail Sniper identity with distance-based damage scaling and stronger charged shot value.
- Reworked Magnetic Grapple into a real pull/snare engage tool.
- Improved Phantom Split identity and added stronger deception support.
- Upgraded duel bot behavior with difficulty levels, better decision quality, stronger spacing logic, and active ultimate usage.
- Preserved duel/training flow while making the prototype more competitive and readable.

### Files
- `index.html`
- `main.js`
- `styles.css`

### Notes
- `WORKSTREAM_SPLIT.md` remains local and is not part of this push.
