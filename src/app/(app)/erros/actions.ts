"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { REASONS } from "@/lib/anki";

export type ErrorState = { error?: string; ok?: string } | undefined;

const txt = (form: FormData, k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);

export async function addErrorNote(_: ErrorState, form: FormData): Promise<ErrorState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  const statement = txt(form, "statement", 3000);
  const answer = txt(form, "answer", 1500);
  if (!statement) return { error: "Cole o enunciado ou a assertiva." };
  if (!answer) return { error: "Escreva o gabarito e por que está certo." };
  const reason = String(form.get("reason") ?? "conteudo");
  const { error } = await supabase.from("error_notes").insert({
    exam_id: String(form.get("exam_id") ?? ""),
    subject_id: String(form.get("subject_id") ?? "") || null,
    topic_id: String(form.get("topic_id") ?? "") || null,
    statement,
    answer,
    reason: reason in REASONS ? reason : "outro",
    bizu: txt(form, "bizu", 1500) || null,
    source: txt(form, "source", 120) || null,
  });
  if (error) return { error: "Não foi possível salvar. Confira se a atualização do banco (0003) foi aplicada." };
  revalidatePath("/erros");
  return { ok: "Erro anotado. Ele vai no próximo arquivo do Anki." };
}

export async function deleteErrorNote(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("error_notes").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/erros");
}
