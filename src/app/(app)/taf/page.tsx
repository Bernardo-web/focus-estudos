import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, Trash2 } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { pickExam } from "@/lib/data";
import { fmtShort, today } from "@/lib/dates";
import { TAF_TEMPLATES, UNIT_LABEL, fmtMark, passes, type FitnessUnit } from "@/lib/fitness";
import { PageHeader } from "@/components/page-header";
import { NoExam } from "@/components/no-exam";
import { LineChart } from "@/components/charts";
import { addLog, addTest, applyTafTemplate, deleteLog, deleteTest, updateTarget } from "./actions";

export const metadata: Metadata = { title: "TAF" };

type Test = { id: string; name: string; detail: string | null; unit: FitnessUnit; target: number; higher_is_better: boolean };
type Log = { id: string; test_id: string; day: string; value: number };

export default async function FitnessPage() {
  const exam = await pickExam();
  if (!exam) return <NoExam />;
  const { supabase } = await getUser();
  const { data: tData, error } = await supabase
    .from("fitness_tests")
    .select("id, name, detail, unit, target, higher_is_better")
    .eq("exam_id", exam.id)
    .order("position");
  const tests = (tData ?? []) as Test[];
  const { data: lData } = tests.length
    ? await supabase.from("fitness_logs").select("id, test_id, day, value").in("test_id", tests.map((t) => t.id)).order("day").order("created_at")
    : { data: [] };
  const logs = (lData ?? []) as Log[];
  const day = today();

  const status = tests.map((t) => {
    const ls = logs.filter((l) => l.test_id === t.id);
    const last = ls.at(-1);
    const best = ls.length ? (t.higher_is_better ? Math.max(...ls.map((l) => l.value)) : Math.min(...ls.map((l) => l.value))) : null;
    return { t, ls, last, best, ok: last ? passes(Number(last.value), Number(t.target), t.higher_is_better) : null };
  });
  const apt = status.filter((s) => s.ok).length;

  return (
    <div className="space-y-6">
      <PageHeader title="TAF" subtitle={`${exam.name} · teste de aptidão física`} />

      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Falta aplicar a atualização do banco: rode <code>supabase/migrations/0003_erros_taf_redacao_lembretes.sql</code> no Supabase.
        </p>
      )}

      {tests.length === 0 && !error && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Comece pelos índices do edital</h2>
          <p className="text-sm">Os índices mínimos da PMAL 2026 já estão prontos. Você pode editar depois se o edital mudar.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TAF_TEMPLATES).map(([k, v]) => (
              <form key={k} action={applyTafTemplate}>
                <input type="hidden" name="exam_id" value={exam.id} />
                <input type="hidden" name="template" value={k} />
                <button className="btn-primary text-sm">{v.title}</button>
              </form>
            ))}
          </div>
          <p className="muted text-xs">Os sites de concurso divergem no tempo da corrida (11 ou 12 min). O modelo usa 11 min, o mais exigente. Confira no edital.</p>
        </section>
      )}

      {tests.length > 0 && (
        <section className={`card flex items-center gap-3 p-5 ${apt === tests.length ? "border-green-400" : ""}`}>
          {apt === tests.length ? <CheckCircle2 className="size-8 text-good" /> : <CircleAlert className="size-8 text-amber-500" />}
          <div>
            <p className="font-semibold">{apt === tests.length ? "Apto em todas as provas!" : `Apto em ${apt} de ${tests.length} provas`}</p>
            <p className="muted text-sm">Pela última marca registrada de cada prova. Basta uma abaixo do índice para eliminar.</p>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {status.map(({ t, ls, last, best, ok }) => (
          <li key={t.id} className="card space-y-3 p-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.name}{t.detail && <span className="muted font-normal"> · {t.detail}</span>}</p>
                <p className="muted text-sm">Índice: {t.higher_is_better ? "mínimo" : "máximo"} {fmtMark(Number(t.target), t.unit)}</p>
              </div>
              {ok !== null && (
                <span className={`chip ${ok ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"}`}>
                  {ok ? "Apto" : "Abaixo"}
                </span>
              )}
            </div>

            {last && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="soft rounded-xl p-2"><p className="text-lg font-bold">{fmtMark(Number(last.value), t.unit)}</p><p className="muted text-xs">último ({fmtShort(last.day)})</p></div>
                <div className="soft rounded-xl p-2"><p className="text-lg font-bold">{fmtMark(Number(best), t.unit)}</p><p className="muted text-xs">melhor marca</p></div>
              </div>
            )}

            {ls.length >= 2 && (
              <LineChart
                points={ls.slice(-12).map((l) => ({ label: l.day.slice(8, 10) + "/" + l.day.slice(5, 7), value: Number(l.value) }))}
                max={Math.max(Number(t.target), ...ls.map((l) => Number(l.value)))}
                suffix={t.unit === "reps" ? " rep." : t.unit === "meters" ? " m" : " s"}
              />
            )}

            <form action={addLog} className="flex flex-wrap gap-2">
              <input type="hidden" name="test_id" value={t.id} />
              <input type="hidden" name="unit" value={t.unit} />
              <input name="value" required className="input min-w-[9rem] flex-1" inputMode={t.unit === "seconds" ? "text" : "numeric"} placeholder={t.unit === "seconds" ? (Number(t.target) >= 60 ? "Tempo, ex.: 10:45" : "Segundos, ex.: 10,8") : `Nº de ${UNIT_LABEL[t.unit]}`} aria-label={`Nova marca de ${t.name}`} />
              <input name="day" type="date" defaultValue={day} max={day} className="input w-auto flex-1 sm:flex-none" aria-label="Dia" />
              <button className="btn-primary shrink-0 text-sm">Salvar</button>
            </form>

            <details>
              <summary className="muted cursor-pointer text-xs">Histórico e ajustes</summary>
              <ul className="mt-2 space-y-1">
                {[...ls].reverse().slice(0, 15).map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <span>{fmtShort(l.day)} · <strong>{fmtMark(Number(l.value), t.unit)}</strong></span>
                    <form action={deleteLog}><input type="hidden" name="id" value={l.id} /><button className="muted p-1 hover:text-bad" aria-label="Apagar marca"><Trash2 className="size-3.5" /></button></form>
                  </li>
                ))}
              </ul>
              <form action={updateTarget} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="unit" value={t.unit} />
                <input name="target" className="input text-sm" defaultValue={t.unit === "seconds" && Number(t.target) >= 60 ? `${Math.floor(Number(t.target) / 60)}:${String(Math.round(Number(t.target) % 60)).padStart(2, "0")}` : String(Number(t.target))} aria-label="Índice do edital" />
                <button className="btn-ghost shrink-0 text-sm">Mudar índice</button>
              </form>
              <form action={deleteTest} className="mt-2"><input type="hidden" name="id" value={t.id} /><button className="text-xs text-bad hover:underline">Excluir prova</button></form>
            </details>
          </li>
        ))}
      </ul>

      {tests.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold">+ Outra prova</summary>
          <form action={addTest} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="exam_id" value={exam.id} />
            <input name="name" required maxLength={80} className="input" placeholder="Nome, ex.: Flexão de braço" />
            <input name="detail" maxLength={120} className="input" placeholder="Detalhe (opcional)" />
            <select name="unit" className="input select" defaultValue="reps">
              <option value="reps">Repetições</option>
              <option value="seconds">Tempo</option>
              <option value="meters">Distância (m)</option>
            </select>
            <select name="direction" className="input select" defaultValue="higher">
              <option value="higher">Quanto mais, melhor</option>
              <option value="lower">Quanto menos, melhor (tempo)</option>
            </select>
            <input name="target" required className="input" placeholder="Índice, ex.: 30 ou 12:00" />
            <button className="btn-primary">Adicionar</button>
          </form>
        </details>
      )}
    </div>
  );
}
