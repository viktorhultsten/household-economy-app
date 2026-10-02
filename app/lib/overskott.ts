// Överskott: resultatet (intäkter − utgifter) minus det bundna sparandet. Svarar
// på om pengarna räcker när även amortering, pensionsspar och liknande ska
// betalas, till skillnad från resultatet som bara visar om förmögenheten växer.

import { laggTillManader } from "./datum";
import { Manad, manadFor, manaderMellan } from "./kontohistorik";

/** Belopp per konto för bundet sparande. */
export type PerKonto = Record<number, number>;

/** En månads (eller periods) belopp, alla som positiva tal. */
export interface Belopp {
  intakter: number;
  utgifter: number;
  /** Inbetalningarna per konto med bundet sparande. */
  bundet: PerKonto;
}

export interface Overskottsrad extends Belopp {
  resultat: number;
  bundetTotalt: number;
  overskott: number;
}

export const NOLL: Belopp = { intakter: 0, utgifter: 0, bundet: {} };

function oren(n: number): number {
  return Math.round(n * 100) / 100;
}

function summaAv(perKonto: PerKonto): number {
  return oren(Object.values(perKonto).reduce((a, b) => a + b, 0));
}

function slaIhop(a: PerKonto, b: PerKonto, f: (x: number, y: number) => number): PerKonto {
  const ut: PerKonto = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)].map(Number))) {
    ut[id] = oren(f(a[id] ?? 0, b[id] ?? 0));
  }
  return ut;
}

export function rad(b: Belopp): Overskottsrad {
  const resultat = oren(b.intakter - b.utgifter);
  const bundetTotalt = summaAv(b.bundet);
  return { ...b, resultat, bundetTotalt, overskott: oren(resultat - bundetTotalt) };
}

export function summa(lista: Belopp[]): Belopp {
  return lista.reduce<Belopp>(
    (acc, b) => ({
      intakter: oren(acc.intakter + b.intakter),
      utgifter: oren(acc.utgifter + b.utgifter),
      bundet: slaIhop(acc.bundet, b.bundet, (x, y) => x + y),
    }),
    NOLL
  );
}

/**
 * Avvikelsen per rad som effekt på överskottet: positiv är alltid bättre än
 * budget. Mer intäkter höjer, mer utgifter och mer bundet sparande sänker.
 */
export function avvikelse(faktiskt: Overskottsrad, budget: Overskottsrad): Overskottsrad {
  return {
    intakter: oren(faktiskt.intakter - budget.intakter),
    utgifter: oren(budget.utgifter - faktiskt.utgifter),
    bundet: slaIhop(faktiskt.bundet, budget.bundet, (f, b) => b - f),
    resultat: oren(faktiskt.resultat - budget.resultat),
    bundetTotalt: oren(budget.bundetTotalt - faktiskt.bundetTotalt),
    overskott: oren(faktiskt.overskott - budget.overskott),
  };
}

/** Ett verifikats nettodebet (debet − kredit) på ett konto med bundet sparande. */
export interface BundenRorelse {
  verifikatId: number;
  kontoId: number;
  netto: number;
}

/**
 * Det bundna sparandet per konto ur verifikatens rörelser. Bara pengar som
 * kommer utifrån räknas: inom ett verifikat dras uttag från andra bundna konton
 * av, så en flytt mellan två bundna konton blir noll och ett nytt lån eller ett
 * uttag räknas inte alls. Det som återstår fördelas på mottagande konton i
 * proportion till vad de tog emot.
 */
export function bundetPerKonto(rorelser: BundenRorelse[]): PerKonto {
  const perVerifikat = new Map<number, BundenRorelse[]>();
  for (const r of rorelser) {
    if (!perVerifikat.has(r.verifikatId)) perVerifikat.set(r.verifikatId, []);
    perVerifikat.get(r.verifikatId)!.push(r);
  }
  const ut: PerKonto = {};
  for (const lista of perVerifikat.values()) {
    const mottaget = lista.filter((r) => r.netto > 0).reduce((a, r) => a + r.netto, 0);
    const utifran = lista.reduce((a, r) => a + r.netto, 0);
    if (mottaget <= 0 || utifran <= 0) continue;
    const andel = utifran / mottaget;
    for (const r of lista) {
      if (r.netto > 0) ut[r.kontoId] = oren((ut[r.kontoId] ?? 0) + r.netto * andel);
    }
  }
  return ut;
}

/** De tolv månaderna till och med `till`. */
export function tolvManaderTill(till: Manad): Manad[] {
  return manaderMellan(manadFor(laggTillManader(`${till}-01`, -11)), till);
}

export type Ackumulering = "r12" | "ytd";

/** Månaderna som ingår i ackumuleringen: rullande tolv eller innevarande år t.o.m. `till`. */
export function ackumuleradeManader(till: Manad, ackumulering: Ackumulering): Manad[] {
  const manader = tolvManaderTill(till);
  return ackumulering === "r12" ? manader : manader.filter((m) => m.slice(0, 4) === till.slice(0, 4));
}

/** Summan av månadernas belopp; månader utan data räknas som noll. */
export function summaFor(manader: Manad[], data: Map<Manad, Belopp>): Belopp {
  return summa(manader.map((m) => data.get(m) ?? NOLL));
}
