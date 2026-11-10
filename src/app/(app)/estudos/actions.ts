"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";

export async function deleteSession(form: FormData) {
  const { supabase } = await getUser();
  // as revisões geradas pela sessão são apagadas junto (on delete cascade)
  await supabase.from("study_sessions").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}
