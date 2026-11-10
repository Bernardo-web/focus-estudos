import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ExamForm } from "../exam-form";

export const metadata: Metadata = { title: "Novo concurso" };

export default function NewExamPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Novo concurso" back="/concursos" />
      <ExamForm />
    </div>
  );
}
