"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { ESSAY_ISSUES, ESSAY_THEMES } from "@/lib/essay";
import { saveEssay } from "./actions";

export function EssayForm({ examId, today, usedThemes, defaultMax }: { examId: string; today: string; usedThemes: string[]; defaultMax: number }) {
  const [state, action] = useActionState(saveEssay, undefined);
  const [theme, setTheme] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setTheme("");
    }
  }, [state]);

  function draw() {
    const fresh = ESSAY_THEMES.filter((t) => !usedThemes.includes(t));
    const pool = fresh.length ? fresh : ESSAY_THEMES;
    setTheme(pool[Math.floor(Math.random() * pool.length)]);
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="exam_id" value={examId} />
      <div>
        <label className="label" htmlFor="theme">Tema</label>
        <div className="flex gap-2">
          <input id="theme" name="theme" required maxLength={200} list="themes" className="input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Digite ou sorteie um tema" />
          <button type="button" onClick={draw} className="btn-ghost shrink-0" title="Sortear tema"><Shuffle className="size-4" /> Sortear</button>
        </div>
        <datalist id="themes">{ESSAY_THEMES.map((t) => <option key={t} value={t} />)}</datalist>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label" htmlFor="day">Dia</label><input id="day" name="day" type="date" defaultValue={today} max={today} className="input" /></div>
        <div><label className="label" htmlFor="score">Nota</label><input id="score" name="score" inputMode="decimal" className="input" placeholder="—" /></div>
        <div><label className="label" htmlFor="max_score">Vale</label><input id="max_score" name="max_score" inputMode="decimal" className="input" defaultValue={defaultMax} /></div>
      </div>
      <fieldset>
        <legend className="label">Onde perdeu pontos</legend>
        <div className="flex flex-wrap gap-2">
          {ESSAY_ISSUES.map((i) => (
            <label key={i} className="chip cursor-pointer has-[:checked]:bg-red-100 has-[:checked]:text-red-800 dark:has-[:checked]:bg-red-900/40 dark:has-[:checked]:text-red-200">
              <input type="checkbox" name="issues" value={i} className="sr-only" /> {i}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="notes">Comentários da correção (opcional)</label>
        <textarea id="notes" name="notes" maxLength={2000} className="input min-h-20" placeholder="O que o corretor apontou, o que melhorar na próxima…" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="sm:w-auto">Salvar redação</SubmitButton>
    </form>
  );
}
