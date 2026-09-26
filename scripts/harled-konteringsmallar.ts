/**
 * Kör härledningen av konteringsmallar (issue 17) mot dev-databasen och
 * skriver ut resultatet. Sparar ingenting.
 *
 *   npm run mallar:harled:dev
 */

import { Pool } from "pg";

import {
  HistoriskHandelse,
  KontoInfo,
  Kontotyp,
  harledKonteringsmallar,
} from "../app/lib/konteringsmallHarledning";
import {
  DagForankring,
  Konteringsmall,
  MallStatus,
  MallUrsprung,
  Riktning,
  Sida,
} from "../app/lib/konteringsmallUtils";
import { DEV_DB_NAME, getDevConnectionString } from "./dev-db";

const pool = new Pool({ connectionString: getDevConnectionString() });

async function hamtaKonton(): Promise<Map<number, KontoInfo>> {
  const { rows } = await pool.query<{ id: number; namn: string; grupp: string; typ: Kontotyp }>(
    `SELECT a.id, a.namn, g.namn AS grupp, g.typ FROM accounts a JOIN groups g ON g.id = a.group_id`
  );
  return new Map(rows.map((r) => [r.id, { namn: r.namn, grupp: r.grupp, typ: r.typ }]));
}

async function hamtaHistorik(): Promise<HistoriskHandelse[]> {
  const { rows: handelser } = await pool.query<{
    bank_event_id: number;
    verifikat_id: number;
    datum: string;
    beskrivning: string;
    belopp: string;
    import_account_id: number | null;
    periodiserad: boolean;
  }>(
    `SELECT be.id AS bank_event_id,
            t.id AS verifikat_id,
            to_char(be.date, 'YYYY-MM-DD') AS datum,
            be.description AS beskrivning,
            be.amount AS belopp,
            i.account_id AS import_account_id,
            (t.periodisering_parent_id IS NOT NULL
              OR EXISTS (SELECT 1 FROM transactions c WHERE c.periodisering_parent_id = t.id)
            ) AS periodiserad
       FROM bank_events be
       JOIN transactions t ON t.id = be.transaction_id
       LEFT JOIN imports i ON i.id = be.import_id
      ORDER BY be.id`
  );
  const { rows: poster } = await pool.query<{
    verifikat_id: number;
    account_id: number;
    debet: string;
    kredit: string;
  }>(
    `SELECT transaction_id AS verifikat_id, account_id, debet, kredit
       FROM posts
      WHERE transaction_id = ANY($1)`,
    [handelser.map((h) => h.verifikat_id)]
  );
  const raderPerVerifikat = new Map<number, HistoriskHandelse["rader"]>();
  for (const p of poster) {
    const rader = raderPerVerifikat.get(p.verifikat_id) ?? [];
    rader.push({ accountId: p.account_id, debet: Number(p.debet), kredit: Number(p.kredit) });
    raderPerVerifikat.set(p.verifikat_id, rader);
  }
  return handelser.map((h) => ({
    bankEventId: h.bank_event_id,
    datum: h.datum,
    beskrivning: h.beskrivning,
    belopp: Number(h.belopp),
    importAccountId: h.import_account_id,
    periodiserad: h.periodiserad,
    rader: raderPerVerifikat.get(h.verifikat_id) ?? [],
  }));
}

async function hamtaMallar(): Promise<Konteringsmall[]> {
  const { rows: mallar } = await pool.query<{
    id: number;
    namn: string;
    ursprung: MallUrsprung;
    last: boolean;
    status: MallStatus;
    nyckelord: string[] | null;
    ankar_account_id: number | null;
    belopp_min: string | null;
    belopp_max: string | null;
    dag_forankring: DagForankring | null;
    dag: number | null;
    dag_fonster: number | null;
    riktning: Riktning | null;
    recurring_item_id: number | null;
  }>(`SELECT * FROM konteringsmallar ORDER BY id`);
  const { rows: alternativ } = await pool.query<{
    id: number;
    mall_id: number;
    antal: number;
    viktad_andel: string | null;
    senast_anvand: string | null;
  }>(
    `SELECT id, mall_id, antal, viktad_andel, to_char(senast_anvand, 'YYYY-MM-DD') AS senast_anvand
       FROM konteringsalternativ ORDER BY id`
  );
  const { rows: rader } = await pool.query<{
    alternativ_id: number;
    account_id: number;
    sida: Sida;
    andel: string;
  }>(`SELECT alternativ_id, account_id, sida, andel FROM konteringsalternativ_rader ORDER BY id`);

  const tal = (v: string | null) => (v === null ? null : Number(v));
  return mallar.map((m) => ({
    id: m.id,
    namn: m.namn,
    ursprung: m.ursprung,
    last: m.last,
    status: m.status,
    nyckelord: m.nyckelord,
    ankarAccountId: m.ankar_account_id,
    beloppMin: tal(m.belopp_min),
    beloppMax: tal(m.belopp_max),
    dagIManaden:
      m.dag_forankring === null
        ? null
        : { forankring: m.dag_forankring, dag: m.dag!, fonster: m.dag_fonster! },
    riktning: m.riktning,
    recurringItemId: m.recurring_item_id,
    alternativ: alternativ
      .filter((a) => a.mall_id === m.id)
      .map((a) => ({
        id: a.id,
        mallId: a.mall_id,
        antal: a.antal,
        viktadAndel: tal(a.viktad_andel),
        senastAnvand: a.senast_anvand,
        rader: rader
          .filter((r) => r.alternativ_id === a.id)
          .map((r) => ({ accountId: r.account_id, sida: r.sida, andel: Number(r.andel) })),
      })),
  }));
}

async function main() {
  const [konton, historik, mallar] = await Promise.all([hamtaKonton(), hamtaHistorik(), hamtaMallar()]);
  const start = Date.now();
  const resultat = harledKonteringsmallar(historik, mallar, konton);
  const tid = Date.now() - start;

  const { analys, andringar, oforandrade, blockerade } = resultat;
  console.log(`Databas: ${DEV_DB_NAME} (inget sparas)`);
  console.log(
    `Historik: ${analys.antalHandelser} bankhändelser ${analys.historikFran ?? "–"} – ${analys.historikTill ?? "–"}, ${analys.antalUteslutna} uteslutna, ${tid} ms`
  );
  console.log(`Befintliga mallar: ${mallar.length}\n`);

  const namn = (id: number) => mallar.find((m) => m.id === id)?.namn ?? `#${id}`;
  for (const a of andringar) {
    if (a.typ === "skapa") console.log(`+ ${a.mall.namn}\n    ${a.beskrivning}`);
    else if (a.typ === "justera") console.log(`~ #${a.mallId} ${a.mall.namn}\n    ${a.beskrivning}`);
    else console.log(`- #${a.mallId} ${namn(a.mallId)}\n    ${a.beskrivning}`);
  }
  for (const b of blockerade) console.log(`! ${b.mall.namn}\n    ${b.beskrivning}`);

  const antal = (typ: string) => andringar.filter((a) => a.typ === typ).length;
  console.log(
    `\n${antal("skapa")} skapas, ${antal("justera")} justeras, ${antal("ta_bort")} tas bort, ${oforandrade.length} oförändrade, ${blockerade.length} blockerade`
  );
  const tackta = new Set(
    andringar.flatMap((a) => (a.typ === "ta_bort" ? [] : a.mall.bankEventIds))
  );
  console.log(
    `Härledda mallar täcker ${tackta.size} av ${analys.antalHandelser} bankhändelser (${Math.round((tackta.size / Math.max(analys.antalHandelser, 1)) * 100)} %)`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
