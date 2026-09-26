import assert from "node:assert/strict";
import test from "node:test";

import { KontoInfo, formaterare } from "../app/lib/konteringsmallHarledning";
import {
  MallIndata,
  andradBeskrivning,
  forifylldMall,
  mallStatistik,
  mallTillIndata,
  matchningText,
  normaliseraMall,
  skapadBeskrivning,
  valideraMall,
} from "../app/lib/konteringsmallSida";
import { Konteringsmall } from "../app/lib/konteringsmallUtils";

const BANK = 1;
const MAT = 10;
const HUSHALL = 11;

const KONTON = new Map<number, KontoInfo>([
  [BANK, { namn: "Lönekonto", grupp: "Bank", typ: "Tillgång" }],
  [MAT, { namn: "Mat", grupp: "Hushåll", typ: "Utgift" }],
  [HUSHALL, { namn: "Hushållsartiklar", grupp: "Hushåll", typ: "Utgift" }],
]);
const fmt = formaterare(KONTON);

function indata(over: Partial<MallIndata> = {}): MallIndata {
  return {
    namn: "Ica",
    nyckelord: ["ica"],
    ankarAccountId: null,
    beloppMin: null,
    beloppMax: null,
    dagIManaden: null,
    riktning: null,
    recurringItemId: null,
    alternativ: [{ rader: [{ accountId: MAT, sida: "motsatt", andel: 1 }] }],
    ...over,
  };
}

function mall(over: Partial<Konteringsmall> = {}): Konteringsmall {
  return {
    id: 1,
    namn: "Ica",
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
    alternativ: [
      {
        id: 1,
        mallId: 1,
        rader: [{ accountId: MAT, sida: "motsatt", andel: 1 }],
        antal: 8,
        viktadAndel: 0.8,
        senastAnvand: "2026-08-30",
      },
      {
        id: 2,
        mallId: 1,
        rader: [{ accountId: HUSHALL, sida: "motsatt", andel: 1 }],
        antal: 2,
        viktadAndel: 0.2,
        senastAnvand: "2026-09-12",
      },
    ],
    ...over,
  };
}

test("matchningText: attributen i läsbar form", () => {
  assert.equal(
    matchningText(
      {
        nyckelord: ["ica", "willys"],
        ankarAccountId: null,
        beloppMin: null,
        beloppMax: null,
        dagIManaden: { forankring: "borjan", dag: 25, fonster: 2 },
        riktning: "ut",
      },
      KONTON
    ),
    "ica, willys · utbetalning · dag 23–27"
  );
  assert.equal(
    matchningText(
      {
        nyckelord: null,
        ankarAccountId: BANK,
        beloppMin: 20000,
        beloppMax: 30000,
        dagIManaden: { forankring: "slut", dag: 0, fonster: 1 },
        riktning: "in",
      },
      KONTON
    ),
    "Lönekonto · inbetalning · 20 000–30 000 kr · månadens sista dag ±1"
  );
  // Ett fönster över månadsskiftet visas som ±.
  assert.match(
    matchningText({ ...indata(), dagIManaden: { forankring: "borjan", dag: 1, fonster: 2 } }, KONTON),
    /dag 1 ±2$/
  );
});

test("normaliseraMall: trimmar, gemener, dubbletter bort och tomma nyckelord blir null", () => {
  const m = normaliseraMall(indata({ namn: "  Ica ", nyckelord: [" ICA", "ica", " "] }));
  assert.equal(m.namn, "Ica");
  assert.deepEqual(m.nyckelord, ["ica"]);
  assert.equal(normaliseraMall(indata({ nyckelord: ["", " "] })).nyckelord, null);
});

test("valideraMall: giltig mall och split", () => {
  assert.equal(valideraMall(indata(), KONTON), null);
  assert.equal(
    valideraMall(
      indata({
        alternativ: [
          {
            rader: [
              { accountId: MAT, sida: "motsatt", andel: 0.6 },
              { accountId: HUSHALL, sida: "motsatt", andel: 0.4 },
            ],
          },
        ],
      }),
      KONTON
    ),
    null
  );
});

test("valideraMall: avvisar ogiltiga mallar", () => {
  const fel = (over: Partial<MallIndata>) => valideraMall(normaliseraMall(indata(over)), KONTON);
  assert.match(fel({ namn: " " })!, /namn/);
  assert.match(fel({ nyckelord: ["123"] })!, /inget ord/);
  // Bara riktning matchar i praktiken allt.
  assert.match(fel({ nyckelord: null, riktning: "ut" })!, /nyckelord, belopp eller dag/);
  assert.equal(fel({ nyckelord: null, beloppMin: 100, beloppMax: 200 }), null);
  assert.match(fel({ beloppMin: 200, beloppMax: 100 })!, /större än högsta/);
  assert.match(fel({ beloppMax: NaN })!, /Högsta belopp/);
  assert.match(fel({ dagIManaden: { forankring: "borjan", dag: 0, fonster: 0 } })!, /1–31/);
  assert.match(fel({ dagIManaden: { forankring: "borjan", dag: 5, fonster: 40 } })!, /Fönstret/);
  assert.match(fel({ alternativ: [] })!, /minst ett konteringsalternativ/);
  assert.match(fel({ alternativ: [{ rader: [{ accountId: 0, sida: "motsatt", andel: 1 }] }] })!, /utan konto/);
  assert.match(
    fel({ alternativ: [{ rader: [{ accountId: MAT, sida: "samma", andel: 1 }] }] })!,
    /motsatt sida/
  );
  assert.match(
    fel({ alternativ: [{ rader: [{ accountId: MAT, sida: "motsatt", andel: 0.9 }] }] })!,
    /100 %/
  );
  assert.match(
    fel({
      ankarAccountId: BANK,
      alternativ: [{ rader: [{ accountId: BANK, sida: "motsatt", andel: 1 }] }],
    })!,
    /ankarkontot/
  );
  const dubblett = { rader: [{ accountId: MAT, sida: "motsatt" as const, andel: 1 }] };
  assert.match(fel({ alternativ: [dubblett, dubblett] })!, /samma konton som ett tidigare/);
});

test("mallStatistik: summerar antal och tar senaste datum", () => {
  assert.deepEqual(mallStatistik(mall()), { antal: 10, senastAnvand: "2026-09-12" });
  assert.deepEqual(mallStatistik({ alternativ: [] }), { antal: 0, senastAnvand: null });
});

test("skapadBeskrivning: matchning, alternativ och låsning", () => {
  assert.equal(
    skapadBeskrivning(indata(), true, fmt),
    "Skapad och låst. Matchning: nyckelord ica. Alternativ: Hushåll / Mat"
  );
});

test("andradBeskrivning: null när inget ändrats", () => {
  assert.equal(andradBeskrivning(mall(), mallTillIndata(mall()), false, fmt, new Map()), null);
});

test("andradBeskrivning: namn, matchning, alternativ och låsning", () => {
  const efter = mallTillIndata(mall());
  efter.namn = "Ica Maxi";
  efter.nyckelord = ["ica", "maxi"];
  efter.alternativ = [efter.alternativ[0]];
  const text = andradBeskrivning(mall(), efter, true, fmt, new Map())!;
  assert.equal(
    text,
    "Ändrad: namn «Ica» → «Ica Maxi»; nyckelord ica → ica, maxi; alternativ borttaget Hushåll / Hushållsartiklar; låst"
  );
  assert.match(
    andradBeskrivning(mall({ last: true }), mallTillIndata(mall()), false, fmt, new Map())!,
    /upplåst/
  );
  assert.match(
    andradBeskrivning(mall(), { ...mallTillIndata(mall()), recurringItemId: 5 }, false, fmt, new Map([[5, "Matkasse"]]))!,
    /återkommande händelse – → Matkasse/
  );
});

test("forifylldMall: nyckelord, ankarkonto och konteringen som alternativ", () => {
  const m = forifylldMall(
    { beskrivning: "ICA NARA SOLNA 1234", importAccountId: BANK },
    [
      { accountId: BANK, debet: 0, kredit: 250 },
      { accountId: MAT, debet: 150, kredit: 0 },
      { accountId: HUSHALL, debet: 100, kredit: 0 },
      { accountId: 0, debet: 0, kredit: 0 },
    ],
    KONTON,
    7
  );
  assert.ok(!("fel" in m));
  assert.equal(m.namn, "Ica Nara Solna");
  assert.deepEqual(m.nyckelord, ["ica", "nara", "solna"]);
  assert.equal(m.ankarAccountId, BANK);
  assert.equal(m.riktning, null);
  assert.equal(m.recurringItemId, 7);
  assert.deepEqual(m.alternativ, [
    {
      rader: [
        { accountId: MAT, sida: "motsatt", andel: 0.6 },
        { accountId: HUSHALL, sida: "motsatt", andel: 0.4 },
      ],
    },
  ]);
  assert.equal(valideraMall(normaliseraMall(m), KONTON), null);
});

test("forifylldMall: en spegling ger samma alternativ", () => {
  const m = forifylldMall(
    { beskrivning: "Ica retur", importAccountId: BANK },
    [
      { accountId: BANK, debet: 50, kredit: 0 },
      { accountId: MAT, debet: 0, kredit: 50 },
    ],
    KONTON,
    null
  );
  assert.ok(!("fel" in m));
  assert.deepEqual(m.alternativ, [{ rader: [{ accountId: MAT, sida: "motsatt", andel: 1 }] }]);
});

test("forifylldMall: fel utan ankarrad eller motkonto", () => {
  assert.deepEqual(
    forifylldMall(
      { beskrivning: "Ica", importAccountId: null },
      [{ accountId: MAT, debet: 50, kredit: 0 }],
      KONTON,
      null
    ),
    { fel: "Konteringen saknar en rad mot bankhändelsens konto" }
  );
  assert.ok(
    "fel" in
      forifylldMall({ beskrivning: "Ica", importAccountId: BANK }, [{ accountId: BANK, debet: 50, kredit: 0 }], KONTON, null)
  );
});
