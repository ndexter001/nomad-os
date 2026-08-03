# Nomad OS

Travel financial operating system for global nomads — intelligence metrics, true-cost stay comparisons, daily burn budgeting, and an interactive cost-of-living map.

The project is a **hybrid app**: the main dashboard is **React + TypeScript + Tailwind** (Vite), while the **COL & Weather Map** remains **vanilla HTML/JS** with Leaflet. Legacy engine scripts (`shared.js`, `geocoding.js`, `i18n.js`, etc.) live in the repo root and power the map (and optional trip-planner integrations).

## Quick start

### Dashboard (recommended — Vite dev server)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the React dashboard.

### Map only (static server, no build)

```bash
python3 -m http.server 8080
# or: npx serve .
```

Open [http://localhost:8080/map.html](http://localhost:8080/map.html). Serve over HTTP — `file://` breaks API calls.

> **Note:** `index.html` is a Vite entry point and requires `npm run dev` or a production build. It will not render the dashboard when opened via a plain static server without building first.

### Production build

```bash
npm run build
npm run preview
```

Outputs to `dist/` (`index.html`, `trip.html`, and assets from `public/`). Deploy `dist/` to any static host.

## Screenshots

| Dashboard | COL Map |
|-----------|---------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Map](docs/screenshots/map.png) |

Drop PNGs into `docs/screenshots/` (`dashboard.png`, `map.png`).

## Pages

| Page | Route | Stack | What it does |
|------|-------|-------|--------------|
| **Dashboard** | `index.html` | React 19 · TS · Tailwind | Nomad intelligence, true-cost stays, daily burn calculator |
| **COL & Weather Map** | `map.html` | Vanilla JS · Leaflet | PPI / cost-of-living layers, city & country search, weather |
| **Trip Planner** | `trip.html` | React (WIP entry) | Weather itinerary, pivot day, packing, offline vault — see [TRIP-PLANNER.md](TRIP-PLANNER.md) |

The dashboard links to the map at `/map.html`. In dev, Vite serves both from the project root.

## Dashboard features (`src/NomadOSDashboard.tsx`)

Single self-contained React component — no external icon libraries (inline SVGs + emojis only).

- **Header** — Language pills / mobile dropdown (🇳🇴 Norsk · 🇬🇧 English · 🇩🇪 Deutsch · 🇪🇸 Español · 🇫🇷 Français) and live **Nomad OS • Online Syncing** status
- **Destination picker** — Lisbon, Bangkok, Tokyo, Barcelona (resets burn defaults and metric profiles)
- **Schengen / Visa tracker** — Interactive days-used slider, color-coded progress (green / yellow / red), persisted to `localStorage`
- **Wi-Fi & productivity** — Download / upload Mbps and coworking density rating
- **Safety & livability** — Dual score bars per destination
- **True Cost Stays** — Compare Coliving, 28-day Airbnb, and Direct Lease with base price, platform fees, utilities, net daily/monthly cost, and savings; sort by **Lowest Cost** or **Highest Value**
- **True Daily Burn** — Sliders for rent/night, coworking, food, and transit with real-time daily + monthly totals (local + home currency) and a visual expense breakdown

## Map features (`map.html` · `map.js`)

- Interactive Leaflet map with cost-of-living and weather layers
- City and country search (`geocoding.js` — Open-Meteo + local country index)
- Set active destination (syncs `nomad-os-selected-city` and `nomados_last_city`)
- 5-language UI via `i18n.js`
- Nav: Dashboard logo · Map

## Legacy engine modules (root `.js` files)

These modules are still used by the map and are loaded as globals by `trip.html`. They are **not** mounted on the React dashboard entry today.

| Module | Purpose |
|--------|---------|
| `shared.js` | FX rates, PPP math, travel tiers, payment & runway helpers |
| `geocoding.js` | City search, country→currency mapping, `CityContext` |
| `currencies.js` | 166 currency definitions |
| `languages.js` | Locale config |
| `i18n.js` | Translations (NO / EN / DE / ES / FR) |
| `app.js` | Original vanilla dashboard logic (archived — not loaded by `index.html`) |
| `fx-watchdog.js` | FX trend alerts |
| `vat-refund.js` | VAT refund calculator UI |
| `survival.js` | Nomad survival kit UI |
| `vault.js` | Budget vault (localStorage) |
| `auth.js` | Local demo auth · Firebase / Supabase ready |
| `retention-engine.js` | Retention widgets |
| `travel-passport.js` | Offline travel passport |

## Tech stack

| Layer | Tools |
|-------|-------|
| Dashboard | React 19, TypeScript, Tailwind CSS 3, Vite 6 |
| Map | Vanilla HTML/CSS/JS, Leaflet (CDN) |
| Styling | Tailwind (`src/index.css`) + legacy glassmorphism (`styles.css`) |
| Data | Client-side public APIs (map); dashboard uses built-in destination profiles + FX conversion table |

## Project layout

```
index.html              Vite entry → React dashboard
trip.html               Vite entry → trip planner shell (see TRIP-PLANNER.md)
map.html                COL & weather map (vanilla)

src/
  NomadOSDashboard.tsx  Main dashboard component
  App.tsx               Root render
  main.tsx              React bootstrap
  index.css             Tailwind base + utilities
  components/           Trip planner UI (ItineraryTimeline, PackingChecklist, …)
  lib/                  Trip engines (itinerary, budget, vault, globalBridge)
  types/                Shared TypeScript types

map.js                  Leaflet map logic
geocoding.js            Search & city context
shared.js               FX / PPP engine
styles.css              Legacy dark UI (map + archived vanilla pages)
i18n.js                 Translations

public/                 Static assets copied to dist/ on build
vite.config.ts          Multi-page build (index + trip)
tailwind.config.js
package.json
```

## Trip planner (React)

Source lives under `src/components/` and `src/lib/`. Full architecture and features are documented in **[TRIP-PLANNER.md](TRIP-PLANNER.md)**.

Components include weather-optimized itinerary, pivot-day contingency, packing checklist, and offline trip vault (IndexedDB + localStorage). Wire a dedicated `App` entry in `trip.html` to activate the trip planner separately from the dashboard.

## APIs

| Service | Used by | Purpose |
|---------|---------|---------|
| [open.er-api.com](https://open.er-api.com) | `shared.js` | Live FX rates |
| [api.frankfurter.app](https://api.frankfurter.app) | `fx-watchdog.js` | Historical rate trends |
| [api.open-meteo.com](https://api.open-meteo.com) | `geocoding.js`, map | Weather forecasts |
| [geocoding-api.open-meteo.com](https://open-meteo.com/en/docs/geocoding-api) | `geocoding.js`, map | City search |
| [Leaflet](https://leafletjs.com) | `map.html` | Map tiles & markers |

The React dashboard uses static destination profiles and a local FX table — no live API calls on the main page.

## Local storage keys

| Key | Purpose |
|-----|---------|
| `nomad-os-lang` | Active locale (`en` · `de` · `es` · `fr` · `no`) — dashboard + map |
| `nomad-os-schengen-used` | Schengen days used — dashboard visa tracker |
| `nomad-os-selected-city` | Last map destination |
| `nomados_last_city` | Dashboard / app city sync (also written by `CityContext`) |
| `nomad-os-auth-session` | Signed-in session |
| `nomad-os-local-users` | Demo auth user registry |
| `nomad-os-vault-{uid}` | Budget vault per user |
| `nomad-os-rate-alerts` | FX watchdog alerts |

## Auth

Default mode is **local demo auth** — accounts live in `localStorage`. To use Firebase or Supabase, set `AUTH_CONFIG.provider` and credentials in `auth.js`.

## UI

- **Dashboard:** Slate-950 dark theme, Tailwind utilities, Instrument Sans
- **Map:** Glass cards on `#0a0b0f` with accent `#818cf8` — CSS variables in `styles.css`

## Deploy

**Vite build (dashboard + trip shell)**

```bash
npm run build
```

Upload the `dist/` folder. Ensure `map.html` and its JS dependencies are reachable — copy root `map.html`, `map.js`, `geocoding.js`, `shared.js`, `styles.css`, etc. into `public/` before building, or deploy them alongside `dist/` on the same origin.

**GitHub Pages**

1. Push the repo to GitHub.
2. `npm run build`
3. Deploy `dist/` (e.g. `gh-pages` branch or GitHub Actions).
4. Include map static files if you need the map on the same site.

**Netlify / Vercel**

- Build command: `npm run build`
- Publish directory: `dist`

**nginx (map + static legacy)**

```nginx
server {
    listen 80;
    root /var/www/nomad-os;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

## Roadmap

- [ ] **Separate trip planner entry** — dedicated `App` for `trip.html` vs dashboard
- [ ] **Wire dashboard to live FX** — connect React dashboard to `shared.js` / open.er-api.com
- [ ] **Production auth** — Firebase Auth or Supabase (`auth.js` hooks ready)
- [ ] **PWA / offline** — service worker for last-known rates
- [ ] **More locales** — Portuguese, Italian, Japanese

## License

Private project — add a license if you open-source it.
