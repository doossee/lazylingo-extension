# lazylingo-extension

Chrome MV3 extension for LazyLingo. Save words to your private GitHub vault from anywhere.

## Setup

1. Same OAuth App as the PWA. Either reuse the existing Client ID or register a new one at https://github.com/settings/developers (enable Device Flow).
2. Copy `.env.example` to `.env.local` and paste the Client ID.
3. `npm install`
4. `npm run build` — produces `dist/`
5. Chrome → `chrome://extensions` → enable Developer Mode → Load unpacked → select `dist/`
6. Click the extension icon in the toolbar → sign in with GitHub.

## Storage

Token: `chrome.storage.local["lazylingo:gh-token"]`. Cleared on sign-out.

Vault: same `lazylingo-vault` private GitHub repo as the PWA. Auto-created on first sign-in if missing. The PWA and extension share the same vault.

## Build / test

- `npm run dev` — Vite dev with HMR
- `npm run build` — production build → `dist/`
- `npm test` / `npm run test:run` — Vitest

## What's missing in v0.2

- Right-click "Save selection" context menu (planned).
- Content script that captures double-clicked words on web pages (planned).
