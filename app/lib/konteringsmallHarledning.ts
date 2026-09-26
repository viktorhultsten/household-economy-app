// Härledning av konteringsmallar ur historiken (issue 17, ADR-0010). Ren och
// deterministisk — inget databasberoende — så att den kan testas direkt och
// köras av mallanalysen.
//
// Översikt:
// 1. Varje verifikat med bankhändelse blir en observation: ankarrad, motkonton
//    relativt ankarraden (så att en spegling är samma alternativ), ord i
//    beskrivningen, belopp, datum och riktning. Periodiseringar utesluts.
// 2. Nyckelord väljs girigt: ordet med flest observationer av sitt vanligaste
//    alternativ först, bland observationer som inget tidigare ord tagit. Ord
//    som inte tillför täckning (t.ex. "maxi" bredvid "ica") blir aldrig egna
//    mallar, och ord utan tydligt mönster (ortnamn, "överföring") avvisas.
// 3. Varje nyckelords observationer delas upp på riktning, ytterligare
//    nyckelord, beloppsintervall och dag i månaden — men bara när delningen
//    skiljer olika konteringsalternativ åt.
// 4. De delar som bär ett mönster blir mallar med sina alternativ; outliers
//    tas inte med.
// 5. De härledda mallarna jämförs med befintliga via vilka historiska
//    bankhändelser de matchar: låsta och inaktiverade blockerar, olåsta
//    justeras på plats, slås ihop eller tas bort.

import { tokeniseAlpha } from "./konteringsforslagUtils";
import {
  AlternativRad,
  DagForankring,
  DagIManaden,
  Konteringsmall,
  Konteringsrad,
  Riktning,
  alternativNyckel,
  konteringsraderTillAlternativ,
  riktningFor,
} from "./konteringsmallUtils";

export type Kontotyp = "Intäkt" | "Utgift" | "Tillgång" | "Skuld";

export interface KontoInfo {
  namn: string;
  /** Gruppens namn — skiljer konton med samma namn åt i beskrivningarna. */
  grupp: string;
  typ: Kontotyp;
}

/** Ett verifikat med bankhändelse, som underlag för härledningen. */
export interface HistoriskHandelse {
  bankEventId: number;
  /** Bankhändelsens datum, YYYY-MM-DD. */
  datum: string;
  beskrivning: string;
  /** Bankhändelsens belopp: positivt är en inbetalning. */
  belopp: number;
  /** Importens konto (bankkonto eller skuldkonto vid extern import). */
  importAccountId: number | null;
  /** Verifikatet ingår i en periodförskjutning eller periodisering. */
  periodiserad: boolean;
  /** Huvudverifikatets konteringsrader. */
  rader: Konteringsrad[];
}

export type Matchning = Pick<
  Konteringsmall,
  "nyckelord" | "ankarAccountId" | "beloppMin" | "beloppMax" | "dagIManaden" | "riktning"
>;

export interface HarlettAlternativ {
  rader: AlternativRad[];
  antal: number;
  /** Andel av mallens historiska bankhändelser (outliers räknas i nämnaren). */
  andel: number;
  senastAnvand: string;
  /** Befintligt alternativ med samma struktur, vid justering av en mall. */
  befintligtId: number | null;
}

export interface HarleddMall extends Matchning {
  namn: string;
  alternativ: HarlettAlternativ[];
  /** Bankhändelserna mallen härleddes ur. */
  bankEventIds: number[];
}

export type Mallandring =
  | { typ: "skapa"; mall: HarleddMall; beskrivning: string }
  | { typ: "justera"; mallId: number; mall: HarleddMall; beskrivning: string }
  | { typ: "ta_bort"; mallId: number; beskrivning: string };

export interface HarledningResultat {
  andringar: Mallandring[];
  /** Olåsta mallar som bekräftades utan ändring. */
  oforandrade: number[];
  /** Härledda mallar som inte skapas eftersom en låst eller inaktiverad mall täcker dem. */
  blockerade: { mall: HarleddMall; blockeradAv: number; beskrivning: string }[];
  analys: {
    antalHandelser: number;
    antalUteslutna: number;
    historikFran: string | null;
    historikTill: string | null;
  };
}

/** Gränserna för härledningen. Kalibreras mot verklig data (issue 18). */
export const HARLEDNING_PARAMETRAR = {
  /** Minsta antal bankhändelser för ett nyckelord, en mall eller en sida i en delning. */
  minStod: 3,
  /** Ett nyckelords vanligaste alternativ måste stå för minst så här stor andel. */
  minRotAndel: 0.5,
  /** En utbruten del måste ha minst så här stor andel av sitt vanligaste alternativ. */
  renAndel: 0.8,
  /** Outlier: färre förekomster än detta… */
  outlierMaxAntal: 5,
  /** …och lägre andel än detta. */
  outlierMaxAndel: 0.15,
  /** Mallens alternativ måste tillsammans täcka minst så här stor andel. */
  tackning: 0.8,
  /** Fler alternativ än så betyder att historiken inte bär ett mönster. */
  maxAlternativ: 4,
  /** Största fönster (± kalenderdagar) för dag i månaden. */
  maxDagFonster: 3,
  /** Högsta antal delningar under ett nyckelord. */
  maxDjup: 4,
  /** Blockering: andel av den härledda mallens bankhändelser som en låst/inaktiverad mall matchar. */
  huvudsak: 0.5,
  /** Identitet: minsta Jaccard-likhet mellan matchade bankhändelser. */
  identitet: 0.5,
  /** Minsta ändring i en split-andel som räknas som en justering. */
  andelTolerans: 0.01,
};

export type HarledningParametrar = typeof HARLEDNING_PARAMETRAR;

// --- Observationer ---------------------------------------------------------

/**
 * En historisk bankhändelse som underlag: bokförd, med ankarrad och
 * alternativ relativt ankarraden. Används även av sannolikhetsmodellen.
 */
export interface Observation {
  bankEventId: number;
  datum: string;
  ord: Set<string>;
  beloppOre: number;
  riktning: Riktning;
  ankarAccountId: number;
  /** Alternativets strukturnyckel — en spegling ger samma nyckel. */
  nyckel: string;
  rader: AlternativRad[];
}

/**
 * Ankarraden: importens konto om verifikatet har en rad på det, annars den
 * enda tillgångsraden. Null om ankaret inte går att avgöra.
 */
export function ankarkontoFor(
  handelse: Pick<HistoriskHandelse, "importAccountId" | "rader">,
  konton: Map<number, KontoInfo>
): number | null {
  const kontoIds = [...new Set(handelse.rader.map((r) => r.accountId))];
  if (handelse.importAccountId !== null && kontoIds.includes(handelse.importAccountId)) {
    return handelse.importAccountId;
  }
  const tillgangar = kontoIds.filter((id) => konton.get(id)?.typ === "Tillgång");
  return tillgangar.length === 1 ? tillgangar[0] : null;
}

export function tillObservationer(historik: HistoriskHandelse[], konton: Map<number, KontoInfo>) {
  const observationer: Observation[] = [];
  let uteslutna = 0;
  for (const h of historik) {
    const ankare = h.periodiserad || h.belopp === 0 ? null : ankarkontoFor(h, konton);
    const rader = ankare === null ? null : konteringsraderTillAlternativ(h.rader, ankare);
    if (ankare === null || !rader || !rader.some((r) => r.sida === "motsatt")) {
      uteslutna++;
      continue;
    }
    observationer.push({
      bankEventId: h.bankEventId,
      datum: h.datum,
      ord: new Set(tokeniseAlpha(h.beskrivning)),
      beloppOre: Math.round(Math.abs(h.belopp) * 100),
      riktning: riktningFor(h.belopp),
      ankarAccountId: ankare,
      nyckel: alternativNyckel(rader),
      rader,
    });
  }
  observationer.sort((a, b) => a.bankEventId - b.bankEventId);
  return { observationer, uteslutna };
}

// --- Matchning -------------------------------------------------------------

const DAG_MS = 24 * 60 * 60 * 1000;

function dagnummer(ar: number, manad: number, dag: number): number {
  return Date.UTC(ar, manad - 1, dag) / DAG_MS;
}

function dagarIManad(ar: number, manad: number): number {
  return new Date(Date.UTC(ar, manad, 0)).getUTCDate();
}

/**
 * Avstånd i kalenderdagar från ett datum till närmaste förväntade dag, över
 * månadsskiften: 30/6 ligger en dag från "dag 1", och 1/3 ligger en dag från
 * "sista dagen" (28/2). Förväntad dag 31 i en kortare månad blir månadens
 * sista dag.
 */
export function dagAvstand(
  datum: string,
  dag: Pick<DagIManaden, "forankring" | "dag">
): number {
  const [ar, manad, d] = datum.split("-").map(Number);
  const t = dagnummer(ar, manad, d);
  let min = Infinity;
  for (const delta of [-1, 0, 1]) {
    const index = ar * 12 + (manad - 1) + delta;
    const a = Math.floor(index / 12);
    const m = (index % 12) + 1;
    const sista = dagarIManad(a, m);
    const forvantad =
      dag.forankring === "borjan"
        ? Math.min(Math.max(dag.dag, 1), sista)
        : Math.max(1, sista - dag.dag);
    min = Math.min(min, Math.abs(t - dagnummer(a, m, forvantad)));
  }
  return min;
}

/** Nyckelorden normaliserade till ord, så att "ICA Maxi" kräver både "ica" och "maxi". */
export function nyckelordsOrd(nyckelord: string[] | null): string[] {
  return [...new Set((nyckelord ?? []).flatMap((n) => tokeniseAlpha(n)))].sort();
}

export type Matchbar = Pick<Observation, "ord" | "beloppOre" | "datum" | "riktning" | "ankarAccountId">;

/** Om en mall matchar en historisk observation (samma semantik som `matcharMall`). */
export function matchar(m: Matchning, o: Matchbar): boolean {
  if (!nyckelordsOrd(m.nyckelord).every((n) => o.ord.has(n))) return false;
  if (m.ankarAccountId !== null && m.ankarAccountId !== o.ankarAccountId) return false;
  if (m.beloppMin !== null && o.beloppOre < Math.round(m.beloppMin * 100)) return false;
  if (m.beloppMax !== null && o.beloppOre > Math.round(m.beloppMax * 100)) return false;
  if (m.dagIManaden && dagAvstand(o.datum, m.dagIManaden) > m.dagIManaden.fonster) return false;
  if (m.riktning !== null && m.riktning !== o.riktning) return false;
  return true;
}

/**
 * Om en mall matchar en bankhändelse. Alla nyckelord måste förekomma i
 * beskrivningen; övriga attribut gäller bara när de är satta. Beloppsintervallet
 * gäller absolutbeloppet, så att en spegling matchar samma intervall.
 */
export function matcharMall(
  m: Matchning,
  handelse: { beskrivning: string; belopp: number; datum: string; ankarAccountId: number | null }
): boolean {
  return matchar(m, {
    ord: new Set(tokeniseAlpha(handelse.beskrivning)),
    beloppOre: Math.round(Math.abs(handelse.belopp) * 100),
    datum: handelse.datum,
    riktning: riktningFor(handelse.belopp),
    ankarAccountId: handelse.ankarAccountId ?? -1,
  });
}

// --- Delning ---------------------------------------------------------------

interface Nod {
  obs: Observation[];
  matchning: Matchning;
}

interface Fordelning {
  dominant: string;
  dominantAntal: number;
}

function fordelning(obs: Observation[]): Fordelning {
  const antal = new Map<string, number>();
  for (const o of obs) antal.set(o.nyckel, (antal.get(o.nyckel) ?? 0) + 1);
  let dominant = "";
  let dominantAntal = 0;
  for (const [nyckel, n] of antal) {
    if (n > dominantAntal || (n === dominantAntal && nyckel < dominant)) {
      dominant = nyckel;
      dominantAntal = n;
    }
  }
  return { dominant, dominantAntal };
}

/**
 * Hittar den delning av noden som bäst skiljer olika konteringsalternativ åt,
 * eller null om inget attribut särskiljer. Vinsten är hur många fler
 * bankhändelser som får sitt vanligaste alternativ efter delningen. Vid lika
 * vinst går riktning före nyckelord, belopp och dag.
 */
function bastaDelning(nod: Nod, p: HarledningParametrar): Nod[] | null {
  const n = nod.obs.length;
  if (n < 2 * p.minStod) return null;
  const foralder = fordelning(nod.obs).dominantAntal;
  let basta: { barn: Nod[]; vinst: number } | null = null;

  const prova = (a: Observation[], b: Observation[], ren: "en" | "bada" | "ingen", barn: () => Nod[]) => {
    if (a.length < p.minStod || b.length < p.minStod) return;
    const fa = fordelning(a);
    const fb = fordelning(b);
    if (fa.dominant === fb.dominant) return;
    if (fa.dominantAntal < p.minStod || fb.dominantAntal < p.minStod) return;
    const arRen = (f: Fordelning, obs: Observation[]) => f.dominantAntal / obs.length >= p.renAndel;
    if (ren !== "ingen" && !arRen(fa, a)) return;
    if (ren === "bada" && !arRen(fb, b)) return;
    const vinst = fa.dominantAntal + fb.dominantAntal - foralder;
    if (vinst > 0 && (!basta || vinst > basta.vinst)) basta = { barn: barn(), vinst };
  };
  const med = (andring: Partial<Matchning>): Matchning => ({ ...nod.matchning, ...andring });

  // Riktning: bara när in- och utbetalningar bokförs olika, inte bara speglat
  // (en spegling har samma alternativ och därmed samma vanligaste alternativ).
  if (nod.matchning.riktning === null) {
    const inObs = nod.obs.filter((o) => o.riktning === "in");
    const utObs = nod.obs.filter((o) => o.riktning === "ut");
    prova(inObs, utObs, "ingen", () => [
      { obs: inObs, matchning: med({ riktning: "in" }) },
      { obs: utObs, matchning: med({ riktning: "ut" }) },
    ]);
  }

  // Ytterligare nyckelord: bryter ut händelser vars ord leder till ett annat
  // alternativ (t.ex. "ica försäkr" bland "ica").
  const befintligaOrd = new Set(nyckelordsOrd(nod.matchning.nyckelord));
  const ordAntal = new Map<string, number>();
  for (const o of nod.obs) for (const w of o.ord) ordAntal.set(w, (ordAntal.get(w) ?? 0) + 1);
  for (const w of [...ordAntal.keys()].sort()) {
    if (befintligaOrd.has(w) || ordAntal.get(w)! < p.minStod) continue;
    const medOrd = nod.obs.filter((o) => o.ord.has(w));
    const utan = nod.obs.filter((o) => !o.ord.has(w));
    prova(medOrd, utan, "en", () => [
      { obs: medOrd, matchning: med({ nyckelord: [...(nod.matchning.nyckelord ?? []), w] }) },
      { obs: utan, matchning: nod.matchning },
    ]);
  }

  // Beloppsintervall: en gräns där båda sidor har var sitt tydligt alternativ.
  const sorterade = [...nod.obs].sort((a, b) => a.beloppOre - b.beloppOre || a.bankEventId - b.bankEventId);
  for (let i = p.minStod; i <= n - p.minStod; i++) {
    const under = sorterade[i - 1].beloppOre;
    const over = sorterade[i].beloppOre;
    if (under === over) continue;
    const grans = Math.floor((under + over) / 2);
    const lag = sorterade.slice(0, i);
    const hog = sorterade.slice(i);
    prova(lag, hog, "bada", () => [
      { obs: lag, matchning: med({ beloppMax: grans / 100 }) },
      { obs: hog, matchning: med({ beloppMin: (grans + 1) / 100 }) },
    ]);
  }

  // Dag i månaden: ett tätt fönster, från månadens början eller slut. Minsta
  // fönster först, så att det tätaste mönstret vinner vid lika vinst.
  if (nod.matchning.dagIManaden === null) {
    const ankare: { forankring: DagForankring; dag: number; avstand: number[] }[] = [];
    for (const forankring of ["borjan", "slut"] as const) {
      const dagar = forankring === "borjan" ? range(1, 31) : range(0, 30);
      for (const dag of dagar) {
        ankare.push({
          forankring,
          dag,
          avstand: nod.obs.map((o) => dagAvstand(o.datum, { forankring, dag })),
        });
      }
    }
    for (let fonster = 0; fonster <= p.maxDagFonster; fonster++) {
      for (const { forankring, dag, avstand } of ankare) {
        const inom = nod.obs.filter((_, i) => avstand[i] <= fonster);
        const utanfor = nod.obs.filter((_, i) => avstand[i] > fonster);
        prova(inom, utanfor, "en", () => [
          { obs: inom, matchning: med({ dagIManaden: { forankring, dag, fonster } }) },
          { obs: utanfor, matchning: nod.matchning },
        ]);
      }
    }
  }

  return basta ? (basta as { barn: Nod[] }).barn : null;
}

function range(fran: number, till: number): number[] {
  return Array.from({ length: till - fran + 1 }, (_, i) => fran + i);
}

function dela(nod: Nod, djup: number, p: HarledningParametrar): Nod[] {
  if (djup >= p.maxDjup) return [nod];
  const barn = bastaDelning(nod, p);
  return barn ? barn.flatMap((b) => dela(b, djup + 1, p)) : [nod];
}

// --- Mallar ur noder -------------------------------------------------------

function median(varden: number[]): number {
  const s = [...varden].sort((a, b) => a - b);
  const mitt = Math.floor(s.length / 2);
  return s.length % 2 ? s[mitt] : (s[mitt - 1] + s[mitt]) / 2;
}

const avrunda6 = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * Alternativets rader med median-andel per motkonto, så att enstaka avvikande
 * split inte slår igenom. Justeras så att motsatt sida minus samma sida blir
 * exakt ankarbeloppet.
 */
function medianRader(obs: Observation[]): AlternativRad[] {
  const rader = obs[0].rader.map((r) => ({
    accountId: r.accountId,
    sida: r.sida,
    andel: median(
      obs.map((o) => o.rader.find((x) => x.accountId === r.accountId && x.sida === r.sida)!.andel)
    ),
  }));
  const netto = rader.reduce((s, r) => s + (r.sida === "motsatt" ? r.andel : -r.andel), 0);
  let storsta = rader.find((r) => r.sida === "motsatt")!;
  for (const r of rader) if (r.sida === "motsatt" && r.andel > storsta.andel) storsta = r;
  storsta.andel += 1 - netto;
  return rader.map((r) => ({ ...r, andel: avrunda6(r.andel) }));
}

function tillMall(nod: Nod, p: HarledningParametrar): HarleddMall | null {
  const n = nod.obs.length;
  if (n < p.minStod) return null;

  const grupper = new Map<string, Observation[]>();
  for (const o of nod.obs) grupper.set(o.nyckel, [...(grupper.get(o.nyckel) ?? []), o]);
  const alternativ = [...grupper]
    .filter(([, obs]) => !(obs.length < p.outlierMaxAntal && obs.length / n < p.outlierMaxAndel))
    .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
  if (alternativ.length === 0 || alternativ.length > p.maxAlternativ) return null;
  const tackt = alternativ.reduce((s, [, obs]) => s + obs.length, 0);
  if (tackt / n < p.tackning) return null;

  return {
    namn: mallnamn(nod.matchning),
    ...nod.matchning,
    alternativ: alternativ.map(([, obs]) => ({
      rader: medianRader(obs),
      antal: obs.length,
      andel: avrunda6(obs.length / n),
      senastAnvand: obs.reduce((max, o) => (o.datum > max ? o.datum : max), obs[0].datum),
      befintligtId: null,
    })),
    bankEventIds: nod.obs.map((o) => o.bankEventId),
  };
}

const TOM_MATCHNING: Matchning = {
  nyckelord: null,
  ankarAccountId: null,
  beloppMin: null,
  beloppMax: null,
  dagIManaden: null,
  riktning: null,
};

/**
 * Väljer nyckelord girigt och härleder mallar under vart och ett. Ett ord
 * prövas bara på de händelser som inget tidigare valt ord tagit, så ett ord
 * som inte tillför täckning blir aldrig en egen mall.
 */
function harledMallar(observationer: Observation[], p: HarledningParametrar): HarleddMall[] {
  const ordObs = new Map<string, Observation[]>();
  for (const o of observationer) {
    for (const w of o.ord) ordObs.set(w, [...(ordObs.get(w) ?? []), o]);
  }
  const kvar = [...ordObs.keys()].filter((w) => ordObs.get(w)!.length >= p.minStod).sort();
  const tagna = new Set<number>();
  const mallar: HarleddMall[] = [];

  while (kvar.length > 0) {
    let bastIndex = -1;
    let bastObs: Observation[] = [];
    let bastDominant = 0;
    kvar.forEach((w, i) => {
      const fria = ordObs.get(w)!.filter((o) => !tagna.has(o.bankEventId));
      const dominant = fria.length ? fordelning(fria).dominantAntal : 0;
      if (dominant > bastDominant) {
        bastIndex = i;
        bastObs = fria;
        bastDominant = dominant;
      }
    });
    if (bastDominant < p.minStod) break;

    const [ord] = kvar.splice(bastIndex, 1);
    if (bastDominant / bastObs.length < p.minRotAndel) continue;

    const nya = dela({ obs: bastObs, matchning: { ...TOM_MATCHNING, nyckelord: [ord] } }, 0, p)
      .map((nod) => tillMall(nod, p))
      .filter((m): m is HarleddMall => m !== null);
    if (nya.length === 0) continue;

    mallar.push(...nya);
    for (const o of bastObs) tagna.add(o.bankEventId);
  }
  return mallar;
}

// --- Samspel med befintliga mallar -----------------------------------------

/**
 * Härleder konteringsmallar ur historiken och jämför dem med de befintliga.
 *
 * - En härledd mall skapas inte om en låst eller inaktiverad mall matchar
 *   huvuddelen av de historiska bankhändelser den skulle matcha.
 * - En olåst mall som matchar i huvudsak samma händelser som en härledd mall
 *   justeras på plats (namnet behålls). Fler olåsta mallar som ryms i samma
 *   härledda mall slås ihop, dvs. tas bort.
 * - En olåst mall med tillräckligt underlag som inte motsvaras av något
 *   mönster i historiken tas bort.
 */
export function harledKonteringsmallar(
  historik: HistoriskHandelse[],
  befintliga: Konteringsmall[],
  konton: Map<number, KontoInfo>,
  p: HarledningParametrar = HARLEDNING_PARAMETRAR
): HarledningResultat {
  const { observationer, uteslutna } = tillObservationer(historik, konton);
  const harledda = harledMallar(observationer, p);
  const fmt = formaterare(konton);

  const matchade = (m: Matchning) =>
    new Set(observationer.filter((o) => matchar(m, o)).map((o) => o.bankEventId));
  const aktuella = befintliga
    .filter((m) => m.status !== "borttagen")
    .sort((a, b) => a.id - b.id);
  const befMatch = new Map(aktuella.map((m) => [m.id, matchade(m)]));
  const blockerande = aktuella.filter((m) => m.last || m.status === "inaktiverad");
  const olasta = aktuella.filter((m) => !m.last && m.status === "aktiv");

  // Blockering från låsta och inaktiverade mallar.
  const blockerade: HarledningResultat["blockerade"] = [];
  const kandidater: { mall: HarleddMall; matchar: Set<number> }[] = [];
  for (const mall of harledda) {
    const egna = matchade(mall);
    let blockerare: Konteringsmall | null = null;
    let bastAndel = 0;
    for (const b of blockerande) {
      const andel = snitt(egna, befMatch.get(b.id)!) / egna.size;
      if (andel >= p.huvudsak && andel > bastAndel) {
        blockerare = b;
        bastAndel = andel;
      }
    }
    if (blockerare) {
      const vad = blockerare.status === "inaktiverad" ? "inaktiverad" : "låst";
      blockerade.push({
        mall,
        blockeradAv: blockerare.id,
        beskrivning: `Skapas inte: skulle i huvudsak matcha samma bankhändelser som ${vad} mall «${blockerare.namn}»`,
      });
    } else {
      kandidater.push({ mall, matchar: egna });
    }
  }

  // Identitet: först par med hög Jaccard-likhet, sedan olåsta mallar som ryms
  // i en härledd mall. En härledd mall övertar högst en befintlig.
  const par = new Map<number, number>(); // kandidatindex → mallId
  const parade = new Set<number>();
  const jaccardPar = kandidater
    .flatMap((k, i) =>
      olasta.map((e) => ({ i, e, likhet: jaccard(k.matchar, befMatch.get(e.id)!) }))
    )
    .filter((x) => x.likhet >= p.identitet)
    .sort((a, b) => b.likhet - a.likhet || a.e.id - b.e.id || a.i - b.i);
  for (const { i, e } of jaccardPar) {
    if (par.has(i) || parade.has(e.id)) continue;
    par.set(i, e.id);
    parade.add(e.id);
  }

  const borttagna: Mallandring[] = [];
  for (const e of olasta) {
    if (parade.has(e.id)) continue;
    const egna = befMatch.get(e.id)!;
    let bast = -1;
    let bastSnitt = 0;
    kandidater.forEach((k, i) => {
      const s = snitt(egna, k.matchar);
      if (s / egna.size >= p.huvudsak && s > bastSnitt) {
        bast = i;
        bastSnitt = s;
      }
    });
    if (bast >= 0) {
      if (!par.has(bast)) {
        par.set(bast, e.id);
        parade.add(e.id);
      } else {
        const ovrig = aktuella.find((m) => m.id === par.get(bast))!;
        borttagna.push({
          typ: "ta_bort",
          mallId: e.id,
          beskrivning: `Borttagen: sammanslagen med «${ovrig.namn}»`,
        });
      }
      continue;
    }
    const tacksAvBlockerare = blockerande.some(
      (b) => egna.size > 0 && snitt(egna, befMatch.get(b.id)!) / egna.size >= p.huvudsak
    );
    if (egna.size >= p.minStod && !tacksAvBlockerare) {
      borttagna.push({
        typ: "ta_bort",
        mallId: e.id,
        beskrivning: `Borttagen: historiken bär inte mallen (${egna.size} matchade bankhändelser utan tydligt mönster)`,
      });
    }
  }

  const andringar: Mallandring[] = [];
  const oforandrade: number[] = [];
  kandidater.forEach(({ mall }, i) => {
    const mallId = par.get(i);
    if (mallId === undefined) {
      andringar.push({
        typ: "skapa",
        mall,
        beskrivning: `Skapad ur ${mall.bankEventIds.length} bankhändelser. Matchning: ${fmt.matchning(mall)}. Alternativ: ${mall.alternativ.map(fmt.alternativMedStatistik).join("; ")}`,
      });
      return;
    }
    const befintlig = aktuella.find((m) => m.id === mallId)!;
    const befintligaAlternativ = new Map(
      befintlig.alternativ.map((a) => [alternativNyckel(a.rader), a])
    );
    const justerad: HarleddMall = {
      ...mall,
      namn: befintlig.namn,
      alternativ: mall.alternativ.map((a) => ({
        ...a,
        befintligtId: befintligaAlternativ.get(alternativNyckel(a.rader))?.id ?? null,
      })),
    };
    const skillnader = jamfor(befintlig, justerad, fmt, p);
    if (skillnader.length === 0) {
      oforandrade.push(mallId);
    } else {
      andringar.push({
        typ: "justera",
        mallId,
        mall: justerad,
        beskrivning: `Justerad: ${skillnader.join("; ")}`,
      });
    }
  });
  andringar.push(...borttagna.sort((a, b) => (a as { mallId: number }).mallId - (b as { mallId: number }).mallId));

  const datum = observationer.map((o) => o.datum).sort();
  return {
    andringar,
    oforandrade: oforandrade.sort((a, b) => a - b),
    blockerade,
    analys: {
      antalHandelser: observationer.length,
      antalUteslutna: uteslutna,
      historikFran: datum[0] ?? null,
      historikTill: datum[datum.length - 1] ?? null,
    },
  };
}

function snitt(a: Set<number>, b: Set<number>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function jaccard(a: Set<number>, b: Set<number>): number {
  const s = snitt(a, b);
  const union = a.size + b.size - s;
  return union === 0 ? 0 : s / union;
}

/** Matchning och alternativ — det två versioner av en mall jämförs på. */
export type Jamforbar = Matchning & { alternativ: { rader: AlternativRad[] }[] };

/** Skillnaderna mellan två versioner av en mall, som text för ändringsloggen. */
export function jamfor(
  fore: Jamforbar,
  efter: Jamforbar,
  fmt: Formaterare,
  p: Pick<HarledningParametrar, "andelTolerans">
): string[] {
  const ut: string[] = [];
  const falt = (etikett: string, a: string, b: string, lika = a === b) => {
    if (!lika) ut.push(`${etikett} ${a} → ${b}`);
  };
  falt(
    "nyckelord",
    fmt.nyckelord(fore.nyckelord),
    fmt.nyckelord(efter.nyckelord),
    nyckelordsOrd(fore.nyckelord).join(" ") === nyckelordsOrd(efter.nyckelord).join(" ")
  );
  falt("ankarkonto", fmt.konto(fore.ankarAccountId), fmt.konto(efter.ankarAccountId));
  falt("belopp", fmt.belopp(fore), fmt.belopp(efter));
  falt("dag i månaden", fmt.dag(fore.dagIManaden), fmt.dag(efter.dagIManaden));
  falt("riktning", fmt.riktning(fore.riktning), fmt.riktning(efter.riktning));

  const foreAlt = new Map(fore.alternativ.map((a) => [alternativNyckel(a.rader), a.rader]));
  const efterAlt = new Map(efter.alternativ.map((a) => [alternativNyckel(a.rader), a.rader]));
  for (const [nyckel, rader] of efterAlt) {
    const tidigare = foreAlt.get(nyckel);
    if (!tidigare) {
      ut.push(`nytt alternativ ${fmt.alternativ(rader)}`);
    } else if (
      rader.some((r) => {
        const t = tidigare.find((x) => x.accountId === r.accountId && x.sida === r.sida)!;
        return Math.abs(t.andel - r.andel) >= p.andelTolerans;
      })
    ) {
      ut.push(`fördelning ${fmt.alternativ(tidigare)} → ${fmt.alternativ(rader)}`);
    }
  }
  for (const [nyckel, rader] of foreAlt) {
    if (!efterAlt.has(nyckel)) ut.push(`alternativ borttaget ${fmt.alternativ(rader)}`);
  }
  return ut;
}

// --- Beskrivningar ---------------------------------------------------------

export const procent = (x: number) => `${Math.round(x * 100)} %`;

export function kronor(belopp: number): string {
  const [hel, ore] = belopp.toFixed(2).split(".");
  const tusental = hel.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${tusental}${ore === "00" ? "" : `,${ore}`} kr`;
}

export function versal(ord: string): string {
  return ord.charAt(0).toUpperCase() + ord.slice(1);
}

function beloppText(m: Pick<Matchning, "beloppMin" | "beloppMax">): string | null {
  if (m.beloppMin !== null && m.beloppMax !== null) return `${kronor(m.beloppMin)}–${kronor(m.beloppMax)}`;
  if (m.beloppMin !== null) return `minst ${kronor(m.beloppMin)}`;
  if (m.beloppMax !== null) return `högst ${kronor(m.beloppMax)}`;
  return null;
}

function dagText(d: DagIManaden | null): string | null {
  if (!d) return null;
  const dag =
    d.forankring === "borjan"
      ? `dag ${d.dag}`
      : d.dag === 0
        ? "månadens sista dag"
        : `${d.dag} dagar före månadsslut`;
  return d.fonster > 0 ? `${dag} ±${d.fonster}` : dag;
}

function mallnamn(m: Matchning): string {
  const bas = (m.nyckelord ?? []).map(versal).join(" ");
  const tillagg = [
    m.riktning === "in" ? "inbetalning" : m.riktning === "ut" ? "utbetalning" : null,
    beloppText(m),
    dagText(m.dagIManaden),
  ].filter((x): x is string => x !== null);
  return tillagg.length ? `${bas} (${tillagg.join(", ")})` : bas;
}

export type Formaterare = ReturnType<typeof formaterare>;

/** Texter för mallar i ändringsloggen och på mallsidan. */
export function formaterare(konton: Map<number, Pick<KontoInfo, "namn" | "grupp">>) {
  const konto = (id: number | null) => {
    if (id === null) return "–";
    const k = konton.get(id);
    return k ? `${k.grupp} / ${k.namn}` : `konto ${id}`;
  };
  const alternativ = (rader: AlternativRad[]) =>
    rader
      .map(
        (r) =>
          `${konto(r.accountId)}${r.sida === "samma" ? " (samma sida)" : ""}${r.andel === 1 ? "" : ` ${procent(r.andel)}`}`
      )
      .join(" + ");
  const nyckelord = (n: string[] | null) => (n && n.length ? n.join(", ") : "–");
  const belopp = (m: Pick<Matchning, "beloppMin" | "beloppMax">) => beloppText(m) ?? "–";
  const dag = (d: DagIManaden | null) => dagText(d) ?? "–";
  const riktning = (r: Riktning | null) => (r === "in" ? "inbetalning" : r === "ut" ? "utbetalning" : "–");
  return {
    konto,
    alternativ,
    nyckelord,
    belopp,
    dag,
    riktning,
    alternativMedStatistik: (a: HarlettAlternativ) =>
      `${alternativ(a.rader)} (${a.antal} st, ${procent(a.andel)})`,
    matchning: (m: Matchning) =>
      [
        `nyckelord ${nyckelord(m.nyckelord)}`,
        m.ankarAccountId !== null ? `ankarkonto ${konto(m.ankarAccountId)}` : null,
        beloppText(m) ? `belopp ${beloppText(m)}` : null,
        dagText(m.dagIManaden),
        m.riktning ? riktning(m.riktning) : null,
      ]
        .filter((x): x is string => x !== null)
        .join(", "),
  };
}
