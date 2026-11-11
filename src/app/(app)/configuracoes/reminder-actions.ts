"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { buildReminder, sendPush } from "@/lib/push";

export async function saveSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada." };
  if (!/^https:\/\//.test(sub?.endpoint ?? "") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Inscrição inválida." };
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint.slice(0, 1000), p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 100) }, { onConflict: "endpoint,user_id" });
  if (error) return { error: "Não foi possível ativar. Confira se a atualização do banco (0003) foi aplicada." };
  await supabase.from("reminder_settings").upsert({ enabled: true }, { onConflict: "user_id", ignoreDuplicates: true });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function removeSubscription(endpoint: string) {
  const { supabase } = await getUser();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  revalidatePath("/configuracoes");
}

export async function saveReminder(form: FormData) {
  const { supabase } = await getUser();
  const hour = Math.min(23, Math.max(0, Math.round(Number(form.get("hour"))) || 19));
  await supabase
    .from("reminder_settings")
    .upsert({ hour, enabled: form.get("enabled") === "on", last_sent_on: null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  revalidatePath("/configuracoes");
}

export async function sendTest() {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada." };
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return { error: "Ative as notificações neste aparelho primeiro." };
  const msg = (await buildReminder(supabase, user.id)) ?? { title: "Focus", body: "Notificações funcionando! Nada pendente para hoje.", url: "/hoje" };
  const r = await sendPush(subs, { ...msg, tag: "focus-teste" });
  if (r.expired.length) await supabase.from("push_subscriptions").delete().in("endpoint", r.expired);
  return r.sent ? { ok: true } : { error: "Não consegui enviar. As chaves VAPID estão configuradas na Vercel?" };
}
