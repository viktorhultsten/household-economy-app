"use server";

import { getDatabase } from "@/lib/db";
import { BankEvent, Transaction, Post, Account } from "./types";

// Bank Events (CSV imports)
export async function getBankEvents(): Promise<BankEvent[]> {
  const db = getDatabase();

  const rows = db
    .prepare("SELECT * FROM bank_events ORDER BY date DESC")
    .all() as Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    is_posted: number;
    transaction_id: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.date),
    description: row.description,
    amount: row.amount,
    isPosted: row.is_posted === 1,
    transactionId: row.transaction_id ?? undefined,
  }));
}

export async function saveBankEvents(
  events: Omit<BankEvent, "id" | "isPosted" | "transactionId">[]
): Promise<void> {
  const db = getDatabase();

  // Clear existing bank events
  db.prepare("DELETE FROM bank_events").run();

  // Insert new bank events
  const insert = db.prepare(
    "INSERT INTO bank_events (date, description, amount) VALUES (?, ?, ?)"
  );

  const insertMany = db.transaction((evts) => {
    for (const evt of evts) {
      insert.run(evt.date.toISOString(), evt.description, evt.amount);
    }
  });

  insertMany(events);
}

export async function deleteBankEvent(id: number): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM bank_events WHERE id = ?").run(id);
}

// Transactions (accounting entries)
export async function getTransactions(): Promise<Transaction[]> {
  const db = getDatabase();

  const transactions = db
    .prepare("SELECT * FROM transactions ORDER BY date DESC")
    .all() as Array<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
  }>;

  const result: Transaction[] = [];

  for (const txn of transactions) {
    const posts = db
      .prepare(
        `
      SELECT
        p.id, p.transaction_id, p.account_id, p.amount, p.description,
        a.namn, a.grupp, a.typ
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      WHERE p.transaction_id = ?
    `
      )
      .all(txn.id) as Array<{
      id: number;
      transaction_id: number;
      account_id: number;
      amount: number;
      description: string | null;
      namn: string;
      grupp: string;
      typ: string;
    }>;

    result.push({
      id: txn.id,
      date: new Date(txn.date),
      description: txn.description,
      bankEventId: txn.bank_event_id ?? undefined,
      posts: posts.map((p) => ({
        id: p.id,
        transactionId: p.transaction_id,
        accountId: p.account_id,
        amount: p.amount,
        description: p.description ?? undefined,
        account: {
          id: p.account_id,
          namn: p.namn,
          grupp: p.grupp,
          typ: p.typ as "Intäkt" | "Utgift",
        },
      })),
    });
  }

  return result;
}

export async function createTransaction(
  transaction: Omit<Transaction, "id">
): Promise<number> {
  const db = getDatabase();

  const result = db
    .prepare(
      "INSERT INTO transactions (date, description, bank_event_id) VALUES (?, ?, ?)"
    )
    .run(
      transaction.date.toISOString(),
      transaction.description,
      transaction.bankEventId ?? null
    );

  const transactionId = result.lastInsertRowid as number;

  // Insert posts
  const insertPost = db.prepare(
    "INSERT INTO posts (transaction_id, account_id, amount, description) VALUES (?, ?, ?, ?)"
  );

  const insertPosts = db.transaction((posts: Omit<Post, "id">[]) => {
    for (const post of posts) {
      insertPost.run(
        transactionId,
        post.accountId,
        post.amount,
        post.description ?? null
      );
    }
  });

  insertPosts(transaction.posts);

  // If linked to bank event, mark it as posted
  if (transaction.bankEventId) {
    db.prepare(
      "UPDATE bank_events SET is_posted = 1, transaction_id = ? WHERE id = ?"
    ).run(transactionId, transaction.bankEventId);
  }

  return transactionId;
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = getDatabase();

  // Unmark any linked bank event
  db.prepare(
    "UPDATE bank_events SET is_posted = 0, transaction_id = NULL WHERE transaction_id = ?"
  ).run(id);

  // Delete transaction (posts will cascade)
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
