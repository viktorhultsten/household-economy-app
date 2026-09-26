// Mallanalysen (issue 21, ADR-0010): den nattliga körningen av härledningen.
// Här ligger de rena delarna — statistik per alternativ och körningens
// sammanfattning. Databasdelen ligger i lib/mallanalys.ts.

import { HarledningResultat, Matchning, Observation, matchar } from "./konteringsmallHarledning";
import { SANNOLIKHET_PARAMETRAR } from "./konteringsmallSannolikhet";
import { AlternativRad, alternativNyckel } from "./konteringsmallUtils";

export interface AlternativStatistik {
  /** Historiska bankhändelser konterade enligt alternativet, speglingar inräknade. */
  antal: number;
  /** Nyhetsviktad andel av mallens underlag, null om mallen saknar underlag. */
  viktadAndel: number | null;
  senastAnvand: string | null;
}

const DAG_MS = 24 * 60 * 60 * 1000;

const avrunda6 = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * Statistik per alternativ ur mallens underlag, dvs. de historiska
 * bankhändelser mallen matchar. Andelen räknas mot hela underlaget, så att
 * bankhändelser som konterats på annat sätt (outliers) sänker den. Nyare
 * bokföringar väger tyngre, med samma halveringstid som sannolikhetsmodellen.
 */
export function alternativStatistik(
  mall: Matchning & { alternativ: { id: number; rader: AlternativRad[] }[] },
  observationer: Observation[],
  idag: string,
  halveringstidDagar: number = SANNOLIKHET_PARAMETRAR.halveringstidDagar
): Map<number, AlternativStatistik> {
  const underlag = observationer.filter((o) => matchar(mall, o));
  const vikt = (datum: string) => {
    const dagar = (Date.parse(`${idag}T00:00:00Z`) - Date.parse(`${datum}T00:00:00Z`)) / DAG_MS;
    return Math.pow(0.5, Math.max(0, dagar) / halveringstidDagar);
  };
  const totalt = underlag.reduce((s, o) => s + vikt(o.datum), 0);

  return new Map(
    mall.alternativ.map((a) => {
      const nyckel = alternativNyckel(a.rader);
      const egna = underlag.filter((o) => o.nyckel === nyckel);
      const viktat = egna.reduce((s, o) => s + vikt(o.datum), 0);
      return [
        a.id,
        {
          antal: egna.length,
          viktadAndel: totalt > 0 ? avrunda6(viktat / totalt) : null,
          senastAnvand: egna.reduce<string | null>((max, o) => (max === null || o.datum > max ? o.datum : max), null),
        },
      ];
    })
  );
}

export interface KorningSammanfattning {
  antalSkapade: number;
  antalJusterade: number;
  antalBorttagna: number;
  text: string;
}

const antalText = (n: number, en: string, flera: string) => `${n} ${n === 1 ? en : flera}`;

/** Siffrorna och texten som körningsloggen får för en lyckad körning. */
export function sammanfattaKorning(r: HarledningResultat): KorningSammanfattning {
  const antal = (typ: HarledningResultat["andringar"][number]["typ"]) =>
    r.andringar.filter((a) => a.typ === typ).length;
  const antalSkapade = antal("skapa");
  const antalJusterade = antal("justera");
  const antalBorttagna = antal("ta_bort");

  const delar = [
    antalText(antalSkapade, "skapad", "skapade"),
    antalText(antalJusterade, "justerad", "justerade"),
    antalText(antalBorttagna, "borttagen", "borttagna"),
    antalText(r.oforandrade.length, "oförändrad", "oförändrade"),
  ];
  if (r.blockerade.length > 0) {
    delar.push(`${antalText(r.blockerade.length, "blockerad", "blockerade")} av låsta eller inaktiverade mallar`);
  }
  const { analys } = r;
  const historik =
    analys.historikFran === null
      ? "Ingen bokförd historik att analysera."
      : `${antalText(analys.antalHandelser, "bankhändelse", "bankhändelser")} analyserade (${analys.historikFran} – ${analys.historikTill}), ${analys.antalUteslutna} uteslutna.`;
  return {
    antalSkapade,
    antalJusterade,
    antalBorttagna,
    text: `${delar.join(", ")}. ${historik}`,
  };
}
