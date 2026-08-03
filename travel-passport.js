/**
 * Travel Passport — offline destination bundles & trip archive (IndexedDB + localStorage fallback)
 */
const PASSPORT_DB_NAME = 'nomad-os-passport';
const PASSPORT_DB_VERSION = 1;
const PASSPORT_LS_KEY = 'nomad-os-passport-cache';
const PASSPORT_ARCHIVE_KEY = 'nomad-os-trip-archive';

const TravelPassport = {
    _db: null,
    _memCache: {},
    _archives: [],

    async init() {
        try {
            const raw = localStorage.getItem(PASSPORT_ARCHIVE_KEY);
            this._archives = raw ? JSON.parse(raw) : [];
        } catch {
            this._archives = [];
        }

        if (typeof indexedDB === 'undefined') return;
        try {
            this._db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(PASSPORT_DB_NAME, PASSPORT_DB_VERSION);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('destinations')) {
                        db.createObjectStore('destinations', { keyPath: 'cityKey' });
                    }
                    if (!db.objectStoreNames.contains('archives')) {
                        db.createObjectStore('archives', { keyPath: 'id' });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch {
            this._db = null;
        }
    },

    _cityKey(city) {
        return String(city || 'unknown').toLowerCase().replace(/\s+/g, '-');
    },

    async cacheDestinationBundle(city, countryCode, bundle) {
        const cityKey = this._cityKey(city);
        const record = { cityKey, city, countryCode, bundle, updatedAt: Date.now() };
        this._memCache[cityKey] = record;

        try {
            if (this._db) {
                await new Promise((resolve, reject) => {
                    const tx = this._db.transaction('destinations', 'readwrite');
                    tx.objectStore('destinations').put(record);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }
            const ls = JSON.parse(localStorage.getItem(PASSPORT_LS_KEY) || '{}');
            ls[cityKey] = record;
            localStorage.setItem(PASSPORT_LS_KEY, JSON.stringify(ls));
        } catch { /* quota */ }
    },

    async getOfflineBundle(city) {
        const cityKey = this._cityKey(city);
        if (this._memCache[cityKey]) return this._memCache[cityKey].bundle;

        if (this._db) {
            try {
                const record = await new Promise((resolve, reject) => {
                    const tx = this._db.transaction('destinations', 'readonly');
                    const req = tx.objectStore('destinations').get(cityKey);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
                if (record?.bundle) {
                    this._memCache[cityKey] = record;
                    return record.bundle;
                }
            } catch { /* fall through */ }
        }

        try {
            const ls = JSON.parse(localStorage.getItem(PASSPORT_LS_KEY) || '{}');
            return ls[cityKey]?.bundle || null;
        } catch {
            return null;
        }
    },

    async archiveCurrentTrip(trip) {
        const entry = {
            id: `archive_${Date.now()}`,
            ...trip,
            archivedAt: new Date().toISOString()
        };
        this._archives.unshift(entry);
        this._archives = this._archives.slice(0, 50);

        try {
            localStorage.setItem(PASSPORT_ARCHIVE_KEY, JSON.stringify(this._archives));
            if (this._db) {
                await new Promise((resolve, reject) => {
                    const tx = this._db.transaction('archives', 'readwrite');
                    tx.objectStore('archives').put(entry);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            }
        } catch { /* quota */ }
        return entry;
    },

    getArchives() {
        return [...this._archives];
    },

    renderPassportUI() {
        const card = document.getElementById('travel-passport-card');
        if (!card) return;

        const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
        card.hidden = !city;

        const statusEl = document.getElementById('passport-offline-status');
        const emergencyEl = document.getElementById('passport-emergency');
        const phrasesEl = document.getElementById('passport-phrases');
        const archiveEl = document.getElementById('passport-archive-list');

        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        if (statusEl) {
            statusEl.textContent = online
                ? (typeof t === 'function' ? t('retentionPassportOnline') : 'Online — caching passport data for offline use.')
                : (typeof t === 'function' ? t('retentionPassportOffline') : 'Offline mode — showing cached Travel Passport.');
            statusEl.className = `passport-status passport-status--${online ? 'online' : 'offline'}`;
        }

        this.getOfflineBundle(city?.name || '').then((bundle) => {
            if (!bundle) return;

            if (emergencyEl && bundle.emergency) {
                emergencyEl.innerHTML = `
                    <span>🚓 ${bundle.emergency.police}</span>
                    <span>🚑 ${bundle.emergency.ambulance}</span>
                    <span>🚒 ${bundle.emergency.fire}</span>`;
            }

            if (phrasesEl && bundle.phrases) {
                phrasesEl.innerHTML = bundle.phrases.map((p) =>
                    `<div class="passport-phrase"><strong>${p.phrase}</strong><span>${p.local}</span></div>`
                ).join('');
            }
        });

        if (archiveEl) {
            const archives = this.getArchives();
            archiveEl.innerHTML = archives.length
                ? archives.slice(0, 5).map((a) => `
                    <div class="passport-archive-item">
                        <strong>${a.city || '—'}</strong>
                        <span>${a.to || ''} · ${new Date(a.archivedAt).toLocaleDateString()}</span>
                    </div>`).join('')
                : `<p class="passport-empty">${typeof t === 'function' ? t('retentionNoArchives') : 'Archive trips to keep weather & expense history.'}</p>`;
        }
    }
};

async function initTravelPassport() {
    await TravelPassport.init();
    TravelPassport.renderPassportUI();
    window.addEventListener('online', () => TravelPassport.renderPassportUI());
    window.addEventListener('offline', () => TravelPassport.renderPassportUI());
}
