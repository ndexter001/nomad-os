import type { OfflineTripBundle, TripActivity, TripDestination } from '../types/trip';
import type { DailyBurnBreakdown } from '../types/trip';

const VAULT_DB = 'trip-planner-vault';
const VAULT_LS = 'trip-planner-vault-cache';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(VAULT_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('trips')) {
          db.createObjectStore('trips', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

export async function cacheTripBundle(bundle: OfflineTripBundle): Promise<void> {
  const id = bundle.destination.name.toLowerCase().replace(/\s+/g, '-');
  const record = { id, ...bundle };

  try {
    localStorage.setItem(VAULT_LS, JSON.stringify(record));
    localStorage.setItem('nomados_last_city', JSON.stringify({
      name: bundle.destination.name,
      country: bundle.destination.country,
      countryCode: bundle.destination.countryCode,
      country_code: bundle.destination.countryCode,
      currency: bundle.destination.currency,
      label: bundle.destination.label,
      lat: bundle.destination.lat,
      lon: bundle.destination.lon
    }));
  } catch { /* quota */ }

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('trips', 'readwrite');
    tx.objectStore('trips').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCachedTrip(): Promise<OfflineTripBundle | null> {
  try {
    const raw = localStorage.getItem(VAULT_LS);
    if (raw) return JSON.parse(raw) as OfflineTripBundle;
  } catch { /* ignore */ }

  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction('trips', 'readonly');
    const req = tx.objectStore('trips').getAll();
    req.onsuccess = () => {
      const rows = req.result as OfflineTripBundle[];
      resolve(rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0] || null);
    };
    req.onerror = () => resolve(null);
  });
}

export function buildOfflineBundle(params: {
  destination: TripDestination;
  itinerary: TripActivity[];
  budget: DailyBurnBreakdown;
  packing: { clothing: string[]; gear: string[]; essentials: string[] };
  language: string;
}): OfflineTripBundle {
  const cc = params.destination.countryCode?.toUpperCase() || 'default';
  const emergencyMap: Record<string, { police: string; ambulance: string; fire: string }> = {
    default: { police: '112', ambulance: '112', fire: '112' },
    US: { police: '911', ambulance: '911', fire: '911' },
    JP: { police: '110', ambulance: '119', fire: '119' },
    NO: { police: '112', ambulance: '113', fire: '110' }
  };

  return {
    destination: params.destination,
    itinerary: params.itinerary,
    budget: params.budget,
    packing: params.packing,
    language: params.language,
    cheatsheets: [
      { phrase: 'How much?', local: 'How much does this cost?' },
      { phrase: 'Help', local: 'I need help, please.' }
    ],
    emergency: emergencyMap[cc] || emergencyMap.default,
    updatedAt: new Date().toISOString()
  };
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
