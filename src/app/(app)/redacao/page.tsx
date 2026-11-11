import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { pickExam } from "@/lib/data";
import { fmtFull, today } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { HBar, LineChart } from "@/components/charts";
import { EssayForm } from "./essay-form";
import { deleteEssay } from "./actions";

export const metadata: Metadata = { title: "Redação" };

type Essay = { id: string; day: string; theme: string; score: number | null; max_score: number | null; issues: string[]; notes: string | null };

export default async function EssayPage() {
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const { data, error } = await supabase
    .from("essays")
    .select("id, day, theme, score, max_score, issues, notes")
    .eq("exam_id", exam.id)
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const essays = (data ?? []) as Essay[];

  const graded = essays.filter((e) => e.score !== null && e.max_score).reverse();
  const pct = (e: Essay) => Math.round((Number(e.score) / Number(e.max_score)) * 1000) / 10;
  const avg = graded.length ? Math.round((graded.reduce((a, e) => a + pct(e), 0) / graded.length) * 10) / 10 : null;
  const recent = graded.slice(-3);
  const recentAvg = recent.length ? Math.round((recent.reduce((a, e) => a + pct(e), 0) / recent.length) * 10) / 10 : null;
  const counts = new Map<string, number>();
  essays.slice(0, 10).forEach((e) => e.issues.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
  const topIssues = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const lastMax = essays.find((e) => e.max_score)?.max_score ?? 30;

  return (
    <div className="space-y-6">
      <PageHeader title="Redação" subtitle={`${exam.name} · ${essays.length} ${essays.length === 1 ? "redação" : "redações"}`} />

      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Falta aplicar a atualização do banco: rode <code>supabase/migrations/0003_erros_taf_redacao_lembretes.sql</code> no Supabase.
        </p>
      )}

      {graded.length > 0 && (
        <section className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center"><p className="text-2xl font-bold">{essays.length}</p><p className="muted text-xs">escritas</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-bold">{avg}%</p><p className="muted text-xs">média geral</p></div>
          <div className="card p-4 text-center"><p className={`text-2xl font-bold ${recentAvg !== null && avg !== null ? (recentAvg >= avg ? "text-good" : "text-bad") : ""}`}>{recentAvg}%</p><p className="muted text-xs">últimas 3</p></div>
        </section>
      )}

      {graded.length >= 2 && (
        <section className="card space-y-2 p-5">
          <h2 className="font-semibold">Evolução da nota (%)</h2>
          <LineChart points={graded.slice(-12).map((e) => ({ label: e.day.slice(8, 10) + "/" + e.day.slice(5, 7), value: pct(e) }))} suffix="%" />
        </section>
      )}

      {topIssues.length > 0 && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Onde você mais perde pontos</h2>
          {topIssues.map(([issue, n]) => (
            <HBar key={issue} label={issue} value={n} max={Math.min(10, essays.length)} color="var(--color-bad)" right={`${n} de ${Math.min(10, essays.length)}`} />
          ))}
          <p className="muted text-xs">Nas últimas {Math.min(10, essays.length)} redações. Foque o treino no que está no topo.</p>
        </section>
      )}

      <details className="card p-5" open={essays.length === 0}>
        <summary className="cursor-pointer font-semibold">+ Registrar redação</summary>
        <div className="mt-4">
          <EssayForm examId={exam.id} today={today()} usedThemes={essays.map((e) => e.theme)} defaultMax={Number(lastMax)} />
        </div>
      </details>

      <ul className="space-y-2">
        {essays.map((e) => (
          <li key={e.id} className="card space-y-1.5 p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{e.theme}</p>
                <p className="muted text-xs">{fmtFull(e.day)}</p>
              </div>
              {e.score !== null && (
                <span className="text-right">
                  <span className="block font-bold tabular-nums">{Number(e.score)}{e.max_score ? `/${Number(e.max_score)}` : ""}</span>
                  {e.max_score && <span className="muted text-xs">{pct(e)}%</span>}
                </span>
              )}
              <form action={deleteEssay}><input type="hidden" name="id" value={e.id} /><button className="muted p-1 hover:text-bad" aria-label="Apagar"><Trash2 className="size-4" /></button></form>
            </div>
            {e.issues.length > 0 && <div className="flex flex-wrap gap-1.5">{e.issues.map((i) => <span key={i} className="chip text-[11px]">{i}</span>)}</div>}
            {e.notes && <p className="muted whitespace-pre-line text-sm">{e.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
