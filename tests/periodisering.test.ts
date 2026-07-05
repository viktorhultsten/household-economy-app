import assert from "node:assert/strict";
import test from "node:test";

import { derivePeriodiseringPosts } from "../app/lib/periodiseringUtils";

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
