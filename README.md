# Nomad OS

Your travel financial operating system — convert currencies, compare real purchasing power, plan runway, and understand true daily costs anywhere in the world.

Nomad OS runs entirely in the browser. No install, no build step, no backend required.

## Quick start

```bash
python3 -m http.server 8080
# or: npx serve .
```

Open [http://localhost:8080](http://localhost:8080). Serve over HTTP — `file://` will break API calls.

## Screenshots

| Dashboard | True Cost Stays | COL Map |
|-----------|-----------------|---------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Stays](docs/screenshots/stays.png) | ![Map](docs/screenshots/map.png) |

Drop PNGs into `docs/screenshots/` (`dashboard.png`, `stays.png`, `map.png`). Dark and light theme captures both look good in the README.

## What you get

| Page | Route | What it does |
|------|-------|--------------|
| **Dashboard** | `index.html` | FX converter, PPP living index, weather, payment optimizer, budget runway, FX watchdog, VAT refund |
| **True Cost Stays** | `hotels.html` | Hotel search with true daily burn, nomad scores, and deal comparison |
| **COL & Weather Map** | `map.html` | Cost-of-living and weather layers on an interactive world map |

## Core features

- **166 currencies** — live rates from [open.er-api.com](https://open.er-api.com)
- **PPP engine** — real local costs (coffee, meals, transport, coworking) scaled by travel style: Backpacker 0.5× · Nomad 1× · Luxury 2.5×
- **Global city search** — Open-Meteo geocoding with destination context and weather
- **Smart Payment Optimizer** — debit vs credit vs zero-FX card comparison for cross-border spend
- **Nomad Budget Runway** — how long your funds last at home vs abroad
- **FX Volatility Watchdog** — 7/30-day trends ([Frankfurter](https://api.frankfurter.app)) with rate alerts
- **VAT Refund Calculator** — estimated tax-back and airport checklist per country
- **Nomad Survival Kit** — SIM prices, tipping norms, VAT rates, cash vs card
- **Personal Budget Vault** — saved trips, subscriptions, runway (sign-in required)
- **Dark / light theme** — follows system preference, persisted locally
- **5 languages** — English, Deutsch, Español, Français, Norsk (browser locale auto-detect, English fallback)

## Tech stack

Vanilla HTML, CSS, and JavaScript. Glassmorphism UI with CSS custom properties for theming. All data fetched client-side from public APIs.

## Project layout

```
index.html          Dashboard
hotels.html         True Cost Stays
map.html            COL & weather map
styles.css          UI, themes, responsive layout
shared.js           FX, PPP, travel tiers, payment & runway math
app.js              Dashboard logic
hotels.js           Stays search, sorting, booking links
map.js              Leaflet map
geocoding.js        City search & country→currency mapping
survival.js         Nomad survival UI
fx-watchdog.js      Rate trends & alerts
vat-refund.js       VAT refund UI
vault.js            Budget vault (localStorage)
auth.js             Auth (local demo · Firebase · Supabase ready)
theme.js            Theme toggle
i18n.js             Translations
currencies.js       166 currency definitions
languages.js        Locale config
```

## APIs

| Service | Purpose |
|---------|---------|
| [open.er-api.com](https://open.er-api.com) | Live FX rates |
| [api.frankfurter.app](https://api.frankfurter.app) | Historical rate trends |
| [api.open-meteo.com](https://api.open-meteo.com) | Weather forecasts |
| [geocoding-api.open-meteo.com](https://open-meteo.com/en/docs/geocoding-api) | City search & reverse geocoding |
| [Leaflet](https://leafletjs.com) | Map (loaded via CDN) |

## Auth

Default mode is **local demo auth** — accounts live in `localStorage`. To use Firebase or Supabase, set `AUTH_CONFIG.provider` and credentials in `auth.js`.

## Local storage keys

| Key | Purpose |
|-----|---------|
| `nomad-os-theme` | `light` or `dark` |
| `nomad-os-lang` | Active locale: `en` · `de` · `es` · `fr` · `no` |
| `nomad-os-auth-session` | Signed-in session |
| `nomad-os-local-users` | Demo auth user registry |
| `nomad-os-vault-{uid}` | Budget vault per user |
| `nomad-os-rate-alerts` | FX watchdog alerts |
| `nomad-os-selected-city` | Last selected destination |

## Theming

Set via `data-theme="dark"|"light"` on `<html>`. Variables in `styles.css` control colors, cards, inputs, and shadows. An inline head script prevents theme flash on load.

## Deploy

Nomad OS is static files — any static host works. Upload the project root (all `.html`, `.js`, `.css` files).

**GitHub Pages**

1. Push the repo to GitHub.
2. Settings → Pages → source: `main` branch, folder `/ (root)`.
3. Site live at `https://<user>.github.io/<repo>/`.

**Netlify / Vercel**

Drag-and-drop the folder, or connect the repo. No build command. Publish directory: `.` (root).

**nginx**

```nginx
server {
    listen 80;
    root /var/www/nomad-os;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

All external APIs are called from the browser — no server-side proxy needed for the default setup.

## Roadmap

- [ ] **Production auth** — wire Firebase Auth or Supabase (`auth.js` hooks are ready)
- [ ] **Saved destination presets** — sync city/currency pairs to user account when signed in
- [ ] **Dashboard Smart Stays widget** — hotel price estimates + PPP food/transit → total daily burn on the main page
- [ ] **Real hotel API** — replace demo stays data with live pricing provider
- [ ] **PWA / offline** — service worker for last-known rates when connectivity drops
- [ ] **More locales** — Portuguese, Italian, Japanese

## License

Private project — add a license if you open-source it.
