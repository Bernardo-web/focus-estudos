import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Monitor, Moon, Sun } from "lucide-react";
import { getProfile, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { setTheme } from "./actions";
import { DeleteAccountForm, ProfileForm } from "./forms";
import { Reminders } from "./reminders";
import { vapidPublicKey } from "@/lib/push";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { user } = await getUser();
  const profile = await getProfile();
  const theme = (await cookies()).get("theme")?.value ?? "system";
  const { supabase } = await getUser();
  const { data: reminder } = await supabase.from("reminder_settings").select("hour, enabled").maybeSingle();

  const themes = [
    { value: "system", label: "Sistema", icon: Monitor },
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Configurações" subtitle={user!.email} />

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Perfil</h2>
        <ProfileForm name={profile?.full_name ?? ""} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Lembretes no celular</h2>
        <Reminders publicKey={vapidPublicKey()} hour={reminder?.hour ?? 19} enabled={reminder?.enabled ?? true} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Aparência</h2>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <form key={value} action={setTheme}>
              <input type="hidden" name="theme" value={value} />
              <button
                aria-pressed={theme === value}
                className={`flex w-full flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium ${
                  theme === value ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-800/30 dark:text-brand-100" : "border-[var(--border)]"
                }`}
              >
                <Icon className="size-5" /> {label}
              </button>
            </form>
          ))}
        </div>
      </section>

      <p className="muted text-center text-xs">
        <Link href="/privacidade" className="underline">Como seus dados são tratados</Link>
      </p>

      <section className="card space-y-3 border-red-300 p-5 dark:border-red-900">
        <h2 className="font-semibold text-bad">Excluir conta</h2>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
