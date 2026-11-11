import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { pickExam } from "@/lib/data";
import { fmtFull, today } from "@/lib/dates";
import { score } from "@/lib/scoring";
import type { Mock } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { LineChart } from "@/components/charts";
import { TargetCard } from "@/components/target-card";
import { getSubjects } from "@/lib/data";

export const metadata: Metadata = { title: "Simulados" };

export default async function MocksPage() {
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const { data } = await supabase
    .from("mocks")
    .select("id, exam_id, title, scheduled_on, done, total_items, correct, wrong, essay_score, essay_max, notes")
    .eq("exam_id", exam.id)
    .order("scheduled_on", { ascending: false })
    .limit(200);
  const mocks = (data ?? []) as Mock[];
  const lastDone = mocks.find((m) => m.done && m.total_items) ?? null;
  const [subjects, { data: lastResults }] = await Promise.all([
    getSubjects(supabase, exam.id),
    lastDone ? supabase.from("mock_results").select("subject_id, items, correct, wrong").eq("mock_id", lastDone.id) : Promise.resolve({ data: [] }),
  ]);
  const day = today();
  const upcoming = mocks.filter((m) => !m.done).reverse();
  const done = mocks.filter((m) => m.done);
  const series = done
    .filter((m) => m.total_items)
    .map((m) => ({ label: fmtFull(m.scheduled_on).slice(0, 5), value: score(m.total_items!, m.correct ?? 0, m.wrong ?? 0, exam.scoring).netPct ?? 0 }))
    .reverse();

  const row = (m: Mock) => {
    const sc = m.total_items ? score(m.total_items, m.correct ?? 0, m.wrong ?? 0, exam.scoring) : null;
    return (
      <li key={m.id}>
        <Link href={`/simulados/${m.id}`} className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{m.title}</span>
            <span className={`text-xs ${!m.done && m.scheduled_on < day ? "text-bad" : "muted"}`}>
              {fmtFull(m.scheduled_on)}{!m.done && m.scheduled_on < day ? " · resultado pendente" : ""}
              {m.essay_score !== null ? ` · redação ${m.essay_score}${m.essay_max ? `/${m.essay_max}` : ""}` : ""}
            </span>
          </span>
          {sc && <span className="text-right"><span className="block font-semibold tabular-nums">{sc.net} pts</span><span className="muted text-xs">{sc.netPct}%</span></span>}
          <ChevronRight className="muted size-4" />
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Simulados" subtitle={exam.name} action={<Link href="/simulados/novo" className="btn-primary"><Plus className="size-4" /> Novo</Link>} />

      <TargetCard exam={exam} mock={lastDone} results={lastResults ?? []} subjects={subjects} />

      {series.length >= 2 && (
        <section className="card space-y-2 p-5">
          <h2 className="font-semibold">Evolução da nota líquida (%)</h2>
          <LineChart points={series} suffix="%" />
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Agendados</h2>
          <ul className="card divide-y divide-[var(--border)]">{upcoming.map(row)}</ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Realizados</h2>
        {done.length === 0 ? (
          <p className="card muted p-5 text-sm">Nenhum simulado registrado. No domingo, o Focus abre o registro direto da tela Hoje.</p>
        ) : (
          <ul className="card divide-y divide-[var(--border)]">{done.map(row)}</ul>
        )}
      </section>
    </div>
  );
}
