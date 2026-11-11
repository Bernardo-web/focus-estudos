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

/** Calendário de constância: um quadrado por dia (semanas em colunas, segunda a domingo). */
export function Heatmap({ start, days, today, levels = [1, 60, 120, 180] }: { start: string; days: Record<string, number>; today: string; levels?: number[] }) {
  const weeks = 18;
  const cell = 14;
  const gap = 3;
  const parse = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const t0 = parse(start);
  const shades = ["var(--soft)", "color-mix(in srgb, var(--color-brand-500) 30%, transparent)", "color-mix(in srgb, var(--color-brand-500) 55%, transparent)", "color-mix(in srgb, var(--color-brand-600) 80%, transparent)", "var(--color-brand-700)"];
  const level = (m: number) => (m <= 0 ? 0 : levels.filter((l) => m >= l).length);
  const months: { x: number; label: string }[] = [];
  const cells = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = iso(t0 + (w * 7 + d) * 86_400_000);
      if (date > today) continue;
      if (d === 0 && (w === 0 || date.slice(8, 10) <= "07")) {
        months.push({ x: w * (cell + gap), label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(parse(date)).replace(".", "") });
      }
      const m = days[date] ?? 0;
      cells.push(
        <rect key={date} x={w * (cell + gap)} y={14 + d * (cell + gap)} width={cell} height={cell} rx="3" fill={shades[level(m)]} stroke={date === today ? "var(--color-gold-500)" : "none"} strokeWidth="1.5">
          <title>{`${date.split("-").reverse().join("/")}: ${m ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : "sem estudo"}`}</title>
        </rect>,
      );
    }
  }
  const W = weeks * (cell + gap);
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${14 + 7 * (cell + gap)}`} className="w-full" role="img" aria-label="Calendário de dias estudados">
        {months.map((m) => <text key={m.x} x={m.x} y="10" fontSize="9" fill="var(--muted)">{m.label}</text>)}
        {cells}
      </svg>
      <div className="muted flex items-center justify-end gap-1 text-[10px]">
        menos {shades.map((c, i) => <span key={i} className="inline-block size-2.5 rounded-sm" style={{ background: c }} />)} mais
      </div>
    </div>
  );
}
