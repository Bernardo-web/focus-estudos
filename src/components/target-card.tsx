import Link from "next/link";
import { Target } from "lucide-react";
import { score } from "@/lib/scoring";
import type { Exam, Mock, Subject } from "@/lib/types";

type Result = { subject_id: string; items: number; correct: number; wrong: number };

/** Distância até a nota de corte e onde estão os pontos mais fáceis de ganhar. */
export function TargetCard({ exam, mock, results, subjects }: { exam: Exam; mock: Mock | null; results: Result[]; subjects: Subject[] }) {
  if (exam.target_score === null) {
    return (
      <Link href={`/concursos/${exam.id}`} className="card flex items-center gap-3 p-4 text-sm">
        <Target className="size-5 text-gold-500" />
        <span className="flex-1">Defina a <strong>nota de corte esperada</strong> no concurso para ver quanto falta a cada simulado.</span>
      </Link>
    );
  }
  const target = Number(exam.target_score);
  const examItems = exam.total_items ?? mock?.total_items ?? null;
  if (!mock || !mock.total_items) {
    return (
      <section className="card flex items-center gap-3 p-4 text-sm">
        <Target className="size-5 text-gold-500" />
        <span>Meta: <strong>{target} pontos</strong>{examItems ? ` de ${examItems}` : ""}. Registre um simulado para ver a distância.</span>
      </section>
    );
  }

  const sc = score(mock.total_items, mock.correct ?? 0, mock.wrong ?? 0, exam.scoring);
  // simulado menor que a prova: projeta proporcionalmente
  const projected = examItems && examItems !== mock.total_items ? Math.round((sc.net / mock.total_items) * examItems * 10) / 10 : sc.net;
  const gap = Math.round((target - projected) * 10) / 10;
  const pct = examItems ? Math.max(0, Math.min(100, (projected / examItems) * 100)) : 0;
  const targetPct = examItems ? Math.min(100, (target / examItems) * 100) : 0;

  const byId = new Map(subjects.map((s) => [s.id, s]));
  const lost = results
    .map((r) => {
      const s = score(r.items, r.correct, r.wrong, exam.scoring);
      return { name: byId.get(r.subject_id)?.short_name || byId.get(r.subject_id)?.name || "Matéria", lost: r.items - s.net, items: r.items };
    })
    .filter((x) => x.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 3);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Target className="size-5 text-gold-500" />
        <h2 className="flex-1 font-semibold">Meta de nota</h2>
        <span className={`chip ${gap <= 0 ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : ""}`}>
          {gap <= 0 ? `${Math.abs(gap)} acima da meta` : `faltam ${gap} pontos`}
        </span>
      </div>
      {examItems && (
        <div className="relative pt-2">
          <div className="bar h-3"><span style={{ width: `${pct}%`, background: gap <= 0 ? "var(--color-good)" : undefined }} /></div>
          <span className="absolute top-0 h-5 w-0.5 bg-gold-500" style={{ left: `${targetPct}%` }} aria-hidden />
        </div>
      )}
      <p className="text-sm">
        Último simulado: <strong>{sc.net} pts</strong>
        {projected !== sc.net && <> (≈ <strong>{projected}</strong> na prova de {examItems} itens)</>} · meta <strong>{target}</strong>.
      </p>
      {lost.length > 0 && gap > 0 && (
        <p className="text-sm">
          Pontos mais fáceis de recuperar: {lost.map((l, i) => <span key={l.name}>{i > 0 && ", "}<strong>{l.name}</strong> ({l.lost} perdidos em {l.items})</span>)}.
        </p>
      )}
      {exam.scoring === "cebraspe" && gap > 0 && (
        <p className="muted text-xs">No Cebraspe, deixar em branco as que você não sabe também sobe a nota: cada errada a menos vale um ponto.</p>
      )}
    </section>
  );
}
