import { useEffect, useState } from 'react';

const APP_SCRIPT = '/app.js?v=42';
const MARKUP_URL = '/legacy-dashboard-body.html';
const SCRIPT_IDS = [
  '/currencies.js?v=16',
  '/languages.js?v=16',
  '/shared.js?v=28',
  '/geocoding.js?v=28',
  '/i18n.js?v=34',
  '/auth.js?v=27',
  '/vault.js?v=27',
  '/survival.js?v=27',
  '/fx-watchdog.js?v=30',
  '/vat-refund.js?v=27',
  '/retention-engine.js?v=1',
  '/travel-passport.js?v=1'
];

let scriptsLoaded = false;
let dashboardInitialized = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-nomad-src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.nomadSrc = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(el);
  });
}

async function bootstrapLegacyDashboard(): Promise<void> {
  if (!scriptsLoaded) {
    for (const src of SCRIPT_IDS) {
      await loadScript(src);
    }
    await loadScript(APP_SCRIPT);
    scriptsLoaded = true;
  }
  if (!dashboardInitialized) {
    window.__nomadInitDashboard?.();
    dashboardInitialized = true;
  }
}

/** React shell — renders original Nomad OS dashboard markup + boots vanilla engine. */
export default function LegacyDashboardShell() {
  const [markup, setMarkup] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(MARKUP_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (!cancelled) setMarkup(html);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!markup) return;
    void bootstrapLegacyDashboard();
  }, [markup]);

  if (loadError) {
    return (
      <div className="app app--wide" style={{ padding: '2rem', color: '#f87171' }}>
        Failed to load dashboard markup: {loadError}
      </div>
    );
  }

  if (!markup) {
    return (
      <div className="app app--wide" style={{ padding: '2rem', color: '#94a3b8' }}>
        Loading Nomad OS…
      </div>
    );
  }

  return <div id="nomad-legacy-root" dangerouslySetInnerHTML={{ __html: markup }} />;
}
