import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { crestUrls, getExams } from "@/lib/data";
import { daysBetween, fmtFull, today } from "@/lib/dates";
import { Crest } from "@/components/crest";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Concursos" };

export default async function ExamsPage() {
  const { supabase } = await getUser();
  const exams = await getExams();
  const urls = await crestUrls(supabase, exams.map((e) => e.crest_path));
  const now = today();
  const active = exams.filter((e) => e.status === "active");
  const archived = exams.filter((e) => e.status === "archived");

  const card = (e: (typeof exams)[number]) => {
    const left = e.exam_date ? daysBetween(now, e.exam_date) : null;
    return (
      <li key={e.id}>
        <Link href={`/concursos/${e.id}`} className="card flex items-center gap-4 p-4 transition hover:border-brand-500">
          <Crest exam={e} url={e.crest_path ? urls[e.crest_path] : null} size={52} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-semibold">
              {e.name}
              {e.is_primary && <Star className="size-4 fill-gold-500 text-gold-500" aria-label="Principal" />}
            </p>
            <p className="muted truncate text-sm">{[e.role, e.board].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <div className="text-right">
            {left === null ? (
              <span className="muted text-xs">Sem data</span>
            ) : left >= 0 ? (
              <>
                <p className="text-xl font-bold tabular-nums">{left}</p>
                <p className="muted text-xs">{left === 1 ? "dia" : "dias"}</p>
              </>
            ) : (
              <span className="muted text-xs">Prova em {fmtFull(e.exam_date!)}</span>
            )}
          </div>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concursos"
        subtitle="O concurso com estrela é o que aparece na tela Hoje."
        action={<Link href="/concursos/novo" className="btn-primary"><Plus className="size-4" /> Novo</Link>}
      />
      {active.length === 0 && (
        <div className="card p-6 text-center">
          <p className="font-medium">Nenhum concurso ainda.</p>
          <p className="muted mt-1 text-sm">Cadastre o primeiro para montar sua semana de estudos.</p>
        </div>
      )}
      <ul className="space-y-2">{active.map(card)}</ul>
      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="muted text-sm font-semibold">Arquivados</h2>
          <ul className="space-y-2 opacity-70">{archived.map(card)}</ul>
        </section>
      )}
    </div>
  );
}
