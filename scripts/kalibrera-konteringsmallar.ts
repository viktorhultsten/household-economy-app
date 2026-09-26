/**
 * Kalibrering av sannolikhetsmodellen (issue 18) som backtest mot
 * dev-databasen. Sparar ingenting.
 *
 * Varje bokföringsdag härleds mallarna på nytt ur de bankhändelser som ligger
 * före den dagen, precis som den nattliga mallanalysen skulle ha gjort, och
 * dagens bankhändelser bedöms mot dem. Rapporten visar fördelningen över
 * scenarier, hur ofta *säker* hade rätt och hur ofta rätt kontering fanns bland
 * alternativen i *val* — för de aktuella parametrarna och när en parameter i
 * taget varieras.
 *
 *   npm run mallar:kalibrera:dev
 */

import { Pool } from "pg";

import {
  HarleddMall,
  Observation,
  harledKonteringsmallar,
  tillObservationer,
} from "../app/lib/konteringsmallHarledning";
import {
  Bankhandelse,
  SANNOLIKHET_PARAMETRAR,
  SannolikhetParametrar,
  Scenario,
  Underlag,
  bedomBankhandelse,
  underlagForMallar,
} from "../app/lib/konteringsmallSannolikhet";
import { Konteringsmall } from "../app/lib/konteringsmallUtils";
import { DEV_DB_NAME, getDevConnectionString } from "./dev-db";
import { hamtaHistorik, hamtaKonton } from "../lib/konteringsmallData";

const pool = new Pool({ connectionString: getDevConnectionString() });

/** En dag i backtestet: mallarna som gällde och bankhändelserna som bedöms. */
interface Dag {
  datum: string;
  mallar: Konteringsmall[];
  underlag: Map<number, Underlag[]>;
  fall: { handelse: Bankhandelse; ratt: string; beskrivning: string }[];
}

function somKonteringsmall(m: HarleddMall, id: number): Konteringsmall {
  return {
    id,
    namn: m.namn,
    ursprung: "app",
    last: false,
    status: "aktiv",
    nyckelord: m.nyckelord,
    ankarAccountId: m.ankarAccountId,
    beloppMin: m.beloppMin,
    beloppMax: m.beloppMax,
    dagIManaden: m.dagIManaden,
    riktning: m.riktning,
    recurringItemId: null,
    alternativ: m.alternativ.map((a, i) => ({
      id: id * 100 + i,
      mallId: id,
      rader: a.rader,
      antal: a.antal,
      viktadAndel: a.andel,
      senastAnvand: a.senastAnvand,
    })),
  };
}

interface Utfall {
  antal: Record<Scenario, number>;
  sakerRatt: number;
  valRatt: number;
  valAlternativ: number;
  gissningar: number;
  gissningarRatt: number;
  totalt: number;
  felSakra: { beskrivning: string; foreslagen: string; ratt: string; sannolikhet: number }[];
}

function utvardera(dagar: Dag[], p: SannolikhetParametrar): Utfall {
  const u: Utfall = {
    antal: { saker: 0, val: 0, splittrad: 0, okand: 0 },
    sakerRatt: 0,
    valRatt: 0,
    valAlternativ: 0,
    gissningar: 0,
    gissningarRatt: 0,
    totalt: 0,
    felSakra: [],
  };
  for (const dag of dagar) {
    for (const { handelse, ratt, beskrivning } of dag.fall) {
      const b = bedomBankhandelse(handelse, dag.mallar, dag.underlag, p);
      u.totalt++;
      u.antal[b.scenario]++;
      const traff = b.forslag.some((f) => f.nyckel === ratt);
      if (b.scenario === "saker") {
        if (traff) u.sakerRatt++;
        else {
          u.felSakra.push({
            beskrivning,
            foreslagen: b.forslag[0].nyckel,
            ratt,
            sannolikhet: b.forslag[0].sannolikhet,
          });
        }
      }
      if (b.scenario === "val") {
        if (traff) u.valRatt++;
        u.valAlternativ += b.forslag.length;
      }
      if (b.gissning && b.forslag.length > 0) {
        u.gissningar++;
        if (traff) u.gissningarRatt++;
      }
    }
  }
  return u;
}

const procent = (del: number, av: number) => (av === 0 ? "–" : `${((del / av) * 100).toFixed(1)} %`);

async function main() {
  const [konton, historik] = await Promise.all([hamtaKonton(pool), hamtaHistorik(pool)]);
  const { observationer } = tillObservationer(historik, konton);
  const obsPerId = new Map<number, Observation>(observationer.map((o) => [o.bankEventId, o]));

  const datum = [...new Set(historik.map((h) => h.datum))].sort();
  const start = Date.now();
  const dagar: Dag[] = [];
  let uteslutna = 0;
  for (const d of datum) {
    const fore = historik.filter((h) => h.datum < d);
    const idag = historik.filter((h) => h.datum === d);
    const mallar = harledKonteringsmallar(fore, [], konton)
      .andringar.flatMap((a) => (a.typ === "skapa" ? [a.mall] : []))
      .map((m, i) => somKonteringsmall(m, i + 1));
    const underlag = underlagForMallar(
      mallar,
      observationer.filter((o) => o.datum < d)
    );
    const fall: Dag["fall"] = [];
    for (const h of idag) {
      const o = obsPerId.get(h.bankEventId);
      if (!o) {
        uteslutna++; // periodiserad eller utan entydigt ankare — ingen rätt kontering att jämföra med
        continue;
      }
      fall.push({
        handelse: { datum: h.datum, beskrivning: h.beskrivning, belopp: h.belopp, ankarAccountId: o.ankarAccountId },
        ratt: o.nyckel,
        beskrivning: `${h.datum} ${h.beskrivning} (${h.belopp.toFixed(2)})`,
      });
    }
    dagar.push({ datum: d, mallar, underlag, fall });
  }
  const tid = Date.now() - start;

  const namn = (nyckel: string) =>
    nyckel
      .split("|")
      .map((del) => {
        const [id, sida] = del.split(":");
        const k = konton.get(Number(id));
        return `${k ? `${k.grupp} / ${k.namn}` : `konto ${id}`}${sida === "samma" ? " (samma sida)" : ""}`;
      })
      .join(" + ");

  console.log(`Databas: ${DEV_DB_NAME} (inget sparas)`);
  console.log(
    `Backtest: ${datum.length} bokföringsdagar ${datum[0]} – ${datum[datum.length - 1]}, mallarna härledda på nytt varje dag (${(tid / 1000).toFixed(1)} s)`
  );
  const bedomda = dagar.reduce((s, d) => s + d.fall.length, 0);
  console.log(`Bedömda bankhändelser: ${bedomda} (${uteslutna} uteslutna: periodiserade eller utan entydigt ankare)\n`);

  // --- Aktuella parametrar ---
  const p = SANNOLIKHET_PARAMETRAR;
  const u = utvardera(dagar, p);
  console.log("Parametrar:");
  for (const [k, v] of Object.entries(p)) console.log(`  ${k} = ${v}`);
  console.log("\nScenario      antal   andel");
  for (const s of ["saker", "val", "splittrad", "okand"] as const) {
    console.log(`  ${s.padEnd(10)} ${String(u.antal[s]).padStart(6)}  ${procent(u.antal[s], u.totalt).padStart(7)}`);
  }
  console.log(`\nSäker hade rätt:                ${u.sakerRatt} av ${u.antal.saker} (${procent(u.sakerRatt, u.antal.saker)})`);
  console.log(`Rätt kontering bland val:       ${u.valRatt} av ${u.antal.val} (${procent(u.valRatt, u.antal.val)})`);
  console.log(`Alternativ per val i snitt:     ${u.antal.val ? (u.valAlternativ / u.antal.val).toFixed(2) : "–"}`);
  console.log(`Gissningar (spegling utan historik): ${u.gissningar}, rätt ${u.gissningarRatt} (${procent(u.gissningarRatt, u.gissningar)})`);
  console.log(
    `Rätt förslag totalt (säker + val med träff): ${u.sakerRatt + u.valRatt} av ${u.totalt} (${procent(u.sakerRatt + u.valRatt, u.totalt)})`
  );

  // Per månad: historiken växer, så de första månaderna domineras av okänd.
  console.log("\nPer månad        antal   säker    rätt      val   träff   okänd");
  const manader = [...new Set(dagar.map((d) => d.datum.slice(0, 7)))];
  for (const m of manader) {
    const r = utvardera(dagar.filter((d) => d.datum.startsWith(m)), p);
    console.log(
      `  ${m}       ${String(r.totalt).padStart(6)}  ${procent(r.antal.saker, r.totalt).padStart(7)} ${procent(r.sakerRatt, r.antal.saker).padStart(7)}  ${procent(r.antal.val, r.totalt).padStart(7)} ${procent(r.valRatt, r.antal.val).padStart(7)}  ${procent(r.antal.okand, r.totalt).padStart(7)}`
    );
  }

  if (u.felSakra.length > 0) {
    console.log(`\nFel säkra (${u.felSakra.length}):`);
    for (const f of u.felSakra.slice(0, 25)) {
      console.log(`  ${f.beskrivning}\n    föreslog ${namn(f.foreslagen)} (${procent(f.sannolikhet, 1)}), rätt ${namn(f.ratt)}`);
    }
    if (u.felSakra.length > 25) console.log(`  … och ${u.felSakra.length - 25} till`);
  }

  // --- Känslighet: en parameter i taget ---
  const varianter: { [K in keyof SannolikhetParametrar]: number[] } = {
    sakerhetsgrans: [0.75, 0.8, 0.85, 0.9, 0.95],
    minUnderlag: [3, 5, 8, 12],
    utjamning: [0, 0.5, 1, 2, 4],
    valTackning: [0.6, 0.7, 0.8, 0.9],
    valMinAndel: [0.05, 0.1, 0.15, 0.2],
    maxValAlternativ: [2, 3, 4, 5],
    halveringstidDagar: [60, 120, 180, 365, 730, Infinity],
    riktningsprior: [0.5, 1, 2, 5, 20],
  };
  console.log("\nKänslighet (en parameter i taget, övriga som ovan):");
  console.log(
    `  ${"parameter".padEnd(20)} ${"värde".padStart(8)}  ${"säker".padStart(7)} ${"rätt".padStart(7)}  ${"val".padStart(7)} ${"träff".padStart(7)} ${"alt".padStart(5)}  ${"splittr".padStart(7)}`
  );
  for (const [param, varden] of Object.entries(varianter) as [keyof SannolikhetParametrar, number[]][]) {
    for (const v of varden) {
      const r = utvardera(dagar, { ...p, [param]: v });
      const aktuell = p[param] === v ? " *" : "";
      console.log(
        `  ${param.padEnd(20)} ${String(v).padStart(8)}  ${procent(r.antal.saker, r.totalt).padStart(7)} ${procent(r.sakerRatt, r.antal.saker).padStart(7)}  ${procent(r.antal.val, r.totalt).padStart(7)} ${procent(r.valRatt, r.antal.val).padStart(7)} ${(r.antal.val ? r.valAlternativ / r.antal.val : 0).toFixed(2).padStart(5)}  ${procent(r.antal.splittrad, r.totalt).padStart(7)}${aktuell}`
      );
    }
  }
  console.log("\n* = aktuellt värde. säker/val/splittr = andel av bedömda; rätt = säker som hade rätt; träff = val med rätt kontering bland alternativen.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
