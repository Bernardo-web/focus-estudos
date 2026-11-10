/**
 * Desempenho em questões.
 * Cebraspe: cada errada anula uma certa (nota líquida = certas − erradas); em branco não conta.
 * Tradicional: nota = certas.
 */
export type Scoring = "cebraspe" | "tradicional";

export type Score = {
  answered: number;
  accuracy: number | null; // % de acerto entre as respondidas
  net: number;             // pontos líquidos
  netPct: number | null;   // nota líquida sobre o total de itens
};

export function score(total: number, correct: number, wrong: number, scoring: Scoring): Score {
  const answered = correct + wrong;
  const net = scoring === "cebraspe" ? correct - wrong : correct;
  return {
    answered,
    accuracy: answered > 0 ? Math.round((correct / answered) * 1000) / 10 : null,
    net,
    netPct: total > 0 ? Math.round((net / total) * 1000) / 10 : null,
  };
}

/** Datas das revisões espaçadas a partir do dia do estudo. */
export const REVIEW_STAGES = [1, 7, 30] as const;
