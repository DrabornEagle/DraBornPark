# Expo Router type cache hotfix

Local Expo Router generated types can become stale after new routes are added. `npm run typecheck` now removes `.expo/types` before invoking TypeScript so local Termux checks match clean CI behavior.
