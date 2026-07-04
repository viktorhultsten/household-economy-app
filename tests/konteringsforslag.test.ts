import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonsterNyckel,
  distributeAmount,
  beloppsScore,
  rankMonster,
  tokeniseAlpha,
  tokeniseDigits,
  scoreBeskrivning,
} from "../app/lib/konteringsforslagUtils";

// --- buildMonsterNyckel ---

test("buildMonsterNyckel — samma konton i annan ordning ger samma nyckel", () => {
  const a = buildMonsterNyckel([
    { accountId: 10, isDebet: false },
    { accountId: 5, isDebet: true },
  ]);
  const b = buildMonsterNyckel([
    { accountId: 5, isDebet: true },
    { accountId: 10, isDebet: false },
  ]);
  assert.equal(a, b);
});

test("buildMonsterNyckel — olika sidor ger olika nycklar", () => {
  const a = buildMonsterNyckel([{ accountId: 5, isDebet: true }]);
  const b = buildMonsterNyckel([{ accountId: 5, isDebet: false }]);
  assert.notEqual(a, b);
});

test("buildMonsterNyckel — split med fler konton är eget mönster jämfört med enkelt", () => {
  const enkelt = buildMonsterNyckel([{ accountId: 5, isDebet: false }]);
  const split = buildMonsterNyckel([
    { accountId: 5, isDebet: false },
    { accountId: 7, isDebet: false },
  ]);
  assert.notEqual(enkelt, split);
});

// --- distributeAmount ---

test("distributeAmount — ett motkonto får hela beloppet", () => {
  const result = distributeAmount(500, [500]);
  assert.deepEqual(result, [500]);
});

test("distributeAmount — enkelt belopp med ett motkonto, negativt bankbelopp", () => {
  const result = distributeAmount(-250, [250]);
  assert.deepEqual(result, [250]);
});

test("distributeAmount — split 40/60 summerar korrekt", () => {
  const result = distributeAmount(100, [200, 300]); // 40 % / 60 %
  assert.equal(result.length, 2);
  assert.equal(result[0], 40);
  assert.equal(result[1], 60);
  assert.equal(result[0] + result[1], 100);
});

test("distributeAmount — öres-rest tilldelas den större raden", () => {
  // 100 kr split 1/3 ≈ 33.33 kr och 2/3 ≈ 66.67 kr
  const result = distributeAmount(100, [100, 200]);
  assert.equal(result[0] + result[1], 100);
  // Den större raden (index 1) ska vara minst lika stor
  assert.ok(result[1] >= result[0]);
});

test("distributeAmount — balansinvariant: summa = bankEventAmount", () => {
  const scenarios: Array<{ amount: number; proportions: number[] }> = [
    { amount: 99.99, proportions: [100, 200, 300] },
    { amount: 1, proportions: [1, 1, 1] },
    { amount: 100, proportions: [50, 50] },
    { amount: 1337.42, proportions: [120, 80] },
  ];

  for (const { amount, proportions } of scenarios) {
    const result = distributeAmount(amount, proportions);
    const sum = result.reduce((s, a) => Math.round((s + a) * 100) / 100, 0);
    assert.ok(
      Math.abs(sum - amount) < 0.001,
      `Förväntad summa ${amount}, fick ${sum} för proportioner [${proportions}]`
    );
  }
});

test("distributeAmount — tom lista ger tom lista", () => {
  const result = distributeAmount(500, []);
  assert.deepEqual(result, []);
});

// --- beloppsScore ---

test("beloppsScore — exakt match ger 100", () => {
  assert.equal(beloppsScore(100, [100]), 100);
});

test("beloppsScore — tom historik ger 0", () => {
  assert.equal(beloppsScore(100, []), 0);
});

test("beloppsScore — negativt bankbelopp matchas på absolutvärde", () => {
  assert.equal(beloppsScore(-100, [100]), 100);
});

test("beloppsScore — väljer bästa av flera historiska belopp", () => {
  // target=100, historik=[50, 100] → bästa är 100 (exakt match)
  assert.equal(beloppsScore(100, [50, 100]), 100);
});

test("beloppsScore — SL-scenario: 100 kr ger högre score mot 100 kr-mönster än mot 50 kr-mönster", () => {
  const scoreEnkel = beloppsScore(100, [50]); // Resa 50 kr-mönster
  const scoreSplit = beloppsScore(100, [100]); // Resa/Fordran split @ 100 kr-mönster
  assert.ok(
    scoreSplit > scoreEnkel,
    `Split-mönster (${scoreSplit}) ska slå enkelt-mönster (${scoreEnkel}) vid 100 kr`
  );
});

// --- rankMonster ---

test("rankMonster — SL-scenariot: 100 kr-mönster rankas högst trots lägre frekvens", () => {
  const enkel = { historicalAmounts: [50], antal: 10, senasteDatum: "2025-01-01", id: "enkel" };
  const split = { historicalAmounts: [100], antal: 2, senasteDatum: "2025-01-01", id: "split" };
  const result = rankMonster([enkel, split], 100);
  assert.equal(result[0].id, "split", "split-mönstret ska ranka högst vid 100 kr");
});

test("rankMonster — tydligt score-gap (> 20) ger exakt ett förslag", () => {
  // beloppsScore(100,[50])=50, beloppsScore(100,[100])=100 → gap=50 > 20
  const enkel = { historicalAmounts: [50], antal: 10, senasteDatum: "2025-01-01" };
  const split = { historicalAmounts: [100], antal: 2, senasteDatum: "2025-01-01" };
  const result = rankMonster([enkel, split], 100);
  assert.equal(result.length, 1, "Tydligt score-gap ska ge exakt ett förslag");
});

test("rankMonster — tvetydigt belopp visar flera förslag", () => {
  // beloppsScore(100,[98])=98, beloppsScore(100,[100])=100 → gap=2 < 20
  const a = { historicalAmounts: [98], antal: 5, senasteDatum: "2025-01-01", id: "a" };
  const b = { historicalAmounts: [100], antal: 3, senasteDatum: "2025-01-01", id: "b" };
  const result = rankMonster([a, b], 100);
  assert.ok(result.length >= 2, "Tvetydigt beloppsfall ska ge flera förslag");
});

test("rankMonster — frekvens som utslagsgivare när beloppsScore är lika", () => {
  const minstFrekvent = { historicalAmounts: [100], antal: 1, senasteDatum: "2025-01-01" };
  const mestFrekvent = { historicalAmounts: [100], antal: 10, senasteDatum: "2025-01-01" };
  const result = rankMonster([minstFrekvent, mestFrekvent], 100);
  assert.equal(result[0].antal, 10, "Mest frekventa ska ranka högst vid lika beloppsScore");
});

test("rankMonster — max 3 förslag returneras", () => {
  const candidates = [98, 97, 96, 95, 94].map((h, i) => ({
    historicalAmounts: [h],
    antal: 1,
    senasteDatum: "2025-01-01",
    id: i,
  }));
  const result = rankMonster(candidates, 100);
  assert.ok(result.length <= 3, `Ska returnera max 3 förslag, fick ${result.length}`);
});

// --- tokeniseAlpha ---

test("tokeniseAlpha — korta varumärken sl och ica behålls", () => {
  const tokens = tokeniseAlpha("SL kortköp 123");
  assert.ok(tokens.includes("sl"), "sl ska finnas bland alpha-token");
});

test("tokeniseAlpha — ica behålls (längd 3)", () => {
  assert.ok(tokeniseAlpha("ICA Nara").includes("ica"));
});

test("tokeniseAlpha — siffror filtreras bort från alpha-token", () => {
  const tokens = tokeniseAlpha("SL 123");
  assert.ok(!tokens.includes("123"), "rena siffertoken ska inte vara med i alpha");
});

// --- tokeniseDigits ---

test("tokeniseDigits — extraherar rena siffertoken", () => {
  assert.deepEqual(tokeniseDigits("SL 123"), ["123"]);
});

test("tokeniseDigits — returnerar tom lista när inga siffror finns", () => {
  assert.deepEqual(tokeniseDigits("ICA Nara"), []);
});

// --- scoreBeskrivning ---

test("scoreBeskrivning — exakt match ger 100", () => {
  assert.equal(scoreBeskrivning("SL kortköp", "SL kortköp"), 100);
});

test("scoreBeskrivning — SL 123 och SL 324 matchar lika (siffror särskiljer inte)", () => {
  const s1 = scoreBeskrivning("SL 123", "SL 000");
  const s2 = scoreBeskrivning("SL 324", "SL 000");
  assert.equal(s1, s2, "Olika siffertoken ska inte påverka matchningspoängen");
});

test("scoreBeskrivning — identiskt OCR-nummer förstärker matchning", () => {
  const medSammaOCR = scoreBeskrivning("SL 123456", "SL 123456");
  const medOlikaOCR = scoreBeskrivning("SL 123456", "SL 999999");
  assert.ok(
    medSammaOCR > medOlikaOCR,
    `Delat OCR-nummer ska ge högre poäng (${medSammaOCR} > ${medOlikaOCR})`
  );
});

test("scoreBeskrivning — Swish Viktor matchar bättre mot Viktor-historik än Anna-historik", () => {
  const motViktor = scoreBeskrivning("Swish Viktor", "Swish Viktor");
  const motAnna = scoreBeskrivning("Swish Viktor", "Swish Anna");
  assert.ok(
    motViktor > motAnna,
    `Viktor-historik (${motViktor}) ska slå Anna-historik (${motAnna})`
  );
});

test("scoreBeskrivning — ingen alpha-överlapp ger 0", () => {
  assert.equal(scoreBeskrivning("SL kortköp", "ICA Nara"), 0);
});

