import assert from "node:assert/strict";
import test from "node:test";

import {
  arGiltigtDatum,
  dagarIManad,
  forstaIManad,
  idag,
  laggTillDagar,
  laggTillManader,
  sistaIManad,
  veckodag,
} from "../app/lib/datum";

test("giltiga och ogiltiga datum", () => {
  assert.equal(arGiltigtDatum("2026-09-05"), true);
  assert.equal(arGiltigtDatum("2024-02-29"), true);
  assert.equal(arGiltigtDatum("2026-02-29"), false);
  assert.equal(arGiltigtDatum("2026-13-01"), false);
  assert.equal(arGiltigtDatum("2026-9-5"), false);
  assert.equal(arGiltigtDatum(""), false);
});

test("månadens första och sista dag", () => {
  assert.equal(forstaIManad("2026-09-05"), "2026-09-01");
  assert.equal(sistaIManad("2026-09-05"), "2026-09-30");
  assert.equal(sistaIManad("2024-02-10"), "2024-02-29");
  assert.equal(dagarIManad(2026, 12), 31);
});

test("lägga till månader begränsar dagen och går över årsskiften", () => {
  assert.equal(laggTillManader("2026-01-31", 1), "2026-02-28");
  assert.equal(laggTillManader("2026-11-15", 3), "2027-02-15");
  assert.equal(laggTillManader("2026-01-15", -1), "2025-12-15");
});

test("lägga till dagar över månads- och årsskiften", () => {
  assert.equal(laggTillDagar("2026-12-31", 1), "2027-01-01");
  assert.equal(laggTillDagar("2026-03-01", -1), "2026-02-28");
});

test("veckodag med måndag först", () => {
  assert.equal(veckodag("2026-09-07"), 0); // måndag
  assert.equal(veckodag("2026-09-06"), 6); // söndag
});

test("i dag är den lokala kalenderdagen", () => {
  assert.equal(idag(new Date(2026, 8, 5, 0, 30)), "2026-09-05");
  assert.equal(idag(new Date(2026, 8, 5, 23, 30)), "2026-09-05");
});
