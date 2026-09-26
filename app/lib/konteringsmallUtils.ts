// Pure types and conversions for konteringsmallar (ADR-0010) — no database
// dependency, so tests can import directly.

export type MallUrsprung = "anvandare" | "app";
export type MallStatus = "aktiv" | "inaktiverad" | "borttagen";
export type Riktning = "in" | "ut";
export type DagForankring = "borjan" | "slut";
export type Sida = "samma" | "motsatt";

/**
 * Förväntad dag i månaden. `borjan`: dag N (1–31). `slut`: N dagar före
 * månadens sista dag (0 = sista dagen). `fonster` är tillåtet avstånd i
 * kalenderdagar över månadsskiften.
 */
export interface DagIManaden {
  forankring: DagForankring;
  dag: number;
  fonster: number;
}

/** Motkonto i ett alternativ, relativt ankarraden. */
export interface AlternativRad {
  accountId: number;
  sida: Sida;
  /** Andel av ankarbeloppet (1 = hela beloppet). */
  andel: number;
}

export interface Konteringsalternativ {
  id: number;
  mallId: number;
  rader: AlternativRad[];
  /** Statistik från senaste mallanalysen. */
  antal: number;
  viktadAndel: number | null;
  senastAnvand: string | null;
}

export interface Konteringsmall {
  id: number;
  namn: string;
  ursprung: MallUrsprung;
  last: boolean;
  status: MallStatus;
  // Matchningsattribut — null betyder att attributet inte används.
  nyckelord: string[] | null;
  ankarAccountId: number | null;
  /** Beloppsintervall i absolutbelopp, så att en spegling matchar samma intervall. */
  beloppMin: number | null;
  beloppMax: number | null;
  dagIManaden: DagIManaden | null;
  riktning: Riktning | null;
  /** Utdata: återkommande händelse som mallen ger när den tillämpas. */
  recurringItemId: number | null;
  alternativ: Konteringsalternativ[];
}

export interface Konteringsrad {
  accountId: number;
  debet: number;
  kredit: number;
}

/** Riktning för en bankhändelse: positivt belopp är en inbetalning. */
export function riktningFor(belopp: number): Riktning {
  return belopp > 0 ? "in" : "ut";
}

/**
 * Omvandlar ett konteringsalternativ till konteringsrader för en bankhändelse.
 *
 * - Ankarraden får hela beloppet: debet vid inbetalning, kredit vid utbetalning.
 * - Motkontona får `andel × belopp` på samma eller motsatt sida som ankaret.
 * - Öres-resten läggs på den största raden på motsatt sida, så att debet = kredit.
 *
 * Eftersom sidorna är relativa ankaret vänds de automatiskt vid spegling
 * (samma alternativ tillämpat på en bankhändelse med omvänd riktning).
 */
export function alternativTillKonteringsrader(
  rader: AlternativRad[],
  ankarAccountId: number,
  belopp: number
): Konteringsrad[] {
  const beloppOre = Math.round(Math.abs(belopp) * 100);
  if (beloppOre === 0) throw new Error("Beloppet måste vara skilt från noll");

  const motsatta = rader.filter((r) => r.sida === "motsatt");
  if (motsatta.length === 0) {
    throw new Error("Alternativet saknar motkonto på motsatt sida");
  }

  const ankarDebet = belopp > 0;
  const radOre = rader.map((r) => Math.round(r.andel * beloppOre));

  // Balans: motsatt sida = ankaret + samma sida. Resten läggs på största motsatta raden.
  const summaMotsatt = rader.reduce((s, r, i) => (r.sida === "motsatt" ? s + radOre[i] : s), 0);
  const summaSamma = rader.reduce((s, r, i) => (r.sida === "samma" ? s + radOre[i] : s), 0);
  const rest = beloppOre + summaSamma - summaMotsatt;

  let storsta = -1;
  rader.forEach((r, i) => {
    if (r.sida === "motsatt" && (storsta === -1 || r.andel > rader[storsta].andel)) storsta = i;
  });
  radOre[storsta] += rest;
  if (radOre[storsta] <= 0) {
    throw new Error("Alternativets andelar går inte att balansera mot beloppet");
  }

  const sidaRad = (accountId: number, ore: number, debet: boolean): Konteringsrad => ({
    accountId,
    debet: debet ? ore / 100 : 0,
    kredit: debet ? 0 : ore / 100,
  });

  return [
    sidaRad(ankarAccountId, beloppOre, ankarDebet),
    ...rader
      .map((r, i) =>
        sidaRad(r.accountId, radOre[i], r.sida === "samma" ? ankarDebet : !ankarDebet)
      )
      .filter((r) => r.debet > 0 || r.kredit > 0),
  ];
}

/**
 * Omvandlar konteringsrader till ett alternativ relativt ankarkontot — det
 * omvända mot `alternativTillKonteringsrader`. Rader på samma konto och sida
 * slås ihop. Returnerar null om ankarkontot saknas eller nettar till noll.
 *
 * Ett verifikat och dess spegling ger samma alternativ.
 */
export function konteringsraderTillAlternativ(
  rader: Konteringsrad[],
  ankarAccountId: number
): AlternativRad[] | null {
  const ankarNettoOre = rader
    .filter((r) => r.accountId === ankarAccountId)
    .reduce((s, r) => s + Math.round(r.debet * 100) - Math.round(r.kredit * 100), 0);
  if (ankarNettoOre === 0) return null;

  const ankarDebet = ankarNettoOre > 0;
  const ankarOre = Math.abs(ankarNettoOre);

  const perNyckel = new Map<string, { accountId: number; sida: Sida; ore: number }>();
  for (const r of rader) {
    if (r.accountId === ankarAccountId) continue;
    const ore = Math.round((r.debet - r.kredit) * 100);
    if (ore === 0) continue;
    const sida: Sida = ore > 0 === ankarDebet ? "samma" : "motsatt";
    const nyckel = `${r.accountId}:${sida}`;
    const befintlig = perNyckel.get(nyckel);
    if (befintlig) befintlig.ore += Math.abs(ore);
    else perNyckel.set(nyckel, { accountId: r.accountId, sida, ore: Math.abs(ore) });
  }

  return sorteraRader(
    [...perNyckel.values()].map(({ accountId, sida, ore }) => ({
      accountId,
      sida,
      andel: Math.round((ore / ankarOre) * 1e6) / 1e6,
    }))
  );
}

/**
 * Strukturnyckel för ett alternativ: vilka motkonton på vilken sida, aldrig
 * belopp eller andel. Två alternativ med samma nyckel är samma alternativ.
 */
export function alternativNyckel(rader: Pick<AlternativRad, "accountId" | "sida">[]): string {
  return sorteraRader(rader)
    .map((r) => `${r.accountId}:${r.sida}`)
    .join("|");
}

function sorteraRader<T extends Pick<AlternativRad, "accountId" | "sida">>(rader: T[]): T[] {
  return [...rader].sort((a, b) => a.accountId - b.accountId || a.sida.localeCompare(b.sida));
}
