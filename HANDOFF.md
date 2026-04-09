# PROTOGRAVITY Handoff

## Project Source
- Repo: `https://github.com/aKoMoses/PROTOTYPE-0`
- Branch: `codex/buildmaker-gameplay-identity-refactor`
- Last synced commit: `b08c7ba23f1ee4e32805b82f8cadf61d5bf75a19`

## Read First
- `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md`
- current branch state and recent gameplay/build-system passes

## Current Direction
- competitive 1v1 arena prototype
- readable, skill-based, precise gameplay
- active focus on build clarity, ability identity, weapon feel, and runtime stability

## Latest Important Pass
- competitive ability pool cleanup
- `Pulse Burst` reworked into a setup-dependent burst spell with light guidance and Burn on full connect
- `Energy Shield` now blocks incoming control while active and refunds part of cooldown if broken
- `Magnetic Field` now slows hostile projectiles instead of deleting them outright
- `Chain Lightning`, `Rail Shot`, `Blink Step`, and `Phase Dash` removed from the active competitive pool

## Run
```powershell
npm install
npm run dev
```

## Recommended Resume Prompt
```text
Read HANDOFF.md and doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md first, then analyze the whole project before changing anything.
Work on the current branch state from commit b08c7ba.
```
