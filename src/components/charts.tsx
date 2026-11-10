/** Gráficos leves em SVG (sem biblioteca), legíveis no claro e no escuro. */

export function LineChart({ points, suffix = "", max = 100 }: { points: { label: string; value: number }[]; suffix?: string; max?: number }) {
  const W = 320;
  const H = 140;
  const pad = { l: 28, r: 10, t: 12, b: 22 };
  const top = Math.max(max, ...points.map((p) => p.value));
  const bottom = Math.min(0, ...points.map((p) => p.value));
  const x = (i: number) => pad.l + (points.length === 1 ? 0 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + ((top - v) * (H - pad.t - pad.b)) / (top - bottom || 1);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const ticks = [bottom, (top + bottom) / 2, top].map((v) => Math.round(v));
  const every = Math.ceil(points.length / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de evolução">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="3 3" />
          <text x={pad.l - 4} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--muted)">{t}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--color-brand-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3.5" fill="var(--surface)" stroke="var(--color-brand-600)" strokeWidth="2">
            <title>{`${p.label}: ${p.value}${suffix}`}</title>
          </circle>
          {(i % every === 0 || i === points.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function ColumnChart({ bars, goal, format }: { bars: { label: string; value: number; highlight?: boolean }[]; goal?: number; format: (v: number) => string }) {
  const W = 320;
  const H = 150;
  const pad = { l: 6, r: 6, t: 16, b: 22 };
  const top = Math.max(goal ?? 0, ...bars.map((b) => b.value), 1);
  const bw = (W - pad.l - pad.r) / bars.length;
  const y = (v: number) => pad.t + ((top - v) * (H - pad.t - pad.b)) / top;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico de colunas">
      {goal ? (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--color-gold-500)" strokeDasharray="4 3" />
          <text x={W - pad.r} y={y(goal) - 3} textAnchor="end" fontSize="9" fill="var(--color-gold-600)">meta</text>
        </g>
      ) : null}
      {bars.map((b, i) => {
        const h = H - pad.b - y(b.value);
        return (
          <g key={i}>
            <rect
              x={pad.l + i * bw + bw * 0.18}
              y={y(b.value)}
              width={bw * 0.64}
              height={Math.max(h, b.value ? 2 : 0)}
              rx="3"
              fill={b.highlight ? "var(--color-brand-600)" : "color-mix(in srgb, var(--color-brand-500) 45%, transparent)"}
            >
              <title>{`${b.label}: ${format(b.value)}`}</title>
            </rect>
            <text x={pad.l + i * bw + bw / 2} y={H - 7} textAnchor="middle" fontSize="9" fill="var(--muted)">{b.label}</text>
            {b.value > 0 && (
              <text x={pad.l + i * bw + bw / 2} y={y(b.value) - 3} textAnchor="middle" fontSize="8.5" fill="var(--text)">{format(b.value)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function HBar({ label, value, max, color, right }: { label: string; value: number; max: number; color?: string; right: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="muted shrink-0 tabular-nums">{right}</span>
      </div>
      <div className="bar"><span style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}
