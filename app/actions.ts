"use server";

import { getDatabase } from "@/lib/db";
import { BankEvent, Transaction, Post, Account, Group, Import } from "./types";

// Imports (CSV import metadata)
export async function getImports(): Promise<Import[]> {
  const db = getDatabase();

  const rows = db
    .prepare("SELECT * FROM imports ORDER BY imported_at DESC")
    .all() as Array<{
    id: number;
    filename: string;
    imported_at: string;
    total_events: number;
    date_range_start: string;
    date_range_end: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    importedAt: new Date(row.imported_at),
    totalEvents: row.total_events,
    dateRangeStart: new Date(row.date_range_start),
    dateRangeEnd: new Date(row.date_range_end),
  }));
}

export async function getImportWithEvents(importId: number): Promise<{
  import: Import;
  events: BankEvent[];
} | null> {
  const db = getDatabase();

  const importRow = db
    .prepare("SELECT * FROM imports WHERE id = ?")
    .get(importId) as {
    id: number;
    filename: string;
    imported_at: string;
    total_events: number;
    date_range_start: string;
    date_range_end: string;
  } | undefined;

  if (!importRow) return null;

  const eventRows = db
    .prepare("SELECT * FROM bank_events WHERE import_id = ? ORDER BY date ASC")
    .all(importId) as Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    is_posted: number;
    transaction_id: number | null;
    import_id: number;
  }>;

  return {
    import: {
      id: importRow.id,
      filename: importRow.filename,
      importedAt: new Date(importRow.imported_at),
      totalEvents: importRow.total_events,
      dateRangeStart: new Date(importRow.date_range_start),
      dateRangeEnd: new Date(importRow.date_range_end),
    },
    events: eventRows.map((row) => ({
      id: row.id,
      date: new Date(row.date),
      description: row.description,
      amount: row.amount,
      isPosted: row.is_posted === 1,
      transactionId: row.transaction_id ?? undefined,
      importId: row.import_id,
    })),
  };
}

export async function deleteImport(id: number): Promise<void> {
  const db = getDatabase();
  // Cascade will delete associated bank_events
  db.prepare("DELETE FROM imports WHERE id = ?").run(id);
}

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
    import_id: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.date),
    description: row.description,
    amount: row.amount,
    isPosted: row.is_posted === 1,
    transactionId: row.transaction_id ?? undefined,
    importId: row.import_id ?? undefined,
  }));
}

export async function saveBankEvents(
  events: Omit<BankEvent, "id" | "isPosted" | "transactionId" | "importId">[],
  filename: string
): Promise<void> {
  const db = getDatabase();

  if (events.length === 0) return;

  // Calculate date range
  const dates = events.map((e) => e.date.getTime());
  const dateRangeStart = new Date(Math.min(...dates));
  const dateRangeEnd = new Date(Math.max(...dates));

  // Create import record
  const importResult = db
    .prepare(
      "INSERT INTO imports (filename, total_events, date_range_start, date_range_end) VALUES (?, ?, ?, ?)"
    )
    .run(
      filename,
      events.length,
      dateRangeStart.toISOString(),
      dateRangeEnd.toISOString()
    );

  const importId = importResult.lastInsertRowid as number;

  // Insert bank events linked to this import
  const insert = db.prepare(
    "INSERT INTO bank_events (date, description, amount, import_id) VALUES (?, ?, ?, ?)"
  );

  const insertMany = db.transaction((evts: typeof events) => {
    for (const evt of evts) {
      insert.run(evt.date.toISOString(), evt.description, evt.amount, importId);
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
        a.namn, a.group_id, g.namn as group_namn, g.typ as group_typ
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      JOIN groups g ON a.group_id = g.id
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
      group_id: number;
      group_namn: string;
      group_typ: string;
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
          groupId: p.group_id,
          group: {
            id: p.group_id,
            namn: p.group_namn,
            typ: p.group_typ as "Intäkt" | "Utgift",
          },
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

// Group actions
export async function getGroups(): Promise<Group[]> {
  const db = getDatabase();

  const rows = db
    .prepare("SELECT * FROM groups ORDER BY namn")
    .all() as Array<{
    id: number;
    namn: string;
    typ: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    namn: row.namn,
    typ: row.typ as "Intäkt" | "Utgift",
  }));
}

export async function addGroup(group: Omit<Group, "id">): Promise<number> {
  const db = getDatabase();

  const result = db
    .prepare("INSERT INTO groups (namn, typ) VALUES (?, ?)")
    .run(group.namn, group.typ);

  return result.lastInsertRowid as number;
}

export async function updateGroup(group: Group): Promise<void> {
  const db = getDatabase();

  db.prepare("UPDATE groups SET namn = ?, typ = ? WHERE id = ?").run(
    group.namn,
    group.typ,
    group.id
  );
}

export async function deleteGroup(id: number): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM groups WHERE id = ?").run(id);
}

// Account actions
export async function getAccounts(): Promise<Account[]> {
  const db = getDatabase();

  const rows = db
    .prepare(
      `SELECT a.id, a.namn, a.group_id, g.namn as group_namn, g.typ as group_typ
       FROM accounts a
       JOIN groups g ON a.group_id = g.id
       ORDER BY g.namn, a.namn`
    )
    .all() as Array<{
    id: number;
    namn: string;
    group_id: number;
    group_namn: string;
    group_typ: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    namn: row.namn,
    groupId: row.group_id,
    group: {
      id: row.group_id,
      namn: row.group_namn,
      typ: row.group_typ as "Intäkt" | "Utgift",
    },
  }));
}

export async function addAccount(
  account: Omit<Account, "id" | "group">
): Promise<void> {
  const db = getDatabase();

  db.prepare("INSERT INTO accounts (namn, group_id) VALUES (?, ?)").run(
    account.namn,
    account.groupId
  );
}

export async function updateAccount(
  account: Omit<Account, "group">
): Promise<void> {
  const db = getDatabase();

  db.prepare("UPDATE accounts SET namn = ?, group_id = ? WHERE id = ?").run(
    account.namn,
    account.groupId,
    account.id
  );
}

export async function deleteAccount(id: number): Promise<void> {
  const db = getDatabase();
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
}

// Balance calculation
export async function getAccountBalances(
  year: number,
  month: number
): Promise<{
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  balance: number;
}[]> {
  const db = getDatabase();

  // Calculate start and end dates for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = db
    .prepare(
      `
      SELECT
        a.id as account_id,
        a.namn as account_name,
        g.id as group_id,
        g.namn as group_name,
        g.typ as group_type,
        COALESCE(SUM(p.amount), 0) as balance
      FROM accounts a
      JOIN groups g ON a.group_id = g.id
      LEFT JOIN posts p ON p.account_id = a.id
      LEFT JOIN transactions t ON t.id = p.transaction_id
      WHERE t.date IS NULL OR t.date <= ?
      GROUP BY a.id, a.namn, g.id, g.namn, g.typ
      ORDER BY g.typ, g.namn, a.namn
    `
    )
    .all(endDate.toISOString()) as Array<{
    account_id: number;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
    balance: number;
  }>;

  return rows.map((row) => ({
    accountId: row.account_id,
    accountName: row.account_name,
    groupId: row.group_id,
    groupName: row.group_name,
    groupType: row.group_type as AccountType,
    balance: row.balance,
  }));
}
