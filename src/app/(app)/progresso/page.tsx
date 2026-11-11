import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam, subjectLabel } from "@/lib/data";
import { WEEKDAYS_SHORT, addDays, fmtMinutes, fmtShort, today, weekStart } from "@/lib/dates";
import { score } from "@/lib/scoring";
import type { Mock, Session, Topic } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { ColumnChart, HBar, Heatmap, LineChart } from "@/components/charts";
import { TargetCard } from "@/components/target-card";

export const metadata: Metadata = { title: "Progresso" };

export default async function ProgressPage() {
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const day = today();
  const monday = weekStart(day);
  const from = addDays(monday, -7 * 7);
  const subjects = await getSubjects(supabase, exam.id);

  const heatStart = addDays(monday, -7 * 17);
  const [{ data: sData }, { data: tData }, { data: mData }, { data: hData }] = await Promise.all([
    supabase.from("study_sessions").select("id, exam_id, subject_id, topic_id, day, minutes, questions, correct, wrong, notes").eq("exam_id", exam.id).gte("day", from).lte("day", day),
    supabase.from("topics").select("id, subject_id, name, status, position").in("subject_id", subjects.map((s) => s.id)),
    supabase.from("mocks").select("id, exam_id, title, scheduled_on, done, total_items, correct, wrong, essay_score, essay_max, notes").eq("exam_id", exam.id).eq("done", true).order("scheduled_on"),
    supabase.from("study_sessions").select("day, minutes, questions").eq("exam_id", exam.id).gte("day", heatStart).lte("day", day),
  ]);
  const heat: Record<string, number> = {};
  for (const s of hData ?? []) heat[s.day] = (heat[s.day] ?? 0) + s.minutes + (s.minutes ? 0 : s.questions ? 1 : 0);
  const daysStudied = Object.values(heat).filter((m) => m > 0).length;
  const sessions = (sData ?? []) as Session[];
  const topics = (tData ?? []) as Topic[];
  const mocks = (mData ?? []) as Mock[];

  // 8 semanas
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(from, i * 7));
  const weekBars = weeks.map((w) => ({
    label: fmtShort(w).replace(" de", ""),
    value: sessions.filter((s) => s.day >= w && s.day <= addDays(w, 6)).reduce((a, s) => a + s.minutes, 0),
    highlight: w === monday,
  }));

  // esta semana, dia a dia
  const dayBars = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    return { label: WEEKDAYS_SHORT[(i + 1) % 7], value: sessions.filter((s) => s.day === d).reduce((a, s) => a + s.minutes, 0), highlight: d === day };
  });

  // constância: dias seguidos com estudo (hoje ainda pode entrar)
  const studied = new Set(sessions.filter((s) => s.minutes > 0 || s.questions > 0).map((s) => s.day));
  let streak = 0;
  for (let d = studied.has(day) ? day : addDays(day, -1); studied.has(d); d = addDays(d, -1)) streak++;

  // por matéria (últimas 8 semanas)
  const perSubject = subjects
    .map((s) => {
      const list = sessions.filter((x) => x.subject_id === s.id);
      const q = list.reduce((a, x) => a + x.questions, 0);
      const c = list.reduce((a, x) => a + x.correct, 0);
      const w = list.reduce((a, x) => a + x.wrong, 0);
      const ts = topics.filter((t) => t.subject_id === s.id);
      return {
        s,
        minutes: list.reduce((a, x) => a + x.minutes, 0),
        q,
        acc: score(q, c, w, exam.scoring).accuracy,
        coverage: ts.length ? Math.round((ts.filter((t) => t.status !== "pending").length / ts.length) * 100) : null,
      };
    });
  const maxMin = Math.max(1, ...perSubject.map((p) => p.minutes));
  const weakest = perSubject.filter((p) => p.acc !== null && p.q >= 10 && p.acc < exam.goal_accuracy).sort((a, b) => a.acc! - b.acc!).slice(0, 3);

  // semana atual (registro de domingo)
  const thisWeek = sessions.filter((s) => s.day >= monday);
  const wk = thisWeek.reduce((a, s) => ({ m: a.m + s.minutes, q: a.q + s.questions, c: a.c + s.correct, w: a.w + s.wrong }), { m: 0, q: 0, c: 0, w: 0 });
  const wkAcc = score(wk.q, wk.c, wk.w, exam.scoring).accuracy;
  const lastMock = mocks.at(-1);
  const lastMockScore = lastMock?.total_items ? score(lastMock.total_items, lastMock.correct ?? 0, lastMock.wrong ?? 0, exam.scoring) : null;

  const lastMockWithItems = [...mocks].reverse().find((m) => m.total_items) ?? null;
  const { data: lastResults } = lastMockWithItems
    ? await supabase.from("mock_results").select("subject_id, items, correct, wrong").eq("mock_id", lastMockWithItems.id)
    : { data: [] };
  const mockSeries = mocks.filter((m) => m.total_items).map((m) => ({ label: m.scheduled_on.slice(8, 10) + "/" + m.scheduled_on.slice(5, 7), value: score(m.total_items!, m.correct ?? 0, m.wrong ?? 0, exam.scoring).netPct ?? 0 }));

  return (
    <div className="space-y-6">
      <PageHeader title="Progresso" subtitle={`${exam.name} · últimas 8 semanas`} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Esta semana" value={fmtMinutes(wk.m)} />
        <Stat label="Questões na semana" value={String(wk.q)} />
        <Stat label="Acerto na semana" value={wkAcc === null ? "—" : `${wkAcc}%`} tone={wkAcc === null ? undefined : wkAcc >= exam.goal_accuracy ? "good" : "bad"} />
        <div className="card flex flex-col items-center justify-center p-4 text-center">
          <p className="flex items-center gap-1 text-2xl font-bold"><Flame className={`size-5 ${streak ? "text-orange-500" : "muted"}`} />{streak}</p>
          <p className="muted text-xs">{streak === 1 ? "dia seguido" : "dias seguidos"}</p>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Constância</h2>
          <span className="muted text-xs">{daysStudied} dias estudados em 18 semanas</span>
        </div>
        <Heatmap start={heatStart} days={heat} today={day} />
      </section>

      <TargetCard exam={exam} mock={lastMockWithItems} results={lastResults ?? []} subjects={subjects} />

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Resumo da semana</h2>
        <ul className="space-y-1.5 text-sm">
          <li>⏱️ Estudou <strong>{fmtMinutes(wk.m)}</strong> de {fmtMinutes(exam.goal_weekly_minutes)} planejadas ({exam.goal_weekly_minutes ? Math.round((wk.m / exam.goal_weekly_minutes) * 100) : 0}%).</li>
          <li>📝 Fez <strong>{wk.q}</strong> questões{wkAcc !== null ? <> com <strong>{wkAcc}%</strong> de acerto (meta {exam.goal_accuracy}%)</> : null}.</li>
          {lastMock && (
            <li>📋 Último simulado ({fmtShort(lastMock.scheduled_on)}): {lastMockScore ? <><strong>{lastMockScore.net} pts</strong> ({lastMockScore.netPct}%)</> : "sem nota objetiva"}
              {lastMock.essay_score !== null ? <>, redação <strong>{lastMock.essay_score}{lastMock.essay_max ? `/${lastMock.essay_max}` : ""}</strong></> : null}.</li>
          )}
          {weakest.length > 0 && <li>🎯 Abaixo da meta de acerto: <strong>{weakest.map((p) => `${subjectLabel(p.s)} (${p.acc}%)`).join(", ")}</strong>.</li>}
        </ul>
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="font-semibold">Horas por semana</h2>
        <ColumnChart bars={weekBars} goal={exam.goal_weekly_minutes} format={(v) => fmtMinutes(v)} />
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="font-semibold">Esta semana, dia a dia</h2>
        <ColumnChart bars={dayBars} format={(v) => fmtMinutes(v)} />
      </section>

      {mockSeries.length >= 2 && (
        <section className="card space-y-2 p-5">
          <h2 className="font-semibold">Simulados — nota líquida (%)</h2>
          <LineChart points={mockSeries} suffix="%" />
        </section>
      )}

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Por matéria</h2>
        {perSubject.map((p) => (
          <div key={p.s.id} className="space-y-1.5">
            <HBar
              label={p.s.name}
              value={p.minutes}
              max={maxMin}
              color={p.s.color}
              right={`${fmtMinutes(p.minutes)}${p.q ? ` · ${p.acc}% em ${p.q}q` : ""}`}
            />
            {p.coverage !== null && <p className="muted text-xs">Edital: {p.coverage}% estudado</p>}
          </div>
        ))}
        {perSubject.length === 0 && <p className="muted text-sm">Cadastre as matérias no Edital.</p>}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="card p-4 text-center">
      <p className={`text-2xl font-bold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</p>
      <p className="muted text-xs">{label}</p>
    </div>
  );
}
