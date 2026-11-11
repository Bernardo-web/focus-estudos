import type { Metadata } from "next";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam, subjectLabel } from "@/lib/data";
import { fmtShort } from "@/lib/dates";
import { REASONS } from "@/lib/anki";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { ErrorForm } from "./error-form";
import { deleteErrorNote } from "./actions";

export const metadata: Metadata = { title: "Caderno de erros" };

type Note = {
  id: string;
  subject_id: string | null;
  statement: string;
  answer: string;
  reason: string;
  bizu: string | null;
  source: string | null;
  exported_at: string | null;
  created_at: string;
  topics: { name: string } | null;
};

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ materia?: string }> }) {
  const { materia } = await searchParams;
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const subjects = await getSubjects(supabase, exam.id);
  const byId = new Map(subjects.map((s) => [s.id, s]));

  let query = supabase
    .from("error_notes")
    .select("id, subject_id, statement, answer, reason, bizu, source, exported_at, created_at, topics(name)")
    .eq("exam_id", exam.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (materia) query = query.eq("subject_id", materia);
  const [{ data, error }, { data: topics }, { data: all }] = await Promise.all([
    query,
    supabase.from("topics").select("id, subject_id, name").in("subject_id", subjects.map((s) => s.id)).order("position"),
    supabase.from("error_notes").select("subject_id, reason, exported_at").eq("exam_id", exam.id),
  ]);
  const notes = (data ?? []) as unknown as Note[];
  const stats = all ?? [];
  const pending = stats.filter((n) => !n.exported_at).length;
  const reasonCount = Object.entries(REASONS)
    .map(([k, label]) => ({ k, label, n: stats.filter((s) => s.reason === k).length }))
    .filter((r) => r.n)
    .sort((a, b) => b.n - a.n);
  const subjectCount = subjects
    .map((s) => ({ s, n: stats.filter((x) => x.subject_id === s.id).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caderno de erros"
        subtitle={`${exam.name} · ${stats.length} anotados`}
        action={
          <a href={`/erros/anki${pending ? "" : "?todos=1"}`} className="btn-primary" download>
            <Download className="size-4" /> Anki{pending ? ` (${pending})` : ""}
          </a>
        }
      />

      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Falta aplicar a atualização do banco: rode <code>supabase/migrations/0003_erros_taf_redacao_lembretes.sql</code> no Supabase.
        </p>
      )}

      <details className="card p-5" open={stats.length === 0}>
        <summary className="cursor-pointer font-semibold">+ Anotar um erro</summary>
        <div className="mt-4">
          <ErrorForm examId={exam.id} subjects={subjects} topics={topics ?? []} defaultSubject={materia} />
        </div>
      </details>

      {reasonCount.length > 0 && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Por que você erra</h2>
          <div className="flex flex-wrap gap-2">
            {reasonCount.map((r) => <span key={r.k} className="chip">{r.label} · {r.n}</span>)}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/erros" className={`chip ${!materia ? "bg-brand-700 text-white" : ""}`}>Todas</Link>
            {subjectCount.map(({ s, n }) => (
              <Link key={s.id} href={`/erros?materia=${s.id}`} className={`chip ${materia === s.id ? "bg-brand-700 text-white" : ""}`}>
                {subjectLabel(s)} · {n}
              </Link>
            ))}
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {notes.map((n) => {
          const subj = n.subject_id ? byId.get(n.subject_id) : undefined;
          return (
            <li key={n.id} className="card space-y-2 p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full" style={{ background: subj?.color ?? "#64748b" }} />
                <span className="muted min-w-0 flex-1 truncate">
                  {subj ? subjectLabel(subj) : "Sem matéria"}{n.topics?.name ? ` · ${n.topics.name}` : ""} · {fmtShort(n.created_at.slice(0, 10))}
                </span>
                <span className="chip">{REASONS[n.reason] ?? n.reason}</span>
                {n.exported_at && <span className="chip text-good">no Anki</span>}
              </div>
              <p className="whitespace-pre-line text-sm">{n.statement}</p>
              <p className="soft whitespace-pre-line rounded-lg px-3 py-2 text-sm"><strong>Gabarito:</strong> {n.answer}</p>
              {n.bizu && <p className="text-sm">💡 <strong>Bizu:</strong> {n.bizu}</p>}
              <div className="flex items-center justify-between">
                <span className="muted text-xs">{n.source ?? ""}</span>
                <form action={deleteErrorNote}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="muted rounded-lg p-1.5 hover:text-bad" aria-label="Apagar"><Trash2 className="size-4" /></button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      {stats.length > 0 && (
        <p className="muted text-center text-xs">
          O botão Anki baixa só os erros ainda não exportados.{" "}
          <a href="/erros/anki?todos=1" className="underline" download>Baixar todos</a>. No Anki: Arquivo → Importar, tipo de nota com os campos Frente, Verso e Bizu.
        </p>
      )}
    </div>
  );
}
