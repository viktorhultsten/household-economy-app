// Sannolikhet och scenarier för konteringsförslag (issue 18, ADR-0010). Ren och
// deterministisk — inget databasberoende.
//
// För en bankhändelse:
// 1. Aktiva mallar som matchar händelsen tas fram. En mall som är strikt
//    specifikare än en annan (fler nyckelord, snävare belopp, satt riktning …)
//    vinner över den allmännare, så att t.ex. en riktningsmall vinner för sin
//    riktning.
// 2. Per mall räknas en fördelning över alternativen ur mallens underlag, dvs.
//    de historiska bankhändelser den matchar. Nyare bokföringar väger tyngre
//    (halveringstid). Fördelningen i händelsens riktning vägs mot fördelningen
//    över båda riktningarna, så att historiska speglingar väger tungt men en
//    enstaka avvikande spegling inte ensam avgör.
// 3. Andelen utjämnas mot underlagets storlek: 2 av 2 är inte 100 %.
// 4. Kvarvarande mallar vägs samman med lika vikt, så att en konflikt mellan
//    två mallar blir ett val och inte ett dolt beslut av den större mallen.
// 5. Scenariot avgörs av fördelningen: säker, val, splittrad eller okänd.

import { Matchning, Observation, matchar, matcharMall, nyckelordsOrd } from "./konteringsmallHarledning";
import {
  AlternativRad,
  Konteringsmall,
  Riktning,
  alternativNyckel,
  riktningFor,
} from "./konteringsmallUtils";

/** Gränserna för modellen. Kalibrerade med `npm run mallar:kalibrera:dev`. */
export const SANNOLIKHET_PARAMETRAR = {
  /** Säker: ett alternativs utjämnade sannolikhet måste nå minst detta. */
  sakerhetsgrans: 0.9,
  /** Säker: minsta antal historiska bankhändelser bakom de matchande mallarna. */
  minUnderlag: 5,
  /** Utjämning: pseudo-observationer som inte stöder något alternativ. */
  utjamning: 1,
  /** Val: alternativen måste tillsammans täcka minst så här stor andel. */
  valTackning: 0.8,
  /** Val: ett alternativ visas bara om det har minst så här stor andel. */
  valMinAndel: 0.1,
  /** Fler alternativ än så betyder splittrad. */
  maxValAlternativ: 3,
  /** Nyhetsviktning: en bokföring väger hälften så mycket efter så här många dagar. */
  halveringstidDagar: 365,
  /**
   * Hur tungt fördelningen över båda riktningarna väger, i pseudo-observationer,
   * mot fördelningen i händelsens riktning. Litet värde gör att historiska
   * speglingar väger mycket tungt.
   */
  riktningsprior: 2,
};

export type SannolikhetParametrar = typeof SANNOLIKHET_PARAMETRAR;

export type Scenario = "saker" | "val" | "splittrad" | "okand";

/** En historisk bankhändelse som en mall matchar. */
export type Underlag = Pick<Observation, "bankEventId" | "datum" | "riktning" | "nyckel">;

export interface Bankhandelse {
  /** YYYY-MM-DD. */
  datum: string;
  beskrivning: string;
  /** Positivt är en inbetalning. */
  belopp: number;
  /** Importens konto, om känt. */
  ankarAccountId: number | null;
}

export interface Forslag {
  /** Alternativets strukturnyckel (samma i alla mallar). */
  nyckel: string;
  rader: AlternativRad[];
  /** Mallen och alternativet raderna hämtats från. */
  mallId: number;
  alternativId: number;
  /** Alla sammanvägda mallar där alternativet finns. */
  mallIds: number[];
  /** Nyhets- och riktningsviktad andel, sammanvägd över mallarna. */
  andel: number;
  /** Andelen utjämnad mot underlagets storlek. */
  sannolikhet: number;
  /** Historiska bankhändelser konterade enligt alternativet. */
  antal: number;
  /** Av dessa, i samma riktning som bankhändelsen. */
  antalIRiktningen: number;
}

export interface Bedomning {
  scenario: Scenario;
  /** Det som visas: ett förslag vid säker, alternativen vid val, annars inget. */
  forslag: Forslag[];
  /** Alla alternativ i de sammanvägda mallarna, högst andel först. */
  alternativ: Forslag[];
  /** Spegling utan historik i händelsens riktning — en kvalificerad gissning, aldrig säker. */
  gissning: boolean;
  /** Mallarna som vägdes samman. */
  mallIds: number[];
  /** Matchande mallar som fick ge vika för en specifikare mall. */
  undantagnaMallIds: number[];
  /** Inaktiverade mallar som matchar — för notisen i bokföringsvyn. */
  inaktiveradeMallIds: number[];
  /** Antal historiska bankhändelser bakom de sammanvägda mallarna. */
  underlag: number;
  /** Av dessa, i samma riktning som bankhändelsen. */
  underlagIRiktningen: number;
}

/**
 * Underlaget per mall: de historiska observationer som mallen matchar.
 * Observationerna kommer från `tillObservationer` i härledningen.
 */
export function underlagForMallar(
  mallar: Konteringsmall[],
  observationer: Observation[]
): Map<number, Underlag[]> {
  return new Map(
    mallar
      .filter((m) => m.status !== "borttagen")
      .map((m) => [
        m.id,
        observationer
          .filter((o) => matchar(m, o))
          .map(({ bankEventId, datum, riktning, nyckel }) => ({ bankEventId, datum, riktning, nyckel })),
      ])
  );
}

// --- Specificitet ----------------------------------------------------------

function intervall(m: Matchning): [number, number] {
  return [m.beloppMin ?? 0, m.beloppMax ?? Infinity];
}

/** Om `a` matchar en delmängd av det `b` matchar, attribut för attribut. */
function minstLikaSpecifik(a: Matchning, b: Matchning): boolean {
  const ordA = new Set(nyckelordsOrd(a.nyckelord));
  if (!nyckelordsOrd(b.nyckelord).every((w) => ordA.has(w))) return false;
  if (b.ankarAccountId !== null && a.ankarAccountId !== b.ankarAccountId) return false;
  const [aMin, aMax] = intervall(a);
  const [bMin, bMax] = intervall(b);
  if (aMin < bMin || aMax > bMax) return false;
  if (
    b.dagIManaden !== null &&
    (a.dagIManaden === null ||
      a.dagIManaden.forankring !== b.dagIManaden.forankring ||
      a.dagIManaden.dag !== b.dagIManaden.dag ||
      a.dagIManaden.fonster > b.dagIManaden.fonster)
  ) {
    return false;
  }
  if (b.riktning !== null && a.riktning !== b.riktning) return false;
  return true;
}

/** `a` är strikt specifikare än `b`: matchar en äkta delmängd av attributen. */
export function arSpecifikare(a: Matchning, b: Matchning): boolean {
  return minstLikaSpecifik(a, b) && !minstLikaSpecifik(b, a);
}

// --- Fördelning per mall ---------------------------------------------------

const DAG_MS = 24 * 60 * 60 * 1000;

function dagarMellan(fran: string, till: string): number {
  return (Date.parse(`${till}T00:00:00Z`) - Date.parse(`${fran}T00:00:00Z`)) / DAG_MS;
}

interface MallFordelning {
  /** Andel per alternativnyckel (bara mallens alternativ). */
  andel: Map<string, number>;
  n: number;
}

function mallFordelning(
  mall: Konteringsmall,
  underlag: Underlag[],
  datum: string,
  riktning: Riktning,
  p: SannolikhetParametrar
): MallFordelning {
  const nycklar = [...new Set(mall.alternativ.map((a) => alternativNyckel(a.rader)))];
  const vikt = (u: Underlag) => Math.pow(0.5, Math.max(0, dagarMellan(u.datum, datum)) / p.halveringstidDagar);

  const summor = (obs: Underlag[]) => {
    const perNyckel = new Map<string, number>();
    let totalt = 0;
    for (const u of obs) {
      const w = vikt(u);
      totalt += w;
      perNyckel.set(u.nyckel, (perNyckel.get(u.nyckel) ?? 0) + w);
    }
    return { perNyckel, totalt };
  };
  const alla = summor(underlag);
  const iRiktningen = underlag.filter((u) => u.riktning === riktning);
  const riktad = summor(iRiktningen);

  const andel = new Map<string, number>();
  for (const nyckel of nycklar) {
    if (underlag.length === 0) {
      // Mall utan underlag (t.ex. nyskapad av användaren): lika andel per alternativ.
      andel.set(nyckel, 1 / nycklar.length);
      continue;
    }
    // Fördelningen i händelsens riktning, med fördelningen över båda
    // riktningarna som prior värd `riktningsprior` observationer.
    const prior = (alla.perNyckel.get(nyckel) ?? 0) / alla.totalt;
    const riktadAndel = riktad.totalt > 0 ? (riktad.perNyckel.get(nyckel) ?? 0) / riktad.totalt : 0;
    const nR = iRiktningen.length;
    andel.set(nyckel, (nR * riktadAndel + p.riktningsprior * prior) / (nR + p.riktningsprior));
  }
  return { andel, n: underlag.length };
}

// --- Bedömning -------------------------------------------------------------

/**
 * Bedömer en bankhändelse mot konteringsmallarna: sannolikhet per
 * konteringsalternativ och scenario.
 *
 * `underlag` är de historiska bankhändelser varje mall matchar (se
 * `underlagForMallar`). En mall utan post i `underlag` räknas som utan historik.
 */
export function bedomBankhandelse(
  handelse: Bankhandelse,
  mallar: Konteringsmall[],
  underlag: Map<number, Underlag[]>,
  p: SannolikhetParametrar = SANNOLIKHET_PARAMETRAR
): Bedomning {
  const riktning = riktningFor(handelse.belopp);
  const matchande = mallar
    .filter((m) => m.status !== "borttagen" && matcharMall(m, handelse))
    .sort((a, b) => a.id - b.id);
  const inaktiveradeMallIds = matchande.filter((m) => m.status === "inaktiverad").map((m) => m.id);
  const aktiva = matchande.filter((m) => m.status === "aktiv" && m.alternativ.length > 0);

  const vinnare = aktiva.filter((m) => !aktiva.some((o) => o !== m && arSpecifikare(o, m)));
  const undantagnaMallIds = aktiva.filter((m) => !vinnare.includes(m)).map((m) => m.id);

  const tom: Bedomning = {
    scenario: "okand",
    forslag: [],
    alternativ: [],
    gissning: false,
    mallIds: [],
    undantagnaMallIds,
    inaktiveradeMallIds,
    underlag: 0,
    underlagIRiktningen: 0,
  };
  if (vinnare.length === 0) return tom;

  // Underlaget över de sammanvägda mallarna, utan dubbletter.
  const unikt = new Map<number, Underlag>();
  for (const m of vinnare) for (const u of underlag.get(m.id) ?? []) unikt.set(u.bankEventId, u);
  const n = unikt.size;
  const nIRiktningen = [...unikt.values()].filter((u) => u.riktning === riktning).length;
  const gissning = n > 0 && nIRiktningen === 0;

  // Sammanvägning: lika vikt per mall. Raderna hämtas från den mall där
  // alternativet har störst andel.
  const perNyckel = new Map<string, Forslag>();
  const bastaAndel = new Map<string, number>();
  for (const m of vinnare) {
    const f = mallFordelning(m, underlag.get(m.id) ?? [], handelse.datum, riktning, p);
    const utjamning = f.n / (f.n + p.utjamning);
    for (const alt of m.alternativ) {
      const nyckel = alternativNyckel(alt.rader);
      const andel = f.andel.get(nyckel)! / vinnare.length;
      const befintligt = perNyckel.get(nyckel);
      if (befintligt?.mallIds.includes(m.id)) continue; // samma struktur två gånger i en mall
      const forslag: Forslag = befintligt ?? {
        nyckel,
        rader: alt.rader,
        mallId: m.id,
        alternativId: alt.id,
        mallIds: [],
        andel: 0,
        sannolikhet: 0,
        antal: 0,
        antalIRiktningen: 0,
      };
      forslag.mallIds.push(m.id);
      forslag.andel += andel;
      forslag.sannolikhet += andel * utjamning;
      if (andel > (bastaAndel.get(nyckel) ?? -1)) {
        Object.assign(forslag, { rader: alt.rader, mallId: m.id, alternativId: alt.id });
        bastaAndel.set(nyckel, andel);
      }
      perNyckel.set(nyckel, forslag);
    }
  }
  const unikaUnderlag = [...unikt.values()];
  const alternativ = [...perNyckel.values()]
    .map((f) => {
      const stod = unikaUnderlag.filter((u) => u.nyckel === f.nyckel);
      return { ...f, antal: stod.length, antalIRiktningen: stod.filter((u) => u.riktning === riktning).length };
    })
    .sort((a, b) => b.andel - a.andel || b.sannolikhet - a.sannolikhet || (a.nyckel < b.nyckel ? -1 : 1));

  const bas = {
    ...tom,
    alternativ,
    gissning,
    mallIds: vinnare.map((m) => m.id),
    underlag: n,
    underlagIRiktningen: nIRiktningen,
  };

  const [forsta] = alternativ;
  if (!gissning && n >= p.minUnderlag && forsta.sannolikhet >= p.sakerhetsgrans) {
    return { ...bas, scenario: "saker", forslag: [forsta] };
  }
  const val = alternativ.filter((a) => a.andel >= p.valMinAndel);
  const tackning = val.reduce((s, a) => s + a.andel, 0);
  if (val.length > 0 && val.length <= p.maxValAlternativ && tackning >= p.valTackning - 1e-9) {
    return { ...bas, scenario: "val", forslag: val };
  }
  return { ...bas, scenario: "splittrad" };
}
