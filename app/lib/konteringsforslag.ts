// Konteringsförslag från konteringsmallar (issue 19, ADR-0010). Ren och
// deterministisk — inget databasberoende.
//
// Bedömningen från sannolikhetsmodellen (issue 18) görs om till det
// bokföringsvyn visar: scenario, ett kort per förslag med konteringsrader och
// föreslagna belopp, underlaget bakom varje förslag och matchande
// inaktiverade mallar.

import { KontoInfo, Observation } from "./konteringsmallHarledning";
import {
  Bankhandelse,
  SANNOLIKHET_PARAMETRAR,
  SannolikhetParametrar,
  Scenario,
  Underlag,
  bedomBankhandelse,
  underlagForMallar,
} from "./konteringsmallSannolikhet";
import { Konteringsmall, alternativTillKonteringsrader } from "./konteringsmallUtils";

/** Antal senaste underlagsbankhändelser som visas per förslag. */
export const ANTAL_SENASTE_UNDERLAG = 5;

export interface ForslagRad {
  /** 0 om ankarkontot inte går att avgöra — användaren väljer det själv. */
  accountId: number;
  accountName: string;
  debet: number;
  kredit: number;
}

export interface ForslagUnderlag {
  bankEventId: number;
  /** YYYY-MM-DD. */
  datum: string;
  belopp: number;
  beskrivning: string;
}

export interface KonteringsforslagKort {
  /** Alternativets strukturnyckel. */
  nyckel: string;
  mallId: number;
  mallNamn: string;
  /** Alternativets andel, sammanvägd över mallarna. */
  andel: number;
  /** Spegling utan historik i händelsens riktning. */
  gissning: boolean;
  rader: ForslagRad[];
  /** Återkommande händelse som mallen ger. */
  recurringItem: { id: number; namn: string } | null;
  /** Historiska bankhändelser konterade enligt alternativet. */
  antal: number;
  /** De senaste av dem, nyast först. */
  senaste: ForslagUnderlag[];
}

export interface Konteringsforslag {
  scenario: Scenario;
  forslag: KonteringsforslagKort[];
  /** Matchande inaktiverade mallar — förklarar varför inget föreslås. */
  inaktiveradeMallar: { id: number; namn: string }[];
}

export interface ForslagKontext {
  mallar: Konteringsmall[];
  /** Historiken som observationer (`tillObservationer`). */
  observationer: Observation[];
  /** Beskrivning och belopp per historisk bankhändelse, för underlaget. */
  bankhandelser: Map<number, { beskrivning: string; belopp: number }>;
  konton: Map<number, Pick<KontoInfo, "namn">>;
  recurringItems: Map<number, string>;
}

/**
 * Konteringsförslagen för en obokförd bankhändelse. Förslag kommer enbart från
 * aktiva konteringsmallar; antalet följer av scenariot.
 */
export function byggKonteringsforslag(
  handelse: Bankhandelse,
  kontext: ForslagKontext,
  p: SannolikhetParametrar = SANNOLIKHET_PARAMETRAR,
  underlag: Map<number, Underlag[]> = underlagForMallar(kontext.mallar, kontext.observationer)
): Konteringsforslag {
  const { mallar, bankhandelser, konton, recurringItems } = kontext;
  if (handelse.belopp === 0) return { scenario: "okand", forslag: [], inaktiveradeMallar: [] };

  const bedomning = bedomBankhandelse(handelse, mallar, underlag, p);
  const mall = (id: number) => mallar.find((m) => m.id === id)!;

  // Underlaget över de sammanvägda mallarna, utan dubbletter.
  const unikt = new Map<number, Underlag>();
  for (const id of bedomning.mallIds) for (const u of underlag.get(id) ?? []) unikt.set(u.bankEventId, u);
  const nyastForst = [...unikt.values()].sort(
    (a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : b.bankEventId - a.bankEventId)
  );

  const forslag: KonteringsforslagKort[] = [];
  for (const f of bedomning.forslag) {
    const m = mall(f.mallId);
    let konteringsrader;
    try {
      // Utan känt ankarkonto matchar bara mallar utan ankare; ankarraden
      // lämnas då utan konto åt användaren.
      konteringsrader = alternativTillKonteringsrader(f.rader, handelse.ankarAccountId ?? 0, handelse.belopp);
    } catch {
      continue; // Alternativ som inte går att balansera föreslås inte.
    }
    forslag.push({
      nyckel: f.nyckel,
      mallId: m.id,
      mallNamn: m.namn,
      andel: f.andel,
      gissning: bedomning.gissning,
      rader: konteringsrader.map((r) => ({
        ...r,
        accountName: konton.get(r.accountId)?.namn ?? "",
      })),
      recurringItem:
        m.recurringItemId !== null && recurringItems.has(m.recurringItemId)
          ? { id: m.recurringItemId, namn: recurringItems.get(m.recurringItemId)! }
          : null,
      antal: f.antal,
      senaste: nyastForst
        .filter((u) => u.nyckel === f.nyckel)
        .slice(0, ANTAL_SENASTE_UNDERLAG)
        .map((u) => ({
          bankEventId: u.bankEventId,
          datum: u.datum,
          belopp: bankhandelser.get(u.bankEventId)?.belopp ?? 0,
          beskrivning: bankhandelser.get(u.bankEventId)?.beskrivning ?? "",
        })),
    });
  }

  return {
    scenario: bedomning.scenario,
    forslag,
    inaktiveradeMallar: bedomning.inaktiveradeMallIds.map((id) => ({ id, namn: mall(id).namn })),
  };
}

/**
 * Konteringsförslagen för flera obokförda bankhändelser. Mallarnas underlag
 * räknas en gång för alla, i stället för en gång per händelse.
 */
export function byggKonteringsforslagForAlla(
  handelser: (Bankhandelse & { id: number })[],
  kontext: ForslagKontext,
  p: SannolikhetParametrar = SANNOLIKHET_PARAMETRAR
): Map<number, Konteringsforslag> {
  const underlag = underlagForMallar(kontext.mallar, kontext.observationer);
  return new Map(handelser.map((h) => [h.id, byggKonteringsforslag(h, kontext, p, underlag)]));
}

/**
 * Bedömningens färg i bankhändelsevyn och bokföringsvyn: grön *säker*, blå när
 * användaren behöver avgöra själv, grå när inget föreslås.
 */
export type ForslagStatus = "saker" | "val" | "okand";

export function forslagStatus(f: Konteringsforslag): ForslagStatus {
  switch (f.scenario) {
    case "saker":
      // Ett säkert förslag utan ankarkonto kan inte godkännas som det är.
      if (f.forslag.length === 1 && f.forslag[0].rader.every((r) => r.accountId !== 0)) return "saker";
      return f.forslag.length > 0 ? "val" : "okand";
    case "val":
      return f.forslag.length > 0 ? "val" : "okand";
    case "splittrad":
      return "val";
    case "okand":
      return "okand";
  }
}
