/** Datas sempre como 'YYYY-MM-DD' no fuso do usuário (Alagoas), sem surpresas de UTC. */
export const TZ = "America/Maceio";

const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export function today(now = new Date()): string {
  return isoFmt.format(now);
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function weekday(iso: string): number {
  return parse(iso).getUTCDay();
}

/** Segunda-feira da semana da data (a semana de estudos começa na segunda). */
export function weekStart(iso: string): string {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Ordem de exibição: começa na segunda. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const longFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export const fmtLong = (iso: string) => longFmt.format(parse(iso));
export const fmtShort = (iso: string) => shortFmt.format(parse(iso)).replace(".", "");
export const fmtFull = (iso: string) => fullFmt.format(parse(iso));

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function isISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parse(v).getTime()) && parse(v).toISOString().slice(0, 10) === v;
}
