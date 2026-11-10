import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { getUser } from "@/lib/supabase/server";
import { EXAM_COLS, type Exam, type Subject } from "./types";

/** Concursos do usuário (ativos primeiro, principal no topo). Uma consulta por requisição. */
export const getExams = cache(async (): Promise<Exam[]> => {
  const { supabase } = await getUser();
  const { data, error } = await supabase
    .from("exams")
    .select(EXAM_COLS)
    .order("is_primary", { ascending: false })
    .order("exam_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Exam[];
});

/** Concurso em foco: o escolhido em ?concurso=, senão o principal, senão o primeiro ativo. */
export async function pickExam(id?: string | null): Promise<Exam | null> {
  const exams = await getExams();
  return (
    (id && exams.find((e) => e.id === id)) ||
    exams.find((e) => e.is_primary && e.status === "active") ||
    exams.find((e) => e.status === "active") ||
    null
  );
}

export async function getSubjects(supabase: SupabaseClient, examId: string): Promise<Subject[]> {
  const { data } = await supabase
    .from("subjects")
    .select("id, exam_id, name, short_name, weight, question_count, color, position")
    .eq("exam_id", examId)
    .order("position")
    .order("name");
  return (data ?? []) as Subject[];
}

/** Links temporários para exibir os brasões (bucket privado). */
export async function crestUrls(supabase: SupabaseClient, paths: (string | null)[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (list.length === 0) return {};
  const { data } = await supabase.storage.from("crests").createSignedUrls(list, 60 * 60 * 6);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

export const subjectLabel = (s: Pick<Subject, "name" | "short_name"> | undefined) => s?.short_name || s?.name || "Matéria";
