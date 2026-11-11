/** Exporta o caderno de erros no formato de importação do Anki (texto separado por tabulação). */
export type AnkiNote = { statement: string; answer: string; bizu: string | null; tags: string[] };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");

export const tag = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function toAnki(notes: AnkiNote[]): string {
  const head = ["#separator:tab", "#html:true", "#columns:Frente\tVerso\tBizu\tTags", "#tags column:4"];
  const lines = notes.map((n) => [esc(n.statement), esc(n.answer), esc(n.bizu ?? ""), n.tags.map(tag).filter(Boolean).join(" ")].join("\t"));
  return [...head, ...lines].join("\n") + "\n";
}

export const REASONS: Record<string, string> = {
  conteudo: "Não sabia o conteúdo",
  interpretacao: "Interpretação",
  pegadinha: "Pegadinha da banca",
  desatencao: "Falta de atenção",
  chute: "Chutei",
  outro: "Outro",
};
