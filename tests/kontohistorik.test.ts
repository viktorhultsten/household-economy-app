import assert from "node:assert/strict";
import test from "node:test";

import {
  beloppPaNormalSida,
  byggMatris,
  cellSumma,
  forvaldPeriod,
  kortDatum,
  manadAv,
  manadDelar,
  manadEtikett,
  manaderMellan,
  periodDatum,
  tolkaUrval,
  urvalTillSok,
} from "../app/lib/kontohistorik";

test("månaderna i en period går över årsskiften", () => {
  assert.deepEqual(manaderMellan("2025-11", "2026-02"), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.deepEqual(manaderMellan("2026-05", "2026-05"), ["2026-05"]);
});

test("etiketter för månad och datum", () => {
  assert.equal(manadEtikett("2026-01"), "jan-26");
  assert.equal(manadEtikett("2025-05"), "maj-25");
  assert.equal(kortDatum("2026-09-05"), "5/9");
});

test("förvalet är rullande tolv månader till och med innevarande månad", () => {
  assert.deepEqual(forvaldPeriod("2026-10-02"), { fran: "2025-11", till: "2026-10" });
  assert.deepEqual(forvaldPeriod("2026-01-31"), { fran: "2025-02", till: "2026-01" });
});

test("månad till och från år och månad", () => {
  assert.equal(manadAv(2026, 3), "2026-03");
  assert.deepEqual(manadDelar("2025-11"), { ar: 2025, manad: 11 });
});

test("periodens första och sista dag", () => {
  assert.deepEqual(periodDatum("2025-11", "2026-02"), { start: "2025-11-01", slut: "2026-02-28" });
});

test("urvalet ur URL:en faller tillbaka på de senaste 12 månaderna", () => {
  assert.deepEqual(tolkaUrval({}, "2026-10-02"), { kontoIds: [], fran: "2025-11", till: "2026-10" });
  assert.deepEqual(tolkaUrval({ konton: "3,x,3,7,-1", fran: "2026-13", till: "2026-06" }, "2026-10-02"), {
    kontoIds: [3, 7],
    fran: "2025-11",
    till: "2026-06",
  });
});

test("en omvänd period vänds rätt", () => {
  assert.deepEqual(tolkaUrval({ fran: "2026-06", till: "2026-01" }, "2026-10-02"), {
    kontoIds: [],
    fran: "2026-01",
    till: "2026-06",
  });
});

test("urvalet som URL-parametrar håller kommatecknen läsbara", () => {
  const sok = urvalTillSok({ kontoIds: [3, 7], fran: "2025-11", till: "2026-10" });
  assert.equal(sok, "konton=3,7&fran=2025-11&till=2026-10");
  assert.deepEqual(tolkaUrval(Object.fromEntries(new URLSearchParams(sok)), "2026-10-02"), {
    kontoIds: [3, 7],
    fran: "2025-11",
    till: "2026-10",
  });
});

test("beloppet följer kontots normala sida", () => {
  assert.equal(beloppPaNormalSida("Utgift", 151, 0), 151);
  assert.equal(beloppPaNormalSida("Utgift", 0, 50), -50);
  assert.equal(beloppPaNormalSida("Tillgång", 100, 0), 100);
  assert.equal(beloppPaNormalSida("Intäkt", 0, 25000), 25000);
  assert.equal(beloppPaNormalSida("Skuld", 0.1, 0.3), 0.2);
});

test("matrisen grupperar per konto och månad och sorterar på datum", () => {
  const matris = byggMatris([
    { accountId: 1, verifikatId: 12, date: "2026-02-20", text: "LF UPPSALA", belopp: 151 },
    { accountId: 1, verifikatId: 11, date: "2026-02-03", text: "AGRIA", belopp: 220 },
    { accountId: 1, verifikatId: 10, date: "2026-01-28", text: "LF UPPSALA", belopp: 151 },
    { accountId: 2, verifikatId: 13, date: "2026-02-28", text: "LF UPPSALA", belopp: 220 },
  ]);

  assert.deepEqual(
    matris.get(1)?.get("2026-02")?.map((p) => p.verifikatId),
    [11, 12]
  );
  assert.equal(matris.get(1)?.get("2026-01")?.length, 1);
  assert.equal(matris.get(2)?.get("2026-01"), undefined);
});

test("cellens summa räknas i ören", () => {
  assert.equal(cellSumma([{ belopp: 0.1 }, { belopp: 0.2 }]), 0.3);
  assert.equal(cellSumma([{ belopp: 220 }, { belopp: -50.5 }]), 169.5);
});
