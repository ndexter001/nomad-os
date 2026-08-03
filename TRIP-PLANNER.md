# Trip Planner (React + Vite)

Actionable trip planning engine built with **React**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Header** — Language selector (NO/EN/DE/ES/FR) + destination + offline badge
- **Weather-optimized itinerary** — Outdoor activities slotted into the sunniest 2-hour window
- **Pivot Day** — 1-tap indoor contingency swaps when rain > 50% or extreme weather
- **True Daily Burn** — Accommodation, food, transit, city tax & tipping norms
- **Smart packing checklist** — Forecast + travel style driven
- **Offline Trip Vault** — IndexedDB + localStorage cache for flights / poor connectivity

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to static hosting (GitHub Pages, Netlify, etc.).

## Architecture

```
src/
  components/     React UI (TripHeader, ItineraryTimeline, …)
  lib/            Pure TS engines (itinerary, budget, vault)
  types/          Shared trip types
```

Legacy engine globals (`shared.js`, `geocoding.js`, `retention-engine.js`) are loaded via script tags and bridged through `src/lib/globalBridge.ts`.

The previous marketing dashboard is preserved at `legacy-dashboard.html`.
