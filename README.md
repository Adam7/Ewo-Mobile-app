# GlowUp MVP (Web Prototype)

This repository contains a frontend MVP prototype for GlowUp and starter backend artifacts.

## Run locally

```bash
python -m http.server 8080
```

Open: `http://localhost:8080`

## Current scope

- Goal selection (skin/hair/cut/bulk)
- Tier-based premium gating
- Daily plan with streak
- Onboarding profile setup
- Local backup export/import/reset
- Tested logic helpers (`logic.js` + `logic.test.js`)

## Tests

```bash
node --test logic.test.js
```

## Next step (backend)

Use `supabase/schema.sql` to provision:
- `profiles`
- `subscription_state`
- `daily_progress`

Then replace `localStorage` sync in `app.js` with Supabase API calls.


## Optional Supabase sync (preview)

If you already have Supabase project + schema applied, you can enable remote sync:

```js
GlowUpSupabase.setConfig('https://YOUR_PROJECT.supabase.co', 'YOUR_ANON_KEY')
```

Run this once in browser console. After auth is available, app will try to load/save snapshots remotely.


## Magic link auth (optional)

After Supabase config is set, use the in-app **Войти** button to send an email magic link.
On successful login the app can load/save snapshots for the authenticated user.
