// Dagdatum som text, "YYYY-MM-DD". En bankhändelse har ett datum och ingen
// tid, så dagdatum hanteras aldrig som `Date` — en `Date` är en tidpunkt, och
// dess dag beror på tidszonen. Alla uträkningar här är rena och görs i UTC,
// så resultatet blir detsamma oavsett serverns eller webbläsarens tidszon.

/** Ett dagdatum, "YYYY-MM-DD". */
export type Datum = string;

const DATUM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function tal(n: number, bredd = 2): string {
  return String(n).padStart(bredd, "0");
}

/** Datumet av år, månad (1–12) och dag. */
export function datum(ar: number, manad: number, dag: number): Datum {
  return `${tal(ar, 4)}-${tal(manad)}-${tal(dag)}`;
}

/** Om texten är ett giltigt dagdatum, t.ex. inte "2026-02-30". */
export function arGiltigtDatum(text: string): boolean {
  const m = DATUM_RE.exec(text);
  if (!m) return false;
  const [ar, manad, dag] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return manad >= 1 && manad <= 12 && dag >= 1 && dag <= dagarIManad(ar, manad);
}

function delar(d: Datum): [number, number, number] {
  const m = DATUM_RE.exec(d);
  if (!m) throw new Error(`Ogiltigt datum: ${d}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function ar(d: Datum): number {
  return delar(d)[0];
}

/** Månaden, 1–12. */
export function manad(d: Datum): number {
  return delar(d)[1];
}

export function dag(d: Datum): number {
  return delar(d)[2];
}

export function dagarIManad(ar: number, manad: number): number {
  return new Date(Date.UTC(ar, manad, 0)).getUTCDate();
}

/** Första dagen i datumets månad. */
export function forstaIManad(d: Datum): Datum {
  return datum(ar(d), manad(d), 1);
}

/** Sista dagen i datumets månad. */
export function sistaIManad(d: Datum): Datum {
  return datum(ar(d), manad(d), dagarIManad(ar(d), manad(d)));
}

/** Datumet `antal` månader fram (eller bak), med dagen begränsad till månadens sista. */
export function laggTillManader(d: Datum, antal: number): Datum {
  const [a, m, dg] = delar(d);
  const index = a * 12 + (m - 1) + antal;
  const nyttAr = Math.floor(index / 12);
  const nyManad = (index % 12) + 1;
  return datum(nyttAr, nyManad, Math.min(dg, dagarIManad(nyttAr, nyManad)));
}

/** Datumet `antal` dagar fram (eller bak). */
export function laggTillDagar(d: Datum, antal: number): Datum {
  const [a, m, dg] = delar(d);
  const t = new Date(Date.UTC(a, m - 1, dg + antal));
  return datum(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Veckodag med måndag = 0 … söndag = 6. */
export function veckodag(d: Datum): number {
  const [a, m, dg] = delar(d);
  return (new Date(Date.UTC(a, m - 1, dg)).getUTCDay() + 6) % 7;
}

/**
 * Dagens datum i den lokala tidszonen — den enda platsen där en tidpunkt blir
 * ett dagdatum, eftersom "i dag" beror på var man är.
 */
export function idag(nu: Date = new Date()): Datum {
  return datum(nu.getFullYear(), nu.getMonth() + 1, nu.getDate());
}
