import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, BookOpenCheck, CalendarDays, Star } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { crestUrls, getExams } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ExamForm } from "../exam-form";
import { deleteExam, setPrimary, toggleArchive } from "../actions";

export const metadata: Metadata = { title: "Concurso" };

export default async function ExamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const { supabase } = await getUser();
  const exam = (await getExams()).find((e) => e.id === id);
  if (!exam) notFound();
  const urls = await crestUrls(supabase, [exam.crest_path]);
  const archived = exam.status === "archived";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={exam.name} subtitle={[exam.role, exam.board].filter(Boolean).join(" · ")} back="/concursos" />

      {aviso && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{aviso}</p>}

      <div className="flex flex-wrap gap-2">
        <Link href={`/edital?concurso=${exam.id}`} className="btn-ghost text-sm"><BookOpenCheck className="size-4" /> Edital e matérias</Link>
        <Link href={`/cronograma?concurso=${exam.id}`} className="btn-ghost text-sm"><CalendarDays className="size-4" /> Semana de estudos</Link>
        {!exam.is_primary && !archived && (
          <form action={setPrimary}>
            <input type="hidden" name="id" value={exam.id} />
            <button className="btn-ghost text-sm"><Star className="size-4" /> Tornar principal</button>
          </form>
        )}
        <form action={toggleArchive}>
          <input type="hidden" name="id" value={exam.id} />
          <input type="hidden" name="archive" value={archived ? "0" : "1"} />
          <button className="btn-ghost text-sm">
            {archived ? <><ArchiveRestore className="size-4" /> Reativar</> : <><Archive className="size-4" /> Arquivar</>}
          </button>
        </form>
      </div>

      <ExamForm exam={exam} crestUrl={exam.crest_path ? urls[exam.crest_path] : null} />

      <details className="card border-red-300 p-5 dark:border-red-900">
        <summary className="cursor-pointer font-semibold text-bad">Excluir concurso</summary>
        <form action={deleteExam} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={exam.id} />
          <p className="text-sm">Apaga o concurso com matérias, cronograma, sessões, revisões e simulados. Não dá para desfazer.</p>
          <input className="input" name="confirm" placeholder="Digite EXCLUIR" autoComplete="off" />
          <button className="btn-primary bg-red-600 hover:bg-red-700">Excluir de vez</button>
        </form>
      </details>
    </div>
  );
}
