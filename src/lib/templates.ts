/**
 * Modelos prontos de concurso: matérias do edital + semana de estudos.
 * Ao criar um concurso a partir de um modelo, tudo é copiado para a conta da pessoa
 * e pode ser editado à vontade depois.
 */
export type SlotKind =
  | "subject" | "questions" | "review" | "week_review"
  | "mock" | "error_analysis" | "essay" | "log" | "custom";

export const SLOT_LABELS: Record<SlotKind, string> = {
  subject: "Matéria",
  questions: "Questões",
  review: "Revisão",
  week_review: "Revisão geral da semana",
  mock: "Simulado",
  error_analysis: "Analisar os erros",
  essay: "Produzir uma redação",
  log: "Registrar o desempenho da semana",
  custom: "Outra tarefa",
};

export type TemplateSubject = { key: string; name: string; short?: string; color: string; topics?: string[] };
export type TemplateSlot = { weekday: number; kind: SlotKind; subject?: string; minutes?: number; label?: string };

export type ExamTemplate = {
  key: string;
  title: string;
  orgKey: string;
  name: string;
  role: string;
  board: string;
  examDate: string | null;
  scoring: "cebraspe" | "tradicional";
  color: string;
  goals: { minutes: number; questions: number; accuracy: number };
  subjects: TemplateSubject[];
  slots: TemplateSlot[];
};

const day = (weekday: number, a: string, b: string): TemplateSlot[] => [
  { weekday, kind: "subject", subject: a, minutes: 90 },
  { weekday, kind: "subject", subject: b, minutes: 90 },
  { weekday, kind: "questions" },
  { weekday, kind: "review" },
];

export const PMAL_SOLDADO: ExamTemplate = {
  key: "pmal-soldado-2026",
  title: "PMAL 2026 — Soldado (Cebraspe)",
  orgKey: "pmal",
  name: "PMAL",
  role: "Soldado",
  board: "Cebraspe",
  examDate: "2027-01-17",
  scoring: "cebraspe",
  color: "#1e3a8a",
  goals: { minutes: 1080, questions: 150, accuracy: 75 },
  subjects: [
    { key: "port", name: "Língua Portuguesa", short: "Português", color: "#2563eb" },
    { key: "mat", name: "Matemática", color: "#7c3aed" },
    { key: "info", name: "Noções de Informática", short: "Informática", color: "#0891b2",
      topics: ["Windows", "Pacote Office", "Redes de computadores", "Navegadores", "Correio eletrônico (e-mail)", "Computação em nuvem", "Segurança da informação e backup"] },
    { key: "al", name: "Conhecimentos do Estado de Alagoas", short: "Alagoas", color: "#16a34a",
      topics: ["História de Alagoas", "Geografia de Alagoas", "Economia de Alagoas"] },
    { key: "atual", name: "Atualidades (redação)", short: "Atualidades", color: "#ca8a04" },
    { key: "leg", name: "Legislação PMAL", short: "Leg. PMAL", color: "#1e3a8a",
      topics: ["Estatuto dos Policiais Militares de Alagoas", "Regulamento Disciplinar (RDPMAL)"] },
    { key: "extra", name: "Legislação Extravagante", short: "Extravagante", color: "#475569",
      topics: ["Código Penal — parte geral", "Leis penais especiais"] },
    { key: "adm", name: "Direito Administrativo", short: "Administrativo", color: "#ea580c" },
    { key: "const", name: "Direito Constitucional", short: "Constitucional", color: "#dc2626" },
    { key: "pp", name: "Direito Processual Penal", short: "Proc. Penal", color: "#db2777",
      topics: ["Inquérito policial", "Ação penal"] },
    { key: "pm", name: "Direito Penal Militar", short: "Penal Militar", color: "#0f766e" },
    { key: "ppm", name: "Direito Processual Penal Militar", short: "Proc. Penal Militar", color: "#115e59" },
    { key: "dh", name: "Direitos Humanos", short: "D. Humanos", color: "#9333ea" },
  ],
  slots: [
    ...day(1, "port", "const"),
    ...day(2, "mat", "pm"),
    ...day(3, "adm", "extra"),
    ...day(4, "pp", "info"),
    ...day(5, "leg", "ppm"),
    { weekday: 6, kind: "subject", subject: "al", minutes: 90 },
    { weekday: 6, kind: "subject", subject: "dh", minutes: 90 },
    { weekday: 6, kind: "review" },
    { weekday: 6, kind: "week_review" },
    { weekday: 0, kind: "mock", label: "Simulado completo PMAL" },
    { weekday: 0, kind: "error_analysis" },
    { weekday: 0, kind: "essay", subject: "atual" },
    { weekday: 0, kind: "log" },
  ],
};

export const TEMPLATES: ExamTemplate[] = [PMAL_SOLDADO];
export const findTemplate = (key: string) => TEMPLATES.find((t) => t.key === key);
