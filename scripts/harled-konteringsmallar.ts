/**
 * Kör härledningen av konteringsmallar (issue 17) mot dev-databasen och
 * skriver ut resultatet. Sparar ingenting.
 *
 *   npm run mallar:harled:dev
 */

import { Pool } from "pg";

import { harledKonteringsmallar } from "../app/lib/konteringsmallHarledning";
import { DEV_DB_NAME, getDevConnectionString } from "./dev-db";
import { hamtaHistorik, hamtaKonton, hamtaMallar } from "../lib/konteringsmallData";

const pool = new Pool({ connectionString: getDevConnectionString() });

async function main() {
  const [konton, historik, mallar] = await Promise.all([hamtaKonton(pool), hamtaHistorik(pool), hamtaMallar(pool)]);
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
