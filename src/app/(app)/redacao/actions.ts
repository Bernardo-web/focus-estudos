"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { isISODate, today } from "@/lib/dates";
import { ESSAY_ISSUES } from "@/lib/essay";

export type EssayState = { error?: string; ok?: string } | undefined;

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 999) : null;
};

export async function saveEssay(_: EssayState, form: FormData): Promise<EssayState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  const theme = String(form.get("theme") ?? "").trim().slice(0, 200);
  const day = String(form.get("day") ?? "") || today();
  const score = num(form.get("score"));
  const max = num(form.get("max_score"));
  if (!theme) return { error: "Informe o tema." };
  if (!isISODate(day) || day > today()) return { error: "Data inválida." };
  if (score !== null && max !== null && score > max) return { error: "A nota passou do valor máximo." };
  const issues = form.getAll("issues").map(String).filter((i) => ESSAY_ISSUES.includes(i));
  const { error } = await supabase.from("essays").insert({
    exam_id: String(form.get("exam_id") ?? ""),
    day,
    theme,
    score,
    max_score: max && max > 0 ? max : null,
    issues,
    notes: String(form.get("notes") ?? "").trim().slice(0, 2000) || null,
  });
  if (error) return { error: "Não foi possível salvar. Confira se a atualização do banco (0003) foi aplicada." };
  revalidatePath("/redacao");
  return { ok: "Redação registrada." };
}

export async function deleteEssay(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("essays").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/redacao");
}
