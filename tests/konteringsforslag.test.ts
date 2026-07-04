import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonsterNyckel,
  distributeAmount,
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
