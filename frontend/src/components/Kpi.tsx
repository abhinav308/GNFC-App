import type { ReactNode } from 'react';

const TONES = {
  navy: 'text-blue-900 bg-blue-50',
  green: 'text-emerald-700 bg-emerald-50',
  red: 'text-rose-700 bg-rose-50',
  amber: 'text-amber-700 bg-amber-50',
  sky: 'text-sky-700 bg-sky-50',
} as const;

/** One headline number on the admin dashboard. Clickable when `onClick` is given. */
export function Kpi({ label, value, caption, tone = 'navy', onClick }: { label: string; value: ReactNode; caption?: string; tone?: keyof typeof TONES; onClick?: () => void }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 inline-block rounded-md px-2 py-0.5 text-2xl font-bold leading-tight ${TONES[tone]}`}>{value}</p>
      {caption && <p className="mt-2 text-xs text-slate-500">{caption}</p>}
    </>
  );
  const cls = 'card text-left !p-4 flex flex-col';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} card-hover focus:outline-none focus:ring-2 focus:ring-blue-600`}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Bars of employees present per day. Plain SVG: no chart library for one chart. */
export function TrendChart({ data }: { data: { date: string; present: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.present));
  const W = 560, H = 160, pad = 24, bw = (W - pad * 2) / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label="Employees present per day, last 7 days">
      <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="#cbd5e1" />
      {data.map((d, i) => {
        const h = (d.present / max) * (H - 24);
        const x = pad + i * bw + bw * 0.2;
        return (
          <g key={d.date}>
            <rect x={x} y={H - h} width={bw * 0.6} height={h} rx={3} fill="#1e3a8a"><title>{`${d.date}: ${d.present} present`}</title></rect>
            <text x={x + bw * 0.3} y={H - h - 5} textAnchor="middle" fontSize="11" fill="#334155">{d.present}</text>
            <text x={x + bw * 0.3} y={H + 15} textAnchor="middle" fontSize="10" fill="#64748b">
              {new Date(d.date + 'T00:00:00Z').toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
