import assert from "node:assert/strict";
import test from "node:test";

import {
  HarleddMall,
  HarledningResultat,
  HistoriskHandelse,
  KontoInfo,
  dagAvstand,
  harledKonteringsmallar,
  matcharMall,
} from "../app/lib/konteringsmallHarledning";
import { Konteringsmall, alternativNyckel } from "../app/lib/konteringsmallUtils";

const BANK = 1;
const KORT = 2;
const MAT = 10;
const HUSHALL = 11;
const FORSAKRING_A = 12;
const FORSAKRING_B = 13;
const BOLAN = 14;
const RANTA = 15;
const DIVERSE = 16;
const BONUS = 20;
const INTERIM = 30;

const konton = new Map<number, KontoInfo>([
  [BANK, { namn: "Bank", grupp: "Bankkonton", typ: "Tillgång" }],
  [KORT, { namn: "Kort", grupp: "Bankkonton", typ: "Tillgång" }],
  [MAT, { namn: "Mat", grupp: "Hushåll", typ: "Utgift" }],
  [HUSHALL, { namn: "Hushållsartiklar", grupp: "Hushåll", typ: "Utgift" }],
  // Samma kontonamn i olika grupper.
  [FORSAKRING_A, { namn: "Försäkring", grupp: "Hem", typ: "Utgift" }],
  [FORSAKRING_B, { namn: "Försäkring", grupp: "Bil", typ: "Utgift" }],
  [BOLAN, { namn: "Bolån", grupp: "Lån", typ: "Skuld" }],
  [RANTA, { namn: "Ränta", grupp: "Lån", typ: "Utgift" }],
  [DIVERSE, { namn: "Diverse", grupp: "Övrigt", typ: "Utgift" }],
  [BONUS, { namn: "Bonus", grupp: "Inkomster", typ: "Intäkt" }],
  [INTERIM, { namn: "Periodiseringar", grupp: "Interimskonton", typ: "Tillgång" }],
]);

let nastaId = 1;

/**
 * En bokförd bankhändelse mot ett eller flera motkonton. Utan split går hela
 * beloppet till första motkontot; en inbetalning bokas speglat.
 */
function h(
  datum: string,
  beskrivning: string,
  belopp: number,
  motkonton: number | [number, number][],
  extra: Partial<HistoriskHandelse> = {}
): HistoriskHandelse {
  const abs = Math.abs(belopp);
  const in_ = belopp > 0;
  const split: [number, number][] = typeof motkonton === "number" ? [[motkonton, 1]] : motkonton;
  return {
    bankEventId: nastaId++,
    datum,
    beskrivning,
    belopp,
    importAccountId: BANK,
    periodiserad: false,
    rader: [
      { accountId: BANK, debet: in_ ? abs : 0, kredit: in_ ? 0 : abs },
      ...split.map(([accountId, andel]) => {
        const del = Math.round(abs * andel * 100) / 100;
        return { accountId, debet: in_ ? 0 : del, kredit: in_ ? del : 0 };
      }),
    ],
    ...extra,
  };
}

/** n datum spridda över dagar och månader, deterministiskt. */
function datum(n: number, startManad = 1): string[] {
  return Array.from({ length: n }, (_, i) => {
    const manad = ((startManad - 1 + i) % 12) + 1;
    const dag = ((i * 7) % 26) + 2;
    return `2025-${String(manad).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
  });
}

function belopp(n: number, fran: number, till: number): number[] {
  return Array.from({ length: n }, (_, i) => -(fran + ((till - fran) * ((i * 37) % n)) / n));
}

function skapade(r: HarledningResultat): HarleddMall[] {
  return r.andringar.flatMap((a) => (a.typ === "skapa" ? [a.mall] : []));
}

function mall(overrides: Partial<Konteringsmall>): Konteringsmall {
  return {
    id: 100,
    namn: "Mall",
    ursprung: "anvandare",
    last: false,
    status: "aktiv",
    nyckelord: null,
    ankarAccountId: null,
    beloppMin: null,
    beloppMax: null,
    dagIManaden: null,
    riktning: null,
    recurringItemId: null,
    alternativ: [],
    ...overrides,
  };
}

function icaHistorik(): HistoriskHandelse[] {
  const d = datum(24);
  const b = belopp(24, 50, 900);
  return [
    ...Array.from({ length: 10 }, (_, i) => h(d[i], `Ica Maxi Storm ${1000 + i}`, b[i], MAT)),
    ...Array.from({ length: 8 }, (_, i) => h(d[10 + i], "Ica Kvantum Gränby", b[10 + i], MAT)),
    ...Array.from({ length: 6 }, (_, i) => h(d[18 + i], "ICA NÄRA Årsta", b[18 + i], MAT)),
  ];
}

// --- dagAvstand ---

test("dag i månaden mäts över månadsskiften", () => {
  assert.equal(dagAvstand("2025-06-30", { forankring: "borjan", dag: 1 }), 1);
  assert.equal(dagAvstand("2025-07-01", { forankring: "slut", dag: 0 }), 1);
  assert.equal(dagAvstand("2025-03-01", { forankring: "slut", dag: 0 }), 1);
  assert.equal(dagAvstand("2025-02-28", { forankring: "slut", dag: 0 }), 0);
  assert.equal(dagAvstand("2024-02-28", { forankring: "slut", dag: 0 }), 1); // skottår
  assert.equal(dagAvstand("2025-01-02", { forankring: "borjan", dag: 30 }), 3);
  assert.equal(dagAvstand("2025-02-28", { forankring: "borjan", dag: 31 }), 0);
});

// --- Nyckelord ---

test("butikskedja med flera filialer blir en mall med ett nyckelord", () => {
  const r = harledKonteringsmallar(icaHistorik(), [], konton);
  const mallar = skapade(r);
  assert.equal(mallar.length, 1);
  const [ica] = mallar;
  assert.deepEqual(ica.nyckelord, ["ica"]);
  assert.equal(ica.namn, "Ica");
  assert.equal(ica.beloppMin, null);
  assert.equal(ica.beloppMax, null);
  assert.equal(ica.dagIManaden, null);
  assert.equal(ica.riktning, null);
  assert.equal(ica.alternativ.length, 1);
  assert.deepEqual(ica.alternativ[0].rader, [{ accountId: MAT, sida: "motsatt", andel: 1 }]);
  assert.equal(ica.alternativ[0].antal, 24);
  assert.equal(ica.bankEventIds.length, 24);
});

test("ord utan mönster blir ingen mall", () => {
  const d = datum(12);
  const b = belopp(12, 50, 500);
  const motkonton = [MAT, HUSHALL, RANTA, DIVERSE, BONUS, FORSAKRING_A];
  const historik = d.map((dt, i) => h(dt, `Swish ${i}`, b[i], motkonton[i % motkonton.length]));
  const r = harledKonteringsmallar(historik, [], konton);
  assert.deepEqual(r.andringar, []);
});

test("ett annat ord som leder till ett annat alternativ bryts ut som eget nyckelord", () => {
  const d = datum(5);
  const historik = [
    ...icaHistorik(),
    ...d.map((dt) => h(dt, "Ica Försäkr", -189, FORSAKRING_A)),
  ];
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.deepEqual(
    mallar.map((m) => m.nyckelord),
    [["ica", "försäkr"], ["ica"]]
  );
  assert.equal(mallar[0].alternativ[0].rader[0].accountId, FORSAKRING_A);
  assert.equal(mallar[1].alternativ[0].rader[0].accountId, MAT);
});

// --- Riktning och spegling ---

test("speglad kreditering räknas som samma alternativ och ger ingen egen mall", () => {
  const d = datum(22);
  const b = belopp(20, 50, 900);
  const historik = [
    ...b.map((x, i) => h(d[i], "Coop Forum", x, MAT)),
    h(d[20], "Coop Forum", 120, MAT),
    h(d[21], "Coop Forum", 45, MAT),
  ];
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar.length, 1);
  assert.equal(mallar[0].riktning, null);
  assert.equal(mallar[0].alternativ.length, 1);
  assert.equal(mallar[0].alternativ[0].antal, 22);
});

test("bonus som bokförs på eget sätt blir en egen mall för inbetalningar", () => {
  const d = datum(27);
  const b = belopp(20, 50, 900);
  const historik = [
    ...b.map((x, i) => h(d[i], "Ica Maxi", x, MAT)),
    h(d[20], "Ica Maxi", 300, MAT), // spegling
    ...[150, 420, 260, 610, 330].map((x, i) => h(d[21 + i], "Ica Maxi", x, BONUS)),
  ];
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar.length, 2);
  const inMall = mallar.find((m) => m.riktning === "in")!;
  const utMall = mallar.find((m) => m.riktning === "ut")!;
  assert.equal(inMall.alternativ[0].rader[0].accountId, BONUS);
  assert.equal(inMall.alternativ[0].antal, 5);
  assert.equal(utMall.alternativ.length, 1);
  assert.equal(utMall.alternativ[0].rader[0].accountId, MAT);
});

test("för lite underlag i motsatt riktning ger ingen egen mall", () => {
  const d = datum(22);
  const b = belopp(20, 50, 900);
  const historik = [
    ...b.map((x, i) => h(d[i], "Ica Maxi", x, MAT)),
    h(d[20], "Ica Maxi", 150, BONUS),
    h(d[21], "Ica Maxi", 420, BONUS),
  ];
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar.length, 1);
  assert.equal(mallar[0].riktning, null);
});

// --- Belopp och dag ---

test("alternativ som skiljs åt av beloppet får var sitt beloppsintervall", () => {
  const d = datum(12);
  const historik = [
    ...[139, 139, 142, 139, 145, 139].map((x, i) => h(d[i * 2], "LF Sak", -x, FORSAKRING_A)),
    ...[612, 612, 598, 612, 640, 612].map((x, i) => h(d[i * 2 + 1], "LF Sak", -x, FORSAKRING_B)),
  ];
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar.length, 2);
  const [lag, hog] = mallar;
  assert.equal(lag.beloppMin, null);
  assert.equal(lag.beloppMax, 371.5);
  assert.equal(lag.alternativ[0].rader[0].accountId, FORSAKRING_A);
  assert.equal(hog.beloppMin, 371.51);
  assert.equal(hog.beloppMax, null);
  assert.equal(hog.alternativ[0].rader[0].accountId, FORSAKRING_B);
  assert.equal(lag.namn, "Lf (högst 371,50 kr)");
});

test("beskrivningen skiljer konton med samma namn åt via gruppen", () => {
  const d = datum(12);
  const historik = [
    ...[139, 139, 142, 139, 145, 139].map((x, i) => h(d[i * 2], "LF Sak", -x, FORSAKRING_A)),
    ...[612, 612, 598, 612, 640, 612].map((x, i) => h(d[i * 2 + 1], "LF Sak", -x, FORSAKRING_B)),
  ];
  const [lag, hog] = harledKonteringsmallar(historik, [], konton).andringar;
  assert.match(lag.beskrivning, /Alternativ: Hem \/ Försäkring \(6 st, 100 %\)/);
  assert.match(hog.beskrivning, /Alternativ: Bil \/ Försäkring \(6 st, 100 %\)/);
});

test("flera vanliga konteringar som inget särskiljer blir alternativ i samma mall", () => {
  const d = datum(12);
  const b = belopp(12, 100, 800);
  const historik = d.map((dt, i) => h(dt, "Rusta", b[i], i % 3 === 0 ? HUSHALL : MAT));
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar.length, 1);
  assert.deepEqual(
    mallar[0].alternativ.map((a) => [a.rader[0].accountId, a.antal]),
    [
      [MAT, 8],
      [HUSHALL, 4],
    ]
  );
});

test("dragning runt månadsskiftet ger ett tätt mönster för dag i månaden", () => {
  const manadsskifte = ["2025-01-31", "2025-03-01", "2025-03-31", "2025-04-30", "2025-07-01", "2025-06-30"];
  const spridda = ["2025-01-12", "2025-02-18", "2025-03-09", "2025-04-15", "2025-05-21", "2025-06-11"];
  const historik = [
    ...manadsskifte.map((dt, i) => h(dt, "SBAB", -2500 - i * 10, BOLAN)),
    ...spridda.map((dt, i) => h(dt, "SBAB", -2530 + i * 10, RANTA)),
  ];
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar.length, 2);
  const dragning = mallar.find((m) => m.dagIManaden !== null)!;
  assert.equal(dragning.alternativ[0].rader[0].accountId, BOLAN);
  assert.equal(dragning.alternativ[0].antal, 6);
  assert.ok(dragning.dagIManaden!.fonster <= 1);
  const ovrig = mallar.find((m) => m.dagIManaden === null)!;
  assert.equal(ovrig.alternativ[0].rader[0].accountId, RANTA);
});

test("dag i månaden används inte när den inte särskiljer", () => {
  const d = Array.from({ length: 8 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}-25`);
  const historik = d.map((dt) => h(dt, "Netflix.com", -109, DIVERSE));
  const mallar = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(mallar[0].dagIManaden, null);
});

// --- Alternativ ---

test("outlier tas inte med som alternativ", () => {
  const d = datum(21);
  const b = belopp(21, 50, 900);
  const historik = d.map((dt, i) => h(dt, "Willys", b[i], i === 7 ? HUSHALL : MAT));
  const [willys] = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(willys.alternativ.length, 1);
  assert.equal(willys.alternativ[0].rader[0].accountId, MAT);
  assert.equal(willys.alternativ[0].antal, 20);
  assert.equal(willys.alternativ[0].andel, Math.round((20 / 21) * 1e6) / 1e6);
  assert.equal(willys.bankEventIds.length, 21);
});

test("andelarna vid split bestäms med median", () => {
  const d = datum(5);
  const historik = [
    ...d.slice(0, 4).map((dt) => h(dt, "Ikea", -1000, [[MAT, 0.75], [HUSHALL, 0.25]])),
    h(d[4], "Ikea", -1000, [[MAT, 0.1], [HUSHALL, 0.9]]),
  ];
  const [ikea] = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(ikea.alternativ.length, 1);
  assert.deepEqual(ikea.alternativ[0].rader, [
    { accountId: MAT, sida: "motsatt", andel: 0.75 },
    { accountId: HUSHALL, sida: "motsatt", andel: 0.25 },
  ]);
});

test("ankarraden är importens konto, annars den enda tillgångsraden", () => {
  const d = datum(4);
  const historik = [
    // Utan import: kortet är den enda tillgångsraden.
    ...d.slice(0, 2).map((dt) => h(dt, "Okq8", -500, MAT, { importAccountId: null })),
    // Med import: importens konto är ankare även om en annan tillgång finns med.
    ...d.slice(2).map((dt) => h(dt, "Okq8", -500, [[MAT, 1]])),
  ];
  historik[0].rader[0].accountId = KORT;
  historik[1].rader[0].accountId = KORT;
  const [okq8] = skapade(harledKonteringsmallar(historik, [], konton));
  assert.equal(okq8.alternativ.length, 1);
  assert.equal(okq8.alternativ[0].antal, 4);
});

test("periodiseringar och händelser utan entydigt ankare utesluts", () => {
  const d = datum(6);
  const historik = [
    ...d.slice(0, 3).map((dt) => h(dt, "Vattenfall", -800, MAT)),
    ...d.slice(3).map((dt) => h(dt, "Vattenfall", -800, INTERIM, { periodiserad: true })),
    h(d[0], "Flytt", -100, INTERIM, { importAccountId: null }), // bank + interim: två tillgångar
  ];
  const r = harledKonteringsmallar(historik, [], konton);
  assert.equal(r.analys.antalHandelser, 3);
  assert.equal(r.analys.antalUteslutna, 4);
  assert.equal(skapade(r)[0].alternativ[0].antal, 3);
});

// --- Befintliga mallar ---

const icaMat = (id: number) => ({
  id,
  mallId: 1,
  rader: [{ accountId: MAT, sida: "motsatt" as const, andel: 1 }],
  antal: 0,
  viktadAndel: null,
  senastAnvand: null,
});

test("låst mall blockerar en härledd mall som matchar samma bankhändelser", () => {
  const last = mall({ id: 1, namn: "ICA-köp", last: true, nyckelord: ["ica", "maxi"], alternativ: [icaMat(1)] });
  // "ica maxi" matchar bara 10 av 24 — "ica" (MAT) blockeras ändå inte…
  const r1 = harledKonteringsmallar(icaHistorik(), [last], konton);
  assert.equal(skapade(r1).length, 1);
  // …men en låst mall som matchar huvuddelen blockerar.
  const lastIca = mall({ ...last, nyckelord: ["ica"] });
  const r2 = harledKonteringsmallar(icaHistorik(), [lastIca], konton);
  assert.deepEqual(r2.andringar, []);
  assert.equal(r2.blockerade.length, 1);
  assert.equal(r2.blockerade[0].blockeradAv, 1);
  assert.match(r2.blockerade[0].beskrivning, /låst mall «ICA-köp»/);
});

test("inaktiverad mall blockerar en härledd mall som matchar samma bankhändelser", () => {
  const inaktiverad = mall({ id: 2, namn: "Ica", status: "inaktiverad", nyckelord: ["ICA"] });
  const r = harledKonteringsmallar(icaHistorik(), [inaktiverad], konton);
  assert.deepEqual(r.andringar, []);
  assert.equal(r.blockerade[0].blockeradAv, 2);
  assert.match(r.blockerade[0].beskrivning, /inaktiverad mall/);
});

test("borttagen mall påverkar inte härledningen", () => {
  const borttagen = mall({ id: 3, status: "borttagen", last: true, nyckelord: ["ica"] });
  const r = harledKonteringsmallar(icaHistorik(), [borttagen], konton);
  assert.equal(skapade(r).length, 1);
});

test("olåst mall justeras på plats i stället för att dupliceras", () => {
  const befintlig = mall({
    id: 7,
    namn: "Ica Maxi",
    ursprung: "app",
    nyckelord: ["ica", "maxi"],
    beloppMax: 500,
    alternativ: [icaMat(70)],
  });
  const r = harledKonteringsmallar(icaHistorik(), [befintlig], konton);
  assert.equal(r.andringar.length, 1);
  const [andring] = r.andringar;
  assert.equal(andring.typ, "justera");
  if (andring.typ !== "justera") return;
  assert.equal(andring.mallId, 7);
  assert.equal(andring.mall.namn, "Ica Maxi");
  assert.deepEqual(andring.mall.nyckelord, ["ica"]);
  assert.equal(andring.mall.beloppMax, null);
  assert.equal(andring.mall.alternativ[0].befintligtId, 70);
  assert.match(andring.beskrivning, /nyckelord ica, maxi → ica/);
  assert.match(andring.beskrivning, /belopp högst 500 kr → –/);
});

test("olåst mall som redan stämmer rapporteras som oförändrad", () => {
  const befintlig = mall({ id: 8, nyckelord: ["ica"], alternativ: [icaMat(80)] });
  const r = harledKonteringsmallar(icaHistorik(), [befintlig], konton);
  assert.deepEqual(r.andringar, []);
  assert.deepEqual(r.oforandrade, [8]);
});

test("flera olåsta mallar för samma händelser slås ihop", () => {
  const maxi = mall({ id: 4, namn: "Maxi", nyckelord: ["maxi"], alternativ: [icaMat(40)] });
  const kvantum = mall({ id: 5, namn: "Kvantum", nyckelord: ["kvantum"], alternativ: [icaMat(50)] });
  const r = harledKonteringsmallar(icaHistorik(), [maxi, kvantum], konton);
  assert.deepEqual(
    r.andringar.map((a) => [a.typ, "mallId" in a ? a.mallId : null]),
    [
      ["justera", 4],
      ["ta_bort", 5],
    ]
  );
  assert.match(r.andringar[1].beskrivning, /sammanslagen med «Maxi»/);
});

test("olåst mall utan mönster i historiken tas bort, men inte utan underlag", () => {
  const d = datum(12);
  const b = belopp(12, 50, 500);
  const motkonton = [MAT, HUSHALL, RANTA, DIVERSE];
  const historik = d.map((dt, i) => h(dt, `Swish ${i}`, b[i], motkonton[i % motkonton.length]));
  const swish = mall({ id: 9, nyckelord: ["swish"], alternativ: [icaMat(90)] });
  const ny = mall({ id: 10, nyckelord: ["hemköp"], alternativ: [icaMat(91)] });
  const r = harledKonteringsmallar(historik, [swish, ny], konton);
  assert.equal(r.andringar.length, 1);
  assert.equal(r.andringar[0].typ, "ta_bort");
  assert.equal((r.andringar[0] as { mallId: number }).mallId, 9);
});

test("låst mall ändras aldrig", () => {
  const last = mall({ id: 11, last: true, nyckelord: ["ica"], beloppMax: 100, alternativ: [icaMat(110)] });
  const r = harledKonteringsmallar(icaHistorik(), [last], konton);
  assert.ok(r.andringar.every((a) => a.typ === "skapa" || a.mallId !== 11));
});

// --- Övrigt ---

test("härledningen är deterministisk och oberoende av ordningen i indata", () => {
  const historik = [...icaHistorik(), ...icaHistorik().map((x) => ({ ...x, beskrivning: "Willys" }))];
  const a = harledKonteringsmallar(historik, [], konton);
  const b = harledKonteringsmallar([...historik].reverse(), [], konton);
  assert.deepEqual(a, b);
});

test("härledda mallar matchar sina egna bankhändelser", () => {
  const historik = icaHistorik();
  const [ica] = skapade(harledKonteringsmallar(historik, [], konton));
  for (const x of historik) {
    assert.ok(matcharMall(ica, { ...x, ankarAccountId: BANK }));
  }
  assert.ok(!matcharMall(ica, { beskrivning: "Willys", belopp: -100, datum: "2025-01-01", ankarAccountId: BANK }));
  assert.equal(alternativNyckel(ica.alternativ[0].rader), `${MAT}:motsatt`);
});
