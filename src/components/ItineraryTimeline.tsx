import type { TripActivity } from '../types/trip';
import { translate } from '../lib/globalBridge';

interface ItineraryTimelineProps {
  activities: TripActivity[];
  bestWindow?: string | null;
  loading?: boolean;
}

const typeIcon: Record<string, string> = {
  outdoor: '🌤',
  indoor: '🏛',
  food: '🍜',
  transit: '🚇'
};

export function ItineraryTimeline({ activities, bestWindow, loading }: ItineraryTimelineProps) {
  if (loading) {
    return (
      <section className="tp-card animate-pulse">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="tp-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            {translate('tripItineraryTitle', "Today's plan")}
          </h2>
          <p className="text-xs text-slate-400">
            {translate('tripItinerarySub', 'Auto-optimized for weather windows')}
          </p>
        </div>
        {bestWindow && (
          <span className="tp-badge bg-accent-dim text-accent">
            ☀️ {bestWindow}
          </span>
        )}
      </div>

      <ol className="relative space-y-3 border-l border-white/10 pl-4">
        {activities.map((act) => (
          <li key={act.id} className="relative">
            <span className="absolute -left-[1.35rem] top-3 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-surface-raised" />
            <article
              className={`rounded-xl border p-3 ${
                act.pivoted
                  ? 'border-amber-400/30 bg-amber-500/10'
                  : 'border-white/8 bg-black/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {typeIcon[act.type] || '•'} {act.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {act.durationMin} min
                    {act.slot ? ` · ${act.slot}` : ''}
                    {act.costEstimate > 0 ? ` · ${act.currency} ${act.costEstimate}` : ''}
                  </p>
                </div>
                {act.pivoted && (
                  <span className="tp-badge bg-amber-500/20 text-amber-200">
                    {translate('tripPivoted', 'Pivoted')}
                  </span>
                )}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
