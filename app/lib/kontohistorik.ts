// Kontohistorik: en matris av konton × månader med de verifikat som bokats på
// valda konton. Urvalet (konton och period) bor i URL:en och sparas aldrig.

import type { AccountType } from "../types";
import {
  Datum,
  datum,
  ar as datumAr,
  manad as datumManad,
  dag as datumDag,
  laggTillManader,
  sistaIManad,
} from "./datum";

/** En kalendermånad, "YYYY-MM". */
export type Manad = string;

const MANAD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

const MANADSNAMN = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function arGiltigManad(text: string): boolean {
  return MANAD_RE.test(text);
}

/** Månaden som datumet ligger i. */
export function manadFor(d: Datum): Manad {
  return d.slice(0, 7);
}

function forstaDag(m: Manad): Datum {
  return `${m}-01`;
}

/** Alla månader från och med `fran` till och med `till`, i ordning. */
export function manaderMellan(fran: Manad, till: Manad): Manad[] {
  const manader: Manad[] = [];
  let d = forstaDag(fran);
  while (manadFor(d) <= till) {
    manader.push(manadFor(d));
    d = laggTillManader(d, 1);
  }
  return manader;
}

/** "2026-01" → "jan-26". */
export function manadEtikett(m: Manad): string {
  const d = forstaDag(m);
  return `${MANADSNAMN[datumManad(d) - 1]}-${String(datumAr(d)).slice(2)}`;
}

/** "2026-09-15" → "15/9". */
export function kortDatum(d: Datum): string {
  return `${datumDag(d)}/${datumManad(d)}`;
}

/** Månaden av år och månad (1–12). */
export function manadAv(ar: number, manad: number): Manad {
  return manadFor(datum(ar, manad, 1));
}

/** År och månad (1–12) ur en månad. */
export function manadDelar(m: Manad): { ar: number; manad: number } {
  const d = forstaDag(m);
  return { ar: datumAr(d), manad: datumManad(d) };
}

/** Förvalet: rullande tolv månader till och med innevarande månad. */
export function forvaldPeriod(idag: Datum): { fran: Manad; till: Manad } {
  const till = manadFor(idag);
  return { fran: manadFor(laggTillManader(forstaDag(till), -11)), till };
}

export interface Urval {
  kontoIds: number[];
  fran: Manad;
  till: Manad;
}

/**
 * Urvalet ur URL:ens parametrar. Saknade eller ogiltiga värden faller tillbaka
 * på de senaste 12 månaderna och inga konton; en omvänd period vänds rätt.
 */
export function tolkaUrval(
  params: { konton?: string | null; fran?: string | null; till?: string | null },
  idag: Datum
): Urval {
  const kontoIds = [
    ...new Set(
      (params.konton ?? "")
        .split(",")
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ];
  const forval = forvaldPeriod(idag);
  let fran = params.fran && arGiltigManad(params.fran) ? params.fran : forval.fran;
  let till = params.till && arGiltigManad(params.till) ? params.till : forval.till;
  if (fran > till) [fran, till] = [till, fran];
  return { kontoIds, fran, till };
}

/** Urvalet som URL-parametrar. */
export function urvalTillSok(urval: Urval): string {
  const params = new URLSearchParams();
  if (urval.kontoIds.length > 0) params.set("konton", urval.kontoIds.join(","));
  params.set("fran", urval.fran);
  params.set("till", urval.till);
  // Kommatecknen hålls läsbara i URL:en.
  return params.toString().replace(/%2C/g, ",");
}

/** Beloppet med kontots normala sida som positiv: debet för tillgång och utgift, kredit annars. */
export function beloppPaNormalSida(typ: AccountType, debet: number, kredit: number): number {
  const ore = typ === "Tillgång" || typ === "Utgift" ? debet * 100 - kredit * 100 : kredit * 100 - debet * 100;
  return Math.round(ore) / 100;
}

/** Ett verifikats bokning på ett konto: konteringsraderna på kontot summerade. */
export interface KontohistorikPost {
  accountId: number;
  verifikatId: number;
  date: Datum;
  text: string;
  belopp: number;
}

/** Posterna per konto och månad, sorterade på datum och sedan verifikat. */
export function byggMatris(poster: KontohistorikPost[]): Map<number, Map<Manad, KontohistorikPost[]>> {
  const matris = new Map<number, Map<Manad, KontohistorikPost[]>>();
  for (const p of poster) {
    if (!matris.has(p.accountId)) matris.set(p.accountId, new Map());
    const rad = matris.get(p.accountId)!;
    const m = manadFor(p.date);
    if (!rad.has(m)) rad.set(m, []);
    rad.get(m)!.push(p);
  }
  for (const rad of matris.values()) {
    for (const cell of rad.values()) {
      cell.sort((a, b) => a.date.localeCompare(b.date) || a.verifikatId - b.verifikatId);
    }
  }
  return matris;
}

/** Summan av en cells poster, räknad i ören. */
export function cellSumma(poster: Pick<KontohistorikPost, "belopp">[]): number {
  return Math.round(poster.reduce((s, p) => s + Math.round(p.belopp * 100), 0)) / 100;
}

/** Första och sista dagen i perioden. */
export function periodDatum(fran: Manad, till: Manad): { start: Datum; slut: Datum } {
  return { start: forstaDag(fran), slut: sistaIManad(forstaDag(till)) };
}
