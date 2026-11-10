"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { score, type Scoring } from "@/lib/scoring";
import type { Topic } from "@/lib/types";
import { logSession } from "./actions";

type Timer = { running: boolean; startedAt: number | null; elapsed: number };
export const TIMER_KEY = "focus-timer";
const KEY = TIMER_KEY;

function readTimer(): Timer {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Timer;
  } catch {
    /* armazenamento indisponível: o cronômetro funciona só nesta aba */
  }
  return { running: false, startedAt: null, elapsed: 0 };
}
function saveTimer(t: Timer) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* ignora */
  }
}
const total = (t: Timer, now: number) => t.elapsed + (t.running && t.startedAt ? now - t.startedAt : 0);
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function StudyForm(props: {
  examId: string;
  scoring: Scoring;
  subjects: { id: string; name: string; color: string }[];
  topics: Topic[];
  slotId?: string;
  defaultSubject: string;
  plannedMinutes: number | null;
  today: string;
}) {
  const [state, action] = useActionState(logSession, undefined);
  const [timer, setTimer] = useState<Timer>({ running: false, startedAt: null, elapsed: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [subject, setSubject] = useState(props.defaultSubject);
  const [minutes, setMinutes] = useState<string>(props.plannedMinutes ? String(props.plannedMinutes) : "");
  const [q, setQ] = useState({ questions: "", correct: "", wrong: "" });

  useEffect(() => setTimer(readTimer()), []);
  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer.running]);

  const elapsed = total(timer, now);
  const update = (t: Timer) => {
    setTimer(t);
    saveTimer(t);
  };
  const start = () => update({ running: true, startedAt: Date.now(), elapsed: timer.elapsed });
  const pause = () => {
    const t = { running: false, startedAt: null, elapsed: total(timer, Date.now()) };
    update(t);
    setMinutes(String(Math.max(1, Math.round(t.elapsed / 60000))));
  };
  const reset = () => update({ running: false, startedAt: null, elapsed: 0 });

  const topics = useMemo(() => props.topics.filter((t) => t.subject_id === subject), [props.topics, subject]);
  const nq = Number(q.questions) || 0;
  const nc = Number(q.correct) || 0;
  const nw = Number(q.wrong) || 0;
  const s = score(nq, nc, nw, props.scoring);

  return (
    <div className="space-y-5">
      <section className="card flex flex-col items-center gap-4 p-6">
        <p className="font-mono text-5xl font-bold tabular-nums" aria-live="off">{clock(elapsed)}</p>
        <div className="flex gap-2">
          {timer.running ? (
            <button type="button" onClick={pause} className="btn-primary"><Pause className="size-4" /> Pausar</button>
          ) : (
            <button type="button" onClick={start} className="btn-primary"><Play className="size-4" /> {elapsed ? "Continuar" : "Iniciar"}</button>
          )}
          <button type="button" onClick={reset} className="btn-ghost" disabled={!elapsed}><RotateCcw className="size-4" /> Zerar</button>
        </div>
        <p className="muted text-center text-xs">O cronômetro continua contando mesmo se você sair desta tela. Ao pausar, o tempo vai para o registro.</p>
      </section>

      <form action={action} className="card space-y-4 p-5">
        <h2 className="font-semibold">Registrar sessão</h2>
        <input type="hidden" name="exam_id" value={props.examId} />
        {props.slotId && <input type="hidden" name="slot_id" value={props.slotId} />}

        <div>
          <label className="label" htmlFor="subject_id">Matéria</label>
          <select id="subject_id" name="subject_id" className="input select" required value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="" disabled>Escolha…</option>
            {props.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {topics.length > 0 && (
          <div>
            <label className="label" htmlFor="topic_id">Tópico (opcional)</label>
            <select id="topic_id" name="topic_id" className="input select" defaultValue="">
              <option value="">—</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label className="muted mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="mark_seen" defaultChecked /> Marcar tópico como visto
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="minutes">Minutos</label>
            <input id="minutes" name="minutes" type="number" min={0} max={1440} className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="day">Dia</label>
            <input id="day" name="day" type="date" max={props.today} defaultValue={props.today} className="input" />
          </div>
        </div>

        <fieldset className="soft space-y-3 rounded-xl p-3">
          <legend className="sr-only">Questões</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["questions", "correct", "wrong"] as const).map((k) => (
              <div key={k}>
                <label className="label text-xs" htmlFor={k}>{k === "questions" ? "Questões" : k === "correct" ? "Certas" : "Erradas"}</label>
                <input id={k} name={k} type="number" min={0} max={2000} inputMode="numeric" className="input" value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          {nq > 0 && (
            <p className="text-sm">
              {s.accuracy !== null && <>Acerto: <strong>{s.accuracy}%</strong></>}
              {props.scoring === "cebraspe" && <> · Líquido: <strong>{s.net}</strong> ({nq - nc - nw} em branco)</>}
              {nc + nw > nq && <span className="text-bad"> · certas + erradas passou do total</span>}
            </p>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="notes">Anotações (opcional)</label>
          <textarea id="notes" name="notes" maxLength={1000} className="input min-h-20" placeholder="Bizus, dúvidas, onde parei…" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="schedule_reviews" defaultChecked /> Agendar revisões (amanhã, em 7 e em 30 dias)
        </label>

        <FormMessage state={state} />
        <SubmitButton>Salvar sessão</SubmitButton>
      </form>
    </div>
  );
}
