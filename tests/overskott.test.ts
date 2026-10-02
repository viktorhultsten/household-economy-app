import assert from "node:assert/strict";
import test from "node:test";

import {
  ackumuleradeManader,
  avvikelse,
  bundetPerKonto,
  rad,
  summa,
  summaFor,
  tolvManaderTill,
} from "../app/lib/overskott";

const BOLAN = 1;
const PENSION = 2;

test("överskottet är resultatet minus allt bundet sparande", () => {
  const r = rad({ intakter: 45000, utgifter: 38000, bundet: { [BOLAN]: 6000, [PENSION]: 2000 } });
  assert.equal(r.resultat, 7000);
  assert.equal(r.bundetTotalt, 8000);
  assert.equal(r.overskott, -1000);
});

test("utan bundet sparande är överskottet lika med resultatet", () => {
  const r = rad({ intakter: 100, utgifter: 40, bundet: {} });
  assert.equal(r.bundetTotalt, 0);
  assert.equal(r.overskott, 60);
});

test("summan räknar i ören per konto", () => {
  assert.deepEqual(
    summa([
      { intakter: 0.1, utgifter: 0.2, bundet: { [BOLAN]: 0.1 } },
      { intakter: 0.2, utgifter: 0.1, bundet: { [BOLAN]: 0.2, [PENSION]: 5 } },
    ]),
    { intakter: 0.3, utgifter: 0.3, bundet: { [BOLAN]: 0.3, [PENSION]: 5 } }
  );
});

test("avvikelsen är positiv när utfallet är bättre för överskottet", () => {
  const budget = rad({ intakter: 45000, utgifter: 38000, bundet: { [BOLAN]: 6000, [PENSION]: 2000 } });
  const faktiskt = rad({ intakter: 46000, utgifter: 37000, bundet: { [BOLAN]: 6000 } });
  const a = avvikelse(faktiskt, budget);
  assert.equal(a.intakter, 1000);
  assert.equal(a.utgifter, 1000);
  assert.deepEqual(a.bundet, { [BOLAN]: 0, [PENSION]: 2000 });
  assert.equal(a.bundetTotalt, 2000);
  assert.equal(a.overskott, 4000);
});

test("en inbetalning från lönekontot räknas som bundet sparande", () => {
  assert.deepEqual(bundetPerKonto([{ verifikatId: 1, kontoId: BOLAN, netto: 6000 }]), { [BOLAN]: 6000 });
});

test("ett nytt lån eller ett uttag räknas inte", () => {
  assert.deepEqual(
    bundetPerKonto([
      { verifikatId: 1, kontoId: BOLAN, netto: -719000 },
      { verifikatId: 2, kontoId: PENSION, netto: -500 },
    ]),
    {}
  );
});

test("en flytt mellan två bundna konton räknas inte", () => {
  assert.deepEqual(
    bundetPerKonto([
      { verifikatId: 1, kontoId: PENSION, netto: -10000 },
      { verifikatId: 1, kontoId: BOLAN, netto: 10000 },
    ]),
    {}
  );
});

test("bara det som kommer utifrån räknas och fördelas på mottagarna", () => {
  // 1 000 flyttas från pensionen och 500 nya pengar kommer in, allt till bolånet.
  assert.deepEqual(
    bundetPerKonto([
      { verifikatId: 1, kontoId: PENSION, netto: -1000 },
      { verifikatId: 1, kontoId: BOLAN, netto: 1500 },
    ]),
    { [BOLAN]: 500 }
  );
  // 8 000 nya pengar delas 3:1 mellan bolån och pension.
  assert.deepEqual(
    bundetPerKonto([
      { verifikatId: 2, kontoId: BOLAN, netto: 6000 },
      { verifikatId: 2, kontoId: PENSION, netto: 2000 },
    ]),
    { [BOLAN]: 6000, [PENSION]: 2000 }
  );
});

test("tolv månader bakåt går över årsskiftet", () => {
  const m = tolvManaderTill("2026-03");
  assert.equal(m.length, 12);
  assert.equal(m[0], "2025-04");
  assert.equal(m[11], "2026-03");
});

test("innevarande år tar bara månaderna i samma år", () => {
  assert.deepEqual(ackumuleradeManader("2026-03", "ytd"), ["2026-01", "2026-02", "2026-03"]);
  assert.equal(ackumuleradeManader("2026-03", "r12").length, 12);
});

test("månader utan data räknas som noll", () => {
  const data = new Map([["2026-02", { intakter: 100, utgifter: 50, bundet: { [BOLAN]: 10 } }]]);
  assert.deepEqual(summaFor(["2026-01", "2026-02"], data), {
    intakter: 100,
    utgifter: 50,
    bundet: { [BOLAN]: 10 },
  });
});
