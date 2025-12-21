"use server";

import { getDatabase } from "@/lib/db";
import { BankEvent, Transaction, Post, Account, Group, Import, AccountType, PeriodLock } from "./types";

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

  // First, get all bank_events from this import with their dates
  const bankEvents = db
    .prepare("SELECT id, date FROM bank_events WHERE import_id = ?")
    .all(id) as Array<{ id: number; date: string }>;

  // Check if any bank events are in locked periods
  for (const event of bankEvents) {
    const eventDate = new Date(event.date);
    const isLocked = await isPeriodLocked(eventDate);
    if (isLocked) {
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth() + 1;
      throw new Error(
        `Kan inte ta bort import. Perioden ${year}-${String(month).padStart(
          2,
          "0"
        )} är låst och innehåller händelser från denna import.`
      );
    }
  }

  // For each bank_event, delete any associated transaction
  for (const event of bankEvents) {
    const txn = db
      .prepare("SELECT id FROM transactions WHERE bank_event_id = ?")
      .get(event.id) as { id: number } | undefined;

    if (txn) {
      // Delete posts first (cascade should handle this, but being explicit)
      db.prepare("DELETE FROM posts WHERE transaction_id = ?").run(txn.id);
      // Delete transaction
      db.prepare("DELETE FROM transactions WHERE id = ?").run(txn.id);
    }
  }

  // Now delete the import (which will cascade delete bank_events)
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
        p.id, p.transaction_id, p.account_id, p.debet, p.kredit, p.description,
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
      debet: number;
      kredit: number;
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
        debet: p.debet,
        kredit: p.kredit,
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
  // Check if period is locked
  await checkPeriodLock(transaction.date);

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
    "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES (?, ?, ?, ?, ?)"
  );

  const insertPosts = db.transaction((posts: Omit<Post, "id">[]) => {
    for (const post of posts) {
      insertPost.run(
        transactionId,
        post.accountId,
        post.debet,
        post.kredit,
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

  // Get transaction date to check lock
  const txn = db
    .prepare("SELECT date FROM transactions WHERE id = ?")
    .get(id) as { date: string } | undefined;

  if (!txn) {
    throw new Error("Transaktion hittades inte");
  }

  // Check if period is locked
  await checkPeriodLock(new Date(txn.date));

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
        COALESCE(SUM(p.debet), 0) as total_debet,
        COALESCE(SUM(p.kredit), 0) as total_kredit
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
    total_debet: number;
    total_kredit: number;
  }>;

  return rows.map((row) => {
    // Calculate balance based on account type's natural balance
    // Tillgång (Assets) and Utgift (Expenses): Debit balance (debet - kredit)
    // Skuld (Liabilities) and Intäkt (Revenue): Credit balance (kredit - debet)
    let balance: number;
    const accountType = row.group_type as AccountType;

    if (accountType === "Tillgång" || accountType === "Utgift") {
      // Debit balance accounts
      balance = row.total_debet - row.total_kredit;
    } else {
      // Credit balance accounts (Skuld, Intäkt)
      balance = row.total_kredit - row.total_debet;
    }

    return {
      accountId: row.account_id,
      accountName: row.account_name,
      groupId: row.group_id,
      groupName: row.group_name,
      groupType: accountType,
      balance: balance,
    };
  });
}

// Get transactions for a specific account in a specific period
export async function getAccountTransactionsForPeriod(
  accountId: number,
  year: number,
  month: number
): Promise<{
  transactionId: number;
  date: Date;
  description: string;
  postDebet: number;
  postKredit: number;
  postDescription: string | null;
}[]> {
  const db = getDatabase();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = db
    .prepare(
      `
      SELECT
        t.id as transaction_id,
        t.date,
        t.description,
        p.debet as post_debet,
        p.kredit as post_kredit,
        p.description as post_description
      FROM transactions t
      JOIN posts p ON p.transaction_id = t.id
      WHERE p.account_id = ?
        AND t.date >= ?
        AND t.date <= ?
      ORDER BY t.date DESC, t.id DESC
    `
    )
    .all(accountId, startDate.toISOString(), endDate.toISOString()) as Array<{
    transaction_id: number;
    date: string;
    description: string;
    post_debet: number;
    post_kredit: number;
    post_description: string | null;
  }>;

  return rows.map((row) => ({
    transactionId: row.transaction_id,
    date: new Date(row.date),
    description: row.description,
    postDebet: row.post_debet,
    postKredit: row.post_kredit,
    postDescription: row.post_description,
  }));
}

// Get all transactions with full details
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = getDatabase();

  const transactionRows = db
    .prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC")
    .all() as Array<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
    created_at: string;
  }>;

  const transactions: Transaction[] = [];

  for (const txnRow of transactionRows) {
    const postRows = db
      .prepare(
        `
        SELECT p.*, a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
        FROM posts p
        JOIN accounts a ON a.id = p.account_id
        JOIN groups g ON g.id = a.group_id
        WHERE p.transaction_id = ?
        ORDER BY p.id
      `
      )
      .all(txnRow.id) as Array<{
      id: number;
      transaction_id: number;
      account_id: number;
      debet: number;
      kredit: number;
      description: string | null;
      account_name: string;
      group_id: number;
      group_name: string;
      group_type: string;
    }>;

    const posts: Post[] = postRows.map((postRow) => ({
      id: postRow.id,
      transactionId: postRow.transaction_id,
      accountId: postRow.account_id,
      debet: postRow.debet,
      kredit: postRow.kredit,
      description: postRow.description ?? undefined,
      account: {
        id: postRow.account_id,
        namn: postRow.account_name,
        groupId: postRow.group_id,
        group: {
          id: postRow.group_id,
          namn: postRow.group_name,
          typ: postRow.group_type as AccountType,
        },
      },
    }));

    transactions.push({
      id: txnRow.id,
      date: new Date(txnRow.date),
      description: txnRow.description,
      bankEventId: txnRow.bank_event_id ?? undefined,
      posts,
    });
  }

  return transactions;
}

// Get a single transaction with full details
export async function getTransaction(id: number): Promise<Transaction | null> {
  const db = getDatabase();

  const txnRow = db
    .prepare("SELECT * FROM transactions WHERE id = ?")
    .get(id) as {
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
    created_at: string;
  } | undefined;

  if (!txnRow) return null;

  const postRows = db
    .prepare(
      `
      SELECT p.*, a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
      FROM posts p
      JOIN accounts a ON a.id = p.account_id
      JOIN groups g ON g.id = a.group_id
      WHERE p.transaction_id = ?
      ORDER BY p.id
    `
    )
    .all(txnRow.id) as Array<{
    id: number;
    transaction_id: number;
    account_id: number;
    debet: number;
    kredit: number;
    description: string | null;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
  }>;

  const posts: Post[] = postRows.map((postRow) => ({
    id: postRow.id,
    transactionId: postRow.transaction_id,
    accountId: postRow.account_id,
    debet: postRow.debet,
    kredit: postRow.kredit,
    description: postRow.description ?? undefined,
    account: {
      id: postRow.account_id,
      namn: postRow.account_name,
      groupId: postRow.group_id,
      group: {
        id: postRow.group_id,
        namn: postRow.group_name,
        typ: postRow.group_type as AccountType,
      },
    },
  }));

  return {
    id: txnRow.id,
    date: new Date(txnRow.date),
    description: txnRow.description,
    bankEventId: txnRow.bank_event_id ?? undefined,
    posts,
  };
}

// Update a transaction
export async function updateTransaction(
  id: number,
  data: {
    date: Date;
    description: string;
    posts: Array<{
      id?: number;
      accountId: number;
      debet: number;
      kredit: number;
      description?: string;
    }>;
  }
): Promise<void> {
  const db = getDatabase();

  // Get current transaction date to check if original period is locked
  const currentTxn = db
    .prepare("SELECT date FROM transactions WHERE id = ?")
    .get(id) as { date: string } | undefined;

  if (!currentTxn) {
    throw new Error("Transaktion hittades inte");
  }

  // Check if original period is locked
  await checkPeriodLock(new Date(currentTxn.date));

  // Check if new period is locked (if date is changing)
  if (data.date.toISOString() !== currentTxn.date) {
    await checkPeriodLock(data.date);
  }

  // Validate that debits and credits balance
  const totalDebet = data.posts.reduce((acc, post) => acc + post.debet, 0);
  const totalKredit = data.posts.reduce((acc, post) => acc + post.kredit, 0);
  if (Math.abs(totalDebet - totalKredit) > 0.001) {
    throw new Error("Debet och kredit måste vara lika");
  }

  // Update transaction
  db.prepare("UPDATE transactions SET date = ?, description = ? WHERE id = ?").run(
    data.date.toISOString(),
    data.description,
    id
  );

  // Delete existing posts
  db.prepare("DELETE FROM posts WHERE transaction_id = ?").run(id);

  // Insert new posts
  const insertPost = db.prepare(
    "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES (?, ?, ?, ?, ?)"
  );

  const insertPosts = db.transaction((posts: typeof data.posts) => {
    for (const post of posts) {
      insertPost.run(id, post.accountId, post.debet, post.kredit, post.description ?? null);
    }
  });

  insertPosts(data.posts);
}

// Period Locks
export async function getPeriodLocks(): Promise<PeriodLock[]> {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM period_locks ORDER BY year DESC, month DESC")
    .all() as Array<{
    id: number;
    year: number;
    month: number;
    locked_at: string;
    locked_by: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    lockedAt: new Date(row.locked_at),
    lockedBy: row.locked_by ?? undefined,
  }));
}

export async function isPeriodLocked(date: Date): Promise<boolean> {
  const db = getDatabase();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const lock = db
    .prepare("SELECT id FROM period_locks WHERE year = ? AND month = ?")
    .get(year, month);

  return lock !== undefined;
}

export async function lockPeriod(year: number, month: number, lockedBy?: string): Promise<void> {
  const db = getDatabase();

  // Check if already locked
  const existing = db
    .prepare("SELECT id FROM period_locks WHERE year = ? AND month = ?")
    .get(year, month);

  if (existing) {
    throw new Error(`Perioden ${year}-${String(month).padStart(2, "0")} är redan låst`);
  }

  db.prepare(
    "INSERT INTO period_locks (year, month, locked_by) VALUES (?, ?, ?)"
  ).run(year, month, lockedBy ?? null);
}

export async function unlockPeriod(year: number, month: number): Promise<void> {
  const db = getDatabase();

  db.prepare("DELETE FROM period_locks WHERE year = ? AND month = ?").run(year, month);
}

// Helper function to check if a transaction date is in a locked period
async function checkPeriodLock(date: Date): Promise<void> {
  const isLocked = await isPeriodLocked(date);
  if (isLocked) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    throw new Error(
      `Kan inte ändra transaktion. Perioden ${year}-${String(month).padStart(2, "0")} är låst.`
    );
  }
}
