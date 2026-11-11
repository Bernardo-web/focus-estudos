import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, daysBetween, today, weekStart, weekday } from "../src/lib/dates.ts";
import { score } from "../src/lib/scoring.ts";

test("datas no fuso de Alagoas", () => {
  // 01:30 UTC de 11/11 ainda é 10/11 em Maceió (UTC-3)
  assert.equal(today(new Date("2026-11-11T01:30:00Z")), "2026-11-10");
  assert.equal(weekday("2026-11-10"), 2); // terça
  assert.equal(weekStart("2026-11-10"), "2026-11-09");
  assert.equal(weekStart("2026-11-15"), "2026-11-09"); // domingo fecha a semana
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-11-10", "2027-01-17"), 68);
});

test("nota Cebraspe: errada anula certa", () => {
  const s = score(120, 80, 30, "cebraspe");
  assert.equal(s.net, 50);
  assert.equal(s.netPct, 41.7);
  assert.equal(s.accuracy, 72.7);
  assert.equal(score(10, 7, 3, "tradicional").net, 7);
  assert.equal(score(0, 0, 0, "cebraspe").accuracy, null);
});

import { toAnki } from "../src/lib/anki.ts";
test("exporta para o Anki com tabulação e HTML seguro", () => {
  const out = toAnki([{ statement: "A <lei>\tdiz:\nX", answer: "Errado", bizu: null, tags: ["Focus", "Direito Constitucional", "pegadinha"] }]);
  const lines = out.trim().split("\n");
  assert.equal(lines[0], "#separator:tab");
  assert.equal(lines[4], "A &lt;lei&gt; diz:<br>X\tErrado\t\tFocus Direito_Constitucional pegadinha");
});

import { fmtMark, parseMark, passes } from "../src/lib/fitness.ts";
test("marcas do TAF", () => {
  assert.equal(parseMark("11:30", "seconds"), 690);
  assert.equal(parseMark("10min45", "seconds"), 645);
  assert.equal(parseMark("10,8", "seconds"), 10.8);
  assert.equal(parseMark("42", "reps"), 42);
  assert.equal(parseMark("", "reps"), null);
  assert.equal(fmtMark(690, "seconds"), "11min30s");
  assert.equal(fmtMark(660, "seconds"), "11min");
  assert.equal(fmtMark(10.8, "seconds"), "10,8 s");
  assert.ok(passes(645, 660, false));
  assert.ok(!passes(3, 4, true));
});
