"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { score, type Scoring } from "@/lib/scoring";
import type { Topic } from "@/lib/types";
import { logSession } from "./actions";

type Timer = { running: boolean; startedAt: number | null; elapsed: number; mode?: "free" | "pomodoro"; focus?: number; rest?: number };
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

/** Pomodoro: ciclos de foco + pausa sobre o tempo total; só o foco conta como estudo. */
function pomodoro(ms: number, focusMin: number, restMin: number) {
  const f = focusMin * 60000;
  const cycle = f + restMin * 60000;
  const pos = ms % cycle;
  const done = Math.floor(ms / cycle);
  const inFocus = pos < f;
  return {
    inFocus,
    cycle: done + 1,
    focusMs: done * f + Math.min(pos, f),
    leftMs: inFocus ? f - pos : cycle - pos,
  };
}

function beep(times = 2) {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t);
      o.stop(t + 0.3);
    }
  } catch {
    /* sem áudio */
  }
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.getRegistration().then((reg) => {
        if (reg) reg.showNotification(title, { body, icon: "/icon-192.png", tag: "focus-pomodoro" });
        else new Notification(title, { body });
      });
    }
  } catch {
    /* ignora */
  }
}

const PRESETS: [number, number][] = [[25, 5], [50, 10], [90, 15]];

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
  const mode = timer.mode ?? "free";
  const focusMin = timer.focus ?? 50;
  const restMin = timer.rest ?? 10;
  const pomo = pomodoro(elapsed, focusMin, restMin);
  const studiedMs = mode === "pomodoro" ? pomo.focusMs : elapsed;

  // avisa na troca de foco ↔ pausa
  const lastPhase = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "pomodoro" || !timer.running) {
      lastPhase.current = null;
      return;
    }
    const phase = `${pomo.cycle}-${pomo.inFocus}`;
    if (lastPhase.current && lastPhase.current !== phase) {
      beep(pomo.inFocus ? 3 : 2);
      notify(pomo.inFocus ? "Hora de voltar ao foco" : "Pausa!", pomo.inFocus ? `Ciclo ${pomo.cycle}: ${focusMin} min de foco.` : `${restMin} min para descansar.`);
    }
    lastPhase.current = phase;
  }, [mode, timer.running, pomo.cycle, pomo.inFocus, focusMin, restMin]);
  const update = (t: Timer) => {
    setTimer(t);
    saveTimer(t);
  };
  const start = () => {
    if (mode === "pomodoro" && "Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    update({ ...timer, running: true, startedAt: Date.now(), elapsed: timer.elapsed });
  };
  const pause = () => {
    const t: Timer = { ...timer, running: false, startedAt: null, elapsed: total(timer, Date.now()) };
    update(t);
    const ms = (t.mode ?? "free") === "pomodoro" ? pomodoro(t.elapsed, t.focus ?? 50, t.rest ?? 10).focusMs : t.elapsed;
    setMinutes(String(Math.max(1, Math.round(ms / 60000))));
  };
  const reset = () => update({ ...timer, running: false, startedAt: null, elapsed: 0 });
  const setMode = (m: "free" | "pomodoro", f = focusMin, r = restMin) => update({ ...timer, mode: m, focus: f, rest: r });

  const topics = useMemo(() => props.topics.filter((t) => t.subject_id === subject), [props.topics, subject]);
  const nq = Number(q.questions) || 0;
  const nc = Number(q.correct) || 0;
  const nw = Number(q.wrong) || 0;
  const s = score(nq, nc, nw, props.scoring);

  return (
    <div className="space-y-5">
      <section className="card flex flex-col items-center gap-4 p-6">
        <div className="soft flex rounded-xl p-1 text-sm" role="tablist" aria-label="Modo do cronômetro">
          {(["free", "pomodoro"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={timer.running}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${mode === m ? "bg-[var(--surface)] shadow-sm" : "muted"}`}
            >
              {m === "free" ? <TimerIcon className="size-4" /> : <Coffee className="size-4" />}
              {m === "free" ? "Livre" : "Pomodoro"}
            </button>
          ))}
        </div>

        {mode === "pomodoro" && (
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map(([f, r]) => (
              <button
                key={f}
                type="button"
                disabled={timer.running}
                onClick={() => setMode("pomodoro", f, r)}
                className={`chip ${focusMin === f && restMin === r ? "bg-brand-700 text-white" : ""}`}
              >
                {f}/{r} min
              </button>
            ))}
          </div>
        )}

        {mode === "pomodoro" ? (
          <>
            <p className={`text-sm font-semibold ${pomo.inFocus ? "text-brand-700 dark:text-brand-500" : "text-good"}`}>
              {pomo.inFocus ? `Foco · ciclo ${pomo.cycle}` : "Pausa"}
            </p>
            <p className="font-mono text-5xl font-bold tabular-nums">{clock(pomo.leftMs)}</p>
            <p className="muted text-sm">Estudado: <strong>{clock(studiedMs)}</strong></p>
          </>
        ) : (
          <p className="font-mono text-5xl font-bold tabular-nums" aria-live="off">{clock(elapsed)}</p>
        )}

        <div className="flex gap-2">
          {timer.running ? (
            <button type="button" onClick={pause} className="btn-primary"><Pause className="size-4" /> Pausar</button>
          ) : (
            <button type="button" onClick={start} className="btn-primary"><Play className="size-4" /> {elapsed ? "Continuar" : "Iniciar"}</button>
          )}
          <button type="button" onClick={reset} className="btn-ghost" disabled={!elapsed}><RotateCcw className="size-4" /> Zerar</button>
        </div>
        <p className="muted text-center text-xs">
          {mode === "pomodoro"
            ? "Toca um aviso na troca entre foco e pausa. Só o tempo de foco vai para o registro."
            : "O cronômetro continua contando mesmo se você sair desta tela. Ao pausar, o tempo vai para o registro."}
        </p>
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
          {nw > 0 && (
            <a href={`/erros${subject ? `?materia=${subject}` : ""}`} target="_blank" rel="noopener" className="block text-sm font-medium text-brand-700 dark:text-brand-500">
              Errou {nw}? Anote no caderno de erros →
            </a>
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
