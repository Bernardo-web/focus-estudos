"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { removeSubscription, saveReminder, saveSubscription, sendTest } from "./reminder-actions";

function toKey(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function Reminders({ publicKey, hour, enabled }: { publicKey: string; hour: number; enabled: boolean }) {
  const [support, setSupport] = useState<"checking" | "ok" | "no" | "ios">("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupport(ios && !standalone ? "ios" : "no");
      return;
    }
    setSupport("ok");
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setEndpoint(s?.endpoint ?? null)).catch(() => {});
  }, []);

  const enable = () =>
    start(async () => {
      setMsg(null);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setMsg({ error: "Permissão negada. Libere as notificações do site nas configurações do navegador." });
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const r = await saveSubscription(json);
        if (r.error) return setMsg({ error: r.error });
        setEndpoint(sub.endpoint);
        setMsg({ ok: "Notificações ativadas neste aparelho." });
      } catch {
        setMsg({ error: "Não foi possível ativar neste navegador." });
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setMsg({ ok: "Notificações desativadas neste aparelho." });
    });

  const test = () =>
    start(async () => {
      const r = await sendTest();
      setMsg(r.ok ? { ok: "Enviado! Deve chegar em alguns segundos." } : { error: r.error });
    });

  if (!publicKey) {
    return <p className="muted text-sm">Os lembretes ainda não foram configurados no servidor (chaves VAPID na Vercel).</p>;
  }

  return (
    <div className="space-y-4">
      {support === "ios" && <p className="text-sm">No iPhone, primeiro adicione o Focus à tela inicial (Compartilhar → Adicionar à Tela de Início) e abra por lá.</p>}
      {support === "no" && <p className="text-sm text-bad">Este navegador não aceita notificações.</p>}

      {support === "ok" && (
        <div className="flex flex-wrap gap-2">
          {endpoint ? (
            <>
              <span className="chip bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"><Bell className="size-3.5" /> Ativo neste aparelho</span>
              <button type="button" onClick={test} disabled={pending} className="btn-ghost text-sm"><Send className="size-4" /> Enviar teste</button>
              <button type="button" onClick={disable} disabled={pending} className="btn-ghost text-sm"><BellOff className="size-4" /> Desativar</button>
            </>
          ) : (
            <button type="button" onClick={enable} disabled={pending} className="btn-primary text-sm"><Bell className="size-4" /> Ativar notificações neste aparelho</button>
          )}
        </div>
      )}

      <form action={saveReminder} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="hour">Horário do lembrete</label>
          <select id="hour" name="hour" defaultValue={hour} className="input select w-32">
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={enabled} /> Lembrete diário ligado
        </label>
        <button className="btn-ghost text-sm">Salvar</button>
      </form>
      <p className="muted text-xs">
        Todo dia, no horário escolhido, chega um aviso com as matérias do dia, as revisões pendentes e quantos dias faltam para a prova.
        Se você já concluiu tudo do dia, não chega nada. Pode atrasar alguns minutos.
      </p>
      {msg && <p role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "text-bad" : "text-good"}`}>{msg.error ?? msg.ok}</p>}
    </div>
  );
}
