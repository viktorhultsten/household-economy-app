"use server";

import { queryAll, queryOne, query, transaction as dbTransaction } from "@/lib/db";
import { BankEvent, Transaction, Post, Account, Group, Import, AccountType, PeriodLock, BookingTemplate, TemplateRow, RecurringItem, RecurringItemStatus, Budget, BudgetComparison, CustomResultView, CustomResultViewWithDetails } from "./types";

// Imports (CSV import metadata)
export async function getImports(): Promise<Import[]> {
  const rows = await queryAll<{
    id: number;
    filename: string;
    imported_at: string;
    total_events: number;
    date_range_start: string;
    date_range_end: string;
    posted_events: number;
  }>(
    `
    SELECT
      i.*,
      COALESCE(SUM(CASE WHEN be.is_posted = 1 THEN 1 ELSE 0 END), 0) as posted_events
    FROM imports i
    LEFT JOIN bank_events be ON be.import_id = i.id
    GROUP BY i.id, i.filename, i.imported_at, i.total_events, i.date_range_start, i.date_range_end, i.account_id
    ORDER BY i.imported_at DESC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    importedAt: new Date(row.imported_at),
    totalEvents: row.total_events,
    dateRangeStart: new Date(row.date_range_start),
    dateRangeEnd: new Date(row.date_range_end),
    postedEvents: Number(row.posted_events),
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
  // First, get all bank_events from this import
  const bankEvents = await queryAll<{ id: number; date: string; is_posted: number }>(
    "SELECT id, date, is_posted FROM bank_events WHERE import_id = $1",
    [id]
  );

  // Check if any bank events have been posted (booked)
  const postedEvents = bankEvents.filter(e => e.is_posted === 1);
  if (postedEvents.length > 0) {
    throw new Error(
      `Kan inte ta bort import. ${postedEvents.length} ${postedEvents.length === 1 ? 'händelse' : 'händelser'} har bokförts. Du måste först ta bort ${postedEvents.length === 1 ? 'transaktionen' : 'transaktionerna'} manuellt.`
    );
  }

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

  // Now delete the import (which will cascade delete bank_events)
  // This is safe because we've verified no events are posted
  await query("DELETE FROM imports WHERE id = $1", [id]);
}

// Utility function to clean up orphaned bank event references
export async function cleanupOrphanedBankEvents(): Promise<number> {
  // Find bank events with transaction_id that don't exist in transactions table
  const orphanedEvents = await queryAll<{ id: number }>(
    `
    SELECT be.id
    FROM bank_events be
    WHERE be.transaction_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM transactions t WHERE t.id = be.transaction_id
    )
    `
  );

  if (orphanedEvents.length > 0) {
    // Clean up by setting transaction_id to NULL and is_posted to 0
    await query(
      `
      UPDATE bank_events
      SET transaction_id = NULL, is_posted = 0
      WHERE id = ANY($1)
      `,
      [orphanedEvents.map(e => e.id)]
    );
  }

  return orphanedEvents.length;
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
    import_account_id: number | null;
  }>(`
    SELECT be.*, i.account_id as import_account_id
    FROM bank_events be
    LEFT JOIN imports i ON be.import_id = i.id
    ORDER BY be.date DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    date: new Date(row.date),
    description: row.description,
    amount: Number(row.amount),
    isPosted: row.is_posted === 1,
    transactionId: row.transaction_id ?? undefined,
    importId: row.import_id ?? undefined,
    import: row.import_account_id ? { accountId: row.import_account_id } as Import : undefined,
  }));
}

export async function saveBankEvents(
  events: Omit<BankEvent, "id" | "isPosted" | "transactionId" | "importId">[],
  filename: string,
  accountId?: number
): Promise<void> {
  if (events.length === 0) return;

  // Calculate date range
  const dates = events.map((e) => e.date.getTime());
  const dateRangeStart = new Date(Math.min(...dates));
  const dateRangeEnd = new Date(Math.max(...dates));

  await dbTransaction(async (client) => {
    // Create import record
    const importResult = await client.query<{ id: number }>(
      "INSERT INTO imports (filename, total_events, date_range_start, date_range_end, account_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [filename, events.length, dateRangeStart.toISOString(), dateRangeEnd.toISOString(), accountId || null]
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
  // Check if period is locked for the main transaction
  await checkPeriodLock(transactionData.date);

  // Check if period is locked for the shifted transaction
  if (transactionData.periodShiftDate) {
    await checkPeriodLock(transactionData.periodShiftDate);
  }

  return await dbTransaction(async (client) => {
    // Create the main transaction (at bank event date)
    const result = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, bank_event_id) VALUES ($1, $2, $3) RETURNING id",
      [
        transactionData.date.toISOString(),
        transactionData.description,
        transactionData.bankEventId ?? null,
      ]
    );

    const transactionId = result.rows[0].id;

    // Insert posts for main transaction
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

    // If period shift is enabled, create the second (shifted) transaction
    if (transactionData.periodShiftDate) {
      // Create the shifted transaction with the same posts
      const shiftedResult = await client.query<{ id: number }>(
        `INSERT INTO transactions
         (date, description, original_transaction_id, period_shift_date)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          transactionData.periodShiftDate.toISOString(),
          `${transactionData.description} (periodförskjuten)`,
          transactionId,
          transactionData.periodShiftDate.toISOString(),
        ]
      );

      const shiftedTransactionId = shiftedResult.rows[0].id;

      // Copy the same posts to the shifted transaction
      for (const post of transactionData.posts) {
        await client.query(
          "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES ($1, $2, $3, $4, $5)",
          [shiftedTransactionId, post.accountId, post.debet, post.kredit, post.description ?? null]
        );
      }

      // Return the shifted transaction ID for recurring item linking
      // The recurring item should be linked to the period-shifted transaction, not the original
      return shiftedTransactionId;
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
      COALESCE(SUM(
        CASE
          WHEN t.date IS NULL THEN 0
          WHEN g.typ IN ('Tillgång', 'Skuld') AND t.date <= $1 THEN p.debet
          WHEN g.typ IN ('Intäkt', 'Utgift') AND t.date >= $2 AND t.date <= $1 THEN p.debet
          ELSE 0
        END
      ), 0) as total_debet,
      COALESCE(SUM(
        CASE
          WHEN t.date IS NULL THEN 0
          WHEN g.typ IN ('Tillgång', 'Skuld') AND t.date <= $1 THEN p.kredit
          WHEN g.typ IN ('Intäkt', 'Utgift') AND t.date >= $2 AND t.date <= $1 THEN p.kredit
          ELSE 0
        END
      ), 0) as total_kredit
    FROM accounts a
    JOIN groups g ON a.group_id = g.id
    LEFT JOIN posts p ON p.account_id = a.id
    LEFT JOIN transactions t ON t.id = p.transaction_id
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
// Helper function to fetch recurring items for multiple transactions
async function fetchRecurringItemsForTransactions(transactionIds: number[]): Promise<Map<number, RecurringItem[]>> {
  if (transactionIds.length === 0) return new Map();

  const rows = await queryAll<{
    transaction_id: number;
    id: number;
    namn: string;
    expected_per_month: number;
    active_months: number[];
    created_at: string;
  }>(
    `SELECT tri.transaction_id, ri.*
     FROM recurring_items ri
     JOIN transaction_recurring_items tri ON tri.recurring_item_id = ri.id
     WHERE tri.transaction_id = ANY($1)`,
    [transactionIds]
  );

  const recurringMap = new Map<number, RecurringItem[]>();
  for (const row of rows) {
    if (!recurringMap.has(row.transaction_id)) {
      recurringMap.set(row.transaction_id, []);
    }
    recurringMap.get(row.transaction_id)!.push({
      id: row.id,
      namn: row.namn,
      expectedPerMonth: row.expected_per_month,
      activeMonths: row.active_months,
      createdAt: new Date(row.created_at),
    });
  }

  return recurringMap;
}

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
    txn_original_transaction_id: number | null;
    txn_period_shift_date: string | null;
    txn_bridge_account_id: number | null;
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
      t.original_transaction_id as txn_original_transaction_id,
      t.period_shift_date as txn_period_shift_date,
      t.bridge_account_id as txn_bridge_account_id,
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
        originalTransactionId: row.txn_original_transaction_id ?? undefined,
        periodShiftDate: row.txn_period_shift_date ? new Date(row.txn_period_shift_date) : undefined,
        bridgeAccountId: row.txn_bridge_account_id ?? undefined,
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

  // Fetch recurring items for all transactions
  const transactionIds = Array.from(transactionsMap.keys());
  const recurringMap = await fetchRecurringItemsForTransactions(transactionIds);

  // Add recurring items to transactions
  for (const [txnId, transaction] of transactionsMap) {
    const recurringItems = recurringMap.get(txnId);
    if (recurringItems && recurringItems.length > 0) {
      transaction.recurringItems = recurringItems;
    }
  }

  return Array.from(transactionsMap.values());
}

export async function getTransactionsPaginated(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string,
  sortField: "date" | "description" | "accounts" = "date",
  sortDirection: "asc" | "desc" = "desc",
  filterAccountType?: string,
  filterAccountId?: number,
  filterDateFrom?: string,
  filterDateTo?: string
): Promise<{ transactions: Transaction[]; total: number }> {
  // Build WHERE clauses for filtering
  const whereClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Search filter
  if (searchQuery && searchQuery.trim()) {
    whereClauses.push(
      `(t.description ILIKE $${paramIndex} OR EXISTS (
        SELECT 1 FROM posts p2
        JOIN accounts a2 ON a2.id = p2.account_id
        WHERE p2.transaction_id = t.id AND a2.namn ILIKE $${paramIndex}
      ))`
    );
    params.push(`%${searchQuery.trim()}%`);
    paramIndex++;
  }

  // Date range filters
  if (filterDateFrom) {
    whereClauses.push(`t.date >= $${paramIndex}`);
    params.push(filterDateFrom);
    paramIndex++;
  }

  if (filterDateTo) {
    whereClauses.push(`t.date <= $${paramIndex}`);
    params.push(filterDateTo);
    paramIndex++;
  }

  // Account type filter
  if (filterAccountType && filterAccountType !== "all") {
    whereClauses.push(
      `EXISTS (
        SELECT 1 FROM posts p3
        JOIN accounts a3 ON a3.id = p3.account_id
        JOIN groups g3 ON g3.id = a3.group_id
        WHERE p3.transaction_id = t.id AND g3.typ = $${paramIndex}
      )`
    );
    params.push(filterAccountType);
    paramIndex++;
  }

  // Specific account filter
  if (filterAccountId && filterAccountId !== 0) {
    whereClauses.push(
      `EXISTS (
        SELECT 1 FROM posts p4
        WHERE p4.transaction_id = t.id AND p4.account_id = $${paramIndex}
      )`
    );
    params.push(filterAccountId);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Build ORDER BY clause
  let orderBy = "ORDER BY ";
  if (sortField === "date") {
    orderBy += `t.date ${sortDirection.toUpperCase()}, t.id ${sortDirection.toUpperCase()}`;
  } else if (sortField === "description") {
    orderBy += `t.description ${sortDirection.toUpperCase()}, t.date DESC, t.id DESC`;
  } else if (sortField === "accounts") {
    // Sort by first account name in posts
    orderBy += `(
      SELECT MIN(a.namn)
      FROM posts p
      JOIN accounts a ON a.id = p.account_id
      WHERE p.transaction_id = t.id
    ) ${sortDirection.toUpperCase()}, t.date DESC, t.id DESC`;
  }

  // Get total count with filters
  const countQuery = `
    SELECT COUNT(*) as count
    FROM transactions t
    ${whereClause}
  `;
  const countResult = await queryOne<{ count: number }>(countQuery, params);
  const total = countResult?.count || 0;

  // Optimized query with LIMIT/OFFSET and filters
  params.push(limit);
  const limitParam = paramIndex++;
  params.push(offset);
  const offsetParam = paramIndex++;

  const rows = await queryAll<{
    txn_id: number;
    txn_date: string;
    txn_description: string;
    txn_bank_event_id: number | null;
    txn_original_transaction_id: number | null;
    txn_period_shift_date: string | null;
    txn_bridge_account_id: number | null;
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
      SELECT id, date, description, bank_event_id, original_transaction_id, period_shift_date, bridge_account_id
      FROM transactions t
      ${whereClause}
      ${orderBy}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    )
    SELECT
      t.id as txn_id,
      t.date as txn_date,
      t.description as txn_description,
      t.bank_event_id as txn_bank_event_id,
      t.original_transaction_id as txn_original_transaction_id,
      t.period_shift_date as txn_period_shift_date,
      t.bridge_account_id as txn_bridge_account_id,
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
    ${orderBy}, p.id ASC
  `,
    params
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
        originalTransactionId: row.txn_original_transaction_id ?? undefined,
        periodShiftDate: row.txn_period_shift_date ? new Date(row.txn_period_shift_date) : undefined,
        bridgeAccountId: row.txn_bridge_account_id ?? undefined,
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

  // Fetch recurring items for all transactions
  const transactionIds = Array.from(transactionsMap.keys());
  const recurringMap = await fetchRecurringItemsForTransactions(transactionIds);

  // Add recurring items to transactions
  for (const [txnId, transaction] of transactionsMap) {
    const recurringItems = recurringMap.get(txnId);
    if (recurringItems && recurringItems.length > 0) {
      transaction.recurringItems = recurringItems;
    }
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

  // Fetch recurring items for this transaction
  const recurringRows = await queryAll<{
    id: number;
    namn: string;
    expected_per_month: number;
    active_months: number[];
    created_at: string;
  }>(
    `SELECT ri.*
     FROM recurring_items ri
     JOIN transaction_recurring_items tri ON tri.recurring_item_id = ri.id
     WHERE tri.transaction_id = $1`,
    [txnRow.id]
  );

  const recurringItems: RecurringItem[] = recurringRows.map((row) => ({
    id: row.id,
    namn: row.namn,
    expectedPerMonth: row.expected_per_month,
    activeMonths: row.active_months,
    createdAt: new Date(row.created_at),
  }));

  return {
    id: txnRow.id,
    date: new Date(txnRow.date),
    description: txnRow.description,
    bankEventId: txnRow.bank_event_id ?? undefined,
    posts,
    recurringItems: recurringItems.length > 0 ? recurringItems : undefined,
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

export async function getRecurringItemForTransaction(
  transactionId: number
): Promise<number | null> {
  const result = await queryOne<{ recurring_item_id: number }>(
    "SELECT recurring_item_id FROM transaction_recurring_items WHERE transaction_id = $1",
    [transactionId]
  );
  return result?.recurring_item_id ?? null;
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

export async function updateTransactionRecurringItemLink(
  transactionId: number,
  recurringItemId: number | null
): Promise<void> {
  // First, remove any existing links
  await query(
    "DELETE FROM transaction_recurring_items WHERE transaction_id = $1",
    [transactionId]
  );

  // If a recurring item is selected, create the link
  if (recurringItemId !== null) {
    await query(
      "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2)",
      [transactionId, recurringItemId]
    );
  }
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

// ==================== BUDGETS ====================

// Get all budgets for a specific account and year
export async function getBudgetsForAccount(
  accountId: number,
  year: number
): Promise<Budget[]> {
  const rows = await queryAll<{
    id: number;
    account_id: number;
    year: number;
    month: number;
    amount: number;
    created_at: string;
    updated_at: string;
  }>(
    "SELECT * FROM budgets WHERE account_id = $1 AND year = $2 ORDER BY month",
    [accountId, year]
  );

  return rows.map((row) => ({
    id: row.id,
    accountId: row.account_id,
    year: row.year,
    month: row.month,
    amount: Number(row.amount),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

// Set budgets for all 12 months for a specific account/year
// Uses UPSERT pattern (INSERT ... ON CONFLICT UPDATE)
export async function setBudgetsForYear(
  accountId: number,
  year: number,
  monthlyAmounts: number[] // Array of 12 numbers
): Promise<void> {
  if (monthlyAmounts.length !== 12) {
    throw new Error("Must provide exactly 12 monthly amounts");
  }

  await dbTransaction(async (client) => {
    for (let month = 1; month <= 12; month++) {
      const amount = monthlyAmounts[month - 1];

      // UPSERT: Insert or update if already exists
      await client.query(
        `INSERT INTO budgets (account_id, year, month, amount, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (account_id, year, month)
         DO UPDATE SET amount = $4, updated_at = CURRENT_TIMESTAMP`,
        [accountId, year, month, amount]
      );
    }
  });
}

// Get budget vs actual comparison for a specific month
export async function getBudgetComparison(
  year: number,
  month: number
): Promise<BudgetComparison[]> {
  // First get all accounts with their balances (actuals)
  // This includes ALL accounts, even those with zero balance
  const balances = await getAccountBalances(year, month);

  // Filter to only income statement accounts (Intäkt and Utgift)
  // Balance sheet accounts (Tillgång and Skuld) should not have budgets
  // Keep ALL income statement accounts, regardless of whether they have balances
  const incomeStatementBalances = balances.filter(
    (balance) => balance.groupType === "Intäkt" || balance.groupType === "Utgift"
  );

  // Get all budgets for this year/month
  const budgetRows = await queryAll<{
    account_id: number;
    amount: number;
  }>(
    "SELECT account_id, amount FROM budgets WHERE year = $1 AND month = $2",
    [year, month]
  );

  // Create a map of accountId -> budget amount
  const budgetMap = new Map<number, number>();
  budgetRows.forEach((row) => {
    budgetMap.set(row.account_id, Number(row.amount));
  });

  // Build comparison results
  const comparisons: BudgetComparison[] = incomeStatementBalances.map((balance) => {
    const budgetAmount = budgetMap.get(balance.accountId) ?? 0;
    const hasBudget = budgetMap.has(balance.accountId);
    const actualAmount = balance.balance;

    // Calculate variance
    // For Utgift (Expense): budget - actual (positive = saved money, under budget)
    // For Intäkt (Income): actual - budget (positive = more income than budgeted)
    let variance: number;
    if (balance.groupType === "Utgift") {
      variance = budgetAmount - actualAmount;
    } else {
      // Intäkt
      variance = actualAmount - budgetAmount;
    }

    const variancePercent = budgetAmount !== 0
      ? (variance / budgetAmount) * 100
      : 0;

    return {
      accountId: balance.accountId,
      accountName: balance.accountName,
      groupId: balance.groupId,
      groupName: balance.groupName,
      groupType: balance.groupType,
      budgetAmount,
      actualAmount,
      variance,
      variancePercent,
      hasBudget,
    };
  });

  return comparisons;
}

// Get budget comparison for result view with R12 data
export async function getResultBudgetComparison(
  year: number,
  month: number
): Promise<{
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  periodActual: number;
  periodBudget: number;
  periodVariance: number;
  r12Actual: number;
  r12Budget: number;
  r12Variance: number;
}[]> {
  // Get period actual (current month)
  const periodBalances = await getAccountBalances(year, month);

  // Filter to only income statement accounts
  const incomeStatementBalances = periodBalances.filter(
    (balance) => balance.groupType === "Intäkt" || balance.groupType === "Utgift"
  );

  // Get R12 actual (rolling 12 months ending at current month)
  const r12Actuals = new Map<number, number>();
  for (let i = 11; i >= 0; i--) {
    let targetMonth = month - i;
    let targetYear = year;

    // Handle year wrapping
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthBalances = await getAccountBalances(targetYear, targetMonth);
    monthBalances.forEach((balance) => {
      if (balance.groupType === "Intäkt" || balance.groupType === "Utgift") {
        const current = r12Actuals.get(balance.accountId) || 0;
        r12Actuals.set(balance.accountId, current + balance.balance);
      }
    });
  }

  // Get period budget (current month)
  const periodBudgetRows = await queryAll<{
    account_id: number;
    amount: number;
  }>(
    "SELECT account_id, amount FROM budgets WHERE year = $1 AND month = $2",
    [year, month]
  );
  const periodBudgetMap = new Map<number, number>();
  periodBudgetRows.forEach((row) => {
    periodBudgetMap.set(row.account_id, Number(row.amount));
  });

  // Get R12 budget (rolling 12 months)
  const r12BudgetMap = new Map<number, number>();
  for (let i = 11; i >= 0; i--) {
    let targetMonth = month - i;
    let targetYear = year;

    // Handle year wrapping
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthBudgetRows = await queryAll<{
      account_id: number;
      amount: number;
    }>(
      "SELECT account_id, amount FROM budgets WHERE year = $1 AND month = $2",
      [targetYear, targetMonth]
    );

    monthBudgetRows.forEach((row) => {
      const current = r12BudgetMap.get(row.account_id) || 0;
      r12BudgetMap.set(row.account_id, current + Number(row.amount));
    });
  }

  // Build comparison results
  const comparisons = incomeStatementBalances.map((balance) => {
    const periodActual = balance.balance;
    const periodBudget = periodBudgetMap.get(balance.accountId) ?? 0;
    const r12Actual = r12Actuals.get(balance.accountId) ?? 0;
    const r12Budget = r12BudgetMap.get(balance.accountId) ?? 0;

    // Calculate variance
    // For Utgift (Expense): budget - actual (positive = saved money, under budget)
    // For Intäkt (Income): actual - budget (positive = more income than budgeted)
    let periodVariance: number;
    let r12Variance: number;

    if (balance.groupType === "Utgift") {
      periodVariance = periodBudget - periodActual;
      r12Variance = r12Budget - r12Actual;
    } else {
      // Intäkt
      periodVariance = periodActual - periodBudget;
      r12Variance = r12Actual - r12Budget;
    }

    return {
      accountId: balance.accountId,
      accountName: balance.accountName,
      groupId: balance.groupId,
      groupName: balance.groupName,
      groupType: balance.groupType,
      periodActual,
      periodBudget,
      periodVariance,
      r12Actual,
      r12Budget,
      r12Variance,
    };
  });

  return comparisons;
}

// Get 11 previous months of data for a specific account
export async function getAccount11MonthsHistory(
  accountId: number,
  endYear: number,
  endMonth: number
): Promise<{
  year: number;
  month: number;
  monthName: string;
  periodActual: number;
  periodBudget: number;
  periodVariance: number;
  r12Actual: number;
  r12Budget: number;
  r12Variance: number;
}[]> {
  const monthNames = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"
  ];

  const results: {
    year: number;
    month: number;
    monthName: string;
    periodActual: number;
    periodBudget: number;
    periodVariance: number;
    r12Actual: number;
    r12Budget: number;
    r12Variance: number;
  }[] = [];

  // Get the account's group type once
  const accountInfo = await queryOne<{ group_type: AccountType }>(
    `SELECT g.typ as group_type
     FROM accounts a
     JOIN groups g ON a.group_id = g.id
     WHERE a.id = $1`,
    [accountId]
  );

  if (!accountInfo) return results;

  // Calculate 11 previous months (not including the current selected month)
  // Loop from 1 to 11 to get reverse chronological order (most recent first)
  for (let i = 1; i <= 11; i++) {
    let targetMonth = endMonth - i;
    let targetYear = endYear;

    // Handle year wrapping
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }

    // Get period actual
    const periodBalances = await getAccountBalances(targetYear, targetMonth);
    const accountBalance = periodBalances.find(b => b.accountId === accountId);
    const periodActual = accountBalance?.balance ?? 0;

    // Get period budget
    const periodBudgetRow = await queryOne<{ amount: number }>(
      "SELECT amount FROM budgets WHERE account_id = $1 AND year = $2 AND month = $3",
      [accountId, targetYear, targetMonth]
    );
    const periodBudget = periodBudgetRow ? Number(periodBudgetRow.amount) : 0;

    // Get R12 actual (rolling 12 months ending at target month)
    let r12Actual = 0;
    for (let j = 11; j >= 0; j--) {
      let r12Month = targetMonth - j;
      let r12Year = targetYear;

      while (r12Month < 1) {
        r12Month += 12;
        r12Year -= 1;
      }

      const monthBalances = await getAccountBalances(r12Year, r12Month);
      const monthBalance = monthBalances.find(b => b.accountId === accountId);
      r12Actual += monthBalance?.balance ?? 0;
    }

    // Get R12 budget (rolling 12 months ending at target month)
    let r12Budget = 0;
    for (let j = 11; j >= 0; j--) {
      let r12Month = targetMonth - j;
      let r12Year = targetYear;

      while (r12Month < 1) {
        r12Month += 12;
        r12Year -= 1;
      }

      const budgetRow = await queryOne<{ amount: number }>(
        "SELECT amount FROM budgets WHERE account_id = $1 AND year = $2 AND month = $3",
        [accountId, r12Year, r12Month]
      );
      r12Budget += budgetRow ? Number(budgetRow.amount) : 0;
    }

    // Calculate variance
    let periodVariance: number;
    let r12Variance: number;

    if (accountInfo.group_type === "Utgift") {
      periodVariance = periodBudget - periodActual;
      r12Variance = r12Budget - r12Actual;
    } else {
      // Intäkt
      periodVariance = periodActual - periodBudget;
      r12Variance = r12Actual - r12Budget;
    }

    results.push({
      year: targetYear,
      month: targetMonth,
      monthName: monthNames[targetMonth - 1],
      periodActual,
      periodBudget,
      periodVariance,
      r12Actual,
      r12Budget,
      r12Variance,
    });
  }

  return results;
}

// Delete all budgets for a specific account/year
export async function deleteBudgetsForYear(
  accountId: number,
  year: number
): Promise<void> {
  await query(
    "DELETE FROM budgets WHERE account_id = $1 AND year = $2",
    [accountId, year]
  );
}

// Custom Result Views
export async function getCustomResultViews(): Promise<CustomResultView[]> {
  const rows = await queryAll<{
    id: number;
    namn: string;
    created_at: string;
    updated_at: string;
  }>(
    "SELECT * FROM custom_result_views ORDER BY namn ASC"
  );

  const views: CustomResultView[] = [];

  for (const row of rows) {
    // Get selected accounts
    const accountRows = await queryAll<{ account_id: number }>(
      "SELECT account_id FROM custom_result_view_accounts WHERE view_id = $1",
      [row.id]
    );

    // Get selected groups
    const groupRows = await queryAll<{ group_id: number }>(
      "SELECT group_id FROM custom_result_view_groups WHERE view_id = $1",
      [row.id]
    );

    // Get selected types
    const typeRows = await queryAll<{ account_type: AccountType }>(
      "SELECT account_type FROM custom_result_view_types WHERE view_id = $1",
      [row.id]
    );

    views.push({
      id: row.id,
      namn: row.namn,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accounts: accountRows.map(r => r.account_id),
      groups: groupRows.map(r => r.group_id),
      types: typeRows.map(r => r.account_type),
    });
  }

  return views;
}

export async function getCustomResultView(id: number): Promise<CustomResultViewWithDetails | null> {
  const row = await queryOne<{
    id: number;
    namn: string;
    created_at: string;
    updated_at: string;
  }>(
    "SELECT * FROM custom_result_views WHERE id = $1",
    [id]
  );

  if (!row) return null;

  // Get selected accounts with full details
  const accountRows = await queryAll<{
    id: number;
    namn: string;
    group_id: number;
  }>(
    `SELECT a.* FROM accounts a
     INNER JOIN custom_result_view_accounts crva ON crva.account_id = a.id
     WHERE crva.view_id = $1
     ORDER BY a.namn ASC`,
    [id]
  );

  // Get selected groups with full details
  const groupRows = await queryAll<{
    id: number;
    namn: string;
    typ: AccountType;
  }>(
    `SELECT g.* FROM groups g
     INNER JOIN custom_result_view_groups crvg ON crvg.group_id = g.id
     WHERE crvg.view_id = $1
     ORDER BY g.namn ASC`,
    [id]
  );

  // Get selected types
  const typeRows = await queryAll<{ account_type: AccountType }>(
    "SELECT account_type FROM custom_result_view_types WHERE view_id = $1",
    [id]
  );

  return {
    id: row.id,
    namn: row.namn,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    accounts: accountRows.map(r => ({
      id: r.id,
      namn: r.namn,
      groupId: r.group_id,
    })),
    groups: groupRows.map(r => ({
      id: r.id,
      namn: r.namn,
      typ: r.typ,
    })),
    types: typeRows.map(r => r.account_type),
  };
}

export async function createCustomResultView(
  namn: string,
  accountIds: number[],
  groupIds: number[],
  types: AccountType[]
): Promise<CustomResultView> {
  return await dbTransaction(async (client) => {
    // Create the view
    const viewResult = await client.query<{
      id: number;
      namn: string;
      created_at: string;
      updated_at: string;
    }>(
      "INSERT INTO custom_result_views (namn) VALUES ($1) RETURNING *",
      [namn]
    );

    const viewRow = viewResult.rows[0];
    if (!viewRow) {
      throw new Error("Failed to create custom result view");
    }

    // Insert selected accounts
    for (const accountId of accountIds) {
      await client.query(
        "INSERT INTO custom_result_view_accounts (view_id, account_id) VALUES ($1, $2)",
        [viewRow.id, accountId]
      );
    }

    // Insert selected groups
    for (const groupId of groupIds) {
      await client.query(
        "INSERT INTO custom_result_view_groups (view_id, group_id) VALUES ($1, $2)",
        [viewRow.id, groupId]
      );
    }

    // Insert selected types
    for (const type of types) {
      await client.query(
        "INSERT INTO custom_result_view_types (view_id, account_type) VALUES ($1, $2)",
        [viewRow.id, type]
      );
    }

    return {
      id: viewRow.id,
      namn: viewRow.namn,
      createdAt: new Date(viewRow.created_at),
      updatedAt: new Date(viewRow.updated_at),
      accounts: accountIds,
      groups: groupIds,
      types,
    };
  });
}

export async function updateCustomResultView(
  id: number,
  namn: string,
  accountIds: number[],
  groupIds: number[],
  types: AccountType[]
): Promise<void> {
  await dbTransaction(async (client) => {
    // Update the view name and updated_at timestamp
    await client.query(
      "UPDATE custom_result_views SET namn = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [namn, id]
    );

    // Delete existing selections
    await client.query(
      "DELETE FROM custom_result_view_accounts WHERE view_id = $1",
      [id]
    );
    await client.query(
      "DELETE FROM custom_result_view_groups WHERE view_id = $1",
      [id]
    );
    await client.query(
      "DELETE FROM custom_result_view_types WHERE view_id = $1",
      [id]
    );

    // Insert new selections
    for (const accountId of accountIds) {
      await client.query(
        "INSERT INTO custom_result_view_accounts (view_id, account_id) VALUES ($1, $2)",
        [id, accountId]
      );
    }

    for (const groupId of groupIds) {
      await client.query(
        "INSERT INTO custom_result_view_groups (view_id, group_id) VALUES ($1, $2)",
        [id, groupId]
      );
    }

    for (const type of types) {
      await client.query(
        "INSERT INTO custom_result_view_types (view_id, account_type) VALUES ($1, $2)",
        [id, type]
      );
    }
  });
}

export async function deleteCustomResultView(id: number): Promise<void> {
  // CASCADE delete will automatically remove related records
  await query("DELETE FROM custom_result_views WHERE id = $1", [id]);
}
