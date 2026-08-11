import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ACC = 9;

async function main() {
  // 1. System balance from posts on account 9
  const bal = await pool.query(
    `SELECT COALESCE(SUM(debet - kredit),0)::text AS b, COUNT(*) AS n
     FROM posts WHERE account_id = $1`,
    [ACC]
  );
  console.log(`Systemsaldo konto ${ACC} (SUM debet-kredit): ${bal.rows[0].b}  (${bal.rows[0].n} posts)`);

  // 2. Sum of bank_events on account 9 (non-external imports)
  const be = await pool.query(
    `SELECT COALESCE(SUM(be.amount),0)::text AS s, COUNT(*) AS n
     FROM bank_events be JOIN imports i ON i.id = be.import_id
     WHERE i.is_external = false AND (i.account_id = $1 OR i.account_id IS NULL)`,
    [ACC]
  );
  console.log(`Summa bank_events konto ${ACC}: ${be.rows[0].s}  (${be.rows[0].n} events)`);

  // 3. Per-verifikat: net on account 9 vs the linked bank event amount.
  //    Find where the account-9 booking differs from the bank event amount.
  const mism = await pool.query(
    `SELECT t.id AS txn, t.date::text AS date, t.description,
            p.net::text AS acc9_net, be.amount::text AS be_amount,
            be.id AS be_id, be.description AS be_desc
     FROM (
       SELECT transaction_id, SUM(debet - kredit) AS net
       FROM posts WHERE account_id = $1 GROUP BY transaction_id
     ) p
     JOIN transactions t ON t.id = p.transaction_id
     LEFT JOIN bank_events be ON be.transaction_id = t.id
     WHERE be.id IS NULL OR ABS(p.net - be.amount) > 0.005
     ORDER BY t.date, t.id`,
    [ACC]
  );
  console.log(`\n=== Verifikat där konto-9-bokning ≠ bankhändelse (eller saknar bankhändelse): ${mism.rows.length} ===`);
  let sumMismatch = 0;
  for (const r of mism.rows) {
    const be_amt = r.be_amount == null ? null : parseFloat(r.be_amount);
    const net = parseFloat(r.acc9_net);
    const delta = be_amt == null ? net : net - be_amt;
    sumMismatch += delta;
    console.log(
      `  txn#${r.txn} ${r.date} "${r.description}" | konto9 net=${r.acc9_net} | bankevent=${r.be_amount ?? "(inget)"} ${r.be_id ? "#" + r.be_id : ""} | delta=${delta.toFixed(2)}`
    );
  }
  console.log(`\nSumma delta (bidrag till diff): ${sumMismatch.toFixed(2)}`);

  // 4. Bank events on account 9 that are posted but whose verifikat has NO post on account 9
  const orphan = await pool.query(
    `SELECT be.id, be.date::text AS date, be.description, be.amount::text AS amount, be.transaction_id
     FROM bank_events be JOIN imports i ON i.id = be.import_id
     WHERE i.is_external = false AND (i.account_id = $1 OR i.account_id IS NULL)
       AND be.transaction_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.transaction_id = be.transaction_id AND p.account_id = $1)
     ORDER BY be.date`,
    [ACC]
  );
  console.log(`\n=== Bankhändelser vars verifikat INTE bokför på konto ${ACC}: ${orphan.rows.length} ===`);
  for (const r of orphan.rows)
    console.log(`  event#${r.id} ${r.date} "${r.description}" belopp=${r.amount} txn=${r.transaction_id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
