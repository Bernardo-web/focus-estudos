import { test } from "node:test";
import assert from "node:assert/strict";
import { guessSubject, parseQcStats } from "../src/lib/qconcursos.ts";

const copied = `Estatísticas de Disciplinas
\tCertas\tErradas\tTotal\t%\t
Português\t30\t10\t40\t75%\tzerar
Direito Administrativo\t17\t9\t26\t65%\tzerar
Direito Constitucional\t39\t21\t60\t65%\tzerar
Direito Penal\t23\t9\t32\t72%\tzerar
Direito Processual Penal\t33\t16\t49\t67%\tzerar
Noções de Informática\t40\t15\t55\t73%\tzerar
Direito Processual Penal Militar\t12\t4\t16\t75%\tzerar
Direitos Humanos\t22\t7\t29\t76%\tzerar
História e Geografia de Estados\t4\t2\t6\t67%\tzerar`;

const cells = `Estatísticas de Disciplinas
Certas
Erradas
Total
%
Português
30
10
40
75%
zerar
Direito Processual Pen...
12
4
16
75%
zerar
Direitos Humanos
22
7
29
76%
zerar`;

test("lê a tabela copiada (uma linha por disciplina)", () => {
  const r = parseQcStats(copied);
  assert.equal(r.length, 9);
  assert.deepEqual(r[0], { name: "Português", correct: 30, wrong: 10, total: 40 });
  assert.equal(r[6].name, "Direito Processual Penal Militar");
});

test("lê o texto da página com uma célula por linha", () => {
  const r = parseQcStats(cells);
  assert.equal(r.length, 3);
  assert.equal(r[1].name, "Direito Processual Pen…");
  assert.equal(r[2].total, 29);
});

test("ignora linhas incoerentes", () => {
  assert.equal(parseQcStats("Português 30 10 99 75%").length, 0);
});

const subjects = [
  "Língua Portuguesa", "Matemática", "Noções de Informática", "Conhecimentos do Estado de Alagoas",
  "Legislação PMAL", "Legislação Extravagante", "Direito Administrativo", "Direito Constitucional",
  "Direito Processual Penal", "Direito Penal Militar", "Direito Processual Penal Militar", "Direitos Humanos",
].map((name, i) => ({ id: String(i), name, short_name: null }));
const name = (q: string, aliases: Record<string, string> = {}) => {
  const id = guessSubject(q, subjects, aliases);
  return id === null ? null : subjects[+id].name;
};

test("sugere a matéria certa", () => {
  assert.equal(name("Português"), "Língua Portuguesa");
  assert.equal(name("Direito Constitucional"), "Direito Constitucional");
  assert.equal(name("Noções de Informática"), "Noções de Informática");
  assert.equal(name("Direito Processual Penal Militar"), "Direito Processual Penal Militar");
  assert.equal(name("Direito Processual Penal"), "Direito Processual Penal");
  assert.equal(name("História e Geografia de Estados"), "Conhecimentos do Estado de Alagoas");
  assert.equal(name("Direito Processual Pen…"), null); // ambíguo: o usuário escolhe
  assert.equal(name("Direito Penal"), null); // pode ser Penal Militar ou Extravagante
  assert.equal(name("Direito Penal", { "Direito Penal": "5" }), "Legislação Extravagante");
});
