import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const r = await pool.query(
    `SELECT p.id, p.account_id, a.namn, g.typ,
            p.debet::text AS debet, p.kredit::text AS kredit, p.description
     FROM posts p
     JOIN accounts a ON a.id = p.account_id
     JOIN groups g ON g.id = a.group_id
     WHERE p.transaction_id = 466
     ORDER BY p.id`
  );
  console.log('Verifikat #466 "Rusta - 7 Uppsala Bola" 2026-03-28:');
  for (const p of r.rows)
    console.log(
      `  post#${p.id} konto#${p.account_id} ${p.namn} (${p.typ}) | debet=${p.debet} kredit=${p.kredit} | ${p.description ?? ""}`
    );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
