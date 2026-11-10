import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam, subjectLabel } from "@/lib/data";
import { WEEKDAYS, WEEK_ORDER, fmtMinutes, today, weekday } from "@/lib/dates";
import { SLOT_LABELS, type SlotKind } from "@/lib/templates";
import type { Slot } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { SlotIcon } from "@/components/slot-icon";
import { addSlot, deleteSlot, moveSlot } from "./actions";

export const metadata: Metadata = { title: "Cronograma" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ concurso?: string }> }) {
  const { concurso } = await searchParams;
  const exam = await pickExam(concurso);
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const [subjects, { data }] = await Promise.all([
    getSubjects(supabase, exam.id),
    supabase.from("week_slots").select("id, exam_id, weekday, position, kind, subject_id, label, minutes").eq("exam_id", exam.id).order("position").order("created_at"),
  ]);
  const slots = (data ?? []) as Slot[];
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const todayWd = weekday(today());
  const weekMinutes = slots.reduce((a, s) => a + (s.minutes ?? 0), 0);
  const subjectSlots = slots.filter((s) => s.subject_id);
  const notScheduled = subjects.filter((s) => !subjectSlots.some((x) => x.subject_id === s.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cronograma"
        subtitle={`Semana de estudos · ${exam.name} · ${fmtMinutes(weekMinutes)} planejadas`}
        back={concurso ? `/concursos/${exam.id}` : undefined}
      />

      {notScheduled.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Fora da semana: {notScheduled.map((s) => subjectLabel(s)).join(", ")}.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {WEEK_ORDER.map((wd) => {
          const list = slots.filter((s) => s.weekday === wd);
          const mins = list.reduce((a, s) => a + (s.minutes ?? 0), 0);
          return (
            <section key={wd} className={`card p-4 ${wd === todayWd ? "ring-2 ring-brand-600" : ""}`}>
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold">
                  {WEEKDAYS[wd]} {wd === todayWd && <span className="chip ml-1 bg-brand-50 text-brand-700 dark:bg-brand-800/30 dark:text-brand-100">hoje</span>}
                </h2>
                <span className="muted text-xs">{mins ? fmtMinutes(mins) : ""}</span>
              </header>
              {list.length === 0 && <p className="muted text-sm">Dia livre.</p>}
              <ol className="space-y-1.5">
                {list.map((s, i) => {
                  const subj = s.subject_id ? byId.get(s.subject_id) : undefined;
                  return (
                    <li key={s.id} className="soft flex items-center gap-2 rounded-xl px-3 py-2">
                      <SlotIcon kind={s.kind} color={subj?.color} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug break-words">
                          {s.kind === "subject" ? subj?.name ?? "Matéria" : s.label || SLOT_LABELS[s.kind]}
                        </p>
                        {(s.kind === "subject" || subj || s.minutes) && (
                          <p className="muted text-xs">
                            {[
                              s.kind === "subject" ? `Bloco ${list.filter((x, k) => x.kind === "subject" && k <= i).length}` : subj?.name,
                              s.minutes ? fmtMinutes(s.minutes) : null,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <span className="flex">
                        <form action={moveSlot}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="up" />
                          <button disabled={i === 0} className="muted rounded p-1 disabled:opacity-30" aria-label="Subir"><ArrowUp className="size-3.5" /></button></form>
                        <form action={moveSlot}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="down" />
                          <button disabled={i === list.length - 1} className="muted rounded p-1 disabled:opacity-30" aria-label="Descer"><ArrowDown className="size-3.5" /></button></form>
                        <form action={deleteSlot}><input type="hidden" name="id" value={s.id} />
                          <button className="muted rounded p-1 hover:text-bad" aria-label="Remover"><Trash2 className="size-3.5" /></button></form>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-700 dark:text-brand-500">+ Adicionar</summary>
                <form action={addSlot} className="mt-2 space-y-2">
                  <input type="hidden" name="exam_id" value={exam.id} />
                  <input type="hidden" name="weekday" value={wd} />
                  <select name="kind" className="input select text-sm" defaultValue="subject">
                    {(Object.keys(SLOT_LABELS) as SlotKind[]).map((k) => <option key={k} value={k}>{SLOT_LABELS[k]}</option>)}
                  </select>
                  <select name="subject_id" className="input select text-sm" defaultValue="">
                    <option value="">Matéria (se for bloco de matéria)</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="minutes" type="number" min={0} max={720} className="input text-sm" placeholder="Minutos (opcional)" />
                    <input name="label" maxLength={80} className="input text-sm" placeholder="Nome (opcional)" />
                  </div>
                  <button className="btn-primary w-full text-sm">Adicionar</button>
                </form>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
