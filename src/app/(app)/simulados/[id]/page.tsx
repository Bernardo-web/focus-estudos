import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getExams, getSubjects } from "@/lib/data";
import { score } from "@/lib/scoring";
import type { Mock } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { MockForm } from "../mock-form";
import { deleteMock } from "../actions";

export const metadata: Metadata = { title: "Simulado" };

export default async function MockPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const { supabase } = await getUser();
  const { data } = await supabase.from("mocks").select("id, exam_id, title, scheduled_on, done, total_items, correct, wrong, essay_score, essay_max, notes").eq("id", id).maybeSingle();
  if (!data) notFound();
  const mock = data as Mock;
  const exam = (await getExams()).find((e) => e.id === mock.exam_id);
  if (!exam) notFound();
  const [subjects, { data: results }] = await Promise.all([
    getSubjects(supabase, exam.id),
    supabase.from("mock_results").select("subject_id, items, correct, wrong").eq("mock_id", id),
  ]);
  const sc = mock.total_items ? score(mock.total_items, mock.correct ?? 0, mock.wrong ?? 0, exam.scoring) : null;
  const byId = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={mock.title} subtitle={exam.name} back="/simulados" />
      {salvo && <p role="status" className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">Simulado salvo.</p>}

      {sc && (
        <section className="card grid grid-cols-3 gap-3 p-5 text-center">
          <div><p className="text-2xl font-bold">{sc.net}</p><p className="muted text-xs">nota líquida</p></div>
          <div><p className="text-2xl font-bold">{sc.netPct}%</p><p className="muted text-xs">do total</p></div>
          <div><p className="text-2xl font-bold">{sc.accuracy ?? "—"}%</p><p className="muted text-xs">acerto</p></div>
        </section>
      )}

      {(results ?? []).length > 0 && (
        <section className="card space-y-2 p-5">
          <h2 className="font-semibold">Por matéria</h2>
          {(results ?? [])
            .map((r) => ({ ...r, s: score(r.items, r.correct, r.wrong, exam.scoring), subj: byId.get(r.subject_id) }))
            .sort((a, b) => (a.s.netPct ?? 0) - (b.s.netPct ?? 0))
            .map((r) => (
              <div key={r.subject_id} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{r.subj?.name}</span><span className="tabular-nums">{r.s.net}/{r.items} · {r.s.netPct}%</span></div>
                <div className="bar"><span style={{ width: `${Math.max(0, r.s.netPct ?? 0)}%`, background: r.subj?.color }} /></div>
              </div>
            ))}
          <p className="muted pt-1 text-xs">Ordenado da pior para a melhor: comece a revisão por cima.</p>
        </section>
      )}

      <MockForm examId={exam.id} scoring={exam.scoring} mock={mock} results={results ?? []} subjects={subjects} defaults={{ title: mock.title, date: mock.scheduled_on }} />

      <form action={deleteMock}>
        <input type="hidden" name="id" value={mock.id} />
        <button className="text-sm text-bad hover:underline">Excluir simulado</button>
      </form>
    </div>
  );
}
