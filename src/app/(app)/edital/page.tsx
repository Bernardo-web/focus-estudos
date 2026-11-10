import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam } from "@/lib/data";
import { TOPIC_STATUS, type Topic } from "@/lib/types";
import { ColorPicker, PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { addSubject, addTopics, cycleTopic, deleteSubject, deleteTopic, updateSubject } from "./actions";

export const metadata: Metadata = { title: "Edital" };

export default async function SyllabusPage({ searchParams }: { searchParams: Promise<{ concurso?: string }> }) {
  const { concurso } = await searchParams;
  const exam = await pickExam(concurso);
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const subjects = await getSubjects(supabase, exam.id);
  const { data } = await supabase
    .from("topics")
    .select("id, subject_id, name, status, position")
    .in("subject_id", subjects.map((s) => s.id))
    .order("position");
  const topics = (data ?? []) as Topic[];

  const total = topics.length;
  const done = topics.filter((t) => t.status !== "pending").length;
  const mastered = topics.filter((t) => t.status === "mastered").length;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edital"
        subtitle={`${exam.name}${exam.role ? ` · ${exam.role}` : ""} — toque num tópico para mudar o status`}
        back={concurso ? `/concursos/${exam.id}` : undefined}
      />

      <section className="card grid grid-cols-3 gap-3 p-5 text-center">
        <div><p className="text-2xl font-bold">{pct(done, total)}%</p><p className="muted text-xs">do edital estudado</p></div>
        <div><p className="text-2xl font-bold">{pct(mastered, total)}%</p><p className="muted text-xs">dominado</p></div>
        <div><p className="text-2xl font-bold">{total}</p><p className="muted text-xs">tópicos</p></div>
      </section>

      <ul className="space-y-3">
        {subjects.map((s) => {
          const ts = topics.filter((t) => t.subject_id === s.id);
          const d = ts.filter((t) => t.status !== "pending").length;
          return (
            <li key={s.id} className="card overflow-hidden">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.name}</span>
                    <span className="muted text-xs">
                      {ts.length ? `${d}/${ts.length} tópicos` : "Sem tópicos"}
                      {s.question_count ? ` · ${s.question_count} questões na prova` : ""}
                      {Number(s.weight) !== 1 ? ` · peso ${s.weight}` : ""}
                    </span>
                  </span>
                  <span className="w-16"><span className="bar block"><span style={{ width: `${pct(d, ts.length)}%`, background: s.color }} /></span></span>
                </summary>

                <div className="space-y-4 border-t border-[var(--border)] p-4">
                  {ts.length > 0 && (
                    <ul className="space-y-1.5">
                      {ts.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                          <form action={cycleTopic} className="min-w-0 flex-1">
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="status" value={t.status} />
                            <button className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5">
                              <span className={`chip shrink-0 ${TOPIC_STATUS[t.status].cls}`}>{TOPIC_STATUS[t.status].label}</span>
                              <span className="truncate text-sm">{t.name}</span>
                            </button>
                          </form>
                          <form action={deleteTopic}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="muted rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5" aria-label={`Apagar ${t.name}`}><Trash2 className="size-3.5" /></button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form action={addTopics} className="space-y-2">
                    <input type="hidden" name="subject_id" value={s.id} />
                    <label className="label" htmlFor={`t-${s.id}`}>Adicionar tópicos (um por linha — dá para colar do edital)</label>
                    <textarea id={`t-${s.id}`} name="names" className="input min-h-20 text-sm" placeholder={"Crase\nConcordância verbal\nRegência"} />
                    <button className="btn-ghost text-sm"><Plus className="size-4" /> Adicionar</button>
                  </form>

                  <details className="soft rounded-xl p-3">
                    <summary className="cursor-pointer text-sm font-medium">Editar matéria</summary>
                    <form action={updateSubject} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={s.id} />
                      <SubjectFields s={s} />
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-primary text-sm">Salvar</button>
                      </div>
                    </form>
                    <form action={deleteSubject} className="mt-2">
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-sm text-bad hover:underline">Excluir matéria (apaga tópicos e registros dela)</button>
                    </form>
                  </details>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">+ Nova matéria</summary>
        <form action={addSubject} className="mt-4 space-y-3">
          <input type="hidden" name="exam_id" value={exam.id} />
          <SubjectFields />
          <button className="btn-primary">Adicionar matéria</button>
        </form>
      </details>

      <p className="muted text-center text-xs">
        Peso e número de questões ajudam o Focus a destacar as matérias que mais valem pontos.{" "}
        <Link href="/cronograma" className="underline">Ver a semana de estudos</Link>
      </p>
    </div>
  );
}

function SubjectFields({ s }: { s?: { name: string; short_name: string | null; weight: number; question_count: number | null; color: string } }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nome</label>
          <input className="input" name="name" required maxLength={80} defaultValue={s?.name} placeholder="Ex.: Direito Penal" />
        </div>
        <div>
          <label className="label">Nome curto (opcional)</label>
          <input className="input" name="short_name" maxLength={24} defaultValue={s?.short_name ?? ""} placeholder="Ex.: Penal" />
        </div>
        <div>
          <label className="label">Peso</label>
          <input className="input" name="weight" inputMode="decimal" defaultValue={s?.weight ?? 1} />
        </div>
        <div>
          <label className="label">Questões na prova</label>
          <input className="input" name="question_count" type="number" min={0} max={999} defaultValue={s?.question_count ?? ""} />
        </div>
      </div>
      <ColorPicker value={s?.color ?? "#2563eb"} />
    </>
  );
}
