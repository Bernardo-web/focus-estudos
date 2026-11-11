"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";
import { isISODate } from "@/lib/dates";
import { findOrg } from "@/lib/catalog";
import { findTemplate } from "@/lib/templates";

export type ExamState = { error?: string; ok?: string } | undefined;

const HEX = /^#[0-9a-fA-F]{6}$/;
const MIME_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function str(form: FormData, key: string, max: number): string | null {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
}
function int(form: FormData, key: string, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(form.get(key)));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function readExamFields(form: FormData) {
  const name = str(form, "name", 80);
  const examDate = str(form, "exam_date", 10);
  const color = String(form.get("color") ?? "");
  const scoring = form.get("scoring") === "tradicional" ? "tradicional" : "cebraspe";
  const orgKey = str(form, "org_key", 40);
  return {
    error: !name ? "Informe o nome do concurso." : examDate && !isISODate(examDate) ? "Data da prova inválida." : undefined,
    row: {
      name: name ?? "",
      org_key: findOrg(orgKey) ? orgKey : null,
      role: str(form, "role", 80),
      board: str(form, "board", 60),
      exam_date: examDate,
      scoring,
      color: HEX.test(color) ? color : "#1e3a8a",
    },
  };
}

async function uploadCrest(supabase: SupabaseClient, userId: string, examId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return { path: null as string | null };
  const ext = MIME_EXT[file.type];
  if (!ext) return { error: "O brasão precisa ser PNG, JPG ou WEBP." };
  if (file.size > 1024 * 1024) return { error: "O brasão pode ter no máximo 1 MB." };
  const path = `${userId}/${examId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("crests").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: "Não foi possível enviar o brasão." };
  return { path };
}

export async function createExam(_: ExamState, form: FormData): Promise<ExamState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const template = findTemplate(String(form.get("template") ?? ""));
  const { error: invalid, row } = readExamFields(form);
  if (invalid) return { error: invalid };

  const { count } = await supabase.from("exams").select("id", { count: "exact", head: true });
  const goals = template?.goals;
  const { data: exam, error } = await supabase
    .from("exams")
    .insert({
      ...row,
      is_primary: (count ?? 0) === 0,
      ...(goals && { goal_weekly_minutes: goals.minutes, goal_weekly_questions: goals.questions, goal_accuracy: goals.accuracy }),
      ...(template?.totalItems && { total_items: template.totalItems }),
    })
    .select("id")
    .single();
  if (error || !exam) return { error: "Não foi possível criar o concurso." };

  const crest = await uploadCrest(supabase, user.id, exam.id, form.get("crest"));
  if (crest.path) await supabase.from("exams").update({ crest_path: crest.path }).eq("id", exam.id);

  if (template) {
    const { data: subjects, error: subjErr } = await supabase
      .from("subjects")
      .insert(template.subjects.map((s, i) => ({ exam_id: exam.id, name: s.name, short_name: s.short ?? null, color: s.color, position: i })))
      .select("id, name");
    if (subjErr || !subjects) return { error: "O concurso foi criado, mas as matérias do modelo falharam. Tente adicioná-las no Edital." };
    const idByKey = new Map(template.subjects.map((s) => [s.key, subjects.find((r) => r.name === s.name)?.id]));

    const topics = template.subjects.flatMap((s) =>
      (s.topics ?? []).map((name, i) => ({ subject_id: idByKey.get(s.key)!, name, position: i })),
    );
    if (topics.length) await supabase.from("topics").insert(topics);

    const pos = new Map<number, number>();
    const slots = template.slots.map((s) => {
      const p = pos.get(s.weekday) ?? 0;
      pos.set(s.weekday, p + 1);
      return {
        exam_id: exam.id,
        weekday: s.weekday,
        position: p,
        kind: s.kind,
        subject_id: s.subject ? idByKey.get(s.subject) : null,
        label: s.label ?? null,
        minutes: s.minutes ?? null,
      };
    });
    await supabase.from("week_slots").insert(slots);
  }

  revalidatePath("/", "layout");
  if (crest.error) redirect(`/concursos/${exam.id}?aviso=${encodeURIComponent(crest.error)}`);
  redirect(`/concursos/${exam.id}`);
}

export async function updateExam(_: ExamState, form: FormData): Promise<ExamState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  const id = String(form.get("id") ?? "");
  const { error: invalid, row } = readExamFields(form);
  if (invalid) return { error: invalid };

  const update: Record<string, unknown> = {
    ...row,
    goal_weekly_minutes: int(form, "goal_hours", 0, 168, 18) * 60,
    goal_weekly_questions: int(form, "goal_questions", 0, 10000, 150),
    goal_accuracy: int(form, "goal_accuracy", 0, 100, 75),
    notes: str(form, "notes", 2000),
    total_items: str(form, "total_items", 5) ? int(form, "total_items", 1, 1000, 120) : null,
    target_score: (() => {
      const v = Number(String(form.get("target_score") ?? "").trim().replace(",", "."));
      return String(form.get("target_score") ?? "").trim() && Number.isFinite(v) ? Math.min(Math.max(v, 0), 9999) : null;
    })(),
  };

  const { data: current } = await supabase.from("exams").select("crest_path").eq("id", id).single();
  if (!current) return { error: "Concurso não encontrado." };

  const crest = await uploadCrest(supabase, user.id, id, form.get("crest"));
  if (crest.error) return { error: crest.error };
  const removeCrest = form.get("remove_crest") === "on";
  if (crest.path || removeCrest) {
    update.crest_path = crest.path;
    if (current.crest_path) await supabase.storage.from("crests").remove([current.crest_path]);
  }

  const { error } = await supabase.from("exams").update(update).eq("id", id);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/", "layout");
  return { ok: "Concurso atualizado." };
}

export async function setPrimary(form: FormData) {
  const { supabase } = await getUser();
  await supabase.rpc("set_primary_exam", { p_exam: String(form.get("id") ?? "") });
  revalidatePath("/", "layout");
}

export async function toggleArchive(form: FormData) {
  const { supabase } = await getUser();
  const id = String(form.get("id") ?? "");
  const archive = form.get("archive") === "1";
  await supabase.from("exams").update({ status: archive ? "archived" : "active", ...(archive && { is_primary: false }) }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteExam(form: FormData) {
  const { supabase } = await getUser();
  const id = String(form.get("id") ?? "");
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "EXCLUIR") redirect(`/concursos/${id}?aviso=Digite+EXCLUIR+para+confirmar.`);
  const { data } = await supabase.from("exams").select("crest_path").eq("id", id).single();
  if (data?.crest_path) await supabase.storage.from("crests").remove([data.crest_path]);
  await supabase.from("exams").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/concursos");
}
