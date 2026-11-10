"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";

export type MockState = { error?: string; ok?: string } | undefined;

const num = (v: FormDataEntryValue | null, max: number): number | null => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : null;
};

export async function saveMock(_: MockState, form: FormData): Promise<MockState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  const id = String(form.get("id") ?? "") || null;
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const scheduled = String(form.get("scheduled_on") ?? "");
  if (!title) return { error: "Dê um nome ao simulado." };
  if (!isISODate(scheduled)) return { error: "Data inválida." };

  // resultados por matéria (opcionais)
  const subjectIds = form.getAll("r_subject").map(String);
  const results = subjectIds
    .map((subject_id, i) => ({
      subject_id,
      items: Math.round(num(form.getAll("r_items")[i], 500) ?? 0),
      correct: Math.round(num(form.getAll("r_correct")[i], 500) ?? 0),
      wrong: Math.round(num(form.getAll("r_wrong")[i], 500) ?? 0),
    }))
    .filter((r) => r.items > 0);
  const bad = results.find((r) => r.correct + r.wrong > r.items);
  if (bad) return { error: "Em alguma matéria, certas + erradas passou do número de itens." };

  let total = num(form.get("total_items"), 500);
  let correct = num(form.get("correct"), 500);
  let wrong = num(form.get("wrong"), 500);
  if (results.length && total === null) {
    total = results.reduce((a, r) => a + r.items, 0);
    correct = results.reduce((a, r) => a + r.correct, 0);
    wrong = results.reduce((a, r) => a + r.wrong, 0);
  }
  if (total !== null && (correct ?? 0) + (wrong ?? 0) > total) return { error: "Certas + erradas passou do total de itens." };
  const essayScore = num(form.get("essay_score"), 999);
  const essayMax = num(form.get("essay_max"), 999);
  const done = total !== null && total > 0 ? true : form.get("done") === "on" || essayScore !== null;

  const row = {
    exam_id: String(form.get("exam_id") ?? ""),
    title,
    scheduled_on: scheduled,
    done,
    total_items: total ? Math.round(total) : null,
    correct: correct !== null ? Math.round(correct) : null,
    wrong: wrong !== null ? Math.round(wrong) : null,
    essay_score: essayScore,
    essay_max: essayMax && essayMax > 0 ? essayMax : null,
    notes: String(form.get("notes") ?? "").trim().slice(0, 2000) || null,
  };

  let mockId = id;
  if (id) {
    const { error } = await supabase.from("mocks").update(row).eq("id", id);
    if (error) return { error: "Não foi possível salvar." };
  } else {
    const { data, error } = await supabase.from("mocks").insert(row).select("id").single();
    if (error || !data) return { error: "Não foi possível salvar." };
    mockId = data.id;
  }

  await supabase.from("mock_results").delete().eq("mock_id", mockId!);
  if (results.length) {
    const { error } = await supabase.from("mock_results").insert(results.map((r) => ({ ...r, mock_id: mockId })));
    if (error) return { error: "O simulado foi salvo, mas o resultado por matéria falhou." };
  }

  revalidatePath("/", "layout");
  if (!id) redirect(`/simulados/${mockId}?salvo=1`);
  return { ok: "Simulado salvo." };
}

export async function deleteMock(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("mocks").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
  redirect("/simulados");
}
