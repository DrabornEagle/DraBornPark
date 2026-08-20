# DraBornPark v0.5.0 Release Audit

Release target: `0.5.0`  
Android versionCode: `12`

## UI / UX

- [x] Loading orbit and vehicle core use one fixed centered stage.
- [x] Long `ScreenHeader` titles stay on one line with controlled font scaling.
- [x] `Etiketlerim` and Demo `DraBornPark Aile` therefore no longer split into multiple title lines on narrow phones.
- [x] Home secondary shortcut is `Merkezim`.
- [x] Animated solid-color `GİRİŞ YAP / KAYIT OL` CTA.
- [x] Animated solid-color `YENİ ETİKET AKTİVE ET` CTA.
- [x] Notification bell and scroll-aware bottom dock retained.
- [x] No new gradient, shadow or glow styling introduced.

## Input / keyboard

- [x] Experimental React Compiler disabled for this release.
- [x] Auth form uses Android `KeyboardAvoidingView` height behavior.
- [x] Auth and tag forms preserve taps and do not dismiss the keyboard on scroll/tap handling.
- [x] Controlled TextInputs use `blurOnSubmit={false}` where appropriate.
- [x] Deprecated `ImagePicker.MediaTypeOptions` removed from v0.5.0 avatar pickers.

## Web Test1

- [x] `Başka bir mesaj` has an attention animation.
- [x] `ARAÇ SAHİBİNE GÜVENLİ GÖNDER` has a modern animated solid-color treatment.
- [x] `prefers-reduced-motion` fallback included.

## Supabase

- [x] Username + avatar profile fields live.
- [x] Username uniqueness and format enforcement live.
- [x] Avatar bucket and owner-write policies live.
- [x] `draborneagle@gmail.com` admin metadata live.
- [x] Profile/admin RPC permissions hardened.
- [x] Live v0.5.0 migrations mirrored under `supabase/migrations/`.
- [x] Security and performance advisors reviewed. Shared legacy-schema advisories were not changed as part of the DraBornPark release.

## Repository hygiene

- [x] Temporary `scripts/.v050.part*` files removed.
- [x] Temporary `v050-finalize.yml` removed.
- [x] `.github/workflows/ci.yml` is the single release CI workflow.
- [x] `scripts/check-project.mjs` contains v0.5.0 release guards.
- [x] README updated for v0.5.0.

## CI pipeline

The repository CI is configured to run on `main`, feature branches, pull requests, and manual dispatch:

1. `npm install --no-audit --no-fund`
2. `npm run check`
3. `npx expo install --check`
4. `npm run typecheck`
5. `npx expo export --platform web`
6. tracked-source cleanliness verification

This document is tracked so the release state is auditable from the repository rather than from chat history.
