import type { SlotKind } from "./templates";
import type { Scoring } from "./scoring";

export type Exam = {
  id: string;
  org_key: string | null;
  name: string;
  role: string | null;
  board: string | null;
  exam_date: string | null;
  scoring: Scoring;
  color: string;
  crest_path: string | null;
  status: "active" | "archived";
  is_primary: boolean;
  goal_weekly_minutes: number;
  goal_weekly_questions: number;
  goal_accuracy: number;
  notes: string | null;
};

export type Subject = {
  id: string;
  exam_id: string;
  name: string;
  short_name: string | null;
  weight: number;
  question_count: number | null;
  color: string;
  position: number;
};

export type TopicStatus = "pending" | "seen" | "reviewed" | "mastered";
export type Topic = { id: string; subject_id: string; name: string; status: TopicStatus; position: number };

export type Slot = {
  id: string;
  exam_id: string;
  weekday: number;
  position: number;
  kind: SlotKind;
  subject_id: string | null;
  label: string | null;
  minutes: number | null;
};

export type Session = {
  id: string;
  exam_id: string;
  subject_id: string | null;
  topic_id: string | null;
  day: string;
  minutes: number;
  questions: number;
  correct: number;
  wrong: number;
  notes: string | null;
};

export type Review = {
  id: string;
  subject_id: string;
  topic_id: string | null;
  stage: 1 | 7 | 30;
  due_on: string;
  done_at: string | null;
};

export type Mock = {
  id: string;
  exam_id: string;
  title: string;
  scheduled_on: string;
  done: boolean;
  total_items: number | null;
  correct: number | null;
  wrong: number | null;
  essay_score: number | null;
  essay_max: number | null;
  notes: string | null;
};

export const EXAM_COLS =
  "id, org_key, name, role, board, exam_date, scoring, color, crest_path, status, is_primary, goal_weekly_minutes, goal_weekly_questions, goal_accuracy, notes";

export const TOPIC_STATUS: Record<TopicStatus, { label: string; cls: string }> = {
  pending: { label: "Não visto", cls: "bg-[var(--soft)] muted" },
  seen: { label: "Visto", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
  reviewed: { label: "Revisado", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
  mastered: { label: "Dominado", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" },
};
export const TOPIC_ORDER: TopicStatus[] = ["pending", "seen", "reviewed", "mastered"];
