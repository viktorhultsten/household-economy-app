"use server";

import { getDatabase } from "@/lib/db";
import { Transaction, Account } from "./types";

export async function getTransactions(): Promise<Transaction[]> {
  const db = getDatabase();

  const rows = db
    .prepare(`
      SELECT
        t.id, t.date, t.description, t.amount, t.account_id,
        a.id as account_id_full, a.namn, a.grupp, a.typ
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      ORDER BY t.date DESC
    `)
    .all() as Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    account_id: number | null;
    account_id_full: number | null;
    namn: string | null;
    grupp: string | null;
    typ: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.date),
    description: row.description,
    amount: row.amount,
    accountId: row.account_id ?? undefined,
    account: row.account_id_full
      ? {
          id: row.account_id_full,
          namn: row.namn!,
          grupp: row.grupp!,
          typ: row.typ! as "Intäkt" | "Utgift",
        }
      : undefined,
  }));
}

export async function saveTransactions(
  transactions: Omit<Transaction, "id">[]
): Promise<void> {
  const db = getDatabase();

  // Clear existing transactions
  db.prepare("DELETE FROM transactions").run();

  // Insert new transactions
  const insert = db.prepare(
    "INSERT INTO transactions (date, description, amount, account_id) VALUES (?, ?, ?, ?)"
  );

  const insertMany = db.transaction((txns) => {
    for (const txn of txns) {
      insert.run(
        txn.date.toISOString(),
        txn.description,
        txn.amount,
        txn.accountId ?? null
      );
    }
  });

  insertMany(transactions);
}

export async function addTransaction(
  transaction: Omit<Transaction, "id">
): Promise<void> {
  const db = getDatabase();

  db.prepare(
    "INSERT INTO transactions (date, description, amount, account_id) VALUES (?, ?, ?, ?)"
  ).run(
    transaction.date.toISOString(),
    transaction.description,
    transaction.amount,
    transaction.accountId ?? null
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
}

// Account actions
export async function getAccounts(): Promise<Account[]> {
  const db = getDatabase();

  const rows = db
    .prepare("SELECT * FROM accounts ORDER BY grupp, namn")
    .all() as Array<{
    id: number;
    namn: string;
    grupp: string;
    typ: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    namn: row.namn,
    grupp: row.grupp,
    typ: row.typ as "Intäkt" | "Utgift",
  }));
}

export async function addAccount(
  account: Omit<Account, "id">
): Promise<void> {
  const db = getDatabase();

  db.prepare(
    "INSERT INTO accounts (namn, grupp, typ) VALUES (?, ?, ?)"
  ).run(account.namn, account.grupp, account.typ);
}

export async function updateAccount(account: Account): Promise<void> {
  const db = getDatabase();

  db.prepare(
    "UPDATE accounts SET namn = ?, grupp = ?, typ = ? WHERE id = ?"
  ).run(account.namn, account.grupp, account.typ, account.id);
}

export async function deleteAccount(id: number): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
}
