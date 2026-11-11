/** TAF: provas, formato das marcas e modelos de índices de editais. */
export type FitnessUnit = "reps" | "seconds" | "meters";
export type FitnessTemplateTest = { name: string; detail?: string; unit: FitnessUnit; target: number; higherIsBetter: boolean };

export const UNIT_LABEL: Record<FitnessUnit, string> = { reps: "repetições", seconds: "tempo", meters: "metros" };

export function fmtMark(v: number, unit: FitnessUnit): string {
  if (unit === "reps") return `${Math.round(v)} rep.`;
  if (unit === "meters") return `${Math.round(v)} m`;
  if (v < 60) return `${Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")} s`;
  const m = Math.floor(v / 60);
  const s = Math.round(v - m * 60);
  return `${m}min${s ? String(s).padStart(2, "0") + "s" : ""}`;
}

/** Aceita "11:30", "11min30", "11'30", "690" (segundos) ou "10,5". */
export function parseMark(raw: string, unit: FitnessUnit): number | null {
  const s = raw.trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  if (unit === "seconds") {
    const m = s.match(/^(\d{1,3})\s*(?::|min|m|')\s*(\d{1,2}(?:\.\d+)?)?\s*(?:s|")?$/);
    if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  }
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && /\d/.test(s) ? n : null;
}

export const passes = (v: number, target: number, higherIsBetter: boolean) => (higherIsBetter ? v >= target : v <= target);

/**
 * PMAL 2026 (Cebraspe) — índices mínimos divulgados a partir do edital.
 * Fontes divergem no tempo da corrida (11 ou 12 min): usamos o mais exigente; confira no edital.
 */
export const TAF_TEMPLATES: Record<string, { title: string; tests: FitnessTemplateTest[] }> = {
  "pmal-m": {
    title: "PMAL 2026 — masculino",
    tests: [
      { name: "Abdominal supra", detail: "em 1 minuto", unit: "reps", target: 40, higherIsBetter: true },
      { name: "Barra fixa", detail: "flexão na barra", unit: "reps", target: 4, higherIsBetter: true },
      { name: "Corrida de ir e vir", detail: "shuttle run", unit: "seconds", target: 11, higherIsBetter: false },
      { name: "Corrida de 2.000 m", unit: "seconds", target: 660, higherIsBetter: false },
      { name: "Natação 50 m", unit: "seconds", target: 65, higherIsBetter: false },
    ],
  },
  "pmal-f": {
    title: "PMAL 2026 — feminino",
    tests: [
      { name: "Abdominal supra", detail: "em 1 minuto", unit: "reps", target: 30, higherIsBetter: true },
      { name: "Isometria na barra", unit: "seconds", target: 10, higherIsBetter: true },
      { name: "Corrida de ir e vir", detail: "shuttle run", unit: "seconds", target: 13, higherIsBetter: false },
      { name: "Corrida de 1.800 m", unit: "seconds", target: 780, higherIsBetter: false },
      { name: "Natação 50 m", unit: "seconds", target: 65, higherIsBetter: false },
    ],
  },
};
