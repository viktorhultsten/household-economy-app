import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePeriodiseringPosts,
  derivePeriodiseringSlices,
  splitAmountOre,
} from "../app/lib/periodiseringUtils";

const PERIODISERINGSKONTO = 99;

test("derivePeriodiseringPosts delar upp en enkel kostnad i två balanserade verifikat", () => {
  // Logisk kontering: debet låneränta 300 / kredit bankkonto 300.
  // Ankaret är bankraden som ligger kvar på bankdatumet.
  const { anchorAmount, huvudPosts, lankatPosts } = derivePeriodiseringPosts(
    [
      { accountId: 10, debet: 300, kredit: 0 }, // låneränta
      { accountId: 20, debet: 0, kredit: 300 }, // bankkonto (ankare)
    ],
    20,
    PERIODISERINGSKONTO
  );

  assert.equal(anchorAmount, 300);

  // Huvud: bankraden + periodiseringskontot på motsatt sida.
  assert.deepEqual(huvudPosts, [
    { accountId: 20, debet: 0, kredit: 300 },
    { accountId: PERIODISERINGSKONTO, debet: 300, kredit: 0 },
  ]);

  // Länkat: låneräntan + periodiseringskontot på samma sida som ankaret.
  assert.deepEqual(lankatPosts, [
    { accountId: 10, debet: 300, kredit: 0 },
    { accountId: PERIODISERINGSKONTO, debet: 0, kredit: 300 },
  ]);

  // Båda verifikaten balanserar.
  for (const posts of [huvudPosts, lankatPosts]) {
    const debet = posts.reduce((s, p) => s + p.debet, 0);
    const kredit = posts.reduce((s, p) => s + p.kredit, 0);
    assert.equal(debet, kredit);
  }
});

test("derivePeriodiseringPosts hanterar en splittad kontering", () => {
  // 500 kr uppdelat på två utgiftskonton, bankraden är ankare.
  const { huvudPosts, lankatPosts } = derivePeriodiseringPosts(
    [
      { accountId: 10, debet: 250, kredit: 0 }, // mat
      { accountId: 11, debet: 250, kredit: 0 }, // teknik
      { accountId: 20, debet: 0, kredit: 500 }, // bankkonto (ankare)
    ],
    20,
    PERIODISERINGSKONTO
  );

  // Huvud speglar bankraden mot periodiseringskontot.
  assert.deepEqual(huvudPosts, [
    { accountId: 20, debet: 0, kredit: 500 },
    { accountId: PERIODISERINGSKONTO, debet: 500, kredit: 0 },
  ]);

  // Länkat bär de logiska raderna och balanseras av periodiseringskontot.
  assert.deepEqual(lankatPosts, [
    { accountId: 10, debet: 250, kredit: 0 },
    { accountId: 11, debet: 250, kredit: 0 },
    { accountId: PERIODISERINGSKONTO, debet: 0, kredit: 500 },
  ]);
});

test("derivePeriodiseringPosts avvisar obalanserad kontering", () => {
  assert.throws(
    () =>
      derivePeriodiseringPosts(
        [
          { accountId: 10, debet: 300, kredit: 0 },
          { accountId: 20, debet: 0, kredit: 299 },
        ],
        20,
        PERIODISERINGSKONTO
      ),
    /Debet och kredit måste vara lika/
  );
});

test("derivePeriodiseringPosts avvisar periodiseringskontot som konteringsrad", () => {
  assert.throws(
    () =>
      derivePeriodiseringPosts(
        [
          { accountId: PERIODISERINGSKONTO, debet: 300, kredit: 0 },
          { accountId: 20, debet: 0, kredit: 300 },
        ],
        20,
        PERIODISERINGSKONTO
      ),
    /Periodiseringskontot får inte användas/
  );
});

test("derivePeriodiseringPosts kräver exakt en ankarrad", () => {
  assert.throws(
    () =>
      derivePeriodiseringPosts(
        [
          { accountId: 10, debet: 300, kredit: 0 },
          { accountId: 20, debet: 0, kredit: 300 },
        ],
        99999, // finns inte bland raderna
        PERIODISERINGSKONTO
      ),
    /Exakt en ankarrad måste väljas/
  );
});

test("splitAmountOre delar jämnt när det går jämnt ut", () => {
  assert.deepEqual(splitAmountOre(1000000, 5), [200000, 200000, 200000, 200000, 200000]);
});

test("splitAmountOre lägger resten på sista månaden", () => {
  const parts = splitAmountOre(1000000, 6);
  assert.deepEqual(parts, [166666, 166666, 166666, 166666, 166666, 166670]);
  assert.equal(
    parts.reduce((s, p) => s + p, 0),
    1000000
  );
});

test("derivePeriodiseringSlices delar 10000/5 i fem jämna månader", () => {
  const { anchorAmount, huvudPosts, slices } = derivePeriodiseringSlices(
    [
      { accountId: 10, debet: 10000, kredit: 0 }, // kostnad
      { accountId: 20, debet: 0, kredit: 10000 }, // bank (ankare)
    ],
    20,
    PERIODISERINGSKONTO,
    5
  );

  assert.equal(anchorAmount, 10000);

  // Huvud = ankare + full brygga (som en periodförskjutning).
  assert.deepEqual(huvudPosts, [
    { accountId: 20, debet: 0, kredit: 10000 },
    { accountId: PERIODISERINGSKONTO, debet: 10000, kredit: 0 },
  ]);

  assert.equal(slices.length, 5);
  for (const rows of slices) {
    assert.deepEqual(rows, [
      { accountId: 10, debet: 2000, kredit: 0, description: undefined },
      { accountId: PERIODISERINGSKONTO, debet: 0, kredit: 2000 },
    ]);
  }
});

test("derivePeriodiseringSlices balanserar varje månad och bryggan nettar till noll", () => {
  const { huvudPosts, slices } = derivePeriodiseringSlices(
    [
      { accountId: 10, debet: 10000, kredit: 0 },
      { accountId: 20, debet: 0, kredit: 10000 },
    ],
    20,
    PERIODISERINGSKONTO,
    6
  );

  // Varje månad balanserar.
  for (const rows of slices) {
    const debet = rows.reduce((s, p) => s + p.debet, 0);
    const kredit = rows.reduce((s, p) => s + p.kredit, 0);
    assert.ok(Math.abs(debet - kredit) < 0.001, "månad ska balansera");
  }

  // Bryggan (periodiseringskontot) ska netta till noll över huvud + alla slices.
  let bridge = 0;
  for (const rows of [huvudPosts, ...slices]) {
    for (const p of rows) {
      if (p.accountId === PERIODISERINGSKONTO) {
        bridge += p.debet - p.kredit;
      }
    }
  }
  assert.ok(Math.abs(bridge) < 0.001, "bryggan ska netta till noll");

  // Summan av kostnadsraderna ska bli exakt 10000.
  let kostnad = 0;
  for (const rows of slices) {
    for (const p of rows) {
      if (p.accountId === 10) kostnad += p.debet;
    }
  }
  assert.ok(Math.abs(kostnad - 10000) < 0.001, "summan av månaderna ska bli totalen");
});

test("derivePeriodiseringSlices avvisar ogiltigt antal månader", () => {
  assert.throws(
    () =>
      derivePeriodiseringSlices(
        [
          { accountId: 10, debet: 10000, kredit: 0 },
          { accountId: 20, debet: 0, kredit: 10000 },
        ],
        20,
        PERIODISERINGSKONTO,
        0
      ),
    /Antal månader måste vara ett heltal och minst 1/
  );
});

