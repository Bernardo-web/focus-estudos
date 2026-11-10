"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { score, type Scoring } from "@/lib/scoring";
import type { Mock } from "@/lib/types";
import { saveMock } from "./actions";

type Result = { subject_id: string; items: number; correct: number; wrong: number };

export function MockForm({
  examId,
  scoring,
  mock,
  results = [],
  subjects,
  defaults,
}: {
  examId: string;
  scoring: Scoring;
  mock?: Mock;
  results?: Result[];
  subjects: { id: string; name: string; short_name: string | null; color: string }[];
  defaults: { title: string; date: string };
}) {
  const [state, action] = useActionState(saveMock, undefined);
  const [bySubject, setBySubject] = useState(results.length > 0);
  const [tot, setTot] = useState({
    total: mock?.total_items?.toString() ?? "",
    correct: mock?.correct?.toString() ?? "",
    wrong: mock?.wrong?.toString() ?? "",
  });
  const s = score(Number(tot.total) || 0, Number(tot.correct) || 0, Number(tot.wrong) || 0, scoring);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="exam_id" value={examId} />
      {mock && <input type="hidden" name="id" value={mock.id} />}

      <section className="card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
          <div>
            <label className="label" htmlFor="title">Nome</label>
            <input id="title" name="title" className="input" required maxLength={120} defaultValue={mock?.title ?? defaults.title} placeholder="Ex.: Simulado 03 — Gran" />
          </div>
          <div>
            <label className="label" htmlFor="scheduled_on">Data</label>
            <input id="scheduled_on" name="scheduled_on" type="date" className="input" required defaultValue={mock?.scheduled_on ?? defaults.date} />
          </div>
        </div>

        {!bySubject && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label text-xs" htmlFor="total_items">Itens</label><input id="total_items" name="total_items" type="number" min={1} max={500} className="input" value={tot.total} onChange={(e) => setTot({ ...tot, total: e.target.value })} placeholder="120" /></div>
              <div><label className="label text-xs" htmlFor="correct">Certas</label><input id="correct" name="correct" type="number" min={0} max={500} className="input" value={tot.correct} onChange={(e) => setTot({ ...tot, correct: e.target.value })} /></div>
              <div><label className="label text-xs" htmlFor="wrong">Erradas</label><input id="wrong" name="wrong" type="number" min={0} max={500} className="input" value={tot.wrong} onChange={(e) => setTot({ ...tot, wrong: e.target.value })} /></div>
            </div>
            {Number(tot.total) > 0 && (
              <p className="text-sm">
                Nota líquida: <strong>{s.net}</strong> {s.netPct !== null && <span className="muted">({s.netPct}% do total)</span>}
                {s.accuracy !== null && <> · Acerto: <strong>{s.accuracy}%</strong></>}
              </p>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bySubject} onChange={(e) => setBySubject(e.target.checked)} /> Lançar resultado por matéria
        </label>
      </section>

      {bySubject && (
        <section className="card space-y-2 p-5">
          <h2 className="font-semibold">Resultado por matéria</h2>
          <p className="muted text-xs">Deixe em branco as matérias que não caíram. O total é somado automaticamente.</p>
          <div className="muted grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 text-xs font-medium">
            <span>Matéria</span><span>Itens</span><span>Certas</span><span>Erradas</span>
          </div>
          {subjects.map((subj) => {
            const r = results.find((x) => x.subject_id === subj.id);
            return (
              <div key={subj.id} className="grid grid-cols-[1fr_4rem_4rem_4rem] items-center gap-2">
                <input type="hidden" name="r_subject" value={subj.id} />
                <span className="flex min-w-0 items-center gap-2 text-sm"><span className="size-2 shrink-0 rounded-full" style={{ background: subj.color }} /><span className="truncate" title={subj.name}>{subj.short_name || subj.name}</span></span>
                <input name="r_items" type="number" min={0} max={500} className="input px-2 py-2 text-sm" defaultValue={r?.items ?? ""} aria-label={`Itens de ${subj.name}`} />
                <input name="r_correct" type="number" min={0} max={500} className="input px-2 py-2 text-sm" defaultValue={r?.correct ?? ""} aria-label={`Certas de ${subj.name}`} />
                <input name="r_wrong" type="number" min={0} max={500} className="input px-2 py-2 text-sm" defaultValue={r?.wrong ?? ""} aria-label={`Erradas de ${subj.name}`} />
              </div>
            );
          })}
        </section>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Redação / discursiva</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label text-xs" htmlFor="essay_score">Nota</label><input id="essay_score" name="essay_score" inputMode="decimal" className="input" defaultValue={mock?.essay_score ?? ""} /></div>
          <div><label className="label text-xs" htmlFor="essay_max">Vale</label><input id="essay_max" name="essay_max" inputMode="decimal" className="input" defaultValue={mock?.essay_max ?? 30} /></div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Análise dos erros</label>
          <textarea id="notes" name="notes" maxLength={2000} className="input min-h-28" defaultValue={mock?.notes ?? ""} placeholder="O que errei, por quê, o que revisar…" />
        </div>
        {!mock?.done && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="done" /> Já fiz este simulado</label>
        )}
      </section>

      <FormMessage state={state} />
      <SubmitButton className="sm:w-auto">Salvar simulado</SubmitButton>
    </form>
  );
}
