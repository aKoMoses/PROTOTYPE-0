# Prototype 0

Minimal playable prototype in plain HTML, CSS, and JavaScript.

## Account Layer

The game now expects a permanent Supabase account before entering play.

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Apply `supabase/migrations/20260412_account_layer.sql` on the target Supabase project.
4. Run the app with Vite so the environment variables are injected.

## Current slice

- top-down arena
- WASD movement
- touch joystick movement
- mouse aim
- pulse rifle shooting
- dash ability
- one enemy bot

## Next steps

1. Tune movement, weapon cadence, and dash invulnerability window.
2. Add player and enemy death states with a cleaner restart flow.
3. Add a second enemy behavior and simple wave progression.
4. Add pickups or energy economy around dash and weapon pressure.

## Run

Install dependencies with `npm install`, then run `npm run dev` for local development or `npm run build` for production validation.
