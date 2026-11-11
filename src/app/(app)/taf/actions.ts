"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { isISODate, today } from "@/lib/dates";
import { TAF_TEMPLATES, parseMark, type FitnessUnit } from "@/lib/fitness";

const UNITS: FitnessUnit[] = ["reps", "seconds", "meters"];

export async function applyTafTemplate(form: FormData) {
  const { supabase } = await getUser();
  const tpl = TAF_TEMPLATES[String(form.get("template") ?? "")];
  if (!tpl) return;
  const examId = String(form.get("exam_id") ?? "");
  await supabase.from("fitness_tests").insert(
    tpl.tests.map((t, i) => ({ exam_id: examId, name: t.name, detail: t.detail ?? null, unit: t.unit, target: t.target, higher_is_better: t.higherIsBetter, position: i })),
  );
  revalidatePath("/taf");
}

export async function addTest(form: FormData) {
  const { supabase } = await getUser();
  const unit = String(form.get("unit") ?? "reps") as FitnessUnit;
  if (!UNITS.includes(unit)) return;
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const target = parseMark(String(form.get("target") ?? ""), unit);
  if (!name || target === null) return;
  const examId = String(form.get("exam_id") ?? "");
  const { count } = await supabase.from("fitness_tests").select("id", { count: "exact", head: true }).eq("exam_id", examId);
  await supabase.from("fitness_tests").insert({
    exam_id: examId,
    name,
    detail: String(form.get("detail") ?? "").trim().slice(0, 120) || null,
    unit,
    target,
    higher_is_better: form.get("direction") !== "lower",
    position: count ?? 0,
  });
  revalidatePath("/taf");
}

export async function updateTarget(form: FormData) {
  const { supabase } = await getUser();
  const unit = String(form.get("unit") ?? "reps") as FitnessUnit;
  const target = parseMark(String(form.get("target") ?? ""), unit);
  if (target === null) return;
  await supabase.from("fitness_tests").update({ target }).eq("id", String(form.get("id") ?? ""));
  revalidatePath("/taf");
}

export async function deleteTest(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("fitness_tests").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/taf");
}

export async function addLog(form: FormData) {
  const { supabase } = await getUser();
  const unit = String(form.get("unit") ?? "reps") as FitnessUnit;
  const value = parseMark(String(form.get("value") ?? ""), unit);
  const day = String(form.get("day") ?? "") || today();
  if (value === null || !isISODate(day) || day > today()) return;
  await supabase.from("fitness_logs").insert({ test_id: String(form.get("test_id") ?? ""), value, day });
  revalidatePath("/taf");
}

export async function deleteLog(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("fitness_logs").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/taf");
}
