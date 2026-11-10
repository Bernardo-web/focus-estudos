"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";

export async function toggleCheck(form: FormData) {
  const { supabase } = await getUser();
  const slotId = String(form.get("slot_id") ?? "");
  const day = String(form.get("day") ?? "");
  if (!isISODate(day)) return;
  if (form.get("checked") === "1") {
    await supabase.from("slot_checks").delete().eq("slot_id", slotId).eq("day", day);
  } else {
    await supabase.from("slot_checks").upsert({ slot_id: slotId, day }, { onConflict: "slot_id,day", ignoreDuplicates: true });
  }
  revalidatePath("/hoje");
}

export async function completeReview(form: FormData) {
  const { supabase } = await getUser();
  const id = String(form.get("id") ?? "");
  const undo = form.get("undo") === "1";
  await supabase.from("reviews").update({ done_at: undo ? null : new Date().toISOString() }).eq("id", id);
  // revisão de 30 dias feita = tópico revisado
  const topicId = String(form.get("topic_id") ?? "");
  if (!undo && topicId && form.get("stage") === "30") {
    await supabase.from("topics").update({ status: "reviewed", updated_at: new Date().toISOString() }).eq("id", topicId).in("status", ["pending", "seen"]);
  }
  revalidatePath("/", "layout");
}
