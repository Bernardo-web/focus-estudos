import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { getProfile } from "@/lib/supabase/server";
import { navItems } from "@/components/app-nav";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Mais" };

export default async function MorePage() {
  const profile = await getProfile();
  const items = navItems(profile?.is_admin ?? false).filter((i) => !["/hoje", "/cronograma", "/simulados"].includes(i.href));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Mais</h1>
      <ul className="card divide-y divide-[var(--border)]">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5">
              <Icon className="muted size-5" />
              <span className="flex-1 font-medium">{label}</span>
              <ChevronRight className="muted size-4" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOut}>
        <button className="btn-ghost w-full justify-center"><LogOut className="size-4" /> Sair</button>
      </form>
    </div>
  );
}
