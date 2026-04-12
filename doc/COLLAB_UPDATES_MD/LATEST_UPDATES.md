# PROTOTYPE 0 - Latest Updates Log
- `vite.config.js`
- `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md`

### Notes
- All Codex survival/combat entries from this session have been preserved and merged into the unified log.

## 2026-04-06 17:40:57
- **Author:** Codex
- **Branch:** `codex/gameplay-foundation`
- **Type:** Pass 2 - Survival Horde Refactor And Scrollable Test Map

### Summary
- Reworked `Survival` into a true wave-by-wave horde mode with scaling enemy compositions instead of a single repeated hunter.
- Added multiple survival enemy tiers: `Small`, `Medium`, `Big`, `Epic`, and `Legendary`.
- Survival now scales by wave through enemy count, composition, spawn cadence, concurrency, HP, speed, and damage pressure.
- Added a larger scrollable training map: `Wasteland Expanse`, designed as a first real oversized test space.
- Implemented camera-follow logic and world-space pointer conversion so large maps can scroll without breaking combat controls.
- Preserved duel flow while keeping the new large-map behavior focused on test mode first.

### Files
- `main.js`
- `COLLAB_UPDATES_MD/LATEST_UPDATES.md`

### Notes
- `WORKSTREAM_SPLIT.md` remains local and is not part of this push.

## 2026-04-06 17:21:05
- **Author:** Codex
- **Branch:** `codex/gameplay-foundation`
- **Type:** Pass 2 - Survival Tuning And AI Fairness Pass

### Summary
- Tuned `Survival` pacing so escalation is cleaner, with smoother wave growth, slower difficulty ramping, and slightly better between-wave recovery.
- Reduced the oppression of the new status package by softening `Burn`, `Freeze`, `Poison`, and `Shock` timings and tick pressure.
- Rebalanced `Charge Lance` and `Heavy Cannon` bot behavior so their strongest patterns are more readable, more punishable, and less spammy.
- Improved early-wave fairness by delaying the weight of harder random bot archetypes such as `Lance Diver` and `Siege Breaker`.
- Tightened hunter decision rules around grapple commits, cryo shells, and lance drives to improve readability and fairness.

### Files
- `main.js`
- `COLLAB_UPDATES_MD/LATEST_UPDATES.md`

### Notes
- `WORKSTREAM_SPLIT.md` remains local and is not part of this push.

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

## 2026-04-06 17:02:40
- **Author:** GitHub Copilot
- **Branch:** `codex/gameplay-foundation`
- **Type:** Main Shell Landing Pass

### Summary
- Reworked the main interface into a real app shell with a fixed sidebar and a right-side workspace.
- Added a lightweight landing page with a short hero and two cards to enter either the game or the developer view.
- Embedded the current game UI as one internal view and embedded Dev Status as the second internal view, both switched through the same shell navigation.

### Files
- `index.html`
- `shell-ui.css`
- `shell-ui.js`
- `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md`

### Notes
- The gameplay DOM was preserved inside its own shell view to avoid changing the current game logic wiring.

## 2026-04-06 16:53:17
- **Author:** GitHub Copilot
- **Branch:** `codex/gameplay-foundation`
- **Type:** Main UI Access For Dev Board

### Summary
- Added a direct `Dev Board` shortcut in the main match panel so the developer page is reachable from the primary interface.
- Added the same access point in the Build Lab sidebar so the dashboard stays available before entering a match.
- Reused the existing HUD action button styling so the new entry fits the current interface without extra UI noise.

### Files
- `index.html`
- `styles.css`
- `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md`

### Notes
- The shortcut opens the developer page in a separate tab to avoid interrupting the current session.

## 2026-04-06 16:47:08
- **Author:** GitHub Copilot
- **Branch:** `codex/gameplay-foundation`
- **Type:** Developer Status Board

### Summary
- Added a dedicated developer page that gives a one-glance visual overview of the project state.
- Wired the page to read `doc/DOCUMENTATION.md` and `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md` directly so the dashboard stays aligned with the source docs.
- Organized the view into project snapshot, latest pass, player flow, architecture map, controls, and development guardrails.

### Files
- `dev-status.html`
- `dev-status.css`
- `dev-status.js`
- `vite.config.js`
- `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md`

### Notes
- The page is intended for developer use and works when served through Vite or another static server.

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

