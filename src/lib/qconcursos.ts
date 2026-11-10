/**
 * Leitura da tabela "Estatísticas de Disciplinas" do Qconcursos.
 * Aceita o texto copiado da página (Ctrl+C) ou o que o botão de favoritos captura:
 * linhas com nome da disciplina, certas, erradas, total e % (o botão "zerar" é ignorado).
 */
export type QcRow = { name: string; correct: number; wrong: number; total: number };

const INT = /^\d{1,6}$/;
const PCT = /^\d{1,3}(?:[.,]\d+)?\s*%$/;
const LINE = /^(.+?)\s+(\d{1,6})\s+(\d{1,6})\s+(\d{1,6})(?:\s+\d{1,3}(?:[.,]\d+)?\s*%)?(?:\s+zerar)?\s*$/i;
const HEADER = /^(certas|erradas|total|%|disciplina|disciplinas|zerar|estatísticas de disciplinas)$/i;

function clean(name: string): string {
  return name.replace(/\s+/g, " ").replace(/\s*(\.{3}|…)$/, "…").trim().slice(0, 200);
}

function valid(r: QcRow): boolean {
  return r.name.length > 0 && !HEADER.test(r.name) && r.correct + r.wrong === r.total && r.total > 0;
}

export function parseQcStats(text: string): QcRow[] {
  const out: QcRow[] = [];
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/\t+/g, " ").trim()).filter(Boolean);

  // 1) cada linha com tudo junto: "Português 30 10 40 75% zerar"
  for (const l of lines) {
    const m = l.match(LINE);
    if (!m) continue;
    const r = { name: clean(m[1]), correct: +m[2], wrong: +m[3], total: +m[4] };
    if (valid(r)) out.push(r);
  }
  if (out.length) return dedupe(out);

  // 2) uma célula por linha (texto da página lido pelo botão)
  const t = text.replace(/\r/g, "").split(/[\n\t]+/).map((s) => s.trim()).filter((s) => s && !/^zerar$/i.test(s));
  for (let i = 1; i + 2 < t.length; i++) {
    if (!(INT.test(t[i]) && INT.test(t[i + 1]) && INT.test(t[i + 2]))) continue;
    if (INT.test(t[i - 1]) || PCT.test(t[i - 1])) continue;
    const r = { name: clean(t[i - 1]), correct: +t[i], wrong: +t[i + 1], total: +t[i + 2] };
    if (valid(r)) {
      out.push(r);
      i += PCT.test(t[i + 3] ?? "") ? 3 : 2;
    }
  }
  return dedupe(out);
}

function dedupe(rows: QcRow[]): QcRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)));
}

const STOP = new Set(["de", "do", "da", "dos", "das", "e", "a", "o", "nocoes", "lingua", "conhecimentos", "estado", "ao"]);

export function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9… ]+/g, " ").replace(/\s+/g, " ").trim();
}
/** "portugues" ≈ "portuguesa", "militar" ≈ "militares" */
const sameWord = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a)));
const words = (s: string) => norm(s).replace(/…/g, "").split(" ").filter((w) => w && !STOP.has(w));

/** Sugere a matéria do Focus para um nome do Qconcursos (ou null se não houver uma clara). */
export function guessSubject(
  qcName: string,
  subjects: { id: string; name: string; short_name: string | null }[],
  aliases: Record<string, string>,
): string | null {
  if (aliases[qcName] && subjects.some((s) => s.id === aliases[qcName])) return aliases[qcName];
  const n = norm(qcName);
  const exact = subjects.find((s) => norm(s.name) === n || (s.short_name && norm(s.short_name) === n));
  if (exact) return exact.id;

  // nome cortado pelo site ("Direito Processual Pen…"): só aceita se um único nome começar assim
  if (n.endsWith("…")) {
    const prefix = n.slice(0, -1).trim();
    const hits = subjects.filter((s) => norm(s.name).startsWith(prefix));
    if (hits.length === 1) return hits[0].id;
    if (hits.length > 1) return null; // ambíguo: a pessoa escolhe na prévia
  }

  const q = new Set(words(qcName));
  const truncated = n.endsWith("…");
  const scored = subjects
    .map((s) => {
      const w = new Set([...words(s.name), ...(s.short_name ? words(s.short_name) : [])]);
      let hit = 0;
      for (const x of q) if ([...w].some((y) => sameWord(x, y) || (truncated && y.startsWith(x)))) hit++;
      const score = q.size ? hit / new Set([...q, ...words(s.name)]).size : 0;
      return { id: s.id, score };
    })
    .sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score >= 0.5 && (!scored[1] || scored[0].score > scored[1].score)) return scored[0].id;

  // casos frequentes em editais estaduais
  if (/historia|geografia|economia/.test(n)) {
    const state = subjects.find((s) => /estado|alagoas|regionais|local/.test(norm(s.name)));
    if (state) return state.id;
  }
  return null;
}
