import assert from "node:assert/strict";
import test from "node:test";

import { HistoriskHandelse, KontoInfo, tillObservationer } from "../app/lib/konteringsmallHarledning";
import {
  Bankhandelse,
  SANNOLIKHET_PARAMETRAR,
  Underlag,
  arSpecifikare,
  bedomBankhandelse,
  underlagForMallar,
} from "../app/lib/konteringsmallSannolikhet";
import {
  AlternativRad,
  Konteringsmall,
  Riktning,
  alternativNyckel,
} from "../app/lib/konteringsmallUtils";

const BANK = 1;
const MAT = 10;
const HUSHALL = 11;
const FORSAKRING = 12;
const RESOR = 13;
const NOJE = 14;
const GAVOR = 15;
const BONUS = 20;

const alt = (konto: number): AlternativRad[] => [{ accountId: konto, sida: "motsatt", andel: 1 }];
const nyckel = (konto: number) => alternativNyckel(alt(konto));

let nastaAltId = 1;

function mall(id: number, konton: number[], overrides: Partial<Konteringsmall> = {}): Konteringsmall {
  return {
    id,
    namn: `Mall ${id}`,
    ursprung: "app",
    last: false,
    status: "aktiv",
    nyckelord: ["ica"],
    ankarAccountId: null,
    beloppMin: null,
    beloppMax: null,
    dagIManaden: null,
    riktning: null,
    recurringItemId: null,
    alternativ: konton.map((k) => ({
      id: nastaAltId++,
      mallId: id,
      rader: alt(k),
      antal: 0,
      viktadAndel: null,
      senastAnvand: null,
    })),
    ...overrides,
  };
}

let nastaEventId = 1;

/** `antal` historiska bankhändelser konterade mot `konto`, med ett datum per dag bakåt från `till`. */
function stod(antal: number, konto: number, riktning: Riktning = "ut", till = "2025-12-31"): Underlag[] {
  const slut = Date.parse(`${till}T00:00:00Z`);
  return Array.from({ length: antal }, (_, i) => ({
    bankEventId: nastaEventId++,
    datum: new Date(slut - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    riktning,
    nyckel: nyckel(konto),
  }));
}

function handelse(beskrivning = "ICA Maxi Storm", belopp = -250, datum = "2026-01-10"): Bankhandelse {
  return { beskrivning, belopp, datum, ankarAccountId: BANK };
}

const konton = (b: ReturnType<typeof bedomBankhandelse>, lista: "forslag" | "alternativ" = "forslag") =>
  b[lista].map((f) => f.rader[0].accountId);

// --- Scenarier ---

test("okänd: ingen mall matchar", () => {
  const b = bedomBankhandelse(handelse("Willys Gränby"), [mall(1, [MAT])], new Map([[1, stod(30, MAT)]]));
  assert.equal(b.scenario, "okand");
  assert.deepEqual(b.forslag, []);
});

test("okänd med notis: bara en inaktiverad mall matchar", () => {
  const b = bedomBankhandelse(
    handelse(),
    [mall(1, [MAT], { status: "inaktiverad" }), mall(2, [MAT], { status: "borttagen" })],
    new Map([[1, stod(30, MAT)]])
  );
  assert.equal(b.scenario, "okand");
  assert.deepEqual(b.inaktiveradeMallIds, [1]);
});

test("säker: ett alternativ med högt stöd och tillräckligt underlag", () => {
  const b = bedomBankhandelse(handelse(), [mall(1, [MAT])], new Map([[1, stod(30, MAT)]]));
  assert.equal(b.scenario, "saker");
  assert.deepEqual(konton(b), [MAT]);
  assert.equal(b.forslag[0].antal, 30);
  assert.ok(b.forslag[0].sannolikhet >= SANNOLIKHET_PARAMETRAR.sakerhetsgrans);
});

test("utjämning: lite underlag ger låg säkerhet, 2 av 2 är inte säker", () => {
  const b = bedomBankhandelse(handelse(), [mall(1, [MAT])], new Map([[1, stod(2, MAT)]]));
  assert.equal(b.scenario, "val");
  assert.deepEqual(konton(b), [MAT]);
  assert.equal(b.forslag[0].andel, 1);
  assert.ok(b.forslag[0].sannolikhet < 0.7);
});

test("val: ett fåtal alternativ täcker tillsammans det mesta", () => {
  const b = bedomBankhandelse(
    handelse(),
    [mall(1, [MAT, HUSHALL])],
    new Map([[1, [...stod(18, MAT), ...stod(12, HUSHALL)]]])
  );
  assert.equal(b.scenario, "val");
  assert.deepEqual(konton(b), [MAT, HUSHALL]);
  assert.ok(Math.abs(b.forslag[0].andel - 0.6) < 0.05);
});

test("splittrad: det krävs för många alternativ för att täcka fördelningen", () => {
  const alla = [MAT, HUSHALL, FORSAKRING, RESOR, NOJE];
  const b = bedomBankhandelse(
    handelse(),
    [mall(1, alla)],
    new Map([[1, alla.flatMap((k) => stod(6, k))]])
  );
  assert.equal(b.scenario, "splittrad");
  assert.deepEqual(b.forslag, []);
  assert.equal(b.alternativ.length, 5);
});

test("maxValAlternativ styr gränsen mellan val och splittrad", () => {
  const tre = [MAT, HUSHALL, FORSAKRING];
  const mallar = [mall(1, tre)];
  const underlag = new Map([[1, tre.flatMap((k) => stod(10, k))]]);
  assert.equal(bedomBankhandelse(handelse(), mallar, underlag).scenario, "val");
  assert.equal(
    bedomBankhandelse(handelse(), mallar, underlag, { ...SANNOLIKHET_PARAMETRAR, maxValAlternativ: 2 }).scenario,
    "splittrad"
  );
});

test("mall utan underlag föreslås som ett val, aldrig som säker", () => {
  const b = bedomBankhandelse(handelse(), [mall(1, [MAT])], new Map());
  assert.equal(b.scenario, "val");
  assert.deepEqual(konton(b), [MAT]);
  assert.equal(b.forslag[0].sannolikhet, 0);
  assert.equal(b.gissning, false);
});

// --- Nyhetsviktning ---

test("nyare bokföringar väger tyngre, så att ett ändrat sätt att bokföra slår igenom", () => {
  const underlag = new Map([[1, [...stod(20, MAT, "ut", "2023-12-31"), ...stod(8, HUSHALL, "ut", "2025-12-31")]]]);
  const b = bedomBankhandelse(handelse(), [mall(1, [MAT, HUSHALL])], underlag);
  assert.equal(konton(b, "alternativ")[0], HUSHALL);

  const utanViktning = bedomBankhandelse(handelse(), [mall(1, [MAT, HUSHALL])], underlag, {
    ...SANNOLIKHET_PARAMETRAR,
    halveringstidDagar: Infinity,
  });
  assert.equal(konton(utanViktning, "alternativ")[0], MAT);
});

// --- Spegling ---

test("spegling utan historik i riktningen är en kvalificerad gissning och aldrig säker", () => {
  const b = bedomBankhandelse(handelse("ICA Maxi retur", 250), [mall(1, [MAT])], new Map([[1, stod(100, MAT)]]));
  assert.equal(b.gissning, true);
  assert.equal(b.scenario, "val");
  assert.deepEqual(konton(b), [MAT]);
  assert.equal(b.forslag[0].antalIRiktningen, 0);
});

test("en historisk spegling väger tungt: 100 utgifter och en speglad kreditering gör nästa kreditering säker", () => {
  const b = bedomBankhandelse(
    handelse("ICA Maxi retur", 250),
    [mall(1, [MAT])],
    new Map([[1, [...stod(100, MAT), ...stod(1, MAT, "in")]]])
  );
  assert.equal(b.gissning, false);
  assert.equal(b.scenario, "saker");
  assert.deepEqual(konton(b), [MAT]);
  assert.equal(b.forslag[0].antalIRiktningen, 1);
});

test("en historisk spegling på ett annat alternativ gör krediteringen till ett val", () => {
  const b = bedomBankhandelse(
    handelse("ICA Maxi retur", 250),
    [mall(1, [MAT, GAVOR])],
    new Map([[1, [...stod(100, MAT), ...stod(1, GAVOR, "in")]]])
  );
  assert.equal(b.scenario, "val");
  assert.deepEqual(konton(b).sort(), [MAT, GAVOR].sort());
  // Utgifterna påverkas inte av krediteringen.
  const ut = bedomBankhandelse(handelse(), [mall(1, [MAT, GAVOR])], new Map([[1, [...stod(100, MAT), ...stod(1, GAVOR, "in")]]]));
  assert.equal(ut.scenario, "saker");
  assert.deepEqual(konton(ut), [MAT]);
});

// --- Outlier ---

test("en outlier påverkar inte: den visas inte och hindrar inte säker", () => {
  // Outliern (NOJE) är inget alternativ i mallen men finns i underlaget.
  const b = bedomBankhandelse(handelse(), [mall(1, [MAT])], new Map([[1, [...stod(40, MAT), ...stod(1, NOJE)]]]));
  assert.equal(b.scenario, "saker");
  assert.deepEqual(konton(b, "alternativ"), [MAT]);
  assert.equal(b.underlag, 41);
});

// --- Flera mallar ---

test("två mallar som är oense blir ett val, inte ett dolt beslut av den större", () => {
  const b = bedomBankhandelse(
    handelse("ICA Försäkring AB"),
    [mall(1, [MAT], { nyckelord: ["ica"] }), mall(2, [FORSAKRING], { nyckelord: ["försäkring"] })],
    new Map([
      [1, stod(200, MAT)],
      [2, stod(10, FORSAKRING)],
    ])
  );
  assert.equal(b.scenario, "val");
  assert.deepEqual(konton(b).sort(), [MAT, FORSAKRING].sort());
  assert.deepEqual(b.mallIds, [1, 2]);
});

test("två mallar som är överens vägs samman och kan ge säker", () => {
  const underlag = stod(30, MAT);
  const b = bedomBankhandelse(
    handelse("ICA Maxi Storm"),
    [mall(1, [MAT], { nyckelord: ["ica"] }), mall(2, [MAT], { nyckelord: ["maxi"] })],
    new Map([
      [1, underlag],
      [2, underlag.slice(0, 20)],
    ])
  );
  assert.equal(b.scenario, "saker");
  assert.deepEqual(b.forslag[0].mallIds, [1, 2]);
  assert.equal(b.underlag, 30); // samma bankhändelser räknas en gång
});

test("en specifikare mall vinner över en allmännare", () => {
  const b = bedomBankhandelse(
    handelse("ICA Försäkring AB"),
    [mall(1, [MAT], { nyckelord: ["ica"] }), mall(2, [FORSAKRING], { nyckelord: ["ica", "försäkring"] })],
    new Map([
      [1, stod(200, MAT)],
      [2, stod(20, FORSAKRING)],
    ])
  );
  assert.equal(b.scenario, "saker");
  assert.deepEqual(konton(b), [FORSAKRING]);
  assert.deepEqual(b.undantagnaMallIds, [1]);
});

test("en riktningsmall vinner för sin riktning", () => {
  const mallar = [
    mall(1, [RESOR], { nyckelord: ["arbetsgivaren"] }),
    mall(2, [BONUS], { nyckelord: ["arbetsgivaren"], riktning: "in" }),
  ];
  const underlag = new Map([
    [1, [...stod(20, RESOR), ...stod(10, BONUS, "in")]],
    [2, stod(10, BONUS, "in")],
  ]);
  const inbetalning = bedomBankhandelse(handelse("Arbetsgivaren AB", 5000), mallar, underlag);
  assert.deepEqual(konton(inbetalning), [BONUS]);
  assert.deepEqual(inbetalning.mallIds, [2]);
  const utbetalning = bedomBankhandelse(handelse("Arbetsgivaren AB", -500), mallar, underlag);
  assert.deepEqual(utbetalning.mallIds, [1]);
});

test("specificitet: delmängd attribut för attribut", () => {
  const bas = mall(1, [MAT]);
  assert.ok(arSpecifikare({ ...bas, nyckelord: ["ica", "maxi"] }, bas));
  assert.ok(arSpecifikare({ ...bas, beloppMin: 100, beloppMax: 200 }, { ...bas, beloppMax: 500 }));
  assert.ok(arSpecifikare({ ...bas, riktning: "in" }, bas));
  assert.ok(!arSpecifikare(bas, bas));
  assert.ok(!arSpecifikare({ ...bas, nyckelord: ["willys"] }, bas));
  assert.ok(!arSpecifikare({ ...bas, beloppMin: 100 }, { ...bas, beloppMax: 500 }));
  assert.ok(!arSpecifikare({ ...bas, riktning: "in" }, { ...bas, riktning: "ut" }));
});

// --- Underlag ur historiken ---

test("underlaget per mall är de historiska bankhändelser mallen matchar", () => {
  const kontoInfo = new Map<number, KontoInfo>([
    [BANK, { namn: "Bank", grupp: "Bank", typ: "Tillgång" }],
    [MAT, { namn: "Mat", grupp: "Hushåll", typ: "Utgift" }],
  ]);
  const h = (id: number, beskrivning: string, belopp: number): HistoriskHandelse => ({
    bankEventId: id,
    datum: "2025-05-01",
    beskrivning,
    belopp,
    importAccountId: BANK,
    periodiserad: false,
    rader: [
      { accountId: BANK, debet: belopp > 0 ? belopp : 0, kredit: belopp < 0 ? -belopp : 0 },
      { accountId: MAT, debet: belopp < 0 ? -belopp : 0, kredit: belopp > 0 ? belopp : 0 },
    ],
  });
  const { observationer } = tillObservationer(
    [h(1, "ICA Maxi", -100), h(2, "Willys", -80), h(3, "ICA Kvantum retur", 40)],
    kontoInfo
  );
  const underlag = underlagForMallar([mall(1, [MAT])], observationer);
  assert.deepEqual(
    underlag.get(1)!.map((u) => [u.bankEventId, u.riktning, u.nyckel]),
    [
      [1, "ut", nyckel(MAT)],
      [3, "in", nyckel(MAT)],
    ]
  );
});
