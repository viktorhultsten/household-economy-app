"use server";

import { queryAll, queryOne, query, transaction as dbTransaction } from "@/lib/db";
import { BankEvent, Transaction, Post, Account, Group, Import, AccountType, PeriodLock, BookingTemplate, TemplateRow, RecurringItem, RecurringItemStatus } from "./types";

// Imports (CSV import metadata)
export async function getImports(): Promise<Import[]> {
  const rows = await queryAll<{
    id: number;
    filename: string;
    imported_at: string;
    total_events: number;
    date_range_start: string;
    date_range_end: string;
  }>("SELECT * FROM imports ORDER BY imported_at DESC");

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
  const importRow = await queryOne<{
    id: number;
    filename: string;
    imported_at: string;
    total_events: number;
    date_range_start: string;
    date_range_end: string;
  }>("SELECT * FROM imports WHERE id = $1", [importId]);

  if (!importRow) return null;

  const eventRows = await queryAll<{
    id: number;
    date: string;
    description: string;
    amount: number;
    is_posted: number;
    transaction_id: number | null;
    import_id: number;
  }>("SELECT * FROM bank_events WHERE import_id = $1 ORDER BY date ASC", [importId]);

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
      amount: Number(row.amount),
      isPosted: row.is_posted === 1,
      transactionId: row.transaction_id ?? undefined,
      importId: row.import_id,
    })),
  };
}

export async function deleteImport(id: number): Promise<void> {
  // First, get all bank_events from this import with their dates
  const bankEvents = await queryAll<{ id: number; date: string }>(
    "SELECT id, date FROM bank_events WHERE import_id = $1",
    [id]
  );

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
    const txn = await queryOne<{ id: number }>(
      "SELECT id FROM transactions WHERE bank_event_id = $1",
      [event.id]
    );

    if (txn) {
      // Delete posts first (cascade should handle this, but being explicit)
      await query("DELETE FROM posts WHERE transaction_id = $1", [txn.id]);
      // Delete transaction
      await query("DELETE FROM transactions WHERE id = $1", [txn.id]);
    }
  }

  // Now delete the import (which will cascade delete bank_events)
  await query("DELETE FROM imports WHERE id = $1", [id]);
}

// Bank Events (CSV imports)
export async function getBankEvents(): Promise<BankEvent[]> {
  const rows = await queryAll<{
    id: number;
    date: string;
    description: string;
    amount: number;
    is_posted: number;
    transaction_id: number | null;
    import_id: number | null;
  }>("SELECT * FROM bank_events ORDER BY date DESC");

  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.date),
    description: row.description,
    amount: Number(row.amount),
    isPosted: row.is_posted === 1,
    transactionId: row.transaction_id ?? undefined,
    importId: row.import_id ?? undefined,
  }));
}

export async function saveBankEvents(
  events: Omit<BankEvent, "id" | "isPosted" | "transactionId" | "importId">[],
  filename: string
): Promise<void> {
  if (events.length === 0) return;

  // Calculate date range
  const dates = events.map((e) => e.date.getTime());
  const dateRangeStart = new Date(Math.min(...dates));
  const dateRangeEnd = new Date(Math.max(...dates));

  await dbTransaction(async (client) => {
    // Create import record
    const importResult = await client.query<{ id: number }>(
      "INSERT INTO imports (filename, total_events, date_range_start, date_range_end) VALUES ($1, $2, $3, $4) RETURNING id",
      [filename, events.length, dateRangeStart.toISOString(), dateRangeEnd.toISOString()]
    );

    const importId = importResult.rows[0].id;

    // Insert bank events linked to this import
    for (const evt of events) {
      await client.query(
        "INSERT INTO bank_events (date, description, amount, import_id) VALUES ($1, $2, $3, $4)",
        [evt.date.toISOString(), evt.description, evt.amount, importId]
      );
    }
  });
}

export async function deleteBankEvent(id: number): Promise<void> {
  await query("DELETE FROM bank_events WHERE id = $1", [id]);
}

// Transactions (accounting entries)
export async function getTransactions(): Promise<Transaction[]> {
  const transactions = await queryAll<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
  }>("SELECT * FROM transactions ORDER BY date DESC");

  const result: Transaction[] = [];

  for (const txn of transactions) {
    const posts = await queryAll<{
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
    }>(
      `
      SELECT
        p.id, p.transaction_id, p.account_id, p.debet, p.kredit, p.description,
        a.namn, a.group_id, g.namn as group_namn, g.typ as group_typ
      FROM posts p
      JOIN accounts a ON p.account_id = a.id
      JOIN groups g ON a.group_id = g.id
      WHERE p.transaction_id = $1
    `,
      [txn.id]
    );

    result.push({
      id: txn.id,
      date: new Date(txn.date),
      description: txn.description,
      bankEventId: txn.bank_event_id ?? undefined,
      posts: posts.map((p) => ({
        id: p.id,
        transactionId: p.transaction_id,
        accountId: p.account_id,
        debet: Number(p.debet),
        kredit: Number(p.kredit),
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
  transactionData: Omit<Transaction, "id">
): Promise<number> {
  // Check if period is locked
  await checkPeriodLock(transactionData.date);

  return await dbTransaction(async (client) => {
    const result = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, bank_event_id) VALUES ($1, $2, $3) RETURNING id",
      [
        transactionData.date.toISOString(),
        transactionData.description,
        transactionData.bankEventId ?? null,
      ]
    );

    const transactionId = result.rows[0].id;

    // Insert posts
    for (const post of transactionData.posts) {
      await client.query(
        "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES ($1, $2, $3, $4, $5)",
        [transactionId, post.accountId, post.debet, post.kredit, post.description ?? null]
      );
    }

    // If linked to bank event, mark it as posted
    if (transactionData.bankEventId) {
      await client.query(
        "UPDATE bank_events SET is_posted = 1, transaction_id = $1 WHERE id = $2",
        [transactionId, transactionData.bankEventId]
      );
    }

    return transactionId;
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  // Get transaction date to check lock
  const txn = await queryOne<{ date: string }>(
    "SELECT date FROM transactions WHERE id = $1",
    [id]
  );

  if (!txn) {
    throw new Error("Transaktion hittades inte");
  }

  // Check if period is locked
  await checkPeriodLock(new Date(txn.date));

  // Unmark any linked bank event
  await query(
    "UPDATE bank_events SET is_posted = 0, transaction_id = NULL WHERE transaction_id = $1",
    [id]
  );

  // Delete transaction (posts will cascade)
  await query("DELETE FROM transactions WHERE id = $1", [id]);
}

// Group actions
export async function getGroups(): Promise<Group[]> {
  const rows = await queryAll<{
    id: number;
    namn: string;
    typ: string;
  }>("SELECT * FROM groups ORDER BY namn");

  return rows.map((row) => ({
    id: row.id,
    namn: row.namn,
    typ: row.typ as "Intäkt" | "Utgift",
  }));
}

export async function addGroup(group: Omit<Group, "id">): Promise<number> {
  const result = await query<{ id: number }>(
    "INSERT INTO groups (namn, typ) VALUES ($1, $2) RETURNING id",
    [group.namn, group.typ]
  );

  return result.rows[0].id;
}

export async function updateGroup(group: Group): Promise<void> {
  await query("UPDATE groups SET namn = $1, typ = $2 WHERE id = $3", [
    group.namn,
    group.typ,
    group.id,
  ]);
}

export async function deleteGroup(id: number): Promise<void> {
  await query("DELETE FROM groups WHERE id = $1", [id]);
}

// Account actions
export async function getAccounts(): Promise<Account[]> {
  const rows = await queryAll<{
    id: number;
    namn: string;
    group_id: number;
    group_namn: string;
    group_typ: string;
  }>(
    `SELECT a.id, a.namn, a.group_id, g.namn as group_namn, g.typ as group_typ
     FROM accounts a
     JOIN groups g ON a.group_id = g.id
     ORDER BY g.namn, a.namn`
  );

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
  await query("INSERT INTO accounts (namn, group_id) VALUES ($1, $2)", [
    account.namn,
    account.groupId,
  ]);
}

export async function updateAccount(
  account: Omit<Account, "group">
): Promise<void> {
  await query("UPDATE accounts SET namn = $1, group_id = $2 WHERE id = $3", [
    account.namn,
    account.groupId,
    account.id,
  ]);
}

export async function deleteAccount(id: number): Promise<void> {
  await query("DELETE FROM accounts WHERE id = $1", [id]);
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
  // Calculate start and end dates for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = await queryAll<{
    account_id: number;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
    total_debet: number;
    total_kredit: number;
  }>(
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
    WHERE t.date IS NULL OR (
      -- Balance accounts (Tillgång, Skuld): sum all transactions up to end of month
      -- Result accounts (Intäkt, Utgift): sum only transactions within the month
      CASE
        WHEN g.typ IN ('Tillgång', 'Skuld') THEN t.date <= $1
        WHEN g.typ IN ('Intäkt', 'Utgift') THEN t.date >= $2 AND t.date <= $1
      END
    )
    GROUP BY a.id, a.namn, g.id, g.namn, g.typ
    ORDER BY g.typ, g.namn, a.namn
  `,
    [endDate.toISOString(), startDate.toISOString()]
  );

  return rows.map((row) => {
    // Calculate balance based on account type's natural balance
    // Tillgång (Assets) and Utgift (Expenses): Debit balance (debet - kredit)
    // Skuld (Liabilities) and Intäkt (Revenue): Credit balance (kredit - debet)
    let balance: number;
    const accountType = row.group_type as AccountType;

    if (accountType === "Tillgång" || accountType === "Utgift") {
      // Debit balance accounts
      balance = Number(row.total_debet) - Number(row.total_kredit);
    } else {
      // Credit balance accounts (Skuld, Intäkt)
      balance = Number(row.total_kredit) - Number(row.total_debet);
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
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = await queryAll<{
    transaction_id: number;
    date: string;
    description: string;
    post_debet: number;
    post_kredit: number;
    post_description: string | null;
  }>(
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
    WHERE p.account_id = $1
      AND t.date >= $2
      AND t.date <= $3
    ORDER BY t.date DESC, t.id DESC
  `,
    [accountId, startDate.toISOString(), endDate.toISOString()]
  );

  return rows.map((row) => ({
    transactionId: row.transaction_id,
    date: new Date(row.date),
    description: row.description,
    postDebet: Number(row.post_debet),
    postKredit: Number(row.post_kredit),
    postDescription: row.post_description,
  }));
}

// Get all transactions with full details
export async function getAllTransactions(): Promise<Transaction[]> {
  // Get total count for pagination info
  const countResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions"
  );
  const totalCount = countResult?.count || 0;

  // Optimized query using JOINs instead of N+1 queries
  const rows = await queryAll<{
    // Transaction fields
    txn_id: number;
    txn_date: string;
    txn_description: string;
    txn_bank_event_id: number | null;
    // Post fields
    post_id: number;
    post_account_id: number;
    post_debet: string;
    post_kredit: string;
    post_description: string | null;
    // Account fields
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
    // Bank event fields (nullable)
    be_id: number | null;
    be_date: string | null;
    be_description: string | null;
    be_amount: string | null;
    be_is_posted: number | null;
    be_transaction_id: number | null;
    be_import_id: number | null;
  }>(`
    SELECT
      t.id as txn_id,
      t.date as txn_date,
      t.description as txn_description,
      t.bank_event_id as txn_bank_event_id,
      p.id as post_id,
      p.account_id as post_account_id,
      p.debet as post_debet,
      p.kredit as post_kredit,
      p.description as post_description,
      a.namn as account_name,
      g.id as group_id,
      g.namn as group_name,
      g.typ as group_type,
      be.id as be_id,
      be.date as be_date,
      be.description as be_description,
      be.amount as be_amount,
      be.is_posted as be_is_posted,
      be.transaction_id as be_transaction_id,
      be.import_id as be_import_id
    FROM transactions t
    JOIN posts p ON p.transaction_id = t.id
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    LEFT JOIN bank_events be ON be.id = t.bank_event_id
    ORDER BY t.date DESC, t.id DESC, p.id ASC
  `);

  // Group rows by transaction
  const transactionsMap = new Map<number, Transaction>();

  for (const row of rows) {
    if (!transactionsMap.has(row.txn_id)) {
      transactionsMap.set(row.txn_id, {
        id: row.txn_id,
        date: new Date(row.txn_date),
        description: row.txn_description,
        bankEventId: row.txn_bank_event_id ?? undefined,
        bankEvent: row.be_id
          ? {
              id: row.be_id,
              date: new Date(row.be_date!),
              description: row.be_description!,
              amount: Number(row.be_amount),
              isPosted: row.be_is_posted === 1,
              transactionId: row.be_transaction_id ?? undefined,
              importId: row.be_import_id ?? undefined,
            }
          : undefined,
        posts: [],
      });
    }

    const transaction = transactionsMap.get(row.txn_id)!;
    transaction.posts.push({
      id: row.post_id,
      transactionId: row.txn_id,
      accountId: row.post_account_id,
      debet: Number(row.post_debet),
      kredit: Number(row.post_kredit),
      description: row.post_description ?? undefined,
      account: {
        id: row.post_account_id,
        namn: row.account_name,
        groupId: row.group_id,
        group: {
          id: row.group_id,
          namn: row.group_name,
          typ: row.group_type as AccountType,
        },
      },
    });
  }

  return Array.from(transactionsMap.values());
}

export async function getTransactionsPaginated(
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: Transaction[]; total: number }> {
  // Get total count
  const countResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions"
  );
  const total = countResult?.count || 0;

  // Optimized query with LIMIT/OFFSET
  const rows = await queryAll<{
    txn_id: number;
    txn_date: string;
    txn_description: string;
    txn_bank_event_id: number | null;
    post_id: number;
    post_account_id: number;
    post_debet: string;
    post_kredit: string;
    post_description: string | null;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
    be_id: number | null;
    be_date: string | null;
    be_description: string | null;
    be_amount: string | null;
    be_is_posted: number | null;
    be_transaction_id: number | null;
    be_import_id: number | null;
  }>(
    `
    WITH paginated_transactions AS (
      SELECT id, date, description, bank_event_id
      FROM transactions
      ORDER BY date DESC, id DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      t.id as txn_id,
      t.date as txn_date,
      t.description as txn_description,
      t.bank_event_id as txn_bank_event_id,
      p.id as post_id,
      p.account_id as post_account_id,
      p.debet as post_debet,
      p.kredit as post_kredit,
      p.description as post_description,
      a.namn as account_name,
      g.id as group_id,
      g.namn as group_name,
      g.typ as group_type,
      be.id as be_id,
      be.date as be_date,
      be.description as be_description,
      be.amount as be_amount,
      be.is_posted as be_is_posted,
      be.transaction_id as be_transaction_id,
      be.import_id as be_import_id
    FROM paginated_transactions t
    JOIN posts p ON p.transaction_id = t.id
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    LEFT JOIN bank_events be ON be.id = t.bank_event_id
    ORDER BY t.date DESC, t.id DESC, p.id ASC
  `,
    [limit, offset]
  );

  // Group rows by transaction
  const transactionsMap = new Map<number, Transaction>();

  for (const row of rows) {
    if (!transactionsMap.has(row.txn_id)) {
      transactionsMap.set(row.txn_id, {
        id: row.txn_id,
        date: new Date(row.txn_date),
        description: row.txn_description,
        bankEventId: row.txn_bank_event_id ?? undefined,
        bankEvent: row.be_id
          ? {
              id: row.be_id,
              date: new Date(row.be_date!),
              description: row.be_description!,
              amount: Number(row.be_amount),
              isPosted: row.be_is_posted === 1,
              transactionId: row.be_transaction_id ?? undefined,
              importId: row.be_import_id ?? undefined,
            }
          : undefined,
        posts: [],
      });
    }

    const transaction = transactionsMap.get(row.txn_id)!;
    transaction.posts.push({
      id: row.post_id,
      transactionId: row.txn_id,
      accountId: row.post_account_id,
      debet: Number(row.post_debet),
      kredit: Number(row.post_kredit),
      description: row.post_description ?? undefined,
      account: {
        id: row.post_account_id,
        namn: row.account_name,
        groupId: row.group_id,
        group: {
          id: row.group_id,
          namn: row.group_name,
          typ: row.group_type as AccountType,
        },
      },
    });
  }

  return {
    transactions: Array.from(transactionsMap.values()),
    total,
  };
}

// Get a single transaction with full details
export async function getTransaction(id: number): Promise<Transaction | null> {
  const txnRow = await queryOne<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
    created_at: string;
  }>("SELECT * FROM transactions WHERE id = $1", [id]);

  if (!txnRow) return null;

  const postRows = await queryAll<{
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
  }>(
    `
    SELECT p.*, a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
    FROM posts p
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    WHERE p.transaction_id = $1
    ORDER BY p.id
  `,
    [txnRow.id]
  );

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
  // Get current transaction date to check if original period is locked
  const currentTxn = await queryOne<{ date: string }>(
    "SELECT date FROM transactions WHERE id = $1",
    [id]
  );

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

  await dbTransaction(async (client) => {
    // Update transaction
    await client.query("UPDATE transactions SET date = $1, description = $2 WHERE id = $3", [
      data.date.toISOString(),
      data.description,
      id,
    ]);

    // Delete existing posts
    await client.query("DELETE FROM posts WHERE transaction_id = $1", [id]);

    // Insert new posts
    for (const post of data.posts) {
      await client.query(
        "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES ($1, $2, $3, $4, $5)",
        [id, post.accountId, post.debet, post.kredit, post.description ?? null]
      );
    }
  });
}

// Period Locks
export async function getPeriodLocks(): Promise<PeriodLock[]> {
  const rows = await queryAll<{
    id: number;
    year: number;
    month: number;
    locked_at: string;
    locked_by: string | null;
  }>("SELECT * FROM period_locks ORDER BY year DESC, month DESC");

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    lockedAt: new Date(row.locked_at),
    lockedBy: row.locked_by ?? undefined,
  }));
}

export async function isPeriodLocked(date: Date): Promise<boolean> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const lock = await queryOne(
    "SELECT id FROM period_locks WHERE year = $1 AND month = $2",
    [year, month]
  );

  return lock !== null;
}

export async function lockPeriod(year: number, month: number, lockedBy?: string): Promise<void> {
  // Check if already locked
  const existing = await queryOne(
    "SELECT id FROM period_locks WHERE year = $1 AND month = $2",
    [year, month]
  );

  if (existing) {
    throw new Error(`Perioden ${year}-${String(month).padStart(2, "0")} är redan låst`);
  }

  await query(
    "INSERT INTO period_locks (year, month, locked_by) VALUES ($1, $2, $3)",
    [year, month, lockedBy ?? null]
  );
}

export async function unlockPeriod(year: number, month: number): Promise<void> {
  await query("DELETE FROM period_locks WHERE year = $1 AND month = $2", [year, month]);
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

// Booking Templates
export async function getBookingTemplates(): Promise<BookingTemplate[]> {
  const templates = await queryAll<{
    id: number;
    namn: string;
    created_at: string;
  }>("SELECT * FROM booking_templates ORDER BY namn");

  const result: BookingTemplate[] = [];

  for (const template of templates) {
    const rows = await queryAll<{
      id: number;
      template_id: number;
      account_id: number;
      is_debet: boolean;
      description: string | null;
      row_order: number;
      account_name: string;
      group_id: number;
      group_name: string;
      group_type: string;
    }>(
      `
      SELECT tr.*, a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
      FROM template_rows tr
      JOIN accounts a ON a.id = tr.account_id
      JOIN groups g ON g.id = a.group_id
      WHERE tr.template_id = $1
      ORDER BY tr.row_order
    `,
      [template.id]
    );

    result.push({
      id: template.id,
      namn: template.namn,
      createdAt: new Date(template.created_at),
      rows: rows.map((row) => ({
        id: row.id,
        templateId: row.template_id,
        accountId: row.account_id,
        isDebet: row.is_debet,
        description: row.description ?? undefined,
        rowOrder: row.row_order,
        account: {
          id: row.account_id,
          namn: row.account_name,
          groupId: row.group_id,
          group: {
            id: row.group_id,
            namn: row.group_name,
            typ: row.group_type as AccountType,
          },
        },
      })),
    });
  }

  return result;
}

export async function getBookingTemplate(id: number): Promise<BookingTemplate | null> {
  const template = await queryOne<{
    id: number;
    namn: string;
    created_at: string;
  }>("SELECT * FROM booking_templates WHERE id = $1", [id]);

  if (!template) return null;

  const rows = await queryAll<{
    id: number;
    template_id: number;
    account_id: number;
    is_debet: boolean;
    description: string | null;
    row_order: number;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
  }>(
    `
    SELECT tr.*, a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
    FROM template_rows tr
    JOIN accounts a ON a.id = tr.account_id
    JOIN groups g ON g.id = a.group_id
    WHERE tr.template_id = $1
    ORDER BY tr.row_order
  `,
    [template.id]
  );

  return {
    id: template.id,
    namn: template.namn,
    createdAt: new Date(template.created_at),
    rows: rows.map((row) => ({
      id: row.id,
      templateId: row.template_id,
      accountId: row.account_id,
      isDebet: row.is_debet,
      description: row.description ?? undefined,
      rowOrder: row.row_order,
      account: {
        id: row.account_id,
        namn: row.account_name,
        groupId: row.group_id,
        group: {
          id: row.group_id,
          namn: row.group_name,
          typ: row.group_type as AccountType,
        },
      },
    })),
  };
}

export async function createBookingTemplate(
  namn: string,
  rows: Array<{
    accountId: number;
    isDebet: boolean;
    description?: string;
  }>
): Promise<number> {
  return await dbTransaction(async (client) => {
    const result = await client.query<{ id: number }>(
      "INSERT INTO booking_templates (namn) VALUES ($1) RETURNING id",
      [namn]
    );

    const templateId = result.rows[0].id;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      await client.query(
        "INSERT INTO template_rows (template_id, account_id, is_debet, description, row_order) VALUES ($1, $2, $3, $4, $5)",
        [templateId, row.accountId, row.isDebet, row.description ?? null, i]
      );
    }

    return templateId;
  });
}

export async function deleteBookingTemplate(id: number): Promise<void> {
  await query("DELETE FROM booking_templates WHERE id = $1", [id]);
}

export async function updateBookingTemplate(
  id: number,
  namn: string,
  rows: Array<{
    accountId: number;
    isDebet: boolean;
    description?: string;
  }>
): Promise<void> {
  await dbTransaction(async (client) => {
    // Update template name
    await client.query("UPDATE booking_templates SET namn = $1 WHERE id = $2", [namn, id]);

    // Delete existing rows
    await client.query("DELETE FROM template_rows WHERE template_id = $1", [id]);

    // Insert new rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      await client.query(
        "INSERT INTO template_rows (template_id, account_id, is_debet, description, row_order) VALUES ($1, $2, $3, $4, $5)",
        [id, row.accountId, row.isDebet, row.description ?? null, i]
      );
    }
  });
}

// Recurring Items
export async function getRecurringItems(): Promise<RecurringItem[]> {
  const rows = await queryAll<{
    id: number;
    namn: string;
    expected_per_month: number;
    active_months: number[];
    created_at: string;
  }>("SELECT * FROM recurring_items ORDER BY namn");

  return rows.map((row) => ({
    id: row.id,
    namn: row.namn,
    expectedPerMonth: row.expected_per_month,
    activeMonths: row.active_months,
    createdAt: new Date(row.created_at),
  }));
}

export async function createRecurringItem(
  namn: string,
  expectedPerMonth: number,
  activeMonths: number[]
): Promise<number> {
  const result = await query<{ id: number }>(
    "INSERT INTO recurring_items (namn, expected_per_month, active_months) VALUES ($1, $2, $3) RETURNING id",
    [namn, expectedPerMonth, activeMonths]
  );
  return result.rows[0].id;
}

export async function updateRecurringItem(
  id: number,
  namn: string,
  expectedPerMonth: number,
  activeMonths: number[]
): Promise<void> {
  await query(
    "UPDATE recurring_items SET namn = $1, expected_per_month = $2, active_months = $3 WHERE id = $4",
    [namn, expectedPerMonth, activeMonths, id]
  );
}

export async function deleteRecurringItem(id: number): Promise<void> {
  await query("DELETE FROM recurring_items WHERE id = $1", [id]);
}

export async function getRecurringItemsStatus(
  year: number,
  month: number
): Promise<RecurringItemStatus[]> {
  const items = await getRecurringItems();

  // Filter items that are active in the current month
  const activeItems = items.filter((item) => item.activeMonths.includes(month));

  // Calculate start and end dates for current and previous period
  const currentStart = new Date(year, month - 1, 1);
  const currentEnd = new Date(year, month, 0, 23, 59, 59);
  const previousStart = new Date(year, month - 2, 1);
  const previousEnd = new Date(year, month - 1, 0, 23, 59, 59);

  const statuses: RecurringItemStatus[] = [];

  for (const item of activeItems) {
    // Get current period transactions
    const currentTransactions = await queryAll<{
      transaction_id: number;
      total_amount: number;
    }>(
      `SELECT
        tri.transaction_id,
        COALESCE(SUM(p.debet), 0) as total_amount
      FROM transaction_recurring_items tri
      JOIN transactions t ON t.id = tri.transaction_id
      LEFT JOIN posts p ON p.transaction_id = t.id
      WHERE tri.recurring_item_id = $1
        AND t.date >= $2 AND t.date <= $3
      GROUP BY tri.transaction_id`,
      [item.id, currentStart.toISOString(), currentEnd.toISOString()]
    );

    // Get previous period transactions
    const previousTransactions = await queryAll<{
      transaction_id: number;
      total_amount: number;
    }>(
      `SELECT
        tri.transaction_id,
        COALESCE(SUM(p.debet), 0) as total_amount
      FROM transaction_recurring_items tri
      JOIN transactions t ON t.id = tri.transaction_id
      LEFT JOIN posts p ON p.transaction_id = t.id
      WHERE tri.recurring_item_id = $1
        AND t.date >= $2 AND t.date <= $3
      GROUP BY tri.transaction_id`,
      [item.id, previousStart.toISOString(), previousEnd.toISOString()]
    );

    const currentPeriodCount = currentTransactions.length;
    const currentPeriodAmount = currentTransactions.reduce(
      (sum, t) => sum + Number(t.total_amount),
      0
    );
    const previousPeriodCount = previousTransactions.length;
    const previousPeriodAmount = previousTransactions.reduce(
      (sum, t) => sum + Number(t.total_amount),
      0
    );

    statuses.push({
      recurringItem: item,
      currentPeriodCount,
      currentPeriodAmount,
      previousPeriodCount,
      previousPeriodAmount,
      isComplete: currentPeriodCount >= item.expectedPerMonth,
    });
  }

  return statuses;
}

export async function linkTransactionToRecurringItem(
  transactionId: number,
  recurringItemId: number
): Promise<void> {
  await query(
    "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [transactionId, recurringItemId]
  );
}

export async function unlinkTransactionFromRecurringItem(
  transactionId: number,
  recurringItemId: number
): Promise<void> {
  await query(
    "DELETE FROM transaction_recurring_items WHERE transaction_id = $1 AND recurring_item_id = $2",
    [transactionId, recurringItemId]
  );
}

// Get transaction count by month for each recurring item
export async function getRecurringItemMonthlyOverview(
  recurringItemId: number,
  year: number
): Promise<{ month: number; count: number }[]> {
  const rows = await queryAll<{ month: number; count: number }>(
    `
    SELECT
      EXTRACT(MONTH FROM t.date::timestamp)::INTEGER as month,
      COUNT(DISTINCT t.id)::INTEGER as count
    FROM transactions t
    JOIN transaction_recurring_items tri ON tri.transaction_id = t.id
    WHERE tri.recurring_item_id = $1
      AND EXTRACT(YEAR FROM t.date::timestamp) = $2
    GROUP BY EXTRACT(MONTH FROM t.date::timestamp)
    ORDER BY month
    `,
    [recurringItemId, year]
  );

  return rows;
}
