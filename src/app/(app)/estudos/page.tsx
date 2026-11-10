import type { Metadata } from "next";
import Link from "next/link";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam, subjectLabel } from "@/lib/data";
import { addDays, fmtLong, fmtMinutes, fmtShort, today } from "@/lib/dates";
import { score } from "@/lib/scoring";
import type { Review, Session } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { completeReview } from "../hoje/actions";
import { deleteSession } from "./actions";

export const metadata: Metadata = { title: "Estudos e revisões" };

const STAGE_LABEL: Record<number, string> = { 1: "24h", 7: "7 dias", 30: "30 dias" };

export default async function SessionsPage() {
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const day = today();
  const subjects = await getSubjects(supabase, exam.id);
  const byId = new Map(subjects.map((s) => [s.id, s]));

  const [{ data: sData }, { data: rData }] = await Promise.all([
    supabase.from("study_sessions").select("id, exam_id, subject_id, topic_id, day, minutes, questions, correct, wrong, notes, topics(name)")
      .eq("exam_id", exam.id).gte("day", addDays(day, -60)).order("day", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    supabase.from("reviews").select("id, subject_id, topic_id, stage, due_on, done_at, topics(name)")
      .in("subject_id", subjects.map((s) => s.id)).is("done_at", null).lte("due_on", addDays(day, 14)).order("due_on").limit(100),
  ]);
  const sessions = (sData ?? []) as unknown as (Session & { topics: { name: string } | null })[];
  const reviews = (rData ?? []) as unknown as (Review & { topics: { name: string } | null })[];

  const days = [...new Set(sessions.map((s) => s.day))];

  return (
    <div className="space-y-6">
      <PageHeader title="Estudos e revisões" subtitle={`${exam.name} · últimos 60 dias`} action={<Link href="/estudar" className="btn-primary"><Plus className="size-4" /> Registrar</Link>} />

      <section id="revisoes" className="space-y-2">
        <h2 className="font-semibold">Revisões pendentes</h2>
        {reviews.length === 0 ? (
          <p className="card muted p-5 text-sm">Nenhuma revisão pendente nos próximos 14 dias.</p>
        ) : (
          <ul className="card divide-y divide-[var(--border)]">
            {reviews.map((r) => {
              const subj = byId.get(r.subject_id);
              const late = r.due_on < day;
              const future = r.due_on > day;
              return (
                <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${future ? "opacity-60" : ""}`}>
                  <RotateCcw className="size-4 shrink-0" style={{ color: subj?.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{subjectLabel(subj)}{r.topics?.name ? ` — ${r.topics.name}` : ""}</p>
                    <p className={`text-xs ${late ? "text-bad" : "muted"}`}>
                      {STAGE_LABEL[r.stage]} · {r.due_on === day ? "hoje" : late ? `atrasada (${fmtShort(r.due_on)})` : fmtShort(r.due_on)}
                    </p>
                  </div>
                  {!future && (
                    <form action={completeReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="stage" value={r.stage} />
                      <input type="hidden" name="topic_id" value={r.topic_id ?? ""} />
                      <button className="btn-ghost px-3 py-1.5 text-sm">Feita</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Histórico</h2>
        {days.length === 0 && <p className="card muted p-5 text-sm">Nenhuma sessão registrada ainda. Toque em ▶ para começar.</p>}
        {days.map((d) => {
          const list = sessions.filter((s) => s.day === d);
          const min = list.reduce((a, s) => a + s.minutes, 0);
          return (
            <div key={d} className="space-y-1.5">
              <p className="muted flex justify-between text-xs font-medium uppercase tracking-wide">
                <span>{d === day ? "Hoje" : fmtLong(d)}</span><span>{fmtMinutes(min)}</span>
              </p>
              <ul className="card divide-y divide-[var(--border)]">
                {list.map((s) => {
                  const subj = s.subject_id ? byId.get(s.subject_id) : undefined;
                  const sc = score(s.questions, s.correct, s.wrong, exam.scoring);
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: subj?.color ?? "#64748b" }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{subjectLabel(subj)}{s.topics?.name ? ` — ${s.topics.name}` : ""}</p>
                        <p className="muted text-xs">
                          {s.minutes ? fmtMinutes(s.minutes) : "—"}
                          {s.questions ? ` · ${s.correct}/${s.questions} certas${sc.accuracy !== null ? ` (${sc.accuracy}%)` : ""}` : ""}
                          {s.notes ? ` · ${s.notes}` : ""}
                        </p>
                      </div>
                      <form action={deleteSession}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="muted rounded-lg p-1.5 hover:text-bad" aria-label="Apagar sessão"><Trash2 className="size-4" /></button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
