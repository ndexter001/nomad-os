import { translate } from '../lib/globalBridge';

interface PackingChecklistProps {
  clothing: string[];
  gear: string[];
  essentials: string[];
  checked: Record<string, boolean>;
  durationDays: number;
  onToggle: (item: string) => void;
  onDurationChange: (days: number) => void;
}

function ChecklistGroup({
  title,
  items,
  checked,
  onToggle
}: {
  title: string;
  items: string[];
  checked: Record<string, boolean>;
  onToggle: (item: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
              <input
                type="checkbox"
                checked={!!checked[item]}
                onChange={() => onToggle(item)}
                className="h-4 w-4 rounded border-white/20 bg-black/40 text-accent focus:ring-accent"
              />
              <span className={`text-sm ${checked[item] ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PackingChecklist({
  clothing,
  gear,
  essentials,
  checked,
  durationDays,
  onToggle,
  onDurationChange
}: PackingChecklistProps) {
  const done = Object.values(checked).filter(Boolean).length;
  const total = clothing.length + gear.length + essentials.length;

  return (
    <section className="tp-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">
            {translate('tripPackingTitle', 'Packing & prep checklist')}
          </h2>
          <p className="text-xs text-slate-400">
            {done}/{total} {translate('tripPackingDone', 'packed')}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          {translate('retentionPackingDays', 'Days')}
          <input
            type="number"
            min={1}
            max={90}
            value={durationDays}
            onChange={(e) => onDurationChange(Number(e.target.value) || 7)}
            className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-white"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChecklistGroup
          title={translate('retentionPackingClothing', 'Clothing')}
          items={clothing}
          checked={checked}
          onToggle={onToggle}
        />
        <ChecklistGroup
          title={translate('retentionPackingGear', 'Gear')}
          items={[...gear, ...essentials]}
          checked={checked}
          onToggle={onToggle}
        />
      </div>
    </section>
  );
}
