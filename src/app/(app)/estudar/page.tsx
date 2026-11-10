import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam } from "@/lib/data";
import { today } from "@/lib/dates";
import type { Topic } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { StudyForm } from "./study-form";

export const metadata: Metadata = { title: "Estudar" };

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ slot?: string; materia?: string }> }) {
  const { slot: slotId, materia } = await searchParams;
  const { supabase } = await getUser();

  let slot: { id: string; exam_id: string; subject_id: string | null; minutes: number | null } | null = null;
  if (slotId) {
    const { data } = await supabase.from("week_slots").select("id, exam_id, subject_id, minutes").eq("id", slotId).maybeSingle();
    slot = data;
  }
  const exam = await pickExam(slot?.exam_id);
  if (!exam) return <NoExam />;

  const subjects = await getSubjects(supabase, exam.id);
  const { data } = await supabase
    .from("topics")
    .select("id, subject_id, name, status, position")
    .in("subject_id", subjects.map((s) => s.id))
    .order("position");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Estudar" subtitle={`${exam.name} · cronômetro e registro da sessão`} back="/hoje" />
      <StudyForm
        examId={exam.id}
        scoring={exam.scoring}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        topics={(data ?? []) as Topic[]}
        slotId={slot?.id}
        defaultSubject={slot?.subject_id ?? materia ?? ""}
        plannedMinutes={slot?.minutes ?? null}
        today={today()}
      />
    </div>
  );
}
