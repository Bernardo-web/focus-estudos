import { NextResponse, type NextRequest } from "next/server";
import { buildReminder, currentHour, pushConfigured, sendPush, serviceClient } from "@/lib/push";
import { today } from "@/lib/dates";

/**
 * Lembretes diários. Chamado de hora em hora pelo GitHub Actions.
 * Envia para quem escolheu esta hora (ou até 2 horas antes, se o agendador atrasou)
 * e ainda não recebeu o lembrete hoje.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ ok: false, error: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas" }, { status: 500 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 500 });

  const day = today();
  const hour = currentHour();
  const hours = [hour, hour - 1, hour - 2].filter((h) => h >= 0);
  const { data: due, error } = await db
    .from("reminder_settings")
    .select("user_id")
    .eq("enabled", true)
    .in("hour", hours)
    .or(`last_sent_on.is.null,last_sent_on.lt.${day}`);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  for (const { user_id } of due ?? []) {
    const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", user_id);
    const msg = subs?.length ? await buildReminder(db, user_id) : null;
    if (msg && subs?.length) {
      const r = await sendPush(subs, msg);
      sent += r.sent;
      if (r.expired.length) await db.from("push_subscriptions").delete().eq("user_id", user_id).in("endpoint", r.expired);
    } else {
      skipped++;
    }
    await db.from("reminder_settings").update({ last_sent_on: day }).eq("user_id", user_id);
  }
  return NextResponse.json({ ok: true, hour, users: due?.length ?? 0, sent, skipped }, { headers: { "Cache-Control": "no-store" } });
}
