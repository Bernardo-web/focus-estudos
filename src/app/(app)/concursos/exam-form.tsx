"use client";

import { useActionState, useState } from "react";
import { ImagePlus } from "lucide-react";
import { BOARDS, ORGS, ORG_GROUPS, findOrg } from "@/lib/catalog";
import { TEMPLATES } from "@/lib/templates";
import type { Exam } from "@/lib/types";
import { Crest } from "@/components/crest";
import { ColorPicker } from "@/components/page-header";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { createExam, updateExam } from "./actions";

export function ExamForm({ exam, crestUrl }: { exam?: Exam; crestUrl?: string | null }) {
  const [state, action] = useActionState(exam ? updateExam : createExam, undefined);
  const [template, setTemplate] = useState(exam ? "" : TEMPLATES[0].key);
  const tpl = TEMPLATES.find((t) => t.key === template);

  const [orgKey, setOrgKey] = useState(exam?.org_key ?? tpl?.orgKey ?? "");
  const [name, setName] = useState(exam?.name ?? tpl?.name ?? "");
  const [color, setColor] = useState(exam?.color ?? tpl?.color ?? "#1e3a8a");
  const [preview, setPreview] = useState<string | null>(crestUrl ?? null);
  const [removeCrest, setRemoveCrest] = useState(false);

  function pickTemplate(key: string) {
    setTemplate(key);
    const t = TEMPLATES.find((x) => x.key === key);
    if (t) {
      setOrgKey(t.orgKey);
      setName(t.name);
      setColor(t.color);
    }
  }

  function pickOrg(key: string) {
    setOrgKey(key);
    const org = findOrg(key);
    if (org) {
      setName(org.short);
      setColor(org.color);
    }
  }

  // a chave força o formulário a recriar os campos sem estado quando o modelo muda
  const formKey = template || "blank";

  return (
    <form action={action} className="space-y-5" key={exam ? exam.id : formKey}>
      {exam && <input type="hidden" name="id" value={exam.id} />}

      {!exam && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Começar a partir de</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...TEMPLATES.map((t) => ({ key: t.key, title: t.title, desc: `${t.subjects.length} matérias + sua semana de estudos prontas` })),
              { key: "", title: "Concurso em branco", desc: "Você cadastra as matérias e a semana depois" }].map((o) => (
              <label key={o.key || "blank"} className={`cursor-pointer rounded-xl border p-3 ${template === o.key ? "border-brand-600 bg-brand-50 dark:bg-brand-800/20" : "border-[var(--border)]"}`}>
                <input type="radio" name="template" value={o.key} checked={template === o.key} onChange={() => pickTemplate(o.key)} className="sr-only" />
                <span className="block font-medium">{o.title}</span>
                <span className="muted text-xs">{o.desc}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-4">
          <Crest exam={{ name: name || "?", color, org_key: orgKey || null }} url={removeCrest ? null : preview} size={64} />
          <div className="min-w-0 flex-1 space-y-2">
            <label className="btn-ghost cursor-pointer text-sm">
              <ImagePlus className="size-4" /> {preview && !removeCrest ? "Trocar brasão" : "Enviar brasão"}
              <input
                type="file"
                name="crest"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPreview(URL.createObjectURL(f));
                    setRemoveCrest(false);
                  }
                }}
              />
            </label>
            {exam?.crest_path && (
              <label className="muted flex items-center gap-2 text-xs">
                <input type="checkbox" name="remove_crest" checked={removeCrest} onChange={(e) => setRemoveCrest(e.target.checked)} /> Remover brasão
              </label>
            )}
            <p className="muted text-xs">PNG, JPG ou WEBP de até 1 MB. Prefira imagem com fundo transparente.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="org_key">Órgão</label>
          <select id="org_key" name="org_key" className="input select" value={orgKey} onChange={(e) => pickOrg(e.target.value)}>
            <option value="">Outro / não listado</option>
            {ORG_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {ORGS.filter((o) => o.group === g).map((o) => (
                  <option key={o.key} value={o.key}>{o.short} — {o.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Nome curto</label>
            <input className="input" id="name" name="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: PRF" />
          </div>
          <div>
            <label className="label" htmlFor="role">Cargo</label>
            <input className="input" id="role" name="role" maxLength={80} defaultValue={exam?.role ?? tpl?.role ?? ""} placeholder="Ex.: Policial Rodoviário Federal" />
          </div>
          <div>
            <label className="label" htmlFor="board">Banca</label>
            <input className="input" id="board" name="board" list="boards" maxLength={60} defaultValue={exam?.board ?? tpl?.board ?? ""} />
            <datalist id="boards">{BOARDS.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="exam_date">Data da prova</label>
            <input className="input" id="exam_date" name="exam_date" type="date" defaultValue={exam?.exam_date ?? tpl?.examDate ?? ""} />
            <p className="muted mt-1 text-xs">Deixe em branco se o edital ainda não saiu.</p>
          </div>
        </div>

        <fieldset>
          <legend className="label">Correção da prova</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: "cebraspe", t: "Certo ou errado (Cebraspe)", d: "Uma errada anula uma certa" },
              { v: "tradicional", t: "Múltipla escolha", d: "Errar não desconta pontos" },
            ].map((o) => (
              <label key={o.v} className="flex cursor-pointer gap-2 rounded-xl border border-[var(--border)] p-3 has-[:checked]:border-brand-600">
                <input type="radio" name="scoring" value={o.v} defaultChecked={(exam?.scoring ?? tpl?.scoring ?? "cebraspe") === o.v} className="mt-1" />
                <span><span className="block text-sm font-medium">{o.t}</span><span className="muted text-xs">{o.d}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <ColorPicker key={color} value={color} onChange={setColor} />
      </section>

      {exam && (
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Metas da semana</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="goal_hours">Horas</label>
              <input className="input" id="goal_hours" name="goal_hours" type="number" min={0} max={168} defaultValue={Math.round(exam.goal_weekly_minutes / 60)} />
            </div>
            <div>
              <label className="label" htmlFor="goal_questions">Questões</label>
              <input className="input" id="goal_questions" name="goal_questions" type="number" min={0} max={10000} defaultValue={exam.goal_weekly_questions} />
            </div>
            <div>
              <label className="label" htmlFor="goal_accuracy">% acerto</label>
              <input className="input" id="goal_accuracy" name="goal_accuracy" type="number" min={0} max={100} defaultValue={exam.goal_accuracy} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="total_items">Itens na prova objetiva</label>
              <input className="input" id="total_items" name="total_items" type="number" min={1} max={1000} defaultValue={exam.total_items ?? ""} placeholder="Ex.: 120" />
            </div>
            <div>
              <label className="label" htmlFor="target_score">Nota de corte esperada</label>
              <input className="input" id="target_score" name="target_score" inputMode="decimal" defaultValue={exam.target_score ?? ""} placeholder={exam.scoring === "cebraspe" ? "Pontos líquidos, ex.: 70" : "Acertos, ex.: 60"} />
            </div>
          </div>
          <p className="muted -mt-2 text-xs">Com a nota de corte, o Focus mostra em cada simulado quanto falta e onde estão os pontos mais fáceis de ganhar.</p>
          <div>
            <label className="label" htmlFor="notes">Anotações</label>
            <textarea className="input min-h-24" id="notes" name="notes" maxLength={2000} defaultValue={exam.notes ?? ""} placeholder="Links do edital, requisitos, TAF..." />
          </div>
        </section>
      )}

      <FormMessage state={state} />
      <SubmitButton className="sm:w-auto">{exam ? "Salvar alterações" : "Criar concurso"}</SubmitButton>
    </form>
  );
}
