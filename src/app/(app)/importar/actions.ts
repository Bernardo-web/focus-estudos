"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isISODate, today } from "@/lib/dates";

export type ImportState = { error?: string } | undefined;

type Row = { name: string; subject_id: string | null; correct: number; wrong: number };

export async function importQc(_: ImportState, form: FormData): Promise<ImportState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const examId = String(form.get("exam_id") ?? "");
  const from = String(form.get("from") ?? "");
  let to = String(form.get("to") ?? "");
  if (!isISODate(from) || !isISODate(to) || from > to) return { error: "Confira o período (de / até)." };
  if (to > today()) to = today();
  if (from > to) return { error: "O período não pode começar no futuro." };

  let rows: Row[];
  try {
    rows = (JSON.parse(String(form.get("rows") ?? "[]")) as Row[])
      .slice(0, 100)
      .map((r) => ({
        name: String(r.name ?? "").slice(0, 200),
        subject_id: r.subject_id ? String(r.subject_id) : null,
        correct: Math.max(0, Math.min(5000, Math.round(Number(r.correct)) || 0)),
        wrong: Math.max(0, Math.min(5000, Math.round(Number(r.wrong)) || 0)),
      }));
  } catch {
    return { error: "Não consegui ler os dados. Tente de novo." };
  }
  const chosen = rows.filter((r) => r.subject_id && r.correct + r.wrong > 0);
  if (chosen.length === 0) return { error: "Escolha a matéria do Focus de pelo menos uma disciplina." };

  // o mesmo período importado de novo substitui o anterior; períodos sobrepostos contariam questões em dobro
  const { data: overlaps } = await supabase
    .from("question_imports")
    .select("id, period_start, period_end")
    .eq("exam_id", examId)
    .lte("period_start", to)
    .gte("period_end", from);
  const same = (overlaps ?? []).filter((o) => o.period_start === from && o.period_end === to);
  const other = (overlaps ?? []).filter((o) => !same.includes(o));
  if (other.length) {
    const o = other[0];
    const f = (d: string) => d.split("-").reverse().join("/");
    return { error: `Esse período se sobrepõe a uma importação de ${f(o.period_start)} a ${f(o.period_end)}. Apague a antiga abaixo ou escolha datas que não se repitam, para não contar questões em dobro.` };
  }
  if (same.length) await supabase.from("question_imports").delete().in("id", same.map((o) => o.id));

  // somar disciplinas do Qconcursos que caíram na mesma matéria do Focus
  const bySubject = new Map<string, { correct: number; wrong: number }>();
  for (const r of chosen) {
    const cur = bySubject.get(r.subject_id!) ?? { correct: 0, wrong: 0 };
    bySubject.set(r.subject_id!, { correct: cur.correct + r.correct, wrong: cur.wrong + r.wrong });
  }
  const total = [...bySubject.values()].reduce((a, v) => a + v.correct + v.wrong, 0);

  const { data: imp, error } = await supabase
    .from("question_imports")
    .insert({ exam_id: examId, period_start: from, period_end: to, total })
    .select("id")
    .single();
  if (error || !imp) return { error: "Não foi possível importar. Confira se a atualização do banco (0002) foi aplicada." };

  const periodNote = from === to ? from.split("-").reverse().join("/") : `${from.split("-").reverse().join("/")} a ${to.split("-").reverse().join("/")}`;
  const { error: sErr } = await supabase.from("study_sessions").insert(
    [...bySubject.entries()].map(([subject_id, v]) => ({
      exam_id: examId,
      subject_id,
      day: to,
      minutes: 0,
      questions: Math.min(2000, v.correct + v.wrong),
      correct: Math.min(2000, v.correct),
      wrong: Math.min(2000, v.wrong),
      notes: `Qconcursos (${periodNote})`,
      import_id: imp.id,
    })),
  );
  if (sErr) {
    await supabase.from("question_imports").delete().eq("id", imp.id);
    return { error: "Não foi possível salvar as questões. Tente de novo." };
  }

  // lembrar "Português" → "Língua Portuguesa" para a próxima vez
  const aliases = chosen.map((r) => ({ alias: r.name, subject_id: r.subject_id }));
  await supabase.from("subject_aliases").upsert(aliases, { onConflict: "user_id,alias" });

  revalidatePath("/", "layout");
  redirect(`/importar?importado=${total}`);
}

export async function deleteImport(form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("question_imports").delete().eq("id", String(form.get("id") ?? ""));
  revalidatePath("/", "layout");
}
