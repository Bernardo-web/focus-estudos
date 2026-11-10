"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, ClipboardPaste } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { guessSubject, parseQcStats, type QcRow } from "@/lib/qconcursos";
import { importQc } from "./actions";

type Subject = { id: string; name: string; short_name: string | null; color: string };

/**
 * Botão de favoritos: roda na página do Qconcursos (já logado), lê a tabela
 * "Estatísticas de Disciplinas" e o período do filtro, e abre o Focus com esses dados.
 * Nada é enviado a outro lugar: os dados viajam no endereço (#) e são lidos aqui no aparelho.
 */
function bookmarklet(origin: string) {
  const code = `(()=>{try{const rows=[...document.querySelectorAll('tr')].map(r=>[...r.cells].map(c=>c.innerText.trim()).join('\\t')).filter(l=>/\\d/.test(l)).join('\\n');const text=(rows.length>20?rows:document.body.innerText).slice(0,60000);const d=[...document.querySelectorAll('input[type=date]')].map(i=>i.value).filter(Boolean);window.open('${origin}/importar#qc='+encodeURIComponent(JSON.stringify({t:text,f:d[0]||'',u:d[1]||''})),'_blank')}catch(e){alert('Focus: abra a página Estatísticas de Disciplinas do Qconcursos e tente de novo.')}})()`;
  return `javascript:${encodeURIComponent(code)}`;
}

export function ImportWizard({
  examId,
  subjects,
  aliases,
  today,
  lastEnd,
}: {
  examId: string;
  subjects: Subject[];
  aliases: Record<string, string>;
  today: string;
  lastEnd: string | null;
}) {
  const [state, action] = useActionState(importQc, undefined);
  const [text, setText] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [fromBookmark, setFromBookmark] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // o React bloqueia "javascript:" em href; o link do favorito é montado direto no elemento
  useEffect(() => {
    linkRef.current?.setAttribute("href", bookmarklet(window.location.origin));
  }, []);

  // dados vindos do botão de favoritos
  useEffect(() => {
    const m = window.location.hash.match(/^#qc=(.+)$/);
    if (!m) return;
    try {
      const data = JSON.parse(decodeURIComponent(m[1])) as { t: string; f: string; u: string };
      setText(data.t ?? "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.f)) setFrom(data.f);
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.u)) setTo(data.u > today ? today : data.u);
      setFromBookmark(true);
    } catch {
      /* endereço inválido: segue no modo colar */
    }
    history.replaceState(null, "", window.location.pathname);
  }, [today]);

  const rows: QcRow[] = useMemo(() => parseQcStats(text), [text]);
  const subjectFor = (r: QcRow) => (r.name in choice ? choice[r.name] : guessSubject(r.name, subjects, aliases) ?? "");
  const payload = rows.map((r) => ({ name: r.name, subject_id: subjectFor(r) || null, correct: r.correct, wrong: r.wrong }));
  const selected = payload.filter((p) => p.subject_id);
  const totalSel = selected.reduce((a, p) => a + p.correct + p.wrong, 0);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;

  return (
    <div className="space-y-5">
      {!rows.length && (
        <>
          <section className="card space-y-3 p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Bookmark className="size-4" /> No computador: botão de favoritos</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              <li>
                Arraste este botão para a barra de favoritos do navegador:{" "}
                <a ref={linkRef} href="#" onClick={(e) => e.preventDefault()} className="chip cursor-grab bg-brand-700 px-3 py-1.5 text-white">
                  → Focus
                </a>
                <span className="muted block text-xs">(Se a barra não aparecer: Ctrl + Shift + B.)</span>
              </li>
              <li>No Qconcursos, abra <strong>Estatísticas de Disciplinas</strong>, escolha o período e clique em <strong>Filtrar</strong>.</li>
              <li>Clique no favorito <strong>→ Focus</strong>. Esta tela abre com tudo preenchido.</li>
            </ol>
            {lastEnd && <p className="muted text-xs">Sua última importação foi até {lastEnd.split("-").reverse().join("/")}. Comece o próximo período no dia seguinte.</p>}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="flex items-center gap-2 font-semibold"><ClipboardPaste className="size-4" /> No celular: copiar e colar</h2>
            <p className="text-sm">Na mesma página do Qconcursos, selecione a tabela de disciplinas (do nome da primeira até a última linha), copie e cole aqui:</p>
            <textarea
              className="input min-h-32 font-mono text-xs"
              placeholder={"Português\t30\t10\t40\t75%\nDireito Constitucional\t39\t21\t60\t65%"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {text.trim() && !rows.length && (
              <p className="text-sm text-bad">Não encontrei disciplinas nesse texto. Copie a tabela inteira, com as colunas de certas, erradas e total.</p>
            )}
          </section>
        </>
      )}

      {rows.length > 0 && (
        <form action={action} className="space-y-5">
          <input type="hidden" name="exam_id" value={examId} />
          <input type="hidden" name="rows" value={JSON.stringify(payload)} />

          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Período no Qconcursos</h2>
            {fromBookmark && <p className="muted text-xs">Datas lidas do filtro do Qconcursos. Confira se batem.</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="from">De</label><input id="from" name="from" type="date" className="input" value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><label className="label" htmlFor="to">Até</label><input id="to" name="to" type="date" className="input" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            {days > 7 && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Período de {days} dias: tudo entra no dia {to.split("-").reverse().join("/")}, então as metas e o gráfico dia a dia ficam concentrados nesse dia. Para metas certinhas, importe por dia ou por semana.
              </p>
            )}
          </section>

          <section className="card space-y-2 p-5">
            <h2 className="font-semibold">Disciplinas encontradas</h2>
            <p className="muted text-xs">Confira a matéria do Focus de cada uma. O Focus lembra sua escolha para as próximas vezes.</p>
            <ul className="divide-y divide-[var(--border)]">
              {rows.map((r) => {
                const sid = subjectFor(r);
                return (
                  <li key={r.name} className="space-y-1.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="muted shrink-0 tabular-nums">{r.correct}✓ {r.wrong}✗ · {Math.round((r.correct / r.total) * 100)}%</span>
                    </div>
                    <select
                      aria-label={`Matéria do Focus para ${r.name}`}
                      className={`input select py-2 text-sm ${sid ? "" : "border-amber-400"}`}
                      value={sid}
                      onChange={(e) => setChoice({ ...choice, [r.name]: e.target.value })}
                    >
                      <option value="">— Não importar —</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>

          <FormMessage state={state} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton className="sm:w-auto">Importar {totalSel} questões</SubmitButton>
            <button type="button" className="btn-ghost" onClick={() => { setText(""); setFromBookmark(false); }}>Cancelar</button>
          </div>
          <p className="muted text-xs">
            Dica: se você importa as questões daqui, não precisa digitar as mesmas questões ao registrar a sessão de estudo. Registre só o tempo.
          </p>
        </form>
      )}
    </div>
  );
}
