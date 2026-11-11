"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Download,
  Dumbbell,
  NotebookPen,
  PenLine,
  History,
  Landmark,
  LogOut,
  Menu,
  Play,
  Settings,
  Sun,
  Ticket,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function navItems(isAdmin: boolean): Item[] {
  return [
    { href: "/hoje", label: "Hoje", icon: Sun },
    { href: "/cronograma", label: "Cronograma", icon: CalendarDays },
    { href: "/estudos", label: "Estudos e revisões", icon: History },
    { href: "/simulados", label: "Simulados", icon: ClipboardList },
    { href: "/erros", label: "Caderno de erros", icon: NotebookPen },
    { href: "/redacao", label: "Redação", icon: PenLine },
    { href: "/taf", label: "TAF", icon: Dumbbell },
    { href: "/importar", label: "Importar questões", icon: Download },
    { href: "/progresso", label: "Progresso", icon: BarChart3 },
    { href: "/edital", label: "Edital", icon: BookOpenCheck },
    { href: "/concursos", label: "Concursos", icon: Landmark },
    ...(isAdmin ? [{ href: "/convites", label: "Convites", icon: Ticket }] : []),
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];
}

export function AppNav({ isAdmin, name }: { isAdmin: boolean; name: string }) {
  const path = usePathname();
  const items = navItems(isAdmin);
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const inMore = ["/estudos", "/erros", "/redacao", "/taf", "/importar", "/progresso", "/edital", "/concursos", "/convites", "/configuracoes", "/mais"].some(active);

  const tab = (href: string, label: string, Icon: Item["icon"], on: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${on ? "text-brand-700 dark:text-brand-500" : "muted"}`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );

  return (
    <>
      <aside className="card fixed inset-y-3 left-3 hidden w-60 flex-col p-4 md:flex">
        <Link href="/hoje" className="mb-6 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-8" />
          <span className="text-lg font-bold tracking-tight">Focus</span>
        </Link>
        <Link href="/estudar" className="btn-primary mb-4">
          <Play className="size-4" /> Estudar agora
        </Link>
        <nav className="-mx-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active(href)
                  ? "bg-brand-50 text-brand-800 dark:bg-brand-800/30 dark:text-brand-100"
                  : "muted hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] pt-4">
          <p className="truncate px-3 text-sm font-medium">{name}</p>
          <form action={signOut}>
            <button className="muted mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-[var(--border)] bg-[var(--surface)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tab("/hoje", "Hoje", Sun, active("/hoje"))}
        {tab("/cronograma", "Cronograma", CalendarDays, active("/cronograma"))}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/estudar"
            aria-label="Estudar agora"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-700/30"
          >
            <Play className="size-6 translate-x-0.5" />
          </Link>
        </div>
        {tab("/simulados", "Simulados", ClipboardList, active("/simulados"))}
        {tab("/mais", "Mais", Menu, inMore)}
      </nav>
    </>
  );
}
