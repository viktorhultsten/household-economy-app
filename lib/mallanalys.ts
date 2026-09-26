/**
 * Mallanalysen (issue 21, ADR-0010): kör härledningen av konteringsmallar mot
 * databasen, sparar ändringarna och uppdaterar statistiken för alla mallar.
 *
 * - Parallella körningar förhindras med ett advisory lock. En körning som
 *   startar medan en annan pågår avbryts och loggas som misslyckad.
 * - Ändringar, statistik och körningens resultat skrivs i en transaktion, så
 *   att en avbruten körning inte lämnar halva ändringar. Körningsloggens post
 *   skrivs före transaktionen, så att även en misslyckad körning syns.
 * - Mallarna låses för skrivning under körningen, så att användarens
 *   ändringar på mallsidan väntar i stället för att skrivas över.
 */

import { Pool, PoolClient } from "pg";

import { HarleddMall, HarledningResultat, harledKonteringsmallar, tillObservationer } from "../app/lib/konteringsmallHarledning";
import { alternativStatistik, sammanfattaKorning } from "../app/lib/mallanalys";
import { hamtaHistorik, hamtaKonton, hamtaMallar } from "./konteringsmallData";

/** Nyckeln för mallanalysens advisory lock (godtycklig, men unik i databasen). */
const LAS_NYCKEL = 210010;

export interface Korningsutfall {
  korningId: number;
  status: "klar" | "fel";
  sammanfattning: string | null;
  fel: string | null;
}

/** Kör mallanalysen. `idag` (YYYY-MM-DD) styr nyhetsviktningen av statistiken. */
export async function korMallanalys(pool: Pool, idag: string): Promise<Korningsutfall> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ las: boolean }>("SELECT pg_try_advisory_lock($1) AS las", [LAS_NYCKEL]);
    if (!rows[0].las) {
      const fel = "Avbruten: en annan mallanalys pågår redan";
      const { rows: korning } = await client.query<{ id: number }>(
        `INSERT INTO mallanalys_korningar (status, avslutad, fel) VALUES ('fel', NOW(), $1) RETURNING id`,
        [fel]
      );
      return { korningId: korning[0].id, status: "fel", sammanfattning: null, fel };
    }
    try {
      return await korMedLas(client, idag);
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LAS_NYCKEL]);
    }
  } finally {
    client.release();
  }
}

async function korMedLas(client: PoolClient, idag: string): Promise<Korningsutfall> {
  // Vi håller låset, så en körning som fortfarande står som pågående
  // avslutades utan att hinna logga (t.ex. att processen dödades).
  await client.query(
    `UPDATE mallanalys_korningar
        SET status = 'fel', avslutad = NOW(), fel = 'Avbruten: körningen avslutades innan den blev klar'
      WHERE status = 'pagar'`
  );
  const { rows } = await client.query<{ id: number }>(
    "INSERT INTO mallanalys_korningar (status) VALUES ('pagar') RETURNING id"
  );
  const korningId = rows[0].id;

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE konteringsmallar IN SHARE ROW EXCLUSIVE MODE");
    const [konton, historik, mallar] = await Promise.all([
      hamtaKonton(client),
      hamtaHistorik(client),
      hamtaMallar(client),
    ]);
    const resultat = harledKonteringsmallar(historik, mallar, konton);
    await sparaAndringar(client, korningId, resultat);
    await uppdateraStatistik(client, historik, konton, idag);

    const sammanfattning = sammanfattaKorning(resultat);
    await client.query(
      `UPDATE mallanalys_korningar
          SET status = 'klar', avslutad = NOW(), historik_fran = $2, historik_till = $3,
              antal_verifikat = $4, antal_skapade = $5, antal_justerade = $6, antal_borttagna = $7,
              sammanfattning = $8
        WHERE id = $1`,
      [
        korningId,
        resultat.analys.historikFran,
        resultat.analys.historikTill,
        resultat.analys.antalHandelser,
        sammanfattning.antalSkapade,
        sammanfattning.antalJusterade,
        sammanfattning.antalBorttagna,
        sammanfattning.text,
      ]
    );
    await client.query("COMMIT");
    return { korningId, status: "klar", sammanfattning: sammanfattning.text, fel: null };
  } catch (err) {
    await client.query("ROLLBACK");
    // Hela stacken till tjänstens logg, meddelandet till körningsloggen.
    console.error(err);
    const fel = err instanceof Error ? err.message : String(err);
    await client.query(
      "UPDATE mallanalys_korningar SET status = 'fel', avslutad = NOW(), fel = $2 WHERE id = $1",
      [korningId, fel]
    );
    return { korningId, status: "fel", sammanfattning: null, fel };
  }
}

function matchningsvarden(m: HarleddMall) {
  return [
    m.nyckelord,
    m.ankarAccountId,
    m.beloppMin,
    m.beloppMax,
    m.dagIManaden?.forankring ?? null,
    m.dagIManaden?.dag ?? null,
    m.dagIManaden?.fonster ?? null,
    m.riktning,
  ];
}

/**
 * Sparar härledningens ändringar och loggar var och en i mallens ändringslogg.
 * Statistiken sätts efteråt, för alla mallar på samma sätt.
 */
async function sparaAndringar(client: PoolClient, korningId: number, resultat: HarledningResultat) {
  const logga = (mallId: number, andring: string) =>
    client.query(
      "INSERT INTO konteringsmall_andringar (mall_id, av, andring, korning_id) VALUES ($1, 'app', $2, $3)",
      [mallId, andring, korningId]
    );

  for (const a of resultat.andringar) {
    if (a.typ === "ta_bort") {
      await client.query(
        "UPDATE konteringsmallar SET status = 'borttagen', updated_at = NOW() WHERE id = $1",
        [a.mallId]
      );
      await logga(a.mallId, a.beskrivning);
      continue;
    }

    let mallId: number;
    if (a.typ === "skapa") {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO konteringsmallar
           (nyckelord, ankar_account_id, belopp_min, belopp_max, dag_forankring, dag, dag_fonster,
            riktning, namn, recurring_item_id, ursprung)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'app')
         RETURNING id`,
        [...matchningsvarden(a.mall), a.mall.namn, a.mall.aterkommande?.id ?? null]
      );
      mallId = rows[0].id;
    } else {
      mallId = a.mallId;
      await client.query(
        `UPDATE konteringsmallar
            SET nyckelord = $1, ankar_account_id = $2, belopp_min = $3, belopp_max = $4,
                dag_forankring = $5, dag = $6, dag_fonster = $7, riktning = $8,
                recurring_item_id = COALESCE($10, recurring_item_id), updated_at = NOW()
          WHERE id = $9`,
        [...matchningsvarden(a.mall), mallId, a.mall.aterkommande?.id ?? null]
      );
    }

    // Alternativ med samma struktur som tidigare behålls, så att deras id
    // (och därmed länkar till dem) består. Raderna skrivs om, eftersom
    // split-andelarna kan ha justerats.
    const behallna: number[] = [];
    for (const alt of a.mall.alternativ) {
      let alternativId = alt.befintligtId;
      if (alternativId !== null) {
        await client.query("DELETE FROM konteringsalternativ_rader WHERE alternativ_id = $1", [alternativId]);
      } else {
        const { rows } = await client.query<{ id: number }>(
          "INSERT INTO konteringsalternativ (mall_id) VALUES ($1) RETURNING id",
          [mallId]
        );
        alternativId = rows[0].id;
      }
      behallna.push(alternativId);
      for (const r of alt.rader) {
        await client.query(
          "INSERT INTO konteringsalternativ_rader (alternativ_id, account_id, sida, andel) VALUES ($1, $2, $3, $4)",
          [alternativId, r.accountId, r.sida, r.andel]
        );
      }
    }
    await client.query("DELETE FROM konteringsalternativ WHERE mall_id = $1 AND id <> ALL($2::int[])", [
      mallId,
      behallna,
    ]);
    await logga(mallId, a.beskrivning);
  }
}

/** Uppdaterar statistiken för alla mallar som inte är borttagna, även låsta och inaktiverade. */
async function uppdateraStatistik(
  client: PoolClient,
  historik: Awaited<ReturnType<typeof hamtaHistorik>>,
  konton: Awaited<ReturnType<typeof hamtaKonton>>,
  idag: string
) {
  const { observationer } = tillObservationer(historik, konton);
  const mallar = (await hamtaMallar(client)).filter((m) => m.status !== "borttagen");

  const ids: number[] = [];
  const antal: number[] = [];
  const andel: (number | null)[] = [];
  const senast: (string | null)[] = [];
  for (const mall of mallar) {
    for (const [id, s] of alternativStatistik(mall, observationer, idag)) {
      ids.push(id);
      antal.push(s.antal);
      andel.push(s.viktadAndel);
      senast.push(s.senastAnvand);
    }
  }
  await client.query(
    `UPDATE konteringsalternativ ka
        SET antal = s.antal, viktad_andel = s.andel, senast_anvand = s.senast
       FROM unnest($1::int[], $2::int[], $3::numeric[], $4::date[]) AS s(id, antal, andel, senast)
      WHERE ka.id = s.id`,
    [ids, antal, andel, senast]
  );
}
