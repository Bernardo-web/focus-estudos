import "server-only";
import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { addDays, daysBetween, today, weekday } from "@/lib/dates";
import { SLOT_LABELS, type SlotKind } from "@/lib/templates";

export type PushSub = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url?: string; tag?: string };

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Envia para as inscrições e devolve as que expiraram (para apagar). */
export async function sendPush(subs: PushSub[], msg: PushMessage): Promise<{ sent: number; expired: string[] }> {
  if (!pushConfigured()) return { sent: 0, expired: [] };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:focus-estudos@users.noreply.github.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  let sent = 0;
  const expired: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 6, urgency: "normal" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) expired.push(s.endpoint);
      }
    }),
  );
  return { sent, expired };
}

/** Cliente com a chave de serviço: só para a rotina de lembretes (lê os dados de todos). */
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Monta o lembrete do dia de uma pessoa. Devolve null quando não há nada a lembrar. */
export async function buildReminder(db: SupabaseClient, userId: string): Promise<PushMessage | null> {
  const day = today();
  const { data: exams } = await db
    .from("exams")
    .select("id, name, exam_date, is_primary")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("is_primary", { ascending: false })
    .limit(1);
  const exam = exams?.[0];
  if (!exam) return null;

  const [{ data: slots }, { data: checks }, { data: subjects }] = await Promise.all([
    db.from("week_slots").select("id, kind, subject_id, label").eq("exam_id", exam.id).eq("weekday", weekday(day)).order("position"),
    db.from("slot_checks").select("slot_id").eq("user_id", userId).eq("day", day),
    db.from("subjects").select("id, name, short_name").eq("exam_id", exam.id),
  ]);
  const subjectIds = (subjects ?? []).map((s) => s.id);
  const { count: reviews } = subjectIds.length
    ? await db.from("reviews").select("id", { count: "exact", head: true }).in("subject_id", subjectIds).is("done_at", null).lte("due_on", day)
    : { count: 0 };

  const done = new Set((checks ?? []).map((c) => c.slot_id));
  const pending = (slots ?? []).filter((s) => !done.has(s.id));
  const names = new Map((subjects ?? []).map((s) => [s.id, s.short_name || s.name]));
  const subjectsToday = pending.filter((s) => s.kind === "subject").map((s) => names.get(s.subject_id) ?? "Matéria");
  const mock = pending.find((s) => s.kind === "mock");
  if (!pending.length && !reviews) return null;

  const parts: string[] = [];
  if (subjectsToday.length) parts.push(`Hoje: ${subjectsToday.join(" + ")}`);
  else if (mock) parts.push(`Hoje tem ${mock.label || SLOT_LABELS.mock.toLowerCase()}`);
  else if (pending.length) parts.push(pending.map((s) => s.label || SLOT_LABELS[s.kind as SlotKind]).slice(0, 2).join(" + "));
  if (reviews) parts.push(`${reviews} ${reviews === 1 ? "revisão pendente" : "revisões pendentes"}`);
  const left = exam.exam_date ? daysBetween(day, exam.exam_date) : null;
  if (left !== null && left > 0) parts.push(`faltam ${left} dias para a ${exam.name}`);

  return {
    title: left !== null && left > 0 && left <= 30 ? `Reta final: ${left} dias 🎯` : "Hora de estudar 📚",
    body: parts.join(" · "),
    url: "/hoje",
    tag: `focus-${day}`,
  };
}

/** Hora atual (0–23) em Alagoas. */
export function currentHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Maceio", hour: "2-digit", hour12: false }).format(now)) % 24;
}

export const yesterday = () => addDays(today(), -1);
