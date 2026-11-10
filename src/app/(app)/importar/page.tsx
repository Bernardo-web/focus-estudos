import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam } from "@/lib/data";
import { fmtFull, today } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { ImportWizard } from "./import-wizard";
import { deleteImport } from "./actions";

export const metadata: Metadata = { title: "Importar questões" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ importado?: string }> }) {
  const { importado } = await searchParams;
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const [subjects, { data: aliasRows }, { data: imports, error: impErr }] = await Promise.all([
    getSubjects(supabase, exam.id),
    supabase.from("subject_aliases").select("alias, subject_id"),
    supabase.from("question_imports").select("id, period_start, period_end, total, created_at").eq("exam_id", exam.id).order("period_end", { ascending: false }).limit(30),
  ]);
  const aliases = Object.fromEntries((aliasRows ?? []).map((a) => [a.alias, a.subject_id]));
  const lastEnd = imports?.[0]?.period_end ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Importar questões" subtitle={`Qconcursos → ${exam.name}`} back="/hoje" />

      {impErr && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Falta aplicar a atualização do banco: rode <code>supabase/migrations/0002_qconcursos_import.sql</code> no SQL Editor do Supabase.
        </p>
      )}
      {importado && (
        <p role="status" className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
          {importado} questões importadas. Elas já contam nas metas da semana e no Progresso.
        </p>
      )}

      <ImportWizard
        examId={exam.id}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, short_name: s.short_name, color: s.color }))}
        aliases={aliases}
        today={today()}
        lastEnd={lastEnd}
      />

      {(imports ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Importações feitas</h2>
          <ul className="card divide-y divide-[var(--border)]">
            {(imports ?? []).map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {i.period_start === i.period_end ? fmtFull(i.period_start) : `${fmtFull(i.period_start)} a ${fmtFull(i.period_end)}`}
                  </p>
                  <p className="muted text-xs">{i.total} questões</p>
                </div>
                <form action={deleteImport}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="muted rounded-lg p-1.5 hover:text-bad" aria-label="Apagar importação"><Trash2 className="size-4" /></button>
                </form>
              </li>
            ))}
          </ul>
          <p className="muted text-xs">Apagar uma importação remove as questões dela do Focus.</p>
        </section>
      )}
    </div>
  );
}
