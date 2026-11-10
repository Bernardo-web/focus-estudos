import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getSubjects, pickExam } from "@/lib/data";
import { isISODate, today } from "@/lib/dates";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { MockForm } from "../mock-form";

export const metadata: Metadata = { title: "Novo simulado" };

export default async function NewMockPage({ searchParams }: { searchParams: Promise<{ data?: string; titulo?: string }> }) {
  const { data, titulo } = await searchParams;
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const subjects = await getSubjects(supabase, exam.id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Novo simulado" subtitle={exam.name} back="/simulados" />
      <MockForm
        examId={exam.id}
        scoring={exam.scoring}
        subjects={subjects}
        defaults={{ title: (titulo ?? "").slice(0, 120) || `Simulado ${exam.name}`, date: data && isISODate(data) ? data : today() }}
      />
    </div>
  );
}
