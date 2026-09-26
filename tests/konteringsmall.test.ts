import assert from "node:assert/strict";
import test from "node:test";

import {
  AlternativRad,
  Konteringsrad,
  alternativNyckel,
  alternativTillKonteringsrader,
  konteringsraderTillAlternativ,
  riktningFor,
} from "../app/lib/konteringsmallUtils";

const BANK = 1;
const MAT = 10;
const HUSHALL = 11;
const RABATT = 20;

function assertBalans(rader: Konteringsrad[]) {
  const ore = (n: number) => Math.round(n * 100);
  const debet = rader.reduce((s, r) => s + ore(r.debet), 0);
  const kredit = rader.reduce((s, r) => s + ore(r.kredit), 0);
  assert.equal(debet, kredit, `debet ${debet} ≠ kredit ${kredit}`);
}

// --- alternativTillKonteringsrader ---

test("enkelt alternativ — utbetalning ger ankaret på kredit och motkontot på debet", () => {
  const rader = alternativTillKonteringsrader(
    [{ accountId: MAT, sida: "motsatt", andel: 1 }],
    BANK,
    -432.5
  );
  assert.deepEqual(rader, [
    { accountId: BANK, debet: 0, kredit: 432.5 },
    { accountId: MAT, debet: 432.5, kredit: 0 },
  ]);
});

test("spegling — samma alternativ på en inbetalning vänder sidorna", () => {
  const alternativ: AlternativRad[] = [{ accountId: MAT, sida: "motsatt", andel: 1 }];
  const rader = alternativTillKonteringsrader(alternativ, BANK, 432.5);
  assert.deepEqual(rader, [
    { accountId: BANK, debet: 432.5, kredit: 0 },
    { accountId: MAT, debet: 0, kredit: 432.5 },
  ]);
  assertBalans(rader);
});

test("split — motkontona fördelas enligt andel", () => {
  const rader = alternativTillKonteringsrader(
    [
      { accountId: MAT, sida: "motsatt", andel: 0.75 },
      { accountId: HUSHALL, sida: "motsatt", andel: 0.25 },
    ],
    BANK,
    -1000
  );
  assert.deepEqual(rader, [
    { accountId: BANK, debet: 0, kredit: 1000 },
    { accountId: MAT, debet: 750, kredit: 0 },
    { accountId: HUSHALL, debet: 250, kredit: 0 },
  ]);
});

test("split — öres-resten hamnar på största raden", () => {
  const rader = alternativTillKonteringsrader(
    [
      { accountId: MAT, sida: "motsatt", andel: 1 / 3 },
      { accountId: HUSHALL, sida: "motsatt", andel: 2 / 3 },
    ],
    BANK,
    -100
  );
  // 33,33 + 66,67 = 100,00; avrundningen ger redan balans här
  assertBalans(rader);

  const treDelar = alternativTillKonteringsrader(
    [
      { accountId: MAT, sida: "motsatt", andel: 0.333333 },
      { accountId: HUSHALL, sida: "motsatt", andel: 0.333333 },
      { accountId: RABATT, sida: "motsatt", andel: 0.333334 },
    ],
    BANK,
    -0.1
  );
  // 3 + 3 + 3 öre = 9; resten (1 öre) läggs på största raden (RABATT)
  assert.deepEqual(
    treDelar.map((r) => [r.accountId, r.debet]),
    [
      [BANK, 0],
      [MAT, 0.03],
      [HUSHALL, 0.03],
      [RABATT, 0.04],
    ]
  );
  assertBalans(treDelar);
});

test("split med rad på samma sida som ankaret balanserar", () => {
  // Köp 1100, rabatt 100 tillbaka: banken dras 1000
  const rader = alternativTillKonteringsrader(
    [
      { accountId: MAT, sida: "motsatt", andel: 1.1 },
      { accountId: RABATT, sida: "samma", andel: 0.1 },
    ],
    BANK,
    -1000
  );
  assert.deepEqual(rader, [
    { accountId: BANK, debet: 0, kredit: 1000 },
    { accountId: MAT, debet: 1100, kredit: 0 },
    { accountId: RABATT, debet: 0, kredit: 100 },
  ]);
});

test("balansinvariant — gäller för udda belopp, split och spegling", () => {
  const alternativ: AlternativRad[] = [
    { accountId: MAT, sida: "motsatt", andel: 0.6123 },
    { accountId: HUSHALL, sida: "motsatt", andel: 0.2877 },
    { accountId: RABATT, sida: "motsatt", andel: 0.1 },
  ];
  for (const belopp of [-0.01, -0.07, -1, -99.99, -1234.57, 0.03, 17.77, 250000.01]) {
    const rader = alternativTillKonteringsrader(alternativ, BANK, belopp);
    assertBalans(rader);
    assert.equal(rader[0].accountId, BANK);
    assert.equal(rader[0].debet + rader[0].kredit, Math.abs(belopp));
    assert.equal(rader[0].debet > 0, belopp > 0);
    for (const r of rader.slice(1)) assert.equal(r.debet > 0, belopp < 0);
  }
});

test("felaktiga indata avvisas", () => {
  assert.throws(() =>
    alternativTillKonteringsrader([{ accountId: MAT, sida: "motsatt", andel: 1 }], BANK, 0)
  );
  assert.throws(() =>
    alternativTillKonteringsrader([{ accountId: MAT, sida: "samma", andel: 1 }], BANK, -10)
  );
});

// --- konteringsraderTillAlternativ ---

test("rader → alternativ — utgift och dess spegling ger samma alternativ", () => {
  const utgift = konteringsraderTillAlternativ(
    [
      { accountId: BANK, debet: 0, kredit: 200 },
      { accountId: MAT, debet: 150, kredit: 0 },
      { accountId: HUSHALL, debet: 50, kredit: 0 },
    ],
    BANK
  );
  const spegling = konteringsraderTillAlternativ(
    [
      { accountId: BANK, debet: 80, kredit: 0 },
      { accountId: HUSHALL, debet: 0, kredit: 20 },
      { accountId: MAT, debet: 0, kredit: 60 },
    ],
    BANK
  );
  assert.deepEqual(utgift, [
    { accountId: MAT, sida: "motsatt", andel: 0.75 },
    { accountId: HUSHALL, sida: "motsatt", andel: 0.25 },
  ]);
  assert.deepEqual(spegling, utgift);
});

test("rader → alternativ → rader ger tillbaka samma kontering", () => {
  const original: Konteringsrad[] = [
    { accountId: BANK, debet: 0, kredit: 1000 },
    { accountId: MAT, debet: 1100, kredit: 0 },
    { accountId: RABATT, debet: 0, kredit: 100 },
  ];
  const alternativ = konteringsraderTillAlternativ(original, BANK)!;
  assert.deepEqual(alternativTillKonteringsrader(alternativ, BANK, -1000), original);
});

test("rader → alternativ — saknat ankare ger null", () => {
  assert.equal(
    konteringsraderTillAlternativ([{ accountId: MAT, debet: 10, kredit: 0 }], BANK),
    null
  );
});

// --- alternativNyckel och riktning ---

test("alternativNyckel — struktur, inte belopp eller ordning", () => {
  const a = alternativNyckel([
    { accountId: HUSHALL, sida: "motsatt" },
    { accountId: MAT, sida: "motsatt" },
  ]);
  const b = alternativNyckel([
    { accountId: MAT, sida: "motsatt" },
    { accountId: HUSHALL, sida: "motsatt" },
  ]);
  assert.equal(a, b);
  assert.notEqual(a, alternativNyckel([{ accountId: MAT, sida: "motsatt" }]));
  assert.notEqual(
    alternativNyckel([{ accountId: MAT, sida: "samma" }]),
    alternativNyckel([{ accountId: MAT, sida: "motsatt" }])
  );
});

test("riktningFor", () => {
  assert.equal(riktningFor(100), "in");
  assert.equal(riktningFor(-100), "ut");
});
