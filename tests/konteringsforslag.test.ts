import assert from "node:assert/strict";
import test from "node:test";

import {
  byggKonteringsforslag,
  byggKonteringsforslagForAlla,
  ForslagKontext,
  forslagStatus,
} from "../app/lib/konteringsforslag";
import { tokeniseAlpha } from "../app/lib/konteringsforslagUtils";
import { HistoriskHandelse, KontoInfo, tillObservationer } from "../app/lib/konteringsmallHarledning";
import { Bankhandelse } from "../app/lib/konteringsmallSannolikhet";
import { Konteringsmall } from "../app/lib/konteringsmallUtils";

const BANK = 1;
const MAT = 10;
const HUSHALL = 11;

const KONTON = new Map<number, KontoInfo>([
  [BANK, { namn: "Lönekonto", grupp: "Bank", typ: "Tillgång" }],
  [MAT, { namn: "Mat", grupp: "Hushåll", typ: "Utgift" }],
  [HUSHALL, { namn: "Hushållsartiklar", grupp: "Hushåll", typ: "Utgift" }],
]);

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
      rader: [{ accountId: k, sida: "motsatt", andel: 1 }],
      antal: 0,
      viktadAndel: null,
      senastAnvand: null,
    })),
    ...overrides,
  };
}

let nastaEventId = 1;

/** `antal` bokförda ICA-köp mot `konto`, ett per dag bakåt från `till`. */
function historik(antal: number, konto: number, till = "2025-12-31"): HistoriskHandelse[] {
  const slut = Date.parse(`${till}T00:00:00Z`);
  return Array.from({ length: antal }, (_, i) => {
    const belopp = -(100 + i);
    return {
      bankEventId: nastaEventId++,
      datum: new Date(slut - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      beskrivning: `ICA Nära ${i}`,
      belopp,
      importAccountId: BANK,
      periodiserad: false,
      rader: [
        { accountId: BANK, debet: 0, kredit: -belopp },
        { accountId: konto, debet: -belopp, kredit: 0 },
      ],
    };
  });
}

function kontext(mallar: Konteringsmall[], hist: HistoriskHandelse[]): ForslagKontext {
  return {
    mallar,
    observationer: tillObservationer(hist, KONTON).observationer,
    bankhandelser: new Map(hist.map((h) => [h.bankEventId, { beskrivning: h.beskrivning, belopp: h.belopp }])),
    konton: KONTON,
    recurringItems: new Map([[7, "Matinköp"]]),
  };
}

function handelse(belopp = -250, ankarAccountId: number | null = BANK): Bankhandelse {
  return { beskrivning: "ICA Maxi Storm", belopp, datum: "2026-01-10", ankarAccountId };
}

test("säker: ett kort med konteringsrader, föreslagna belopp och underlag", () => {
  const hist = historik(20, MAT);
  const r = byggKonteringsforslag(handelse(), kontext([mall(1, [MAT])], hist));

  assert.equal(r.scenario, "saker");
  assert.equal(r.forslag.length, 1);
  const [f] = r.forslag;
  assert.equal(f.mallNamn, "Mall 1");
  assert.equal(f.andel, 1);
  assert.equal(f.gissning, false);
  assert.deepEqual(f.rader, [
    { accountId: BANK, accountName: "Lönekonto", debet: 0, kredit: 250 },
    { accountId: MAT, accountName: "Mat", debet: 250, kredit: 0 },
  ]);
  assert.equal(f.antal, 20);
  assert.deepEqual(
    f.senaste.map((u) => [u.datum, u.belopp, u.beskrivning]),
    [
      ["2025-12-31", -100, "ICA Nära 0"],
      ["2025-12-30", -101, "ICA Nära 1"],
      ["2025-12-29", -102, "ICA Nära 2"],
      ["2025-12-28", -103, "ICA Nära 3"],
      ["2025-12-27", -104, "ICA Nära 4"],
    ]
  );
});

test("val: alla alternativ blir kort, varje med sitt eget underlag", () => {
  const hist = [...historik(10, MAT), ...historik(10, HUSHALL)];
  const r = byggKonteringsforslag(handelse(), kontext([mall(1, [MAT, HUSHALL])], hist));

  assert.equal(r.scenario, "val");
  assert.deepEqual(r.forslag.map((f) => f.rader[1].accountId).sort(), [MAT, HUSHALL]);
  for (const f of r.forslag) {
    assert.equal(f.antal, 10);
    const motkonto = f.rader[1].accountId;
    assert.ok(f.senaste.every((u) => hist.find((h) => h.bankEventId === u.bankEventId)!.rader[1].accountId === motkonto));
  }
});

test("splittrad: inga kort", () => {
  const konton = [MAT, HUSHALL, 12, 13, 14];
  const hist = konton.flatMap((k) => historik(4, k));
  const r = byggKonteringsforslag(handelse(), kontext([mall(1, konton)], hist));
  assert.equal(r.scenario, "splittrad");
  assert.deepEqual(r.forslag, []);
});

test("okänd: ingen mall matchar, inga kort och ingen notis", () => {
  const r = byggKonteringsforslag(handelse(), kontext([mall(1, [MAT], { nyckelord: ["willys"] })], historik(20, MAT)));
  assert.deepEqual(r, { scenario: "okand", forslag: [], inaktiveradeMallar: [] });
});

test("spegling utan historik: kvalificerad gissning med omvända sidor", () => {
  const r = byggKonteringsforslag(handelse(80), kontext([mall(1, [MAT])], historik(20, MAT)));
  assert.notEqual(r.scenario, "saker");
  assert.equal(r.forslag.length, 1);
  assert.equal(r.forslag[0].gissning, true);
  assert.deepEqual(
    r.forslag[0].rader.map((x) => [x.accountId, x.debet, x.kredit]),
    [
      [BANK, 80, 0],
      [MAT, 0, 80],
    ]
  );
});

test("inaktiverad mall: föreslås inte men returneras för notisen", () => {
  const r = byggKonteringsforslag(
    handelse(),
    kontext([mall(1, [MAT], { status: "inaktiverad", namn: "ICA" })], historik(20, MAT))
  );
  assert.equal(r.scenario, "okand");
  assert.deepEqual(r.forslag, []);
  assert.deepEqual(r.inaktiveradeMallar, [{ id: 1, namn: "ICA" }]);
});

test("mallens återkommande händelse följer med förslaget", () => {
  const r = byggKonteringsforslag(handelse(), kontext([mall(1, [MAT], { recurringItemId: 7 })], historik(20, MAT)));
  assert.deepEqual(r.forslag[0].recurringItem, { id: 7, namn: "Matinköp" });
});

test("okänt ankarkonto: ankarraden lämnas utan konto", () => {
  const r = byggKonteringsforslag(handelse(-250, null), kontext([mall(1, [MAT])], historik(20, MAT)));
  assert.deepEqual(r.forslag[0].rader[0], { accountId: 0, accountName: "", debet: 0, kredit: 250 });
});

test("belopp noll: inga förslag", () => {
  const r = byggKonteringsforslag(handelse(0), kontext([mall(1, [MAT])], historik(20, MAT)));
  assert.equal(r.scenario, "okand");
});

// --- forslagStatus ---

test("status: säker blir grön", () => {
  const r = byggKonteringsforslag(handelse(), kontext([mall(1, [MAT])], historik(20, MAT)));
  assert.equal(forslagStatus(r), "saker");
});

test("status: val och splittrad blir blå", () => {
  const val = byggKonteringsforslag(
    handelse(),
    kontext([mall(1, [MAT, HUSHALL])], [...historik(10, MAT), ...historik(10, HUSHALL)])
  );
  assert.equal(forslagStatus(val), "val");

  const konton = [MAT, HUSHALL, 12, 13, 14];
  const splittrad = byggKonteringsforslag(handelse(), kontext([mall(1, konton)], konton.flatMap((k) => historik(4, k))));
  assert.equal(splittrad.scenario, "splittrad");
  assert.equal(forslagStatus(splittrad), "val");
});

test("status: okänd och inaktiverad mall blir grå", () => {
  const okand = byggKonteringsforslag(handelse(), kontext([mall(1, [MAT], { nyckelord: ["willys"] })], historik(20, MAT)));
  assert.equal(forslagStatus(okand), "okand");
  const inaktiverad = byggKonteringsforslag(
    handelse(),
    kontext([mall(1, [MAT], { status: "inaktiverad" })], historik(20, MAT))
  );
  assert.equal(forslagStatus(inaktiverad), "okand");
});

test("status: säkert förslag utan ankarkonto kan inte godkännas och blir blått", () => {
  const r = byggKonteringsforslag(handelse(-250, null), kontext([mall(1, [MAT])], historik(20, MAT)));
  assert.equal(r.scenario, "saker");
  assert.equal(forslagStatus(r), "val");
});

test("status: gissning blir blå", () => {
  const r = byggKonteringsforslag(handelse(80), kontext([mall(1, [MAT])], historik(20, MAT)));
  assert.equal(forslagStatus(r), "val");
});

// --- byggKonteringsforslagForAlla ---

test("flera händelser bedöms som var för sig", () => {
  const k = kontext([mall(1, [MAT]), mall(2, [HUSHALL], { nyckelord: ["clas"] })], historik(20, MAT));
  const handelser = [
    { id: 101, ...handelse() },
    { id: 102, ...handelse(80) },
    { id: 103, ...handelse(), beskrivning: "Okänd butik" },
  ];
  const alla = byggKonteringsforslagForAlla(handelser, k);
  assert.equal(alla.size, 3);
  for (const h of handelser) assert.deepEqual(alla.get(h.id), byggKonteringsforslag(h, k));
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
