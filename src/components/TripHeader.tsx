import type { TripDestination } from '../types/trip';
import { isOnline, translate } from '../lib/globalBridge';

interface TripHeaderProps {
  destination: TripDestination | null;
  onOpenMap?: () => void;
}

export function TripHeader({ destination, onOpenMap }: TripHeaderProps) {
  const online = isOnline();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0b0f]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {translate('tripActiveDest', 'Active destination')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold text-white">
              {destination?.label || translate('tripPickDest', 'Pick a destination')}
            </h1>
            <span
              className={`tp-badge ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'}`}
            >
              {online ? '🟢 ' + translate('tripOnline', 'Online') : '📴 ' + translate('tripOffline', 'Offline cache')}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="lang-select" className="sr-only">
            {translate('langLabel', 'Language')}
          </label>
          <select
            id="lang-select"
            className="rounded-xl border border-white/10 bg-surface-raised px-2 py-2 text-sm text-slate-200"
            aria-label={translate('langLabel', 'Language')}
          />
          {onOpenMap && (
            <button type="button" className="tp-btn-ghost px-3 py-2" onClick={onOpenMap} aria-label="Map">
              🗺
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
