"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { SLOT_LABELS, type SlotKind } from "@/lib/templates";

export async function addSlot(form: FormData) {
  const { supabase } = await getUser();
  const kind = String(form.get("kind") ?? "") as SlotKind;
  if (!(kind in SLOT_LABELS)) return;
  const examId = String(form.get("exam_id") ?? "");
  const weekday = Number(form.get("weekday"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
  const subjectId = String(form.get("subject_id") ?? "") || null;
  if (kind === "subject" && !subjectId) return;
  const minutesRaw = String(form.get("minutes") ?? "").trim();
  const minutes = minutesRaw ? Math.min(Math.max(Math.round(Number(minutesRaw)) || 0, 0), 720) : null;
  const label = String(form.get("label") ?? "").trim().slice(0, 80) || null;

  const { data: last } = await supabase
    .from("week_slots")
    .select("position")
    .eq("exam_id", examId)
    .eq("weekday", weekday)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("week_slots").insert({
    exam_id: examId,
    weekday,
    kind,
    subject_id: kind === "subject" || kind === "essay" || kind === "questions" || kind === "custom" ? subjectId : null,
    minutes,
    label,
    position: (last?.position ?? -1) + 1,
  });
  revalidatePath("/", "layout");
}

export async function deleteSlot(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("week_slots").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}

/** Troca a posição do item com o vizinho de cima ou de baixo no mesmo dia. */
export async function moveSlot(form: FormData) {
  const { supabase } = await getUser();
  const id = String(form.get("id") ?? "");
  const dir = form.get("dir") === "up" ? -1 : 1;
  const { data: slot } = await supabase.from("week_slots").select("id, exam_id, weekday").eq("id", id).single();
  if (!slot) return;
  const { data: list } = await supabase
    .from("week_slots")
    .select("id, position")
    .eq("exam_id", slot.exam_id)
    .eq("weekday", slot.weekday)
    .order("position")
    .order("created_at");
  if (!list) return;
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, pos) => supabase.from("week_slots").update({ position: pos }).eq("id", s.id)));
  revalidatePath("/", "layout");
}

export async function updateSlotMinutes(form: FormData) {
  const { supabase } = await getUser();
  const raw = String(form.get("minutes") ?? "").trim();
  const minutes = raw ? Math.min(Math.max(Math.round(Number(raw)) || 0, 0), 720) : null;
  await supabase.from("week_slots").update({ minutes }).eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}
