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
