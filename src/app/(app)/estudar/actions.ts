"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { addDays, isISODate, today } from "@/lib/dates";
import { REVIEW_STAGES } from "@/lib/scoring";

export type SessionState = { error?: string } | undefined;

const n = (form: FormData, key: string, max: number) => {
  const v = Math.round(Number(form.get(key) ?? 0));
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : 0;
};

export async function logSession(_: SessionState, form: FormData): Promise<SessionState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const examId = String(form.get("exam_id") ?? "");
  const subjectId = String(form.get("subject_id") ?? "") || null;
  const topicId = String(form.get("topic_id") ?? "") || null;
  const day = String(form.get("day") ?? "") || today();
  const minutes = n(form, "minutes", 1440);
  const questions = n(form, "questions", 2000);
  const correct = n(form, "correct", 2000);
  const wrong = n(form, "wrong", 2000);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
  const slotId = String(form.get("slot_id") ?? "") || null;

  if (!isISODate(day)) return { error: "Data inválida." };
  if (day > today()) return { error: "A data não pode ser no futuro." };
  if (!subjectId) return { error: "Escolha a matéria." };
  if (minutes === 0 && questions === 0) return { error: "Informe o tempo estudado ou as questões feitas." };
  if (correct + wrong > questions) return { error: "Certas + erradas não pode passar do total de questões." };

  const { data: session, error } = await supabase
    .from("study_sessions")
    .insert({ exam_id: examId, subject_id: subjectId, topic_id: topicId, day, minutes, questions, correct, wrong, notes })
    .select("id")
    .single();
  if (error || !session) return { error: "Não foi possível salvar. Tente de novo." };

  const tasks: PromiseLike<unknown>[] = [];
  // revisões espaçadas: 24h, 7 e 30 dias depois (só quando houve estudo de conteúdo)
  if (minutes > 0 && form.get("schedule_reviews") === "on") {
    tasks.push(
      supabase.from("reviews").insert(
        REVIEW_STAGES.map((stage) => ({ session_id: session.id, subject_id: subjectId, topic_id: topicId, stage, due_on: addDays(day, stage) })),
      ),
    );
  }
  if (topicId && form.get("mark_seen") === "on") {
    tasks.push(supabase.from("topics").update({ status: "seen", updated_at: new Date().toISOString() }).eq("id", topicId).eq("status", "pending"));
  }
  if (slotId) {
    tasks.push(supabase.from("slot_checks").upsert({ slot_id: slotId, day }, { onConflict: "slot_id,day", ignoreDuplicates: true }));
  }
  await Promise.all(tasks);

  revalidatePath("/", "layout");
  redirect(`/hoje?registrado=1`);
}
