import { translate } from '../lib/globalBridge';

interface PivotDayButtonProps {
  badWeather: boolean;
  pivoted: boolean;
  shelterDelta: number;
  currency: string;
  onPivot: () => void;
  onReset: () => void;
}

export function PivotDayButton({
  badWeather,
  pivoted,
  shelterDelta,
  currency,
  onPivot,
  onReset
}: PivotDayButtonProps) {
  return (
    <section className="tp-card border-dashed border-amber-400/25 bg-amber-500/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-white">
            {translate('tripPivotTitle', 'Rain & contingency matrix')}
          </h2>
          <p className="text-xs text-slate-400">
            {badWeather
              ? translate('tripPivotBad', 'Poor weather detected — indoor swaps ready')
              : translate('tripPivotOk', 'Weather OK — pivot available if forecast shifts')}
          </p>
          {pivoted && shelterDelta > 0 && (
            <p className="mt-1 text-xs text-amber-200">
              +{currency} {shelterDelta} {translate('tripShelterCost', 'estimated shelter/day')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!pivoted ? (
            <button type="button" className="tp-btn-primary w-full sm:w-auto" onClick={onPivot}>
              🌧 {translate('tripPivotBtn', 'Pivot day')}
            </button>
          ) : (
            <button type="button" className="tp-btn-ghost w-full sm:w-auto" onClick={onReset}>
              ↩ {translate('tripResetBtn', 'Restore outdoor plan')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
