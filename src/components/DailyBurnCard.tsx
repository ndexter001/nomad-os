import type { DailyBurnBreakdown } from '../types/trip';
import { formatMoney } from '../lib/tripBudget';
import { translate } from '../lib/globalBridge';

interface DailyBurnCardProps {
  burn: DailyBurnBreakdown | null;
  travelStyle: string;
  onStyleChange: (style: 'backpacker' | 'nomad' | 'luxury') => void;
}

export function DailyBurnCard({ burn, travelStyle, onStyleChange }: DailyBurnCardProps) {
  const styles = [
    { id: 'backpacker' as const, label: '🎒 ' + translate('travelStyleBackpacker', 'Backpacker') },
    { id: 'nomad' as const, label: '💻 ' + translate('travelStyleNomad', 'Nomad') },
    { id: 'luxury' as const, label: '🥂 ' + translate('travelStyleLuxury', 'Luxury') }
  ];

  return (
    <section className="tp-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">
            {translate('tripBurnTitle', 'True daily burn')}
          </h2>
          <p className="text-xs text-slate-400">
            {translate('tripBurnSub', 'Accommodation · transit · food · hidden fees')}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {styles.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStyleChange(s.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                travelStyle === s.id
                  ? 'bg-accent text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {!burn ? (
        <p className="text-sm text-slate-500">{translate('tripBurnEmpty', 'Select a destination')}</p>
      ) : (
        <>
          <p className="text-3xl font-bold text-white">
            {formatMoney(burn.total, burn.currency)}
            <span className="ml-2 text-sm font-normal text-slate-400">/ day</span>
          </p>
          {burn.totalHome != null && (
            <p className="mt-1 text-sm text-slate-400">
              ≈ {formatMoney(burn.totalHome, burn.homeCurrency)} / day
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-black/25 p-2">
              <dt className="text-slate-500">{translate('tripBurnStay', 'Stay')}</dt>
              <dd className="font-semibold text-slate-200">{formatMoney(burn.accommodation, burn.currency)}</dd>
            </div>
            <div className="rounded-lg bg-black/25 p-2">
              <dt className="text-slate-500">{translate('tripBurnFood', 'Food')}</dt>
              <dd className="font-semibold text-slate-200">{formatMoney(burn.food, burn.currency)}</dd>
            </div>
            <div className="rounded-lg bg-black/25 p-2">
              <dt className="text-slate-500">{translate('tripBurnTransit', 'Transit')}</dt>
              <dd className="font-semibold text-slate-200">{formatMoney(burn.transit, burn.currency)}</dd>
            </div>
            <div className="rounded-lg bg-black/25 p-2">
              <dt className="text-slate-500">{translate('tripBurnHidden', 'Tax & fees')}</dt>
              <dd className="font-semibold text-slate-200">{formatMoney(burn.hiddenFees, burn.currency)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-500">{burn.cityTaxNote}</p>
          <p className="text-[11px] text-slate-500">{burn.tippingNote}</p>
        </>
      )}
    </section>
  );
}
