"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { TOPIC_ORDER, type TopicStatus } from "@/lib/types";

const HEX = /^#[0-9a-fA-F]{6}$/;

function subjectFields(form: FormData) {
  const weight = Number(String(form.get("weight") ?? "1").replace(",", "."));
  const qc = String(form.get("question_count") ?? "").trim();
  const color = String(form.get("color") ?? "");
  return {
    name: String(form.get("name") ?? "").trim().slice(0, 80),
    short_name: String(form.get("short_name") ?? "").trim().slice(0, 24) || null,
    weight: Number.isFinite(weight) ? Math.min(Math.max(weight, 0), 99) : 1,
    question_count: qc ? Math.min(Math.max(Math.round(Number(qc)) || 0, 0), 999) : null,
    ...(HEX.test(color) && { color }),
  };
}

export async function addSubject(form: FormData) {
  const { supabase } = await getUser();
  const fields = subjectFields(form);
  if (!fields.name) return;
  const examId = String(form.get("exam_id") ?? "");
  const { count } = await supabase.from("subjects").select("id", { count: "exact", head: true }).eq("exam_id", examId);
  await supabase.from("subjects").insert({ ...fields, exam_id: examId, position: count ?? 0 });
  revalidatePath("/edital");
}

export async function updateSubject(form: FormData) {
  const { supabase } = await getUser();
  const fields = subjectFields(form);
  if (!fields.name) return;
  await supabase.from("subjects").update(fields).eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}

export async function deleteSubject(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("subjects").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}

export async function addTopics(form: FormData) {
  const { supabase } = await getUser();
  const subjectId = String(form.get("subject_id") ?? "");
  const names = String(form.get("names") ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-•*\d.)]+/, "").trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 200);
  if (names.length === 0) return;
  const { count } = await supabase.from("topics").select("id", { count: "exact", head: true }).eq("subject_id", subjectId);
  await supabase.from("topics").insert(names.map((name, i) => ({ subject_id: subjectId, name, position: (count ?? 0) + i })));
  revalidatePath("/edital");
}

export async function cycleTopic(form: FormData) {
  const { supabase } = await getUser();
  const current = String(form.get("status") ?? "pending") as TopicStatus;
  const next = TOPIC_ORDER[(TOPIC_ORDER.indexOf(current) + 1) % TOPIC_ORDER.length];
  await supabase.from("topics").update({ status: next, updated_at: new Date().toISOString() }).eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}

export async function deleteTopic(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("topics").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/edital");
}
