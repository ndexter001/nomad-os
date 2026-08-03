# Konverter — Travel Financial OS

A browser-based travel finance platform for global travelers and digital nomads — live FX across 166 currencies, purchasing-power parity (PPP), budgeting tools, and destination intelligence. No build step; plain HTML, CSS, and JavaScript.

Built for an international audience: multi-language UI, worldwide city search, and cross-border payment guidance out of the box.

## Pages

| Page | File | Description |
|------|------|-------------|
| **Dashboard** | `index.html` | Currency converter, PPP living index, weather, payment optimizer, budget runway, FX watchdog, VAT refund calculator |
| **True Cost Stays** | `hotels.html` | Trivago-style hotel search with true daily burn, nomad scoring, and deal comparison |
| **COL & Weather Map** | `map.html` | Interactive map of cost-of-living and weather by city (Leaflet) |

## Features

- **166 currencies** with live rates from [open.er-api.com](https://open.er-api.com)
- **PPP engine** — local living costs (coffee, meals, transport, coworking) adjusted by travel style (Backpacker 0.5× / Nomad 1× / Luxury 2.5×)
- **City search** — geocoding with destination context, weather (Open-Meteo), and activity value index
- **Smart Payment Optimizer** — compares card types (debit, credit, no-FX-fee) for cross-border spend
- **Nomad Budget Runway** — home vs destination burn rate with progress bar
- **FX Volatility Watchdog** — 7/30-day rate trends (Frankfurter API) and localStorage rate alerts
- **VAT Refund Calculator** — estimated tax-back and receipt checklist per destination
- **Nomad Survival Kit** — SIM costs, tipping culture, VAT rate, cash intensity
- **Personal Budget Vault** — saved trips, subscriptions, and runway (requires sign-in)
- **Dark / light theme** with system preference detection
- **Internationalization** — English, German, Spanish, French, and Norwegian; language follows browser locale with English fallback

## Getting started

Serve the folder over HTTP (required for fetch APIs and module loading):

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Open [http://localhost:8080/index.html](http://localhost:8080/index.html).

Do **not** open HTML files directly via `file://` — external APIs and some browser features will fail.

## Project structure

```
├── index.html          Dashboard
├── hotels.html         True Cost Stays
├── map.html            Cost-of-living map
├── styles.css          Glass UI, theme variables, responsive layout
├── shared.js           FX, PPP, travel tiers, payment optimizer, runway math
├── app.js              Dashboard orchestration
├── hotels.js           Stays search, sorting, booking links
├── map.js              Leaflet map logic
├── geocoding.js        City autocomplete & geocoding
├── survival.js         Nomad survival metadata UI
├── fx-watchdog.js      Rate trends & alerts
├── vat-refund.js       VAT refund calculator UI
├── vault.js            Personal budget vault (localStorage)
├── auth.js             Auth client (local demo / Firebase / Supabase hooks)
├── theme.js            Dark/light theme toggle
├── i18n.js             Translations & language picker
├── currencies.js       Currency list & metadata
└── languages.js        Supported locales
```

## External APIs

| Service | Used for |
|---------|----------|
| [open.er-api.com](https://open.er-api.com) | Live FX rates |
| [api.frankfurter.app](https://api.frankfurter.app) | Historical rate trends |
| [api.open-meteo.com](https://api.open-meteo.com) | Destination weather |
| Geocoding (via `geocoding.js`) | City search & coordinates |
| [Leaflet](https://leafletjs.com) | Map page (CDN) |

All APIs are called client-side. No backend is required for the default setup.

## Auth & storage

Auth runs in **local demo mode** by default (`auth.js` → `AUTH_CONFIG.provider = 'local'`). Users and sessions are stored in `localStorage`. To wire Firebase or Supabase, set the provider and credentials in `AUTH_CONFIG`.

Key `localStorage` keys:

| Key | Purpose |
|-----|---------|
| `konverter-theme` | `light` or `dark` |
| `konverter-lang` | Active locale (`en`, `de`, `es`, `fr`, `no`) |
| `konverter-auth-session` | Signed-in user session |
| `konverter-vault-{uid}` | Budget vault data per user |
| `konverter-rate-alerts` | FX watchdog alerts |

## Theming

Theme is applied via `data-theme="dark"|"light"` on `<html>`. CSS custom properties in `styles.css` drive colors, cards, inputs, and shadows for both modes. An inline script in each HTML head prevents flash of wrong theme before paint.

## License

Private project — add a license here if you plan to open-source.
