import type { OfflineTripBundle } from '../types/trip';
import { isOnline, translate } from '../lib/globalBridge';

interface OfflineVaultProps {
  bundle: OfflineTripBundle | null;
  onSync: () => void;
  syncing?: boolean;
}

export function OfflineVault({ bundle, onSync, syncing }: OfflineVaultProps) {
  const online = isOnline();

  return (
    <section className="tp-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">
            {translate('tripVaultTitle', 'Offline trip vault')}
          </h2>
          <p className="text-xs text-slate-400">
            {online
              ? translate('tripVaultOnline', 'Itinerary, budget & cheatsheets cached locally')
              : translate('tripVaultOffline', 'Using cached trip data — no network needed')}
          </p>
        </div>
        <button type="button" className="tp-btn-ghost text-xs" onClick={onSync} disabled={syncing}>
          {syncing ? '…' : '💾 ' + translate('tripVaultSync', 'Sync')}
        </button>
      </div>

      {!bundle ? (
        <p className="text-sm text-slate-500">{translate('tripVaultEmpty', 'Plan a trip to cache offline')}</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="tp-badge bg-white/5 text-slate-300">
              🚓 {bundle.emergency.police}
            </span>
            <span className="tp-badge bg-white/5 text-slate-300">
              🚑 {bundle.emergency.ambulance}
            </span>
            <span className="tp-badge bg-white/5 text-slate-300">
              🚒 {bundle.emergency.fire}
            </span>
          </div>
          <ul className="space-y-1 text-xs text-slate-400">
            {bundle.cheatsheets.map((c) => (
              <li key={c.phrase}>
                <strong className="text-slate-300">{c.phrase}:</strong> {c.local}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-600">
            {translate('tripVaultUpdated', 'Updated')}: {new Date(bundle.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}
