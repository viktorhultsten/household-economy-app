import assert from "node:assert/strict";
import test from "node:test";

import {
  HarledningResultat,
  HistoriskHandelse,
  KontoInfo,
  Matchning,
  tillObservationer,
} from "../app/lib/konteringsmallHarledning";
import { alternativStatistik, sammanfattaKorning } from "../app/lib/mallanalys";
import { AlternativRad } from "../app/lib/konteringsmallUtils";

const BANK = 1;
const MAT = 10;
const HUSHALL = 11;
const RESOR = 12;

const konton = new Map<number, KontoInfo>([
  [BANK, { namn: "Bank", grupp: "Tillgångar", typ: "Tillgång" }],
  [MAT, { namn: "Mat", grupp: "Utgifter", typ: "Utgift" }],
  [HUSHALL, { namn: "Hushåll", grupp: "Utgifter", typ: "Utgift" }],
  [RESOR, { namn: "Resor", grupp: "Utgifter", typ: "Utgift" }],
]);

let nastaId = 1;

/** En bokförd bankhändelse mot `konto`. Negativt belopp är en utbetalning. */
function handelse(beskrivning: string, belopp: number, datum: string, konto: number): HistoriskHandelse {
  const b = Math.abs(belopp);
  return {
    bankEventId: nastaId++,
    datum,
    beskrivning,
    belopp,
    importAccountId: BANK,
    periodiserad: false,
    rader:
      belopp < 0
        ? [
            { accountId: konto, debet: b, kredit: 0 },
            { accountId: BANK, debet: 0, kredit: b },
          ]
        : [
            { accountId: BANK, debet: b, kredit: 0 },
            { accountId: konto, debet: 0, kredit: b },
          ],
  };
}

const alt = (konto: number): AlternativRad[] => [{ accountId: konto, sida: "motsatt", andel: 1 }];

const ICA: Matchning = {
  nyckelord: ["ica"],
  ankarAccountId: null,
  beloppMin: null,
  beloppMax: null,
  dagIManaden: null,
  riktning: null,
};

test("statistik: antal, senast använd och andel av hela underlaget per alternativ", () => {
  const { observationer } = tillObservationer(
    [
      handelse("ICA Maxi", -300, "2026-01-05", MAT),
      handelse("ICA Kvantum", -200, "2026-02-05", MAT),
      handelse("ICA Maxi", -100, "2026-03-05", HUSHALL),
      // Outlier: räknas i nämnaren men är inget alternativ i mallen.
      handelse("ICA Maxi", -50, "2026-03-06", RESOR),
      // Matchar inte mallen.
      handelse("Willys", -400, "2026-03-07", MAT),
    ],
    konton
  );
  const mall = { ...ICA, alternativ: [{ id: 1, rader: alt(MAT) }, { id: 2, rader: alt(HUSHALL) }] };
  // Lång halveringstid: praktiskt taget oviktad.
  const s = alternativStatistik(mall, observationer, "2026-03-10", 1e9);

  assert.equal(s.get(1)!.antal, 2);
  assert.equal(s.get(1)!.senastAnvand, "2026-02-05");
  assert.equal(s.get(1)!.viktadAndel, 0.5);
  assert.equal(s.get(2)!.antal, 1);
  assert.equal(s.get(2)!.senastAnvand, "2026-03-05");
  assert.equal(s.get(2)!.viktadAndel, 0.25);
});

test("statistik: nyare bokföringar väger tyngre", () => {
  const { observationer } = tillObservationer(
    [handelse("ICA", -100, "2025-03-10", MAT), handelse("ICA", -100, "2026-03-10", HUSHALL)],
    konton
  );
  const mall = { ...ICA, alternativ: [{ id: 1, rader: alt(MAT) }, { id: 2, rader: alt(HUSHALL) }] };
  // Ett år gammal bokföring väger hälften med ett års halveringstid.
  const s = alternativStatistik(mall, observationer, "2026-03-10", 365);
  assert.equal(s.get(1)!.viktadAndel, 0.333333);
  assert.equal(s.get(2)!.viktadAndel, 0.666667);
});

test("statistik: en spegling räknas som samma alternativ", () => {
  const { observationer } = tillObservationer(
    [handelse("ICA", -100, "2026-01-10", MAT), handelse("ICA retur", 40, "2026-01-12", MAT)],
    konton
  );
  const s = alternativStatistik({ ...ICA, alternativ: [{ id: 1, rader: alt(MAT) }] }, observationer, "2026-02-01");
  assert.equal(s.get(1)!.antal, 2);
  assert.equal(s.get(1)!.viktadAndel, 1);
});

test("statistik: mall utan underlag får noll och ingen andel", () => {
  const { observationer } = tillObservationer([handelse("Willys", -100, "2026-01-10", MAT)], konton);
  const s = alternativStatistik({ ...ICA, alternativ: [{ id: 1, rader: alt(MAT) }] }, observationer, "2026-02-01");
  assert.deepEqual(s.get(1), { antal: 0, viktadAndel: null, senastAnvand: null });
});

function resultat(overrides: Partial<HarledningResultat> = {}): HarledningResultat {
  return {
    andringar: [],
    oforandrade: [],
    blockerade: [],
    analys: { antalHandelser: 0, antalUteslutna: 0, historikFran: null, historikTill: null },
    ...overrides,
  };
}

test("sammanfattning: räknar skapade, justerade och borttagna", () => {
  const harledd = { ...ICA, namn: "Ica", alternativ: [], bankEventIds: [] };
  const s = sammanfattaKorning(
    resultat({
      andringar: [
        { typ: "skapa", mall: harledd, beskrivning: "" },
        { typ: "skapa", mall: harledd, beskrivning: "" },
        { typ: "justera", mallId: 3, mall: harledd, beskrivning: "" },
        { typ: "ta_bort", mallId: 4, beskrivning: "" },
      ],
      oforandrade: [5, 6, 7],
      blockerade: [{ mall: harledd, blockeradAv: 8, beskrivning: "" }],
      analys: { antalHandelser: 1234, antalUteslutna: 12, historikFran: "2025-01-02", historikTill: "2026-09-01" },
    })
  );
  assert.equal(s.antalSkapade, 2);
  assert.equal(s.antalJusterade, 1);
  assert.equal(s.antalBorttagna, 1);
  assert.equal(
    s.text,
    "2 skapade, 1 justerad, 1 borttagen, 3 oförändrade, 1 blockerad av låsta eller inaktiverade mallar. " +
      "1234 bankhändelser analyserade (2025-01-02 – 2026-09-01), 12 uteslutna."
  );
});

test("sammanfattning: utan historik", () => {
  assert.equal(
    sammanfattaKorning(resultat()).text,
    "0 skapade, 0 justerade, 0 borttagna, 0 oförändrade. Ingen bokförd historik att analysera."
  );
});
