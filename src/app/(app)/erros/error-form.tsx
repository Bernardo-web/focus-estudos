"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { REASONS } from "@/lib/anki";
import { addErrorNote } from "./actions";

export function ErrorForm({
  examId,
  subjects,
  topics,
  defaultSubject,
}: {
  examId: string;
  subjects: { id: string; name: string }[];
  topics: { id: string; subject_id: string; name: string }[];
  defaultSubject?: string;
}) {
  const [state, action] = useActionState(addErrorNote, undefined);
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const subjectTopics = useMemo(() => topics.filter((t) => t.subject_id === subject), [topics, subject]);

  // depois de salvar, limpa os textos e mantém a matéria (normalmente vêm vários erros seguidos)
  useEffect(() => {
    if (state?.ok) formRef.current?.querySelectorAll("textarea, input[type=text]").forEach((el) => ((el as HTMLInputElement).value = ""));
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="exam_id" value={examId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="e-subject">Matéria</label>
          <select id="e-subject" name="subject_id" className="input select" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">—</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="e-topic">Tópico</label>
          <select id="e-topic" name="topic_id" className="input select" defaultValue="" disabled={!subjectTopics.length}>
            <option value="">—</option>
            {subjectTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="e-statement">Questão / assertiva (frente do cartão)</label>
        <textarea id="e-statement" name="statement" required maxLength={3000} className="input min-h-24" placeholder="Cole a assertiva do Cebraspe…" />
      </div>
      <div>
        <label className="label" htmlFor="e-answer">Gabarito e explicação (verso)</label>
        <textarea id="e-answer" name="answer" required maxLength={1500} className="input min-h-20" placeholder="ERRADO. O prazo é de 10 dias, não 15…" />
      </div>
      <div>
        <label className="label" htmlFor="e-bizu">Bizu (opcional)</label>
        <input type="text" id="e-bizu" name="bizu" maxLength={1500} className="input" placeholder="Palavra-chave, macete, artigo de lei…" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="e-reason">Por que errei</label>
          <select id="e-reason" name="reason" className="input select" defaultValue="conteudo">
            {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="e-source">Fonte (opcional)</label>
          <input type="text" id="e-source" name="source" maxLength={120} className="input" placeholder="Ex.: Qconcursos Q3456789" />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="sm:w-auto">Salvar no caderno</SubmitButton>
    </form>
  );
}
