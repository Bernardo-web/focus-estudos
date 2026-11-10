/**
 * Catálogo de órgãos para agilizar o cadastro do concurso (nome, sigla, cor e banca habitual).
 * O brasão de cada concurso é enviado pelo próprio usuário e fica guardado na conta dele:
 * vários órgãos (ex.: PRF, Decreto 10.438/2020) proíbem reproduzir seus símbolos sem autorização,
 * então o app não distribui essas imagens.
 */
export type Org = {
  key: string;
  short: string;
  name: string;
  color: string;
  group: "Federal" | "Polícia Militar" | "Polícia Civil" | "Bombeiros" | "Polícia Penal" | "Outros";
};

const UFS: [string, string][] = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
];

const federal: Org[] = [
  { key: "pf", short: "PF", name: "Polícia Federal", color: "#1f2937", group: "Federal" },
  { key: "prf", short: "PRF", name: "Polícia Rodoviária Federal", color: "#1d4ed8", group: "Federal" },
  { key: "ppf", short: "PPF", name: "Polícia Penal Federal", color: "#111827", group: "Federal" },
  { key: "pleg", short: "PLEG", name: "Polícia Legislativa (Câmara/Senado)", color: "#065f46", group: "Federal" },
  { key: "eb", short: "EB", name: "Exército Brasileiro", color: "#3f6212", group: "Federal" },
  { key: "mb", short: "MB", name: "Marinha do Brasil", color: "#1e3a8a", group: "Federal" },
  { key: "fab", short: "FAB", name: "Força Aérea Brasileira", color: "#0369a1", group: "Federal" },
];

const states: Org[] = UFS.flatMap(([uf, nome]) => {
  const l = uf.toLowerCase();
  const de = ["AL", "GO", "MG", "MT", "MS", "PE", "RO", "RR", "SC", "SE", "SP"].includes(uf) ? "de" : uf === "DF" ? "do" : ["BA", "PB"].includes(uf) ? "da" : "do";
  return [
    { key: `pm${l}`, short: `PM${uf}`, name: `Polícia Militar ${de} ${nome}`, color: "#1e3a8a", group: "Polícia Militar" as const },
    { key: `pc${l}`, short: `PC${uf}`, name: `Polícia Civil ${de} ${nome}`, color: "#111827", group: "Polícia Civil" as const },
    { key: `cbm${l}`, short: `CBM${uf}`, name: `Corpo de Bombeiros Militar ${de} ${nome}`, color: "#b91c1c", group: "Bombeiros" as const },
    { key: `pp${l}`, short: `PP${uf}`, name: `Polícia Penal ${de} ${nome}`, color: "#374151", group: "Polícia Penal" as const },
  ];
});

const others: Org[] = [
  { key: "gcm", short: "GCM", name: "Guarda Civil Municipal", color: "#0e7490", group: "Outros" },
  { key: "pci", short: "PCI", name: "Polícia Científica / Perícia", color: "#4c1d95", group: "Outros" },
  { key: "det", short: "DETRAN", name: "Agente de Trânsito / DETRAN", color: "#ca8a04", group: "Outros" },
];

export const ORGS: Org[] = [...federal, ...states, ...others];
export const ORG_GROUPS = ["Federal", "Polícia Militar", "Polícia Civil", "Bombeiros", "Polícia Penal", "Outros"] as const;

export function findOrg(key: string | null | undefined): Org | undefined {
  return key ? ORGS.find((o) => o.key === key) : undefined;
}

export const BOARDS = ["Cebraspe", "FGV", "Vunesp", "IBFC", "Instituto AOCP", "IDECAN", "Fundatec", "FCC", "Consulplan", "Instituto Consulplan", "IBADE", "Outra"];
