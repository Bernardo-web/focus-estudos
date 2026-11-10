import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, ClipboardList, Play, RotateCcw } from "lucide-react";
import { getProfile, getUser } from "@/lib/supabase/server";
import { crestUrls, getExams, getSubjects, pickExam, subjectLabel } from "@/lib/data";
import { addDays, daysBetween, fmtFull, fmtLong, fmtMinutes, fmtShort, today, weekStart, weekday } from "@/lib/dates";
import { score } from "@/lib/scoring";
import { SLOT_LABELS } from "@/lib/templates";
import type { Mock, Review, Session, Slot } from "@/lib/types";
import { Crest } from "@/components/crest";
import { NoExam } from "@/components/no-exam";
import { SlotIcon } from "@/components/slot-icon";
import { TimerReset } from "@/components/timer-reset";
import { completeReview, toggleCheck } from "./actions";

export const metadata: Metadata = { title: "Hoje" };

const STAGE_LABEL: Record<number, string> = { 1: "24h", 7: "7 dias", 30: "30 dias" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ registrado?: string }> }) {
  const { registrado } = await searchParams;
  const exam = await pickExam();
  if (!exam) return <NoExam />;

  const { supabase } = await getUser();
  const day = today();
  const wd = weekday(day);
  const monday = weekStart(day);
  const sunday = addDays(monday, 6);

  const subjects = await getSubjects(supabase, exam.id);
  const subjectIds = subjects.map((s) => s.id);
  const [profile, exams, slotsRes, checksRes, sessionsRes, reviewsRes, mocksRes] = await Promise.all([
    getProfile(),
    getExams(),
    supabase.from("week_slots").select("id, exam_id, weekday, position, kind, subject_id, label, minutes").eq("exam_id", exam.id).eq("weekday", wd).order("position").order("created_at"),
    supabase.from("slot_checks").select("slot_id").eq("day", day),
    supabase.from("study_sessions").select("id, exam_id, subject_id, topic_id, day, minutes, questions, correct, wrong, notes").eq("exam_id", exam.id).gte("day", monday).lte("day", day),
    supabase.from("reviews").select("id, subject_id, topic_id, stage, due_on, done_at, topics(name)").in("subject_id", subjectIds).lte("due_on", day).or(`done_at.is.null,done_at.gte.${day}T03:00:00Z`).order("due_on"),
    supabase.from("mocks").select("id, exam_id, title, scheduled_on, done, total_items, correct, wrong, essay_score, essay_max, notes").eq("exam_id", exam.id).gte("scheduled_on", monday).lte("scheduled_on", sunday).order("scheduled_on"),
  ]);

  const slots = (slotsRes.data ?? []) as Slot[];
  const checked = new Set((checksRes.data ?? []).map((c) => c.slot_id));
  const sessions = (sessionsRes.data ?? []) as Session[];
  const reviews = (reviewsRes.data ?? []) as unknown as (Review & { topics: { name: string } | null })[];
  const mocks = (mocksRes.data ?? []) as Mock[];
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const urls = await crestUrls(supabase, exams.filter((e) => e.status === "active").map((e) => e.crest_path));

  const left = exam.exam_date ? daysBetween(day, exam.exam_date) : null;
  const week = sessions.reduce((a, s) => ({ min: a.min + s.minutes, q: a.q + s.questions, c: a.c + s.correct, w: a.w + s.wrong }), { min: 0, q: 0, c: 0, w: 0 });
  const acc = score(week.q, week.c, week.w, exam.scoring).accuracy;
  const todaySessions = sessions.filter((s) => s.day === day);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.minutes, 0);
  const pendingReviews = reviews.filter((r) => !r.done_at);
  const doneCount = slots.filter((s) => checked.has(s.id)).length;
  const firstName = (profile?.full_name ?? "").split(" ")[0];
  const otherExams = exams.filter((e) => e.id !== exam.id && e.status === "active");

  const pct = (v: number, goal: number) => (goal > 0 ? Math.min(100, Math.round((v / goal) * 100)) : 0);

  return (
    <div className="space-y-6">
      {registrado && <TimerReset />}
      <header>
        <p className="muted text-sm first-letter:uppercase">{fmtLong(day)}</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName ? `Bora, ${firstName}!` : "Hoje"}</h1>
      </header>

      {registrado && (
        <p role="status" className="rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
          Sessão registrada. As revisões foram agendadas.
        </p>
      )}

      {/* Contagem regressiva */}
      <Link
        href={`/concursos/${exam.id}`}
        className="relative block overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${exam.color}, #0a1233)` }}
      >
        <div className="flex items-center gap-4">
          <Crest exam={exam} url={exam.crest_path ? urls[exam.crest_path] : null} size={72} className="drop-shadow-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight">{exam.name}</p>
            <p className="truncate text-sm text-white/75">{[exam.role, exam.board].filter(Boolean).join(" · ")}</p>
            {exam.exam_date && <p className="mt-1 text-xs text-white/60">Prova em {fmtFull(exam.exam_date)}</p>}
          </div>
          <div className="text-right">
            {left === null ? (
              <p className="text-sm text-white/75">Sem data</p>
            ) : left > 0 ? (
              <>
                <p className="text-4xl font-extrabold tabular-nums leading-none">{left}</p>
                <p className="text-xs text-white/75">{left === 1 ? "dia" : "dias"}</p>
              </>
            ) : left === 0 ? (
              <p className="text-lg font-bold text-gold-400">É hoje!</p>
            ) : (
              <p className="text-sm text-white/75">Prova realizada</p>
            )}
          </div>
        </div>
        {left !== null && left > 0 && (
          <p className="mt-3 text-xs text-white/70">
            ≈ {Math.ceil(left / 7)} {Math.ceil(left / 7) === 1 ? "semana" : "semanas"} de estudo até a prova
          </p>
        )}
      </Link>

      {/* Metas da semana */}
      <section className="card space-y-3 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Metas da semana</h2>
          <span className="muted text-xs">{fmtShort(monday)} – {fmtShort(sunday)}</span>
        </div>
        <Goal label="Horas" value={fmtMinutes(week.min)} goal={fmtMinutes(exam.goal_weekly_minutes)} pct={pct(week.min, exam.goal_weekly_minutes)} />
        <Goal label="Questões" value={String(week.q)} goal={String(exam.goal_weekly_questions)} pct={pct(week.q, exam.goal_weekly_questions)} />
        <div className="flex items-center justify-between text-sm">
          <span>Acerto</span>
          <span>
            <strong className={acc === null ? "" : acc >= exam.goal_accuracy ? "text-good" : "text-bad"}>{acc === null ? "—" : `${acc}%`}</strong>
            <span className="muted"> / meta {exam.goal_accuracy}%</span>
          </span>
        </div>
      </section>

      {/* Checklist do dia */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Matérias do dia</h2>
          <span className="muted text-xs">
            {slots.length ? `${doneCount}/${slots.length} feitos` : ""}
            {todayMinutes ? ` · ${fmtMinutes(todayMinutes)} hoje` : ""}
          </span>
        </div>
        {slots.length === 0 ? (
          <div className="card p-5 text-sm">
            <p className="muted">Nada planejado para hoje.</p>
            <Link href="/cronograma" className="mt-2 inline-block font-medium text-brand-700 dark:text-brand-500">Montar a semana →</Link>
          </div>
        ) : (
          <ul className="card divide-y divide-[var(--border)]">
            {slots.map((s, i) => {
              const subj = s.subject_id ? byId.get(s.subject_id) : undefined;
              const done = checked.has(s.id);
              const block = slots.filter((x, k) => x.kind === "subject" && k <= i).length;
              const studied = subj ? todaySessions.filter((x) => x.subject_id === subj.id).reduce((a, x) => a + x.minutes, 0) : 0;
              const mockToday = mocks.find((m) => m.scheduled_on === day);
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <form action={toggleCheck}>
                    <input type="hidden" name="slot_id" value={s.id} />
                    <input type="hidden" name="day" value={day} />
                    <input type="hidden" name="checked" value={done ? "1" : "0"} />
                    <button
                      aria-label={done ? "Desmarcar" : "Marcar como feito"}
                      className={`flex size-7 items-center justify-center rounded-full border-2 transition ${done ? "border-good bg-good text-white" : "border-[var(--border)]"}`}
                    >
                      {done && <Check className="size-4" strokeWidth={3} />}
                    </button>
                  </form>
                  <SlotIcon kind={s.kind} color={subj?.color} className="size-5" />
                  <div className={`min-w-0 flex-1 ${done ? "muted line-through" : ""}`}>
                    <p className="truncate font-medium">{s.kind === "subject" ? subjectLabel(subj) : s.label || SLOT_LABELS[s.kind]}</p>
                    <p className="muted text-xs no-underline">
                      {s.kind === "subject" && `Bloco ${block}${s.minutes ? ` · ${fmtMinutes(s.minutes)}` : ""}${studied ? ` · ${fmtMinutes(studied)} registrados` : ""}`}
                      {s.kind === "review" && (pendingReviews.length ? `${pendingReviews.length} pendente${pendingReviews.length > 1 ? "s" : ""}` : "Nenhuma pendente")}
                      {s.kind === "mock" && (mockToday ? (mockToday.done ? "Resultado registrado" : "Agendado") : "Registre o resultado depois")}
                    </p>
                  </div>
                  {s.kind === "subject" && !done && (
                    <Link href={`/estudar?slot=${s.id}`} className="btn-primary px-3 py-2 text-sm"><Play className="size-3.5" /> Estudar</Link>
                  )}
                  {s.kind === "mock" && !done && (
                    <Link href={mockToday ? `/simulados/${mockToday.id}` : `/simulados/novo?data=${day}&titulo=${encodeURIComponent(s.label || "Simulado")}`} className="btn-ghost px-3 py-2 text-sm">
                      <ClipboardList className="size-3.5" /> {mockToday ? "Abrir" : "Registrar"}
                    </Link>
                  )}
                  {(s.kind === "log" || s.kind === "week_review") && !done && (
                    <Link href="/progresso" className="btn-ghost px-3 py-2 text-sm">Ver</Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Revisões */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Revisões</h2>
          <Link href="/estudos#revisoes" className="muted text-xs">ver todas</Link>
        </div>
        {reviews.length === 0 ? (
          <p className="card muted p-5 text-sm">Sem revisões para hoje. Elas aparecem aqui 1, 7 e 30 dias depois de cada sessão.</p>
        ) : (
          <ul className="card divide-y divide-[var(--border)]">
            {reviews.map((r) => {
              const subj = byId.get(r.subject_id);
              const late = r.due_on < day && !r.done_at;
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <RotateCcw className="size-4 shrink-0" style={{ color: subj?.color }} />
                  <div className={`min-w-0 flex-1 ${r.done_at ? "muted line-through" : ""}`}>
                    <p className="truncate text-sm font-medium">{subjectLabel(subj)}{r.topics?.name ? ` — ${r.topics.name}` : ""}</p>
                    <p className={`text-xs ${late ? "text-bad" : "muted"}`}>
                      Revisão de {STAGE_LABEL[r.stage]}{late ? ` · atrasada desde ${fmtShort(r.due_on)}` : ""}
                    </p>
                  </div>
                  <form action={completeReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="stage" value={r.stage} />
                    <input type="hidden" name="topic_id" value={r.topic_id ?? ""} />
                    {r.done_at && <input type="hidden" name="undo" value="1" />}
                    <button className={r.done_at ? "muted text-xs underline" : "btn-ghost px-3 py-1.5 text-sm"}>{r.done_at ? "desfazer" : "Feita"}</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Simulados da semana */}
      {mocks.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Simulados da semana</h2>
          <ul className="card divide-y divide-[var(--border)]">
            {mocks.map((m) => {
              const sc = m.done && m.total_items ? score(m.total_items, m.correct ?? 0, m.wrong ?? 0, exam.scoring) : null;
              return (
                <li key={m.id}>
                  <Link href={`/simulados/${m.id}`} className="flex items-center gap-3 px-4 py-3">
                    <ClipboardList className="muted size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{m.title}</span>
                      <span className="muted text-xs">{fmtShort(m.scheduled_on)}</span>
                    </span>
                    <span className="text-sm font-semibold">{sc ? `${sc.net} pts` : m.done ? "Feito" : "Pendente"}</span>
                    <ChevronRight className="muted size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {otherExams.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Outros concursos</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {otherExams.map((e) => {
              const d = e.exam_date ? daysBetween(day, e.exam_date) : null;
              return (
                <Link key={e.id} href={`/concursos/${e.id}`} className="card flex items-center gap-3 p-3">
                  <Crest exam={e} url={e.crest_path ? urls[e.crest_path] : null} size={36} />
                  <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                  <span className="muted text-sm">{d === null ? "sem data" : d >= 0 ? `${d} dias` : "realizada"}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Goal({ label, value, goal, pct }: { label: string; value: string; goal: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span><strong>{value}</strong><span className="muted"> / {goal}</span></span>
      </div>
      <div className="bar"><span style={{ width: `${pct}%`, background: pct >= 100 ? "var(--color-good)" : undefined }} /></div>
    </div>
  );
}
