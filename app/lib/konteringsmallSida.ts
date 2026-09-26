// Mallsidan (issue 20, ADR-0010): texter, validering och ändringsloggens
// beskrivningar när användaren skapar och justerar konteringsmallar. Ren —
// inget databasberoende — så att den kan testas direkt och användas både av
// sidan och av server actions.

import { tokeniseAlpha } from "./konteringsforslagUtils";
import {
  Formaterare,
  KontoInfo,
  Matchning,
  ankarkontoFor,
  jamfor,
  kronor,
  nyckelordsOrd,
  versal,
} from "./konteringsmallHarledning";
import {
  AlternativRad,
  DagIManaden,
  Konteringsmall,
  Konteringsrad,
  alternativNyckel,
  konteringsraderTillAlternativ,
} from "./konteringsmallUtils";

/** En mall som användaren skapar eller justerar. */
export interface MallIndata extends Matchning {
  namn: string;
  /** Återkommande händelse som mallen ger när den tillämpas. */
  recurringItemId: number | null;
  alternativ: { rader: AlternativRad[] }[];
}

/** Största fönster (± dagar) för dag i månaden som användaren kan ange. */
export const MAX_DAG_FONSTER = 15;

/** Tillåten avvikelse när alternativets andelar summeras. */
const ANDEL_TOLERANS = 1e-4;

const avrundaAndel = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * Städar indata: namn och nyckelord trimmas, nyckelord skrivs med gemener och
 * dubbletter tas bort, och tomma attribut blir null.
 */
export function normaliseraMall(indata: MallIndata): MallIndata {
  const nyckelord = [
    ...new Set((indata.nyckelord ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean)),
  ];
  return {
    ...indata,
    namn: indata.namn.trim(),
    nyckelord: nyckelord.length ? nyckelord : null,
    alternativ: indata.alternativ.map((a) => ({
      rader: a.rader.map((r) => ({ ...r, andel: avrundaAndel(r.andel) })),
    })),
  };
}

/**
 * Validerar en normaliserad mall. Returnerar ett felmeddelande, eller null om
 * mallen går att spara.
 */
export function valideraMall(
  m: MallIndata,
  konton: Map<number, unknown>
): string | null {
  if (!m.namn) return "Mallen måste ha ett namn";

  for (const n of m.nyckelord ?? []) {
    if (tokeniseAlpha(n).length === 0) {
      return `Nyckelordet «${n}» innehåller inget ord som kan matchas (bokstäver, minst två tecken)`;
    }
  }
  if (m.ankarAccountId !== null && !konton.has(m.ankarAccountId)) return "Ankarkontot finns inte";
  if (m.beloppMin !== null && !(m.beloppMin >= 0)) return "Lägsta belopp måste vara noll eller mer";
  if (m.beloppMax !== null && !(m.beloppMax > 0)) return "Högsta belopp måste vara större än noll";
  if (m.beloppMin !== null && m.beloppMax !== null && m.beloppMin > m.beloppMax) {
    return "Lägsta belopp får inte vara större än högsta belopp";
  }
  if (m.dagIManaden) {
    const { forankring, dag, fonster } = m.dagIManaden;
    if (!Number.isInteger(dag) || (forankring === "borjan" ? dag < 1 || dag > 31 : dag < 0 || dag > 30)) {
      return forankring === "borjan"
        ? "Dag i månaden måste vara 1–31"
        : "Dagar före månadsslut måste vara 0–30";
    }
    if (!Number.isInteger(fonster) || fonster < 0 || fonster > MAX_DAG_FONSTER) {
      return `Fönstret för dag i månaden måste vara 0–${MAX_DAG_FONSTER} dagar`;
    }
  }
  // En mall som bara matchar på ankarkonto eller riktning matchar i praktiken allt.
  if (nyckelordsOrd(m.nyckelord).length === 0 && m.beloppMin === null && m.beloppMax === null && !m.dagIManaden) {
    return "Mallen måste matcha på nyckelord, belopp eller dag i månaden";
  }

  if (m.alternativ.length === 0) return "Mallen måste ha minst ett konteringsalternativ";
  const nycklar = new Set<string>();
  for (const [i, a] of m.alternativ.entries()) {
    const nr = m.alternativ.length > 1 ? ` ${i + 1}` : "";
    if (a.rader.length === 0) return `Alternativ${nr} saknar motkonto`;
    if (a.rader.some((r) => !konton.has(r.accountId))) return `Alternativ${nr} har en rad utan konto`;
    if (a.rader.some((r) => !(r.andel > 0))) return `Alternativ${nr} har en rad utan andel`;
    if (!a.rader.some((r) => r.sida === "motsatt")) {
      return `Alternativ${nr} måste ha minst ett motkonto på motsatt sida`;
    }
    if (a.rader.some((r) => r.accountId === m.ankarAccountId)) {
      return `Alternativ${nr} använder ankarkontot som motkonto`;
    }
    const nyckel = alternativNyckel(a.rader);
    if (new Set(a.rader.map((r) => `${r.accountId}:${r.sida}`)).size !== a.rader.length) {
      return `Alternativ${nr} har samma konto på samma sida flera gånger`;
    }
    const netto = a.rader.reduce((s, r) => s + (r.sida === "motsatt" ? r.andel : -r.andel), 0);
    if (Math.abs(netto - 1) > ANDEL_TOLERANS) {
      return `Alternativ${nr} går inte jämnt ut: motsatt sida minus samma sida ska bli 100 %`;
    }
    if (nycklar.has(nyckel)) return `Alternativ${nr} har samma konton som ett tidigare alternativ`;
    nycklar.add(nyckel);
  }
  return null;
}

// --- Texter ------------------------------------------------------------------

function dagKort(d: DagIManaden): string {
  if (d.forankring === "borjan") {
    const fran = d.dag - d.fonster;
    const till = d.dag + d.fonster;
    if (d.fonster === 0) return `dag ${d.dag}`;
    return fran >= 1 && till <= 31 ? `dag ${fran}–${till}` : `dag ${d.dag} ±${d.fonster}`;
  }
  const dag = d.dag === 0 ? "månadens sista dag" : `${d.dag} dagar före månadsslut`;
  return d.fonster > 0 ? `${dag} ±${d.fonster}` : dag;
}

function beloppKort(m: Pick<Matchning, "beloppMin" | "beloppMax">): string | null {
  if (m.beloppMin !== null && m.beloppMax !== null) {
    return `${kronor(m.beloppMin).replace(/ kr$/, "")}–${kronor(m.beloppMax)}`;
  }
  if (m.beloppMin !== null) return `minst ${kronor(m.beloppMin)}`;
  if (m.beloppMax !== null) return `högst ${kronor(m.beloppMax)}`;
  return null;
}

/** Matchningen i läsbar form, t.ex. "ica, willys · utbetalning · dag 23–27". */
export function matchningText(m: Matchning, konton: Map<number, Pick<KontoInfo, "namn">>): string {
  const delar = [
    m.nyckelord?.length ? m.nyckelord.join(", ") : null,
    m.ankarAccountId !== null ? (konton.get(m.ankarAccountId)?.namn ?? `konto ${m.ankarAccountId}`) : null,
    m.riktning === "in" ? "inbetalning" : m.riktning === "ut" ? "utbetalning" : null,
    beloppKort(m),
    m.dagIManaden ? dagKort(m.dagIManaden) : null,
  ].filter((x): x is string => x !== null);
  return delar.length ? delar.join(" · ") : "matchar alla bankhändelser";
}

/** Antal bankhändelser och senast använd, summerat över mallens alternativ. */
export function mallStatistik(m: Pick<Konteringsmall, "alternativ">): {
  antal: number;
  senastAnvand: string | null;
} {
  let antal = 0;
  let senastAnvand: string | null = null;
  for (const a of m.alternativ) {
    antal += a.antal;
    if (a.senastAnvand && (!senastAnvand || a.senastAnvand > senastAnvand)) senastAnvand = a.senastAnvand;
  }
  return { antal, senastAnvand };
}

/**
 * Alternativets andel: den viktade andelen från senaste mallanalysen, annars
 * andelen av mallens antal. Null om mallen saknar statistik.
 */
export function alternativAndel(
  m: Pick<Konteringsmall, "alternativ">,
  a: Pick<Konteringsmall["alternativ"][number], "antal" | "viktadAndel">
): number | null {
  if (a.viktadAndel !== null) return a.viktadAndel;
  const totalt = mallStatistik(m).antal;
  return totalt > 0 ? a.antal / totalt : null;
}

// --- Ändringslogg ------------------------------------------------------------

/** Ändringsloggens post när användaren skapar en mall. */
export function skapadBeskrivning(m: MallIndata, last: boolean, fmt: Formaterare): string {
  return `Skapad${last ? " och låst" : ""}. Matchning: ${fmt.matchning(m)}. Alternativ: ${m.alternativ.map((a) => fmt.alternativ(a.rader)).join("; ")}`;
}

/**
 * Ändringsloggens post när användaren sparar en befintlig mall, eller null om
 * inget ändrades.
 */
export function andradBeskrivning(
  fore: Konteringsmall,
  efter: MallIndata,
  last: boolean,
  fmt: Formaterare,
  recurringItems: Map<number, string>
): string | null {
  const ut: string[] = [];
  if (fore.namn !== efter.namn) ut.push(`namn «${fore.namn}» → «${efter.namn}»`);
  ut.push(...jamfor(fore, efter, fmt, { andelTolerans: ANDEL_TOLERANS }));
  if (fore.recurringItemId !== efter.recurringItemId) {
    const namn = (id: number | null) => (id === null ? "–" : (recurringItems.get(id) ?? `#${id}`));
    ut.push(`återkommande händelse ${namn(fore.recurringItemId)} → ${namn(efter.recurringItemId)}`);
  }
  if (fore.last !== last) ut.push(last ? "låst" : "upplåst");
  return ut.length ? `Ändrad: ${ut.join("; ")}` : null;
}

// --- Spara som mall ----------------------------------------------------------

/** Formulärets indata för en befintlig mall. */
export function mallTillIndata(m: Konteringsmall): MallIndata {
  return {
    namn: m.namn,
    nyckelord: m.nyckelord,
    ankarAccountId: m.ankarAccountId,
    beloppMin: m.beloppMin,
    beloppMax: m.beloppMax,
    dagIManaden: m.dagIManaden,
    riktning: m.riktning,
    recurringItemId: m.recurringItemId,
    alternativ: m.alternativ.map((a) => ({ rader: a.rader.map((r) => ({ ...r })) })),
  };
}

/**
 * En ny mall ur konteringen i bokföringsformuläret: nyckelorden är orden i
 * bankhändelsens beskrivning och ankarkontot är importens konto, och
 * konteringen blir mallens enda alternativ. Användaren stryker det som inte
 * särskiljer innan mallen sparas.
 */
export function forifylldMall(
  handelse: { beskrivning: string; importAccountId: number | null },
  rader: Konteringsrad[],
  konton: Map<number, KontoInfo>,
  recurringItemId: number | null
): MallIndata | { fel: string } {
  const ifyllda = rader.filter((r) => r.accountId > 0 && (r.debet > 0 || r.kredit > 0));
  const ankare = ankarkontoFor({ importAccountId: handelse.importAccountId, rader: ifyllda }, konton);
  if (ankare === null) {
    return { fel: "Konteringen saknar en rad mot bankhändelsens konto" };
  }
  const alternativ = konteringsraderTillAlternativ(ifyllda, ankare);
  if (!alternativ || !alternativ.some((r) => r.sida === "motsatt")) {
    return { fel: "Konteringen saknar motkonto och kan inte sparas som mall" };
  }
  const nyckelord = [...new Set(tokeniseAlpha(handelse.beskrivning))];
  return {
    namn: nyckelord.length ? nyckelord.map(versal).join(" ") : handelse.beskrivning.trim(),
    nyckelord: nyckelord.length ? nyckelord : null,
    ankarAccountId: ankare,
    beloppMin: null,
    beloppMax: null,
    dagIManaden: null,
    riktning: null,
    recurringItemId,
    alternativ: [{ rader: alternativ }],
  };
}
