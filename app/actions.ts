"use server";

import { revalidatePath } from "next/cache";
import { queryAll, queryOne, query, transaction as dbTransaction, getDatabase } from "@/lib/db";
import { hamtaHistorik, hamtaKonton, hamtaMallar } from "@/lib/konteringsmallData";
import { BankEvent, Verifikat, Post, Account, Group, Import, AccountType, PeriodLock, RecurringItem, RecurringItemStatus, Budget, BudgetComparison, CustomResultView, CustomResultViewWithDetails, DashboardOverview, DashboardMonth, DashboardMonthDetail, BudgetOutlier, DashboardTopExpense, Todo, AccountAnalysis, AccountAnalysisMonth } from "./types";
import { byggKonteringsforslag, Konteringsforslag } from "./lib/konteringsforslag";
import { tillObservationer } from "./lib/konteringsmallHarledning";
import { derivePeriodiseringPosts, derivePeriodiseringSlices } from "./lib/periodiseringUtils";

type ActionErrorCategory = "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "LOCKED_PERIOD" | "DATABASE";

const REVALIDATE_PATHS = [
  "/",
  "/imports",
  "/verifikat",
  "/accounts",
  "/budget",
  "/periods",
  "/recurring",
  "/resultat",
  "/balans",
  "/easy",
];

function createActionError(category: ActionErrorCategory, message: string): Error {
  return new Error(`[${category}] ${message}`);
}

function revalidateMutationViews(): void {
  for (const path of REVALIDATE_PATHS) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("static generation store missing")
      ) {
        continue;
      }
      throw error;
    }
  }
}

// Imports (CSV import metadata)
export async function getImports(): Promise<Import[]> {
  const rows = await queryAll<{
    id: number;
    filename: string;
    imported_at: string;
    total_events: number;
    date_range_start: string;
    date_range_end: string;
    is_external: boolean;
    posted_events: number;
  }>(
    `
    SELECT
      i.*,
      COALESCE(SUM(CASE WHEN be.is_posted = 1 THEN 1 ELSE 0 END), 0) as posted_events
    FROM imports i
    LEFT JOIN bank_events be ON be.import_id = i.id
    GROUP BY i.id, i.filename, i.imported_at, i.total_events, i.date_range_start, i.date_range_end, i.account_id, i.is_external
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
    isExternal: row.is_external ?? false,
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
    is_external: boolean;
  }>("SELECT * FROM imports WHERE id = $1", [importId]);

  if (!importRow) return null;

  const eventRows = await queryAll<{
    id: number;
    date: string;
    description: string;
    amount: number;
    is_posted: number;
    flagged: boolean;
    flag_comment: string | null;
    is_irrelevant: boolean;
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
      isExternal: importRow.is_external ?? false,
    },
    events: eventRows.map((row) => ({
      id: row.id,
      date: new Date(row.date),
      description: row.description,
      amount: Number(row.amount),
      isPosted: row.is_posted === 1,
      flagged: row.flagged ?? false,
      flagComment: row.flag_comment ?? undefined,
      isIrrelevant: row.is_irrelevant ?? false,
      verifikatId: row.transaction_id ?? undefined,
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
    throw createActionError(
      "CONFLICT",
      `Kan inte ta bort import. ${postedEvents.length} ${postedEvents.length === 1 ? 'händelse' : 'händelser'} har bokförts. Du måste först ta bort ${postedEvents.length === 1 ? 'verifikatet' : 'verifikaten'} manuellt.`
    );
  }

  // Check if any bank events are in locked periods
  for (const event of bankEvents) {
    const eventDate = new Date(event.date);
    const isLocked = await isPeriodLocked(eventDate);
    if (isLocked) {
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth() + 1;
      throw createActionError(
        "LOCKED_PERIOD",
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
  revalidateMutationViews();
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
    revalidateMutationViews();
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
    flagged: boolean;
    flag_comment: string | null;
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
    flagged: row.flagged ?? false,
    flagComment: row.flag_comment ?? undefined,
    verifikatId: row.transaction_id ?? undefined,
    importId: row.import_id ?? undefined,
    import: row.import_account_id ? { accountId: row.import_account_id } as Import : undefined,
  }));
}

export async function getUnpostedBankEventsPaginated(
  limit: number = 25,
  offset: number = 0
): Promise<{ events: BankEvent[]; total: number }> {
  const countResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM bank_events WHERE is_posted = 0 AND is_irrelevant = false"
  );
  const total = Number(countResult?.count) || 0;

  const rows = await queryAll<{
    id: number;
    date: string;
    description: string;
    amount: number;
    is_posted: number;
    flagged: boolean;
    flag_comment: string | null;
    transaction_id: number | null;
    import_id: number | null;
    import_account_id: number | null;
    import_account_name: string | null;
    import_account_group_id: number | null;
    import_is_external: boolean | null;
  }>(
    `
    SELECT be.*,
      i.account_id as import_account_id,
      i.is_external as import_is_external,
      ia.namn as import_account_name,
      ia.group_id as import_account_group_id
    FROM bank_events be
    LEFT JOIN imports i ON be.import_id = i.id
    LEFT JOIN accounts ia ON ia.id = i.account_id
    WHERE be.is_posted = 0 AND be.is_irrelevant = false
    ORDER BY be.date DESC, be.id DESC
    LIMIT $1 OFFSET $2
  `,
    [limit, offset]
  );

  const events = rows.map((row) => ({
    id: row.id,
    date: new Date(row.date),
    description: row.description,
    amount: Number(row.amount),
    isPosted: row.is_posted === 1,
    flagged: row.flagged ?? false,
    flagComment: row.flag_comment ?? undefined,
    verifikatId: row.transaction_id ?? undefined,
    importId: row.import_id ?? undefined,
    import: row.import_account_id || row.import_is_external
      ? ({
          accountId: row.import_account_id ?? undefined,
          isExternal: row.import_is_external ?? false,
          account:
            row.import_account_id && row.import_account_name
              ? {
                  id: row.import_account_id,
                  namn: row.import_account_name,
                  groupId: row.import_account_group_id ?? 0,
                }
              : undefined,
        } as Import)
      : undefined,
  }));

  return { events, total };
}

export async function flagBankEvent(
  id: number,
  comment: string,
  deps: { persistFlag?: (id: number, comment: string | null) => Promise<void> } = {}
): Promise<void> {
  const normalised = comment.trim() || null;
  const persist = deps.persistFlag ?? ((eventId, c) =>
    query("UPDATE bank_events SET flagged = true, flag_comment = $1 WHERE id = $2", [c, eventId])
  );
  await persist(id, normalised);
  revalidateMutationViews();
}

export async function unflagBankEvent(
  id: number,
  deps: { persistUnflag?: (id: number) => Promise<void> } = {}
): Promise<void> {
  const persist = deps.persistUnflag ?? ((eventId) =>
    query("UPDATE bank_events SET flagged = false, flag_comment = NULL WHERE id = $1", [eventId])
  );
  await persist(id);
  revalidateMutationViews();
}

export async function saveBankEvents(
  events: Omit<BankEvent, "id" | "isPosted" | "verifikatId" | "importId">[],
  filename: string,
  accountId?: number,
  isExternal: boolean = false
): Promise<void> {
  if (events.length === 0) return;

  // Calculate date range
  const dates = events.map((e) => e.date.getTime());
  const dateRangeStart = new Date(Math.min(...dates));
  const dateRangeEnd = new Date(Math.max(...dates));

  await dbTransaction(async (client) => {
    // Create import record
    const importResult = await client.query<{ id: number }>(
      "INSERT INTO imports (filename, total_events, date_range_start, date_range_end, account_id, is_external) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [filename, events.length, dateRangeStart.toISOString(), dateRangeEnd.toISOString(), accountId || null, isExternal]
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

  revalidateMutationViews();
}

// Mark a bank event as irrelevant so it drops out of the att göra-listan without
// being booked. Only meaningful for external imports; reversible via unmark.
export async function markBankEventIrrelevant(id: number): Promise<void> {
  await query(
    "UPDATE bank_events SET is_irrelevant = true, flagged = false, flag_comment = NULL WHERE id = $1 AND is_posted = 0",
    [id]
  );
  revalidateMutationViews();
}

export async function unmarkBankEventIrrelevant(id: number): Promise<void> {
  await query("UPDATE bank_events SET is_irrelevant = false WHERE id = $1", [id]);
  revalidateMutationViews();
}

export async function deleteBankEvent(id: number): Promise<void> {
  await query("DELETE FROM bank_events WHERE id = $1 AND is_posted = 0", [id]);
  revalidateMutationViews();
}

// Justerar beloppet på en obokförd bankhändelse permanent (t.ex. när banken i
// efterhand ändrat ett preliminärt kortköp till sitt slutgiltiga belopp).
// Går bara att göra innan bokföring; en redan bokförd händelse måste rättas via
// avstämningen på Balans-sidan så att verifikatets poster hålls i synk.
export async function adjustBankEventAmount(
  id: number,
  amount: number,
  deps: { persistAdjust?: (id: number, amount: number) => Promise<void> } = {}
): Promise<void> {
  if (!Number.isFinite(amount)) {
    throw createActionError("VALIDATION", "Beloppet måste vara ett giltigt tal");
  }
  const persist = deps.persistAdjust ?? ((eventId, amt) =>
    query("UPDATE bank_events SET amount = $1 WHERE id = $2 AND is_posted = 0", [amt, eventId])
  );
  await persist(id, amount);
  revalidateMutationViews();
}

// Verifikat (accounting entries)
export async function getVerifikatLista(): Promise<Verifikat[]> {
  const transactions = await queryAll<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
  }>("SELECT * FROM transactions ORDER BY date DESC");

  const result: Verifikat[] = [];

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
        verifikatId: p.transaction_id,
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

export async function createVerifikat(
  verifikatData: Omit<Verifikat, "id">
): Promise<number> {
  return postVerifikat({
    mode: "create",
    date: verifikatData.date,
    description: verifikatData.description,
    bankEventId: verifikatData.bankEventId,
    posts: verifikatData.posts,
  });
}

type VerifikatPostInput = {
  accountId: number;
  debet: number;
  kredit: number;
  description?: string;
};

type CreateVerifikatCommand = {
  mode: "create";
  date: Date;
  description: string;
  bankEventId?: number;
  posts: VerifikatPostInput[];
};

type UpdateVerifikatCommand = {
  mode: "update";
  id: number;
  date: Date;
  description: string;
  posts: VerifikatPostInput[];
};

type PostVerifikatCommand = CreateVerifikatCommand | UpdateVerifikatCommand;

type PostVerifikatDependencies = {
  checkPeriodLockForDate: (date: Date) => Promise<void>;
  getTransactionDateById: (id: number) => Promise<Date | null>;
  persistCreate: (command: CreateVerifikatCommand) => Promise<number>;
  persistUpdate: (command: UpdateVerifikatCommand) => Promise<void>;
};

const defaultPostVerifikatDependencies: PostVerifikatDependencies = {
  checkPeriodLockForDate: checkPeriodLock,
  getTransactionDateById: async (id: number) => {
    const currentTxn = await queryOne<{ date: string }>(
      "SELECT date FROM transactions WHERE id = $1",
      [id]
    );
    return currentTxn ? new Date(currentTxn.date) : null;
  },
  persistCreate: async (command: CreateVerifikatCommand) => {
    return dbTransaction(async (client) => {
      const result = await client.query<{ id: number }>(
        "INSERT INTO transactions (date, description, bank_event_id) VALUES ($1, $2, $3) RETURNING id",
        [
          command.date.toISOString(),
          command.description,
          command.bankEventId ?? null,
        ]
      );

      const transactionId = result.rows[0].id;

      for (const post of command.posts) {
        await client.query(
          "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES ($1, $2, $3, $4, $5)",
          [transactionId, post.accountId, post.debet, post.kredit, post.description ?? null]
        );
      }

      if (command.bankEventId) {
        await client.query(
          "UPDATE bank_events SET is_posted = 1, transaction_id = $1, flagged = false, flag_comment = NULL WHERE id = $2",
          [transactionId, command.bankEventId]
        );
      }

      return transactionId;
    });
  },
  persistUpdate: async (command: UpdateVerifikatCommand) => {
    await dbTransaction(async (client) => {
      await client.query("UPDATE transactions SET date = $1, description = $2 WHERE id = $3", [
        command.date.toISOString(),
        command.description,
        command.id,
      ]);

      await client.query("DELETE FROM posts WHERE transaction_id = $1", [command.id]);

      for (const post of command.posts) {
        await client.query(
          "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES ($1, $2, $3, $4, $5)",
          [command.id, post.accountId, post.debet, post.kredit, post.description ?? null]
        );
      }
    });
  },
};

function assertBalancedVerifikat(posts: VerifikatPostInput[]): void {
  const totalDebet = posts.reduce((acc, post) => acc + post.debet, 0);
  const totalKredit = posts.reduce((acc, post) => acc + post.kredit, 0);

  if (Math.abs(totalDebet - totalKredit) > 0.001) {
    throw createActionError("VALIDATION", "Debet och kredit måste vara lika");
  }
}

export async function postVerifikat(
  command: CreateVerifikatCommand,
  dependencies?: PostVerifikatDependencies
): Promise<number>;
export async function postVerifikat(
  command: UpdateVerifikatCommand,
  dependencies?: PostVerifikatDependencies
): Promise<void>;
export async function postVerifikat(
  command: PostVerifikatCommand,
  dependencies: PostVerifikatDependencies = defaultPostVerifikatDependencies
): Promise<number | void> {
  assertBalancedVerifikat(command.posts);

  if (command.mode === "create") {
    await dependencies.checkPeriodLockForDate(command.date);
    const transactionId = await dependencies.persistCreate(command);
    revalidateMutationViews();
    return transactionId;
  }

  const currentTxnDate = await dependencies.getTransactionDateById(command.id);
  if (!currentTxnDate) {
    throw createActionError("NOT_FOUND", "Verifikat hittades inte");
  }

  await dependencies.checkPeriodLockForDate(currentTxnDate);

  const currentDateKey = currentTxnDate.toISOString().slice(0, 10);
  const nextDateKey = command.date.toISOString().slice(0, 10);
  if (nextDateKey !== currentDateKey) {
    await dependencies.checkPeriodLockForDate(command.date);
  }

  await dependencies.persistUpdate(command);
  revalidateMutationViews();
}

export async function deleteVerifikat(id: number): Promise<void> {
  // Get verifikat date to check lock
  const txn = await queryOne<{ date: string; periodisering_parent_id: number | null }>(
    "SELECT date, periodisering_parent_id FROM transactions WHERE id = $1",
    [id]
  );

  if (!txn) {
    throw createActionError("NOT_FOUND", "Verifikat hittades inte");
  }

  // A periodisering pair may never be broken via the normal delete path.
  await assertNotPeriodiseringMember(id, txn.periodisering_parent_id);

  // Check if period is locked
  await checkPeriodLock(new Date(txn.date));

  // Unmark any linked bank event
  await query(
    "UPDATE bank_events SET is_posted = 0, transaction_id = NULL WHERE transaction_id = $1",
    [id]
  );

  // Delete transaction (posts will cascade)
  await query("DELETE FROM transactions WHERE id = $1", [id]);
  revalidateMutationViews();
}

// ==================== PERIODFÖRSKJUTNING ====================
// A periodförskjutning splits a bank event's booking into two linked verifikat
// via an interim account (periodiseringskonto), moving the whole amount to one
// target period. See docs/adr/0008. (Periodisering — spreading over several
// months — lives further down; see docs/adr/0009.)

export type PeriodforskjutningInput = {
  bankEventId: number;
  description: string;
  bankDate: Date; // Huvudverifikatets datum = bankhändelsens datum
  targetDate: Date; // Länkat verifikats datum
  anchorAccountId: number; // Konteringsraden som ligger kvar på bankdatumet
  posts: VerifikatPostInput[]; // Den logiska konteringen (balanserad)
  recurringItemId?: number | null; // Kopplas till det länkade verifikatet
};

function sameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

// Add `months` calendar months to a date, keeping the day-of-month but clamping
// to the target month's last day (so 31 jan + 1 månad → 28/29 feb, not 3 mars).
function addMonthsUTC(date: Date, months: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

// The pg-like client passed to the transaction() callback.
type TxClient = Parameters<Parameters<typeof dbTransaction>[0]>[0];

// Throw if the verifikat is part of a periodisering (either half).
async function assertNotPeriodiseringMember(
  id: number,
  periodiseringParentId: number | null
): Promise<void> {
  if (periodiseringParentId !== null) {
    throw createActionError(
      "CONFLICT",
      "Detta verifikat tillhör en periodisering. Justera eller ta bort den via huvudverifikatet."
    );
  }
  const child = await queryOne<{ id: number }>(
    "SELECT id FROM transactions WHERE periodisering_parent_id = $1 LIMIT 1",
    [id]
  );
  if (child) {
    throw createActionError(
      "CONFLICT",
      "Detta verifikat är huvudverifikat i en periodisering. Använd periodiseringsvyn."
    );
  }
}

// Derive the two verifikats' posts from the logical kontering.
// Implemented in ./lib/periodiseringUtils so it can be unit-tested.

async function insertPosts(
  client: TxClient,
  transactionId: number,
  posts: VerifikatPostInput[]
): Promise<void> {
  for (const post of posts) {
    await client.query(
      "INSERT INTO posts (transaction_id, account_id, debet, kredit, description) VALUES ($1, $2, $3, $4, $5)",
      [transactionId, post.accountId, post.debet, post.kredit, post.description ?? null]
    );
  }
}

// Create a periodförskjutning: two linked verifikat bridged by the periodiseringskonto.
// Returns the huvudverifikat id.
export async function createPeriodforskjutning(input: PeriodforskjutningInput): Promise<number> {
  const periodiseringskonto = await getPeriodiseringskonto();
  if (!periodiseringskonto) {
    throw createActionError(
      "VALIDATION",
      "Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först."
    );
  }

  if (sameDay(input.bankDate, input.targetDate)) {
    throw createActionError(
      "VALIDATION",
      "Måldatumet måste skilja sig från bankhändelsens datum."
    );
  }

  const { huvudPosts, lankatPosts } = derivePeriodiseringPosts(
    input.posts,
    input.anchorAccountId,
    periodiseringskonto.id
  );

  await checkPeriodLock(input.bankDate);
  await checkPeriodLock(input.targetDate);

  const huvudId = await dbTransaction(async (client) => {
    const huvud = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, bank_event_id, periodisering_kind) VALUES ($1, $2, $3, 'forskjutning') RETURNING id",
      [input.bankDate.toISOString(), input.description, input.bankEventId]
    );
    const huvudTxnId = huvud.rows[0].id;
    await insertPosts(client, huvudTxnId, huvudPosts);

    await client.query(
      "UPDATE bank_events SET is_posted = 1, transaction_id = $1, flagged = false, flag_comment = NULL WHERE id = $2",
      [huvudTxnId, input.bankEventId]
    );

    const lankat = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, periodisering_parent_id) VALUES ($1, $2, $3) RETURNING id",
      [input.targetDate.toISOString(), input.description, huvudTxnId]
    );
    const lankatTxnId = lankat.rows[0].id;
    await insertPosts(client, lankatTxnId, lankatPosts);

    if (input.recurringItemId != null) {
      await client.query(
        "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [lankatTxnId, input.recurringItemId]
      );
    }

    return huvudTxnId;
  });

  revalidateMutationViews();
  return huvudId;
}

// Update an existing periodförskjutning by rewriting both verifikat.
export async function updatePeriodforskjutning(
  huvudId: number,
  input: Omit<PeriodforskjutningInput, "bankEventId">
): Promise<void> {
  const huvud = await queryOne<{ date: string; bank_event_id: number | null }>(
    "SELECT date, bank_event_id FROM transactions WHERE id = $1",
    [huvudId]
  );
  if (!huvud) {
    throw createActionError("NOT_FOUND", "Huvudverifikat hittades inte");
  }

  const child = await queryOne<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE periodisering_parent_id = $1 LIMIT 1",
    [huvudId]
  );
  if (!child) {
    throw createActionError("VALIDATION", "Verifikatet är inte en periodisering.");
  }

  const periodiseringskonto = await getPeriodiseringskonto();
  if (!periodiseringskonto) {
    throw createActionError(
      "VALIDATION",
      "Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först."
    );
  }

  if (sameDay(input.bankDate, input.targetDate)) {
    throw createActionError(
      "VALIDATION",
      "Måldatumet måste skilja sig från bankhändelsens datum."
    );
  }

  const { huvudPosts, lankatPosts } = derivePeriodiseringPosts(
    input.posts,
    input.anchorAccountId,
    periodiseringskonto.id
  );

  // Both months in the existing pair and the new target month must be unlocked.
  await checkPeriodLock(new Date(huvud.date));
  await checkPeriodLock(new Date(child.date));
  await checkPeriodLock(input.bankDate);
  await checkPeriodLock(input.targetDate);

  await dbTransaction(async (client) => {
    // Rewrite huvud (keeps its bank event link).
    await client.query(
      "UPDATE transactions SET date = $1, description = $2 WHERE id = $3",
      [input.bankDate.toISOString(), input.description, huvudId]
    );
    await client.query("DELETE FROM posts WHERE transaction_id = $1", [huvudId]);
    await insertPosts(client, huvudId, huvudPosts);

    // Recreate the länkat verifikat.
    await client.query("DELETE FROM transactions WHERE id = $1", [child.id]);
    const lankat = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, periodisering_parent_id) VALUES ($1, $2, $3) RETURNING id",
      [input.targetDate.toISOString(), input.description, huvudId]
    );
    const lankatTxnId = lankat.rows[0].id;
    await insertPosts(client, lankatTxnId, lankatPosts);

    if (input.recurringItemId != null) {
      await client.query(
        "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [lankatTxnId, input.recurringItemId]
      );
    }
  });

  revalidateMutationViews();
}

// Delete both verifikat in a periodförskjutning and return the bank event to the todo list.
export async function deletePeriodforskjutning(huvudId: number): Promise<void> {
  const huvud = await queryOne<{ date: string }>(
    "SELECT date FROM transactions WHERE id = $1",
    [huvudId]
  );
  if (!huvud) {
    throw createActionError("NOT_FOUND", "Huvudverifikat hittades inte");
  }

  const child = await queryOne<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE periodisering_parent_id = $1 LIMIT 1",
    [huvudId]
  );
  if (!child) {
    throw createActionError("VALIDATION", "Verifikatet är inte en periodisering.");
  }

  await checkPeriodLock(new Date(huvud.date));
  await checkPeriodLock(new Date(child.date));

  await dbTransaction(async (client) => {
    await client.query(
      "UPDATE bank_events SET is_posted = 0, transaction_id = NULL WHERE transaction_id = $1",
      [huvudId]
    );
    // Deleting the huvud cascades to the länkat verifikat and all posts.
    await client.query("DELETE FROM transactions WHERE id = $1", [huvudId]);
  });

  revalidateMutationViews();
}

// Reconstruct the logical kontering of a periodförskjutning for editing.
export type PeriodforskjutningDetails = {
  huvudId: number;
  bankEventId?: number;
  description: string;
  bankDate: Date;
  targetDate: Date;
  anchorAccountId: number;
  periodiseringskontoId: number;
  posts: Post[];
  recurringItemId: number | null;
};

export async function getPeriodforskjutningForHuvud(
  huvudId: number
): Promise<PeriodforskjutningDetails | null> {
  const huvud = await queryOne<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
  }>("SELECT id, date, description, bank_event_id FROM transactions WHERE id = $1", [huvudId]);
  if (!huvud) return null;

  const child = await queryOne<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE periodisering_parent_id = $1 LIMIT 1",
    [huvudId]
  );
  if (!child) return null;

  type PostRow = {
    id: number;
    transaction_id: number;
    account_id: number;
    debet: string;
    kredit: string;
    description: string | null;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
  };
  const fetchPosts = (txnId: number) =>
    queryAll<PostRow>(
      `SELECT p.id, p.transaction_id, p.account_id, p.debet, p.kredit, p.description,
              a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
       FROM posts p
       JOIN accounts a ON a.id = p.account_id
       JOIN groups g ON g.id = a.group_id
       WHERE p.transaction_id = $1
       ORDER BY p.id`,
      [txnId]
    );

  const [huvudPosts, childPosts] = await Promise.all([
    fetchPosts(huvud.id),
    fetchPosts(child.id),
  ]);

  // The periodiseringskonto is the account present in both verifikat (the bridge).
  const childAccountIds = new Set(childPosts.map((p) => p.account_id));
  const periodiseringskontoId =
    huvudPosts.find((p) => childAccountIds.has(p.account_id))?.account_id ?? -1;

  const toPost = (row: PostRow): Post => ({
    id: row.id,
    verifikatId: row.transaction_id,
    accountId: row.account_id,
    debet: Number(row.debet),
    kredit: Number(row.kredit),
    description: row.description ?? undefined,
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
  });

  // Logical kontering = anchor (huvud, non-bridge) + child rows minus the bridge.
  const anchorRow = huvudPosts.find((p) => p.account_id !== periodiseringskontoId);
  const logicalPosts: Post[] = [
    ...(anchorRow ? [toPost(anchorRow)] : []),
    ...childPosts.filter((p) => p.account_id !== periodiseringskontoId).map(toPost),
  ];

  const recurring = await queryOne<{ recurring_item_id: number }>(
    "SELECT recurring_item_id FROM transaction_recurring_items WHERE transaction_id = $1",
    [child.id]
  );

  return {
    huvudId: huvud.id,
    bankEventId: huvud.bank_event_id ?? undefined,
    description: huvud.description,
    bankDate: new Date(huvud.date),
    targetDate: new Date(child.date),
    anchorAccountId: anchorRow?.account_id ?? -1,
    periodiseringskontoId,
    posts: logicalPosts,
    recurringItemId: recurring?.recurring_item_id ?? null,
  };
}

// ==================== PERIODISERING (fördelning över flera månader) ====================
// A periodisering spreads a cost/intäkt evenly over N consecutive months
// starting in the payment month, as a huvudverifikat + N länkade verifikat (one
// per month) bridged by the periodiseringskonto. See docs/adr/0009.

export type PeriodiseringInput = {
  bankEventId: number;
  description: string;
  bankDate: Date; // Huvudverifikatets datum = bankhändelsens datum; första slicen ligger i denna månad
  antalManader: number; // Antal månader att fördela över
  anchorAccountId: number; // Konteringsraden som ligger kvar på bankdatumet
  posts: VerifikatPostInput[]; // Den logiska konteringen (balanserad)
};

// Create a periodisering: huvudverifikat + N per-month länkade verifikat.
// Returns the huvudverifikat id.
export async function createPeriodisering(input: PeriodiseringInput): Promise<number> {
  const periodiseringskonto = await getPeriodiseringskonto();
  if (!periodiseringskonto) {
    throw createActionError(
      "VALIDATION",
      "Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först."
    );
  }

  const { huvudPosts, slices } = derivePeriodiseringSlices(
    input.posts,
    input.anchorAccountId,
    periodiseringskonto.id,
    input.antalManader
  );

  const sliceDates = slices.map((_, i) => addMonthsUTC(input.bankDate, i));

  await checkPeriodLock(input.bankDate);
  for (const d of sliceDates) {
    await checkPeriodLock(d);
  }

  const huvudId = await dbTransaction(async (client) => {
    const huvud = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, bank_event_id, periodisering_kind) VALUES ($1, $2, $3, 'periodisering') RETURNING id",
      [input.bankDate.toISOString(), input.description, input.bankEventId]
    );
    const huvudTxnId = huvud.rows[0].id;
    await insertPosts(client, huvudTxnId, huvudPosts);

    await client.query(
      "UPDATE bank_events SET is_posted = 1, transaction_id = $1, flagged = false, flag_comment = NULL WHERE id = $2",
      [huvudTxnId, input.bankEventId]
    );

    for (let i = 0; i < slices.length; i++) {
      const lankat = await client.query<{ id: number }>(
        "INSERT INTO transactions (date, description, periodisering_parent_id) VALUES ($1, $2, $3) RETURNING id",
        [sliceDates[i].toISOString(), input.description, huvudTxnId]
      );
      await insertPosts(client, lankat.rows[0].id, slices[i]);
    }

    return huvudTxnId;
  });

  revalidateMutationViews();
  return huvudId;
}

// ==================== KONVERTERA BEFINTLIGT VERIFIKAT ====================
// Turn an already-booked "vanligt" verifikat into a periodförskjutning or
// periodisering. The original verifikat is removed and the periodisering pair
// is created in its place, linked to the same bank event — all in one
// transaction so the bank event is never left dangling. See docs/adr/0008, 0009.

// Load & validate a verifikat that is a candidate for periodisering. Must exist,
// be linked to a bank event, and not already be part of a periodisering.
async function loadConvertibleVerifikat(
  verifikatId: number
): Promise<{ date: string; bankEventId: number }> {
  const source = await queryOne<{
    date: string;
    bank_event_id: number | null;
    periodisering_parent_id: number | null;
  }>(
    "SELECT date, bank_event_id, periodisering_parent_id FROM transactions WHERE id = $1",
    [verifikatId]
  );
  if (!source) {
    throw createActionError("NOT_FOUND", "Verifikat hittades inte");
  }
  await assertNotPeriodiseringMember(verifikatId, source.periodisering_parent_id);
  if (source.bank_event_id == null) {
    throw createActionError(
      "VALIDATION",
      "Endast verifikat som är kopplade till en bankhändelse kan periodiseras."
    );
  }
  return { date: source.date, bankEventId: source.bank_event_id };
}

// Convert an existing verifikat into a periodförskjutning (two linked verifikat).
// Returns the new huvudverifikat id.
export async function convertVerifikatToPeriodforskjutning(
  verifikatId: number,
  input: Omit<PeriodforskjutningInput, "bankEventId">
): Promise<number> {
  const source = await loadConvertibleVerifikat(verifikatId);

  const periodiseringskonto = await getPeriodiseringskonto();
  if (!periodiseringskonto) {
    throw createActionError(
      "VALIDATION",
      "Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först."
    );
  }

  if (sameDay(input.bankDate, input.targetDate)) {
    throw createActionError(
      "VALIDATION",
      "Måldatumet måste skilja sig från bankhändelsens datum."
    );
  }

  const { huvudPosts, lankatPosts } = derivePeriodiseringPosts(
    input.posts,
    input.anchorAccountId,
    periodiseringskonto.id
  );

  await checkPeriodLock(new Date(source.date));
  await checkPeriodLock(input.bankDate);
  await checkPeriodLock(input.targetDate);

  const huvudId = await dbTransaction(async (client) => {
    // Release the bank event link and remove the original single verifikat.
    await client.query(
      "UPDATE bank_events SET transaction_id = NULL WHERE transaction_id = $1",
      [verifikatId]
    );
    await client.query("DELETE FROM transactions WHERE id = $1", [verifikatId]);

    const huvud = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, bank_event_id, periodisering_kind) VALUES ($1, $2, $3, 'forskjutning') RETURNING id",
      [input.bankDate.toISOString(), input.description, source.bankEventId]
    );
    const huvudTxnId = huvud.rows[0].id;
    await insertPosts(client, huvudTxnId, huvudPosts);

    await client.query(
      "UPDATE bank_events SET is_posted = 1, transaction_id = $1, flagged = false, flag_comment = NULL WHERE id = $2",
      [huvudTxnId, source.bankEventId]
    );

    const lankat = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, periodisering_parent_id) VALUES ($1, $2, $3) RETURNING id",
      [input.targetDate.toISOString(), input.description, huvudTxnId]
    );
    const lankatTxnId = lankat.rows[0].id;
    await insertPosts(client, lankatTxnId, lankatPosts);

    if (input.recurringItemId != null) {
      await client.query(
        "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [lankatTxnId, input.recurringItemId]
      );
    }

    return huvudTxnId;
  });

  revalidateMutationViews();
  return huvudId;
}

// Convert an existing verifikat into a periodisering (huvud + N månadsverifikat).
// Returns the new huvudverifikat id.
export async function convertVerifikatToPeriodisering(
  verifikatId: number,
  input: Omit<PeriodiseringInput, "bankEventId">
): Promise<number> {
  const source = await loadConvertibleVerifikat(verifikatId);

  const periodiseringskonto = await getPeriodiseringskonto();
  if (!periodiseringskonto) {
    throw createActionError(
      "VALIDATION",
      "Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först."
    );
  }

  const { huvudPosts, slices } = derivePeriodiseringSlices(
    input.posts,
    input.anchorAccountId,
    periodiseringskonto.id,
    input.antalManader
  );

  const sliceDates = slices.map((_, i) => addMonthsUTC(input.bankDate, i));

  await checkPeriodLock(new Date(source.date));
  await checkPeriodLock(input.bankDate);
  for (const d of sliceDates) {
    await checkPeriodLock(d);
  }

  const huvudId = await dbTransaction(async (client) => {
    // Release the bank event link and remove the original single verifikat.
    await client.query(
      "UPDATE bank_events SET transaction_id = NULL WHERE transaction_id = $1",
      [verifikatId]
    );
    await client.query("DELETE FROM transactions WHERE id = $1", [verifikatId]);

    const huvud = await client.query<{ id: number }>(
      "INSERT INTO transactions (date, description, bank_event_id, periodisering_kind) VALUES ($1, $2, $3, 'periodisering') RETURNING id",
      [input.bankDate.toISOString(), input.description, source.bankEventId]
    );
    const huvudTxnId = huvud.rows[0].id;
    await insertPosts(client, huvudTxnId, huvudPosts);

    await client.query(
      "UPDATE bank_events SET is_posted = 1, transaction_id = $1, flagged = false, flag_comment = NULL WHERE id = $2",
      [huvudTxnId, source.bankEventId]
    );

    for (let i = 0; i < slices.length; i++) {
      const lankat = await client.query<{ id: number }>(
        "INSERT INTO transactions (date, description, periodisering_parent_id) VALUES ($1, $2, $3) RETURNING id",
        [sliceDates[i].toISOString(), input.description, huvudTxnId]
      );
      await insertPosts(client, lankat.rows[0].id, slices[i]);
    }

    return huvudTxnId;
  });

  revalidateMutationViews();
  return huvudId;
}

// Update an existing periodisering by rewriting the huvud and all N slices.
export async function updatePeriodisering(
  huvudId: number,
  input: Omit<PeriodiseringInput, "bankEventId">
): Promise<void> {
  const huvud = await queryOne<{ date: string; bank_event_id: number | null }>(
    "SELECT date, bank_event_id FROM transactions WHERE id = $1",
    [huvudId]
  );
  if (!huvud) {
    throw createActionError("NOT_FOUND", "Huvudverifikat hittades inte");
  }

  const children = await queryAll<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE periodisering_parent_id = $1",
    [huvudId]
  );
  if (children.length === 0) {
    throw createActionError("VALIDATION", "Verifikatet är inte en periodisering.");
  }

  const periodiseringskonto = await getPeriodiseringskonto();
  if (!periodiseringskonto) {
    throw createActionError(
      "VALIDATION",
      "Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först."
    );
  }

  const { huvudPosts, slices } = derivePeriodiseringSlices(
    input.posts,
    input.anchorAccountId,
    periodiseringskonto.id,
    input.antalManader
  );

  const sliceDates = slices.map((_, i) => addMonthsUTC(input.bankDate, i));

  // Every month in the existing span and the new span must be unlocked.
  await checkPeriodLock(new Date(huvud.date));
  for (const c of children) {
    await checkPeriodLock(new Date(c.date));
  }
  await checkPeriodLock(input.bankDate);
  for (const d of sliceDates) {
    await checkPeriodLock(d);
  }

  await dbTransaction(async (client) => {
    // Rewrite huvud (keeps its bank event link).
    await client.query(
      "UPDATE transactions SET date = $1, description = $2 WHERE id = $3",
      [input.bankDate.toISOString(), input.description, huvudId]
    );
    await client.query("DELETE FROM posts WHERE transaction_id = $1", [huvudId]);
    await insertPosts(client, huvudId, huvudPosts);

    // Recreate all slices (deleting the old ones cascades their posts).
    await client.query(
      "DELETE FROM transactions WHERE periodisering_parent_id = $1",
      [huvudId]
    );
    for (let i = 0; i < slices.length; i++) {
      const lankat = await client.query<{ id: number }>(
        "INSERT INTO transactions (date, description, periodisering_parent_id) VALUES ($1, $2, $3) RETURNING id",
        [sliceDates[i].toISOString(), input.description, huvudId]
      );
      await insertPosts(client, lankat.rows[0].id, slices[i]);
    }
  });

  revalidateMutationViews();
}

// Delete a periodisering (huvud + all slices) and return the bank event to the todo list.
export async function deletePeriodisering(huvudId: number): Promise<void> {
  const huvud = await queryOne<{ date: string }>(
    "SELECT date FROM transactions WHERE id = $1",
    [huvudId]
  );
  if (!huvud) {
    throw createActionError("NOT_FOUND", "Huvudverifikat hittades inte");
  }

  const children = await queryAll<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE periodisering_parent_id = $1",
    [huvudId]
  );
  if (children.length === 0) {
    throw createActionError("VALIDATION", "Verifikatet är inte en periodisering.");
  }

  await checkPeriodLock(new Date(huvud.date));
  for (const c of children) {
    await checkPeriodLock(new Date(c.date));
  }

  await dbTransaction(async (client) => {
    await client.query(
      "UPDATE bank_events SET is_posted = 0, transaction_id = NULL WHERE transaction_id = $1",
      [huvudId]
    );
    // Deleting the huvud cascades to all länkade verifikat and their posts.
    await client.query("DELETE FROM transactions WHERE id = $1", [huvudId]);
  });

  revalidateMutationViews();
}

// Reconstruct the logical (full) kontering of a periodisering for editing.
export type PeriodiseringDetails = {
  huvudId: number;
  bankEventId?: number;
  description: string;
  bankDate: Date;
  antalManader: number;
  anchorAccountId: number;
  periodiseringskontoId: number;
  posts: Post[];
};

export async function getPeriodiseringForHuvud(
  huvudId: number
): Promise<PeriodiseringDetails | null> {
  const huvud = await queryOne<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
  }>("SELECT id, date, description, bank_event_id FROM transactions WHERE id = $1", [huvudId]);
  if (!huvud) return null;

  const children = await queryAll<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE periodisering_parent_id = $1 ORDER BY date",
    [huvudId]
  );
  if (children.length === 0) return null;

  type PostRow = {
    id: number;
    transaction_id: number;
    account_id: number;
    debet: string;
    kredit: string;
    description: string | null;
    account_name: string;
    group_id: number;
    group_name: string;
    group_type: string;
  };
  const fetchPosts = (txnIds: number[]) =>
    queryAll<PostRow>(
      `SELECT p.id, p.transaction_id, p.account_id, p.debet, p.kredit, p.description,
              a.namn as account_name, g.id as group_id, g.namn as group_name, g.typ as group_type
       FROM posts p
       JOIN accounts a ON a.id = p.account_id
       JOIN groups g ON g.id = a.group_id
       WHERE p.transaction_id = ANY($1)
       ORDER BY p.transaction_id, p.id`,
      [txnIds]
    );

  const [huvudPosts, childPosts] = await Promise.all([
    fetchPosts([huvud.id]),
    fetchPosts(children.map((c) => c.id)),
  ]);

  // The periodiseringskonto (bridge) is the account present in both huvud and children.
  const childAccountIds = new Set(childPosts.map((p) => p.account_id));
  const periodiseringskontoId =
    huvudPosts.find((p) => childAccountIds.has(p.account_id))?.account_id ?? -1;

  const toAccount = (row: PostRow) => ({
    id: row.account_id,
    namn: row.account_name,
    groupId: row.group_id,
    group: {
      id: row.group_id,
      namn: row.group_name,
      typ: row.group_type as AccountType,
    },
  });

  // Anchor = the huvud row that is not the bridge.
  const anchorRow = huvudPosts.find((p) => p.account_id !== periodiseringskontoId);

  // Category rows = children rows minus the bridge, aggregated per account back
  // to the full (logical) amount across all slices.
  const categoryByAccount = new Map<number, Post>();
  for (const row of childPosts) {
    if (row.account_id === periodiseringskontoId) continue;
    const existing = categoryByAccount.get(row.account_id);
    if (existing) {
      existing.debet += Number(row.debet);
      existing.kredit += Number(row.kredit);
    } else {
      categoryByAccount.set(row.account_id, {
        id: row.id,
        verifikatId: huvud.id,
        accountId: row.account_id,
        debet: Number(row.debet),
        kredit: Number(row.kredit),
        description: row.description ?? undefined,
        account: toAccount(row),
      });
    }
  }

  const logicalPosts: Post[] = [
    ...(anchorRow
      ? [
          {
            id: anchorRow.id,
            verifikatId: huvud.id,
            accountId: anchorRow.account_id,
            debet: Number(anchorRow.debet),
            kredit: Number(anchorRow.kredit),
            description: anchorRow.description ?? undefined,
            account: toAccount(anchorRow),
          },
        ]
      : []),
    ...categoryByAccount.values(),
  ];

  return {
    huvudId: huvud.id,
    bankEventId: huvud.bank_event_id ?? undefined,
    description: huvud.description,
    bankDate: new Date(huvud.date),
    antalManader: children.length,
    anchorAccountId: anchorRow?.account_id ?? -1,
    periodiseringskontoId,
    posts: logicalPosts,
  };
}

// Overview of active periodiseringar for a selected period: how much has been
// recognized cumulatively through the period and how much remains. See docs/adr/0009.
export type PeriodiseringOversiktRad = {
  huvudId: number;
  description: string;
  kontoNamn: string;
  total: number;
  avdraget: number;
  kvar: number;
  startDate: Date;
  slutDate: Date;
  antalManader: number;
};

export async function getPeriodiseringarOversikt(
  year: number,
  month: number
): Promise<PeriodiseringOversiktRad[]> {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));
  const periodEndKey = periodEnd.toISOString().slice(0, 10);
  const periodStartKey = periodStart.toISOString().slice(0, 10);

  const huvudRows = await queryAll<{ id: number; description: string }>(
    "SELECT id, description FROM transactions WHERE periodisering_kind = 'periodisering'"
  );
  if (huvudRows.length === 0) return [];
  const huvudIds = huvudRows.map((r) => r.id);

  const children = await queryAll<{ id: number; parent_id: number; date: string }>(
    "SELECT id, periodisering_parent_id AS parent_id, date FROM transactions WHERE periodisering_parent_id = ANY($1)",
    [huvudIds]
  );
  const childIds = children.map((c) => c.id);

  const childPosts =
    childIds.length === 0
      ? []
      : await queryAll<{ transaction_id: number; account_id: number; debet: string; account_name: string }>(
          `SELECT p.transaction_id, p.account_id, p.debet, a.namn AS account_name
           FROM posts p JOIN accounts a ON a.id = p.account_id
           WHERE p.transaction_id = ANY($1)`,
          [childIds]
        );

  const huvudPosts = await queryAll<{ transaction_id: number; account_id: number }>(
    "SELECT transaction_id, account_id FROM posts WHERE transaction_id = ANY($1)",
    [huvudIds]
  );

  // Accounts appearing in each huvud (anchor + bridge) — a child account not in
  // this set is a category (kostnad/intäkt) account.
  const huvudAccounts = new Map<number, Set<number>>();
  for (const p of huvudPosts) {
    if (!huvudAccounts.has(p.transaction_id)) huvudAccounts.set(p.transaction_id, new Set());
    huvudAccounts.get(p.transaction_id)!.add(p.account_id);
  }

  // Per child: slice amount (= sum of debet) and its parent.
  const childAmount = new Map<number, number>();
  const childCategoryName = new Map<number, string>();
  const childParent = new Map<number, number>();
  for (const c of children) childParent.set(c.id, c.parent_id);
  for (const p of childPosts) {
    childAmount.set(p.transaction_id, (childAmount.get(p.transaction_id) ?? 0) + Number(p.debet));
    const parentId = childParent.get(p.transaction_id);
    if (parentId != null && !huvudAccounts.get(parentId)?.has(p.account_id)) {
      if (!childCategoryName.has(p.transaction_id)) {
        childCategoryName.set(p.transaction_id, p.account_name);
      }
    }
  }

  const descByHuvud = new Map(huvudRows.map((r) => [r.id, r.description]));
  const rows: PeriodiseringOversiktRad[] = [];

  for (const huvudId of huvudIds) {
    const own = children.filter((c) => c.parent_id === huvudId);
    if (own.length === 0) continue;
    let total = 0;
    let avdraget = 0;
    let kontoNamn = "";
    let start = own[0].date;
    let slut = own[0].date;
    for (const c of own) {
      const amount = childAmount.get(c.id) ?? 0;
      total += amount;
      if (c.date.slice(0, 10) <= periodEndKey) avdraget += amount;
      if (!kontoNamn && childCategoryName.has(c.id)) kontoNamn = childCategoryName.get(c.id)!;
      if (c.date < start) start = c.date;
      if (c.date > slut) slut = c.date;
    }
    // Only show periodiseringar that still have a slice on/after the selected period.
    if (slut.slice(0, 10) < periodStartKey) continue;
    rows.push({
      huvudId,
      description: descByHuvud.get(huvudId) ?? "",
      kontoNamn,
      total: Math.round(total * 100) / 100,
      avdraget: Math.round(avdraget * 100) / 100,
      kvar: Math.round((total - avdraget) * 100) / 100,
      startDate: new Date(start),
      slutDate: new Date(slut),
      antalManader: own.length,
    });
  }

  rows.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return rows;
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

  revalidateMutationViews();
  return result.rows[0].id;
}

export async function updateGroup(group: Group): Promise<void> {
  await query("UPDATE groups SET namn = $1, typ = $2 WHERE id = $3", [
    group.namn,
    group.typ,
    group.id,
  ]);
  revalidateMutationViews();
}

export async function deleteGroup(id: number): Promise<void> {
  await query("DELETE FROM groups WHERE id = $1", [id]);
  revalidateMutationViews();
}

// Account actions
export async function getAccounts(): Promise<Account[]> {
  const rows = await queryAll<{
    id: number;
    namn: string;
    group_id: number;
    exclude_from_budget: number;
    is_periodisering_default: number;
    reconciled_through: string | null;
    has_posts: number;
    group_namn: string;
    group_typ: string;
  }>(
    `SELECT a.id, a.namn, a.group_id, a.exclude_from_budget, a.is_periodisering_default,
            a.reconciled_through::text as reconciled_through,
            CASE WHEN EXISTS (SELECT 1 FROM posts p WHERE p.account_id = a.id) THEN 1 ELSE 0 END as has_posts,
            g.namn as group_namn, g.typ as group_typ
     FROM accounts a
     JOIN groups g ON a.group_id = g.id
     ORDER BY g.namn, a.namn`
  );

  return rows.map((row) => ({
    id: row.id,
    namn: row.namn,
    groupId: row.group_id,
    excludeFromBudget: row.exclude_from_budget === 1,
    isPeriodiseringDefault: row.is_periodisering_default === 1,
    reconciledThrough: row.reconciled_through,
    hasPosts: row.has_posts === 1,
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
  revalidateMutationViews();
}

export async function updateAccount(
  account: Omit<Account, "group">,
  dependencies: UpdateAccountDependencies = defaultUpdateAccountDependencies
): Promise<void> {
  const currentAccount = await dependencies.getAccountById(account.id);
  if (!currentAccount) {
    throw createActionError("NOT_FOUND", "Konto hittades inte");
  }

  const isChangingGroup = currentAccount.groupId !== account.groupId;
  if (isChangingGroup) {
    const postCount = await dependencies.getPostCountByAccountId(account.id);
    if (postCount > 0) {
      throw createActionError(
        "CONFLICT",
        "Kan inte byta grupp för konto som redan har konteringsrader"
      );
    }
  }

  await dependencies.persistUpdate(account);
  revalidateMutationViews();
}

type UpdateAccountDependencies = {
  getAccountById: (id: number) => Promise<{ id: number; groupId: number } | null>;
  getPostCountByAccountId: (accountId: number) => Promise<number>;
  persistUpdate: (account: Omit<Account, "group">) => Promise<void>;
};

const defaultUpdateAccountDependencies: UpdateAccountDependencies = {
  getAccountById: async (id: number) => {
    const row = await queryOne<{ id: number; group_id: number }>(
      "SELECT id, group_id FROM accounts WHERE id = $1",
      [id]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      groupId: row.group_id,
    };
  },
  getPostCountByAccountId: async (accountId: number) => {
    const row = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM posts WHERE account_id = $1",
      [accountId]
    );
    return Number(row?.count ?? 0);
  },
  persistUpdate: async (account: Omit<Account, "group">) => {
    await dbTransaction(async (client) => {
      // A single account may be the default periodiseringskonto. Setting a new
      // default clears any previous one in the same transaction.
      if (account.isPeriodiseringDefault) {
        await client.query(
          "UPDATE accounts SET is_periodisering_default = 0 WHERE id <> $1 AND is_periodisering_default = 1",
          [account.id]
        );
      }
      await client.query(
        "UPDATE accounts SET namn = $1, group_id = $2, exclude_from_budget = $3, is_periodisering_default = $4 WHERE id = $5",
        [
          account.namn,
          account.groupId,
          account.excludeFromBudget ? 1 : 0,
          account.isPeriodiseringDefault ? 1 : 0,
          account.id,
        ]
      );
    });
  },
};

// Sätter eller rensar klarmarkeringen (avstämt t.o.m.-datum) för ett konto.
export async function setAccountReconciledThrough(
  accountId: number,
  date: string | null
): Promise<void> {
  await query("UPDATE accounts SET reconciled_through = $1 WHERE id = $2", [date, accountId]);
  revalidateMutationViews();
}

// Returns the account marked as the default periodiseringskonto, or null.
export async function getPeriodiseringskonto(): Promise<Account | null> {
  const row = await queryOne<{
    id: number;
    namn: string;
    group_id: number;
    exclude_from_budget: number;
    is_periodisering_default: number;
    group_namn: string;
    group_typ: string;
  }>(
    `SELECT a.id, a.namn, a.group_id, a.exclude_from_budget, a.is_periodisering_default,
            g.namn as group_namn, g.typ as group_typ
     FROM accounts a
     JOIN groups g ON a.group_id = g.id
     WHERE a.is_periodisering_default = 1
     LIMIT 1`
  );

  if (!row) return null;

  return {
    id: row.id,
    namn: row.namn,
    groupId: row.group_id,
    excludeFromBudget: row.exclude_from_budget === 1,
    isPeriodiseringDefault: true,
    group: {
      id: row.group_id,
      namn: row.group_namn,
      typ: row.group_typ as AccountType,
    },
  };
}

export async function deleteAccount(id: number): Promise<void> {
  await query("DELETE FROM accounts WHERE id = $1", [id]);
  revalidateMutationViews();
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

// Get account balances with month-over-month change
export async function getAccountBalancesWithChange(
  year: number,
  month: number
): Promise<{
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  balance: number;
  previousBalance: number;
  changeAmount: number;
  changePercent: number;
}[]> {
  // Get current month balances
  const currentBalances = await getAccountBalances(year, month);

  // Calculate previous month
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;

  // Get previous month balances
  const previousBalances = await getAccountBalances(previousYear, previousMonth);

  // Create a map of previous balances for easy lookup
  const previousBalanceMap = new Map(
    previousBalances.map((b) => [b.accountId, b.balance])
  );

  // Combine current and previous balances
  return currentBalances.map((current) => {
    const previousBalance = previousBalanceMap.get(current.accountId) || 0;
    const changeAmount = current.balance - previousBalance;
    const changePercent = previousBalance !== 0
      ? (changeAmount / Math.abs(previousBalance)) * 100
      : current.balance !== 0 ? 100 : 0;

    return {
      ...current,
      previousBalance,
      changeAmount,
      changePercent,
    };
  });
}

// Get account balances with change and budget comparison
export async function getAccountBalancesWithChangeBudget(
  year: number,
  month: number
): Promise<{
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  balance: number;
  previousBalance: number;
  changeAmount: number;
  changePercent: number;
  budgetAmount: number;
  variance: number;
  variancePercent: number;
  hasBudget: boolean;
}[]> {
  // Get all accounts to check exclude_from_budget flag
  const accounts = await getAccounts();
  const excludedAccountIds = new Set(
    accounts.filter(a => a.excludeFromBudget).map(a => a.id)
  );

  // Get balances with changes
  const balancesWithChange = await getAccountBalancesWithChange(year, month);

  // Filter out excluded accounts
  const includedBalances = balancesWithChange.filter(
    b => !excludedAccountIds.has(b.accountId)
  );

  // Get budgets for the current month
  const budgets = await queryAll<{
    account_id: number;
    amount: number;
  }>(
    `
    SELECT account_id, amount
    FROM budgets
    WHERE year = $1 AND month = $2
  `,
    [year, month]
  );

  // Create a map of budgets for easy lookup
  const budgetMap = new Map(
    budgets.map((b) => [b.account_id, Number(b.amount)])
  );

  // Combine balances with budgets for included accounts only
  return includedBalances.map((balance) => {
    const budgetAmount = budgetMap.get(balance.accountId) || 0;
    const hasBudget = budgetMap.has(balance.accountId);

    // For balance sheet accounts (Tillgång/Skuld):
    // Budget represents expected CHANGE, so variance = actual change - budget change
    const variance = balance.changeAmount - budgetAmount;
    const variancePercent = budgetAmount !== 0
      ? (variance / Math.abs(budgetAmount)) * 100
      : 0;

    return {
      ...balance,
      budgetAmount,
      variance,
      variancePercent,
      hasBudget,
    };
  });
}

// Get verifikat for a specific account in a specific period
export async function getAccountTransactionsForPeriod(
  accountId: number,
  year: number,
  month: number
): Promise<{
  verifikatId: number;
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
    verifikatId: row.transaction_id,
    date: new Date(row.date),
    description: row.description,
    postDebet: Number(row.post_debet),
    postKredit: Number(row.post_kredit),
    postDescription: row.post_description,
  }));
}

export interface ReconciliationMatchPost {
  verifikatId: number;
  date: string;
  verifikatDescription: string;
  postDescription: string | null;
  debet: number;
  kredit: number;
  // Radens bidrag till kontosaldot (tecknat efter kontotyp).
  contribution: number;
}

export interface ReconciliationMatch {
  posts: ReconciliationMatchPost[];
  total: number;
  // Antal dagar mellan tidigaste och senaste posten i kombinationen.
  spreadDays: number;
  // "sum": poster vars saldobidrag summerar till diffen (t.ex. dubbel-/felpost
  // att ta bort). "flip": en enskild post bokförd på fel sida (debet/kredit),
  // vars bidrag är halva diffen – att rätta genom att vända på sidan.
  kind: "sum" | "flip";
}

export interface ReconciliationResult {
  systemBalance: number;
  realBalance: number;
  diff: number;
  reconciledThrough: string | null;
  matches: ReconciliationMatch[];
}

// Avstämning: givet ett verkligt kontosaldo, hitta kombinationer av upp till
// `maxPosts` bokförda konteringsrader på kontot vars saldobidrag exakt
// motsvarar skillnaden mot systemets saldo (t.ex. en dubbel- eller felpost).
// Poster t.o.m. kontots klarmarkeringsdatum utesluts som kandidater eftersom
// saldot redan är avstämt fram till dess. Kombinationer där posterna ligger
// nära varandra i tid rankas högst.
export async function findReconciliationMatches(
  accountId: number,
  year: number,
  month: number,
  realBalance: number,
  maxPosts = 3,
  maxResults = 50
): Promise<ReconciliationResult> {
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = await queryAll<{
    transaction_id: number;
    date: string;
    verifikat_description: string;
    post_description: string | null;
    debet: string;
    kredit: string;
    group_type: string;
    reconciled_through: string | null;
  }>(
    `
    SELECT
      t.id as transaction_id,
      t.date::text as date,
      t.description as verifikat_description,
      p.description as post_description,
      p.debet,
      p.kredit,
      g.typ as group_type,
      a.reconciled_through::text as reconciled_through
    FROM posts p
    JOIN transactions t ON t.id = p.transaction_id
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    WHERE p.account_id = $1
      AND t.date <= $2
    ORDER BY t.date DESC, t.id DESC
  `,
    [accountId, endDate.toISOString()]
  );

  const reconciledThrough = rows[0]?.reconciled_through ?? null;

  // Bidrag i ören (heltal) för att undvika flyttalsfel vid summering.
  const toOre = (kr: number) => Math.round(kr * 100);
  const debitBalance = (typ: string) => typ === "Tillgång" || typ === "Utgift";

  const allItems = rows.map((row) => {
    const debet = Number(row.debet);
    const kredit = Number(row.kredit);
    const contributionOre = debitBalance(row.group_type)
      ? toOre(debet) - toOre(kredit)
      : toOre(kredit) - toOre(debet);
    return {
      verifikatId: row.transaction_id,
      date: row.date,
      verifikatDescription: row.verifikat_description,
      postDescription: row.post_description,
      debet,
      kredit,
      contributionOre,
    };
  });

  // Systemsaldot omfattar alla poster; klarmarkeringen begränsar bara vilka
  // poster som får ingå i en föreslagen kombination.
  const systemBalanceOre = allItems.reduce((sum, it) => sum + it.contributionOre, 0);
  const items = reconciledThrough
    ? allItems.filter((it) => it.date > reconciledThrough)
    : allItems;

  const realBalanceOre = toOre(realBalance);
  const targetOre = systemBalanceOre - realBalanceOre;

  const dayMs = 24 * 60 * 60 * 1000;
  const spreadOf = (indices: number[]): number => {
    const times = indices.map((i) => Date.parse(items[i].date));
    return (Math.max(...times) - Math.min(...times)) / dayMs;
  };

  const toMatch = (indices: number[], kind: "sum" | "flip" = "sum"): ReconciliationMatch => ({
    posts: indices.map((i) => {
      const it = items[i];
      return {
        verifikatId: it.verifikatId,
        date: it.date,
        verifikatDescription: it.verifikatDescription,
        postDescription: it.postDescription,
        debet: it.debet,
        kredit: it.kredit,
        contribution: it.contributionOre / 100,
      };
    }),
    total: indices.reduce((sum, i) => sum + items[i].contributionOre, 0) / 100,
    spreadDays: spreadOf(indices),
    kind,
  });

  const n = items.length;
  // Samla fler kandidater än vi returnerar så att tidssorteringen får verklig
  // effekt innan listan kortas ner.
  const genCap = Math.max(maxResults * 6, 300);
  const matches: ReconciliationMatch[] = [];

  // Felvänd bokföring: en post bokförd på fel sida bidrar med c men borde bidra
  // med −c, vilket ger ett fel på exakt 2c. Hitta enskilda poster där 2·bidrag
  // = diffen; att vända på debet/kredit rättar saldot. Genereras först så att de
  // aldrig trängs ut av taket på antal summakandidater.
  if (targetOre !== 0 && targetOre % 2 === 0) {
    const halfTargetOre = targetOre / 2;
    for (let i = 0; i < n && matches.length < genCap; i++) {
      if (items[i].contributionOre === halfTargetOre) {
        matches.push(toMatch([i], "flip"));
      }
    }
  }

  if (targetOre !== 0) {
    // Storlek 1
    for (let i = 0; i < n && matches.length < genCap; i++) {
      if (items[i].contributionOre === targetOre) {
        matches.push(toMatch([i]));
      }
    }

    // Storlek 2 (hashkarta över tidigare rader → O(n))
    if (maxPosts >= 2 && matches.length < genCap) {
      const seen = new Map<number, number[]>();
      for (let j = 0; j < n && matches.length < genCap; j++) {
        const need = targetOre - items[j].contributionOre;
        const prior = seen.get(need);
        if (prior) {
          for (const i of prior) {
            matches.push(toMatch([i, j]));
            if (matches.length >= genCap) break;
          }
        }
        const key = items[j].contributionOre;
        const bucket = seen.get(key);
        if (bucket) bucket.push(j);
        else seen.set(key, [j]);
      }
    }

    // Storlek 3 (dubbel loop över par + uppslag av tredje rad)
    if (maxPosts >= 3 && matches.length < genCap) {
      const byValue = new Map<number, number[]>();
      for (let k = 0; k < n; k++) {
        const key = items[k].contributionOre;
        const bucket = byValue.get(key);
        if (bucket) bucket.push(k);
        else byValue.set(key, [k]);
      }
      outer: for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const need = targetOre - items[i].contributionOre - items[j].contributionOre;
          const thirds = byValue.get(need);
          if (thirds) {
            for (const k of thirds) {
              if (k > j) {
                matches.push(toMatch([i, j, k]));
                if (matches.length >= genCap) break outer;
              }
            }
          }
        }
      }
    }
  }

  // Rangordna: minst tidsspridning först, sedan färre poster, sedan senaste.
  matches.sort((a, b) => {
    if (a.spreadDays !== b.spreadDays) return a.spreadDays - b.spreadDays;
    if (a.posts.length !== b.posts.length) return a.posts.length - b.posts.length;
    const aLatest = Math.max(...a.posts.map((p) => Date.parse(p.date)));
    const bLatest = Math.max(...b.posts.map((p) => Date.parse(p.date)));
    return bLatest - aLatest;
  });

  return {
    systemBalance: systemBalanceOre / 100,
    realBalance: realBalanceOre / 100,
    diff: targetOre / 100,
    reconciledThrough,
    matches: matches.slice(0, maxResults),
  };
}

// Get all transactions with full details
// Resolve periodisering link info for a set of loaded verifikat ids. Returns a
// map from verifikat id to its role and its counterpart (for click-through).
async function resolvePeriodiseringLinks(
  transactionIds: number[]
): Promise<Map<number, { role: "huvud" | "lankat"; kind: "forskjutning" | "periodisering"; motpartVerifikatId: number; motpartDate: Date }>> {
  const result = new Map<
    number,
    { role: "huvud" | "lankat"; kind: "forskjutning" | "periodisering"; motpartVerifikatId: number; motpartDate: Date }
  >();
  if (transactionIds.length === 0) return result;

  const rows = await queryAll<{
    child_id: number;
    child_date: string;
    parent_id: number;
    parent_date: string;
    parent_kind: string | null;
  }>(
    `SELECT child.id AS child_id, child.date AS child_date,
            parent.id AS parent_id, parent.date AS parent_date,
            parent.periodisering_kind AS parent_kind
     FROM transactions child
     JOIN transactions parent ON child.periodisering_parent_id = parent.id
     WHERE child.id = ANY($1) OR parent.id = ANY($1)`,
    [transactionIds]
  );

  const loaded = new Set(transactionIds);
  for (const row of rows) {
    const kind = (row.parent_kind === "periodisering" ? "periodisering" : "forskjutning") as
      | "forskjutning"
      | "periodisering";
    if (loaded.has(row.parent_id)) {
      result.set(row.parent_id, {
        role: "huvud",
        kind,
        motpartVerifikatId: row.child_id,
        motpartDate: new Date(row.child_date),
      });
    }
    if (loaded.has(row.child_id)) {
      result.set(row.child_id, {
        role: "lankat",
        kind,
        motpartVerifikatId: row.parent_id,
        motpartDate: new Date(row.parent_date),
      });
    }
  }

  return result;
}

// Helper function to fetch recurring items for multiple transactions
async function fetchRecurringItemsForTransactions(transactionIds: number[]): Promise<Map<number, RecurringItem[]>> {  if (transactionIds.length === 0) return new Map();

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

type TransactionJoinRow = {
  txn_id: number;
  txn_date: string;
  txn_description: string;
  txn_bank_event_id: number | null;
  txn_periodisering_parent_id: number | null;
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
  be_flagged: boolean | null;
  be_flag_comment: string | null;
  be_transaction_id: number | null;
  be_import_id: number | null;
  be_import_is_external: boolean | null;
};

const TRANSACTION_LIST_SELECT = `
  SELECT
    t.id as txn_id,
    t.date as txn_date,
    t.description as txn_description,
    t.bank_event_id as txn_bank_event_id,
    t.periodisering_parent_id as txn_periodisering_parent_id,
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
    be.flagged as be_flagged,
    be.flag_comment as be_flag_comment,
    be.transaction_id as be_transaction_id,
    be.import_id as be_import_id,
    i.is_external as be_import_is_external
`;

async function mapVerifikatFromJoinRows(rows: TransactionJoinRow[]): Promise<Verifikat[]> {
  const verifikatMap = new Map<number, Verifikat>();

  for (const row of rows) {
    if (!verifikatMap.has(row.txn_id)) {
      verifikatMap.set(row.txn_id, {
        id: row.txn_id,
        date: new Date(row.txn_date),
        description: row.txn_description,
        bankEventId: row.txn_bank_event_id ?? undefined,
        periodiseringParentId: row.txn_periodisering_parent_id ?? undefined,
        isExternal: row.be_import_is_external ?? false,
        bankEvent: row.be_id
          ? {
              id: row.be_id,
              date: new Date(row.be_date!),
              description: row.be_description!,
              amount: Number(row.be_amount),
              isPosted: row.be_is_posted === 1,
              flagged: row.be_flagged ?? false,
              flagComment: row.be_flag_comment ?? undefined,
              verifikatId: row.be_transaction_id ?? undefined,
              importId: row.be_import_id ?? undefined,
            }
          : undefined,
        posts: [],
      });
    }

    const verifikat = verifikatMap.get(row.txn_id)!;
    verifikat.posts.push({
      id: row.post_id,
      verifikatId: row.txn_id,
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

  const verifikatIds = Array.from(verifikatMap.keys());
  const recurringMap = await fetchRecurringItemsForTransactions(verifikatIds);

  for (const [txnId, verifikat] of verifikatMap) {
    const recurringItems = recurringMap.get(txnId);
    if (recurringItems && recurringItems.length > 0) {
      verifikat.recurringItems = recurringItems;
    }
  }

  const periodiseringMap = await resolvePeriodiseringLinks(verifikatIds);
  for (const [txnId, verifikat] of verifikatMap) {
    const link = periodiseringMap.get(txnId);
    if (link) {
      verifikat.periodisering = link;
    }
  }

  return Array.from(verifikatMap.values());
}

export async function getAllVerifikat(): Promise<Verifikat[]> {
  const rows = await queryAll<TransactionJoinRow>(`
    ${TRANSACTION_LIST_SELECT}
    FROM transactions t
    JOIN posts p ON p.transaction_id = t.id
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    LEFT JOIN bank_events be ON be.id = t.bank_event_id
    LEFT JOIN imports i ON i.id = be.import_id
    ORDER BY t.date DESC, t.id DESC, p.id ASC
  `);

  return mapVerifikatFromJoinRows(rows);
}

export async function getVerifikatPaginated(
  limit: number = 50,
  offset: number = 0,
  searchQuery?: string,
  sortField: "date" | "description" | "accounts" = "date",
  sortDirection: "asc" | "desc" = "desc",
  filterAccountType?: string,
  filterAccountId?: number,
  filterDateFrom?: string,
  filterDateTo?: string
): Promise<{ verifikat: Verifikat[]; total: number }> {
  // Build WHERE clauses for filtering
  const whereClauses: string[] = [];
  const params: unknown[] = [];
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

  const rows = await queryAll<TransactionJoinRow>(
    `
    WITH paginated_transactions AS (
      SELECT id, date, description, bank_event_id, periodisering_parent_id
      FROM transactions t
      ${whereClause}
      ${orderBy}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    )
    ${TRANSACTION_LIST_SELECT}
    FROM paginated_transactions t
    JOIN posts p ON p.transaction_id = t.id
    JOIN accounts a ON a.id = p.account_id
    JOIN groups g ON g.id = a.group_id
    LEFT JOIN bank_events be ON be.id = t.bank_event_id
    LEFT JOIN imports i ON i.id = be.import_id
    ${orderBy}, p.id ASC
  `,
    params
  );

  const verifikat = await mapVerifikatFromJoinRows(rows);

  return {
    verifikat,
    total,
  };
}

// Get a single verifikat with full details
export async function getVerifikat(id: number): Promise<Verifikat | null> {
  const txnRow = await queryOne<{
    id: number;
    date: string;
    description: string;
    bank_event_id: number | null;
    periodisering_parent_id: number | null;
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
    verifikatId: postRow.transaction_id,
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

  const periodiseringMap = await resolvePeriodiseringLinks([txnRow.id]);

  return {
    id: txnRow.id,
    date: new Date(txnRow.date),
    description: txnRow.description,
    bankEventId: txnRow.bank_event_id ?? undefined,
    periodiseringParentId: txnRow.periodisering_parent_id ?? undefined,
    periodisering: periodiseringMap.get(txnRow.id),
    posts,
    recurringItems: recurringItems.length > 0 ? recurringItems : undefined,
  };
}

// --- Konteringsförslag från konteringsmallar (issue 19, ADR-0010) ---

/**
 * Konteringsförslagen för en obokförd bankhändelse, enbart ur konteringsmallar.
 * Scenariot avgör hur många förslag som visas; inget tillämpas automatiskt.
 */
export async function getKonteringsforslag(bankEventId: number): Promise<Konteringsforslag> {
  const handelse = await queryOne<{
    datum: string;
    beskrivning: string;
    belopp: string;
    ankar_account_id: number | null;
  }>(
    `SELECT to_char(be.date, 'YYYY-MM-DD') AS datum,
            be.description AS beskrivning,
            be.amount AS belopp,
            i.account_id AS ankar_account_id
       FROM bank_events be
       LEFT JOIN imports i ON i.id = be.import_id
      WHERE be.id = $1`,
    [bankEventId]
  );
  if (!handelse) return { scenario: "okand", forslag: [], inaktiveradeMallar: [] };

  const db = getDatabase();
  const [konton, historik, mallar, recurring] = await Promise.all([
    hamtaKonton(db),
    hamtaHistorik(db),
    hamtaMallar(db),
    queryAll<{ id: number; namn: string }>("SELECT id, namn FROM recurring_items"),
  ]);

  return byggKonteringsforslag(
    {
      datum: handelse.datum,
      beskrivning: handelse.beskrivning,
      belopp: Number(handelse.belopp),
      ankarAccountId: handelse.ankar_account_id,
    },
    {
      mallar,
      observationer: tillObservationer(historik, konton).observationer,
      bankhandelser: new Map(historik.map((h) => [h.bankEventId, h])),
      konton,
      recurringItems: new Map(recurring.map((r) => [r.id, r.namn])),
    }
  );
}

// Update a verifikat
export async function updateVerifikat(
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
  const existing = await queryOne<{ periodisering_parent_id: number | null }>(
    "SELECT periodisering_parent_id FROM transactions WHERE id = $1",
    [id]
  );
  if (existing) {
    await assertNotPeriodiseringMember(id, existing.periodisering_parent_id);
  }

  await postVerifikat({
    mode: "update",
    id,
    date: data.date,
    description: data.description,
    posts: data.posts,
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
    throw createActionError("CONFLICT", `Perioden ${year}-${String(month).padStart(2, "0")} är redan låst`);
  }

  await query(
    "INSERT INTO period_locks (year, month, locked_by) VALUES ($1, $2, $3)",
    [year, month, lockedBy ?? null]
  );
  revalidateMutationViews();
}

export async function unlockPeriod(year: number, month: number): Promise<void> {
  await query("DELETE FROM period_locks WHERE year = $1 AND month = $2", [year, month]);
  revalidateMutationViews();
}

// Helper function to check if a transaction date is in a locked period
async function checkPeriodLock(date: Date): Promise<void> {
  const isLocked = await isPeriodLocked(date);
  if (isLocked) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    throw createActionError(
      "LOCKED_PERIOD",
      `Kan inte ändra verifikat. Perioden ${year}-${String(month).padStart(2, "0")} är låst.`
    );
  }
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
  revalidateMutationViews();
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
  revalidateMutationViews();
}

export async function deleteRecurringItem(id: number): Promise<void> {
  await query("DELETE FROM recurring_items WHERE id = $1", [id]);
  revalidateMutationViews();
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

    // Get the most recent transactions that used this recurring item, so the
    // user can see what to look for when matching new bank events.
    const recentRows = await queryAll<{
      transaction_id: number;
      date: string;
      description: string;
      total_amount: number;
    }>(
      `SELECT
        t.id AS transaction_id,
        t.date AS date,
        t.description AS description,
        COALESCE(SUM(p.debet), 0) AS total_amount
      FROM transaction_recurring_items tri
      JOIN transactions t ON t.id = tri.transaction_id
      LEFT JOIN posts p ON p.transaction_id = t.id
      WHERE tri.recurring_item_id = $1
      GROUP BY t.id, t.date, t.description
      ORDER BY t.date DESC, t.id DESC
      LIMIT 3`,
      [item.id]
    );

    const recentUsages = recentRows.map((r) => ({
      verifikatId: r.transaction_id,
      date: new Date(r.date),
      description: r.description,
      amount: Number(r.total_amount),
    }));

    // Estimate the amount expected for this recurring item and classify it as
    // an expense or income based on the accounts touched by its most recent
    // usage. This lets the dashboard sum up what is expected to be drawn.
    const flowRows = await queryAll<{
      group_type: AccountType;
      debet: number;
      kredit: number;
    }>(
      `WITH latest AS (
        SELECT t.id
        FROM transactions t
        JOIN transaction_recurring_items tri ON tri.transaction_id = t.id
        WHERE tri.recurring_item_id = $1
        ORDER BY t.date DESC, t.id DESC
        LIMIT 1
      )
      SELECT
        g.typ AS group_type,
        COALESCE(SUM(p.debet), 0) AS debet,
        COALESCE(SUM(p.kredit), 0) AS kredit
      FROM posts p
      JOIN accounts a ON a.id = p.account_id
      JOIN groups g ON g.id = a.group_id
      WHERE p.transaction_id IN (SELECT id FROM latest)
      GROUP BY g.typ`,
      [item.id]
    );

    let expenseMagnitude = 0;
    let incomeMagnitude = 0;
    for (const row of flowRows) {
      if (row.group_type === "Utgift") {
        expenseMagnitude += Number(row.debet) - Number(row.kredit);
      } else if (row.group_type === "Intäkt") {
        incomeMagnitude += Number(row.kredit) - Number(row.debet);
      }
    }

    let flowType: "expense" | "income" | "other";
    let estimatedAmount: number;
    if (expenseMagnitude <= 0 && incomeMagnitude <= 0) {
      flowType = "other";
      estimatedAmount = 0;
    } else if (expenseMagnitude >= incomeMagnitude) {
      flowType = "expense";
      estimatedAmount = expenseMagnitude;
    } else {
      flowType = "income";
      estimatedAmount = incomeMagnitude;
    }

    statuses.push({
      recurringItem: item,
      currentPeriodCount,
      currentPeriodAmount,
      previousPeriodCount,
      previousPeriodAmount,
      isComplete: currentPeriodCount >= item.expectedPerMonth,
      recentUsages,
      estimatedAmount,
      flowType,
    });
  }

  return statuses;
}

export async function getRecurringItemForVerifikat(
  verifikatId: number
): Promise<number | null> {
  const result = await queryOne<{ recurring_item_id: number }>(
    "SELECT recurring_item_id FROM transaction_recurring_items WHERE transaction_id = $1",
    [verifikatId]
  );
  return result?.recurring_item_id ?? null;
}

export async function linkVerifikatToRecurringItem(
  verifikatId: number,
  recurringItemId: number
): Promise<void> {
  await query(
    "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [verifikatId, recurringItemId]
  );
  revalidateMutationViews();
}

export async function unlinkVerifikatFromRecurringItem(
  verifikatId: number,
  recurringItemId: number
): Promise<void> {
  await query(
    "DELETE FROM transaction_recurring_items WHERE transaction_id = $1 AND recurring_item_id = $2",
    [verifikatId, recurringItemId]
  );
  revalidateMutationViews();
}

export async function updateVerifikatRecurringItemLink(
  verifikatId: number,
  recurringItemId: number | null
): Promise<void> {
  // First, remove any existing links
  await query(
    "DELETE FROM transaction_recurring_items WHERE transaction_id = $1",
    [verifikatId]
  );

  // If a recurring item is selected, create the link
  if (recurringItemId !== null) {
    await query(
      "INSERT INTO transaction_recurring_items (transaction_id, recurring_item_id) VALUES ($1, $2)",
      [verifikatId, recurringItemId]
    );
  }

  revalidateMutationViews();
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
    throw createActionError("VALIDATION", "Must provide exactly 12 monthly amounts");
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

  revalidateMutationViews();
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

// Get budget comparison for ALL account types (including balance sheet accounts)
// Used for budget management page where users can set budgets for any account
export async function getAllAccountsBudgetComparison(
  year: number,
  month: number
): Promise<BudgetComparison[]> {
  // Get all accounts to check exclude_from_budget flag
  const accounts = await getAccounts();
  const excludedAccountIds = new Set(
    accounts.filter(a => a.excludeFromBudget).map(a => a.id)
  );

  // Get all accounts with their balances
  const balances = await getAccountBalances(year, month);

  // Filter out excluded accounts
  const includedBalances = balances.filter(
    b => !excludedAccountIds.has(b.accountId)
  );

  // Get balance changes for balance sheet accounts
  const balancesWithChange = await getAccountBalancesWithChange(year, month);
  const changeMap = new Map(
    balancesWithChange.map((b) => [b.accountId, b.changeAmount])
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

  // Build comparison results for included accounts only
  const comparisons: BudgetComparison[] = includedBalances.map((balance) => {
    const budgetAmount = budgetMap.get(balance.accountId) ?? 0;
    const hasBudget = budgetMap.has(balance.accountId);

    let actualAmount: number;
    let variance: number;

    // Different logic for balance sheet vs income statement accounts
    if (balance.groupType === "Tillgång" || balance.groupType === "Skuld") {
      // For balance sheet accounts: use CHANGE amount, not balance
      actualAmount = changeMap.get(balance.accountId) ?? 0;

      if (balance.groupType === "Skuld") {
        // For Skuld: reducing debt is good (negative numbers)
        // If budget = -10000 (plan to reduce debt by 10000)
        // and actual = -12000 (reduced debt by 12000)
        // variance should be positive (budget - actual = -10000 - (-12000) = +2000)
        variance = budgetAmount - actualAmount;
      } else {
        // For Tillgång: increasing assets is good
        // variance = actual - budget
        variance = actualAmount - budgetAmount;
      }
    } else {
      // For income statement accounts: use period balance
      actualAmount = balance.balance;
      // Calculate variance based on account type
      if (balance.groupType === "Utgift") {
        variance = budgetAmount - actualAmount; // positive = under budget
      } else {
        // Intäkt
        variance = actualAmount - budgetAmount; // positive = over budget
      }
    }

    const variancePercent = budgetAmount !== 0
      ? (variance / Math.abs(budgetAmount)) * 100
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

// Kontoanalys: budget vs utfall vs differens month-by-month for a single account.
// mode "calendar" = Jan..Dec of `year`; mode "r12" = the 12 months ending at
// (year, refMonth), i.e. a rolling twelve-month window that can span years.
const ANALYSIS_MONTH_NAMES = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export async function getAccountAnalysis(
  accountId: number,
  year: number,
  mode: "calendar" | "r12" = "calendar",
  refMonth: number = 12
): Promise<AccountAnalysis> {
  // Account metadata (name + type) drives sign convention and variance direction
  const accountRow = await queryOne<{
    id: number;
    namn: string;
    group_name: string;
    group_type: string;
  }>(
    `
    SELECT a.id, a.namn, g.namn as group_name, g.typ as group_type
    FROM accounts a
    JOIN groups g ON a.group_id = g.id
    WHERE a.id = $1
    `,
    [accountId]
  );

  if (!accountRow) {
    throw createActionError("NOT_FOUND", `Konto ${accountId} finns inte`);
  }

  const groupType = accountRow.group_type as AccountType;

  // Build the ordered list of 12 (year, month) periods for the window
  const periods: { year: number; month: number }[] = [];
  if (mode === "r12") {
    for (let i = 11; i >= 0; i--) {
      let m = refMonth - i;
      let y = year;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      periods.push({ year: y, month: m });
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      periods.push({ year, month: m });
    }
  }

  const startYear = periods[0].year;
  const endYear = periods[periods.length - 1].year;

  // Net posting activity per (year, month) for this account across the window
  const activityRows = await queryAll<{
    year: number;
    month: number;
    total_debet: number;
    total_kredit: number;
  }>(
    `
    SELECT
      EXTRACT(YEAR FROM t.date::timestamp)::INTEGER as year,
      EXTRACT(MONTH FROM t.date::timestamp)::INTEGER as month,
      COALESCE(SUM(p.debet), 0) as total_debet,
      COALESCE(SUM(p.kredit), 0) as total_kredit
    FROM posts p
    JOIN transactions t ON t.id = p.transaction_id
    WHERE p.account_id = $1
      AND EXTRACT(YEAR FROM t.date::timestamp) BETWEEN $2 AND $3
    GROUP BY 1, 2
    `,
    [accountId, startYear, endYear]
  );

  const key = (y: number, m: number) => `${y}-${m}`;
  const actualByPeriod = new Map<string, number>();
  activityRows.forEach((row) => {
    const debet = Number(row.total_debet);
    const kredit = Number(row.total_kredit);
    // Debit-balance accounts (Tillgång, Utgift) vs credit-balance (Skuld, Intäkt)
    const actual =
      groupType === "Tillgång" || groupType === "Utgift"
        ? debet - kredit
        : kredit - debet;
    actualByPeriod.set(key(row.year, row.month), actual);
  });

  // Budgets for the account across the involved years
  const budgetRows = await queryAll<{ year: number; month: number; amount: number }>(
    "SELECT year, month, amount FROM budgets WHERE account_id = $1 AND year BETWEEN $2 AND $3",
    [accountId, startYear, endYear]
  );
  const budgetByPeriod = new Map<string, number>();
  budgetRows.forEach((row) => {
    budgetByPeriod.set(key(row.year, row.month), Number(row.amount));
  });

  const months: AccountAnalysisMonth[] = [];
  let totalBudget = 0;
  let totalActual = 0;

  for (const { year: y, month: m } of periods) {
    const budget = budgetByPeriod.get(key(y, m)) ?? 0;
    const actual = actualByPeriod.get(key(y, m)) ?? 0;

    // Good-sense variance: for costs (Utgift) and debt reduction (Skuld),
    // spending less than budget is positive; otherwise more is positive.
    const variance =
      groupType === "Utgift" || groupType === "Skuld"
        ? budget - actual
        : actual - budget;

    const label =
      mode === "r12"
        ? `${ANALYSIS_MONTH_NAMES[m - 1].slice(0, 3).toLowerCase()} -${String(y).slice(2)}`
        : ANALYSIS_MONTH_NAMES[m - 1];

    months.push({ year: y, month: m, label, budget, actual, variance });
    totalBudget += budget;
    totalActual += actual;
  }

  const totalVariance =
    groupType === "Utgift" || groupType === "Skuld"
      ? totalBudget - totalActual
      : totalActual - totalBudget;

  return {
    accountId: accountRow.id,
    accountName: accountRow.namn,
    groupName: accountRow.group_name,
    groupType,
    mode,
    year,
    months,
    totalBudget,
    totalActual,
    totalVariance,
  };
}

// Get budget comparison for result view with R12 and YTD data
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
  ytdActual: number;
  ytdBudget: number;
  ytdVariance: number;
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

  // Get YTD actual (year-to-date: January through current month)
  const ytdActuals = new Map<number, number>();
  for (let i = 1; i <= month; i++) {
    const monthBalances = await getAccountBalances(year, i);
    monthBalances.forEach((balance) => {
      if (balance.groupType === "Intäkt" || balance.groupType === "Utgift") {
        const current = ytdActuals.get(balance.accountId) || 0;
        ytdActuals.set(balance.accountId, current + balance.balance);
      }
    });
  }

  // Get YTD budget (year-to-date: January through current month)
  const ytdBudgetMap = new Map<number, number>();
  for (let i = 1; i <= month; i++) {
    const monthBudgetRows = await queryAll<{
      account_id: number;
      amount: number;
    }>(
      "SELECT account_id, amount FROM budgets WHERE year = $1 AND month = $2",
      [year, i]
    );

    monthBudgetRows.forEach((row) => {
      const current = ytdBudgetMap.get(row.account_id) || 0;
      ytdBudgetMap.set(row.account_id, current + Number(row.amount));
    });
  }

  // Build comparison results
  const comparisons = incomeStatementBalances.map((balance) => {
    const periodActual = balance.balance;
    const periodBudget = periodBudgetMap.get(balance.accountId) ?? 0;
    const r12Actual = r12Actuals.get(balance.accountId) ?? 0;
    const r12Budget = r12BudgetMap.get(balance.accountId) ?? 0;
    const ytdActual = ytdActuals.get(balance.accountId) ?? 0;
    const ytdBudget = ytdBudgetMap.get(balance.accountId) ?? 0;

    // Calculate variance
    // For Utgift (Expense): budget - actual (positive = saved money, under budget)
    // For Intäkt (Income): actual - budget (positive = more income than budgeted)
    let periodVariance: number;
    let r12Variance: number;
    let ytdVariance: number;

    if (balance.groupType === "Utgift") {
      periodVariance = periodBudget - periodActual;
      r12Variance = r12Budget - r12Actual;
      ytdVariance = ytdBudget - ytdActual;
    } else {
      // Intäkt
      periodVariance = periodActual - periodBudget;
      r12Variance = r12Actual - r12Budget;
      ytdVariance = ytdActual - ytdBudget;
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
      ytdActual,
      ytdBudget,
      ytdVariance,
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
  ytdActual: number;
  ytdBudget: number;
  ytdVariance: number;
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
    ytdActual: number;
    ytdBudget: number;
    ytdVariance: number;
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

    // Get YTD actual (year-to-date: January through target month of target year)
    let ytdActual = 0;
    for (let j = 1; j <= targetMonth; j++) {
      const monthBalances = await getAccountBalances(targetYear, j);
      const monthBalance = monthBalances.find(b => b.accountId === accountId);
      ytdActual += monthBalance?.balance ?? 0;
    }

    // Get YTD budget (year-to-date: January through target month of target year)
    let ytdBudget = 0;
    for (let j = 1; j <= targetMonth; j++) {
      const budgetRow = await queryOne<{ amount: number }>(
        "SELECT amount FROM budgets WHERE account_id = $1 AND year = $2 AND month = $3",
        [accountId, targetYear, j]
      );
      ytdBudget += budgetRow ? Number(budgetRow.amount) : 0;
    }

    // Calculate variance
    let periodVariance: number;
    let r12Variance: number;
    let ytdVariance: number;

    if (accountInfo.group_type === "Utgift") {
      periodVariance = periodBudget - periodActual;
      r12Variance = r12Budget - r12Actual;
      ytdVariance = ytdBudget - ytdActual;
    } else {
      // Intäkt
      periodVariance = periodActual - periodBudget;
      r12Variance = r12Actual - r12Budget;
      ytdVariance = ytdActual - ytdBudget;
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
      ytdActual,
      ytdBudget,
      ytdVariance,
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
  revalidateMutationViews();
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
  const createdView = await dbTransaction(async (client) => {
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
      throw createActionError("DATABASE", "Failed to create custom result view");
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

  revalidateMutationViews();
  return createdView;
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

  revalidateMutationViews();
}

export async function deleteCustomResultView(id: number): Promise<void> {
  // CASCADE delete will automatically remove related records
  await query("DELETE FROM custom_result_views WHERE id = $1", [id]);
  revalidateMutationViews();
}

// --- Dashboard / Översikt ---

const DASHBOARD_MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

function dashboardMonthLabel(year: number, month: number): string {
  return `${DASHBOARD_MONTH_NAMES[month - 1]} -${String(year).slice(2)}`;
}

// Compute the full dashboard overview in a single pass over the trailing
// 12 months ending at (year, month). Reuses getAccountBalances per month for
// both the income-statement series and the cumulative net-worth series.
export async function getDashboardOverview(
  year: number,
  month: number
): Promise<DashboardOverview> {
  // Accounts excluded from budget follow-up should not appear as outliers.
  const accounts = await getAccounts();
  const excludedAccountIds = new Set(
    accounts.filter((a) => a.excludeFromBudget).map((a) => a.id)
  );

  // Build the list of 12 months (chronological, oldest first).
  const window: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    window.push({ year: y, month: m });
  }

  const months: DashboardMonth[] = [];
  const monthDetails: DashboardMonthDetail[] = [];

  // Accumulators for KPIs / top expenses / YTD outliers.
  const expenseByAccount = new Map<
    number,
    { name: string; period: number; r12: number }
  >();
  const ytdActual = new Map<number, number>();
  const ytdBudget = new Map<number, number>();
  const ytdMeta = new Map<number, { name: string; type: AccountType }>();

  let r12Resultat = 0;
  let r12Intakter = 0;
  let r12Utgifter = 0;
  let ytdResultat = 0;
  let ytdIntakter = 0;
  let periodResultat = 0;
  let periodIntakter = 0;

  for (let idx = 0; idx < window.length; idx++) {
    const { year: y, month: m } = window[idx];
    const isLast = idx === window.length - 1;
    const isYtd = y === year && m <= month;

    const balances = await getAccountBalances(y, m);

    const budgetRows = await queryAll<{ account_id: number; amount: number }>(
      "SELECT account_id, amount FROM budgets WHERE year = $1 AND month = $2",
      [y, m]
    );
    const budgetMap = new Map<number, number>();
    budgetRows.forEach((row) => budgetMap.set(row.account_id, Number(row.amount)));

    let intakter = 0;
    let utgifter = 0;
    let tillgangar = 0;
    let skulder = 0;
    let budgetIntakter = 0;
    let budgetUtgifter = 0;
    const monthOutliers: BudgetOutlier[] = [];

    for (const b of balances) {
      if (b.groupType === "Intäkt") intakter += b.balance;
      else if (b.groupType === "Utgift") utgifter += b.balance;
      else if (b.groupType === "Tillgång") tillgangar += b.balance;
      else if (b.groupType === "Skuld") skulder += b.balance;

      // Sum budgeted income/expenses for the month (for budget vs utfall).
      if (b.groupType === "Intäkt") budgetIntakter += budgetMap.get(b.accountId) ?? 0;
      else if (b.groupType === "Utgift") budgetUtgifter += budgetMap.get(b.accountId) ?? 0;

      // Income-statement accounts feed budget outliers.
      if (b.groupType === "Intäkt" || b.groupType === "Utgift") {
        if (!excludedAccountIds.has(b.accountId)) {
          const budget = budgetMap.get(b.accountId) ?? 0;
          if (budget !== 0 || b.balance !== 0) {
            const variance =
              b.groupType === "Utgift"
                ? budget - b.balance // under budget = good
                : b.balance - budget; // more income = good
            monthOutliers.push({
              accountId: b.accountId,
              accountName: b.accountName,
              groupType: b.groupType,
              actual: b.balance,
              budget,
              variance,
            });
          }
        }
      }

      // Top expenses (selected month + R12).
      if (b.groupType === "Utgift" && b.balance !== 0) {
        const prev = expenseByAccount.get(b.accountId) ?? {
          name: b.accountName,
          period: 0,
          r12: 0,
        };
        prev.r12 += b.balance;
        if (isLast) prev.period = b.balance;
        expenseByAccount.set(b.accountId, prev);
      }

      // YTD accumulation for income-statement accounts.
      if (isYtd && (b.groupType === "Intäkt" || b.groupType === "Utgift")) {
        if (!excludedAccountIds.has(b.accountId)) {
          ytdActual.set(b.accountId, (ytdActual.get(b.accountId) ?? 0) + b.balance);
          ytdBudget.set(
            b.accountId,
            (ytdBudget.get(b.accountId) ?? 0) + (budgetMap.get(b.accountId) ?? 0)
          );
          ytdMeta.set(b.accountId, { name: b.accountName, type: b.groupType });
        }
      }
    }

    const resultat = intakter - utgifter;
    const nettoformogenhet = tillgangar - skulder;
    const budgetResultat = budgetIntakter - budgetUtgifter;

    months.push({
      year: y,
      month: m,
      label: dashboardMonthLabel(y, m),
      intakter,
      utgifter,
      resultat,
      nettoformogenhet,
      budgetIntakter,
      budgetUtgifter,
      budgetResultat,
      resultatAvvikelse: resultat - budgetResultat,
    });

    // Sort outliers by how far they diverge from budget (largest first).
    monthOutliers.sort((a, b) => Math.abs(a.variance) - Math.abs(b.variance));
    monthOutliers.reverse();
    monthDetails.push({
      year: y,
      month: m,
      label: dashboardMonthLabel(y, m),
      outliers: monthOutliers.slice(0, 5),
    });

    r12Resultat += resultat;
    r12Intakter += intakter;
    r12Utgifter += utgifter;
    if (isYtd) {
      ytdResultat += resultat;
      ytdIntakter += intakter;
    }
    if (isLast) {
      periodResultat = resultat;
      periodIntakter = intakter;
    }
  }

  // Most recent month first for the per-month detail list.
  monthDetails.reverse();

  const sparkvot = (resultat: number, intakter: number) =>
    intakter > 0 ? resultat / intakter : 0;

  // Top expenses sorted by R12 size.
  const topExpenses: DashboardTopExpense[] = Array.from(
    expenseByAccount.entries()
  )
    .map(([accountId, v]) => ({
      accountId,
      accountName: v.name,
      period: v.period,
      r12: v.r12,
    }))
    .sort((a, b) => b.r12 - a.r12)
    .slice(0, 8);

  // YTD budget outliers.
  const ytdOutliers: BudgetOutlier[] = Array.from(ytdMeta.entries())
    .map(([accountId, meta]) => {
      const actual = ytdActual.get(accountId) ?? 0;
      const budget = ytdBudget.get(accountId) ?? 0;
      const variance =
        meta.type === "Utgift" ? budget - actual : actual - budget;
      return {
        accountId,
        accountName: meta.name,
        groupType: meta.type,
        actual,
        budget,
        variance,
      };
    })
    .filter((o) => o.budget !== 0 || o.actual !== 0)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 8);

  // To-do counts (obokförda / flaggade bankhändelser).
  const unpostedRow = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM bank_events WHERE is_posted = 0 AND is_irrelevant = false"
  );
  const flaggedRow = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM bank_events WHERE is_posted = 0 AND is_irrelevant = false AND flagged = true"
  );

  return {
    year,
    month,
    months,
    monthDetails,
    kpi: {
      periodResultat,
      periodIntakter,
      periodSparkvot: sparkvot(periodResultat, periodIntakter),
      r12Resultat,
      r12Intakter,
      r12Utgifter,
      r12Sparkvot: sparkvot(r12Resultat, r12Intakter),
      ytdResultat,
      ytdIntakter,
      ytdSparkvot: sparkvot(ytdResultat, ytdIntakter),
    },
    todo: {
      unposted: Number(unpostedRow?.count) || 0,
      flagged: Number(flaggedRow?.count) || 0,
    },
    topExpenses,
    ytdOutliers,
  };
}

// Fristående att göra-poster på översiktsvyn. Sorteras med tidigaste
// förfallodatum först; passerade datum flaggas som akuta i UI.
export async function getTodos(): Promise<Todo[]> {
  const rows = await queryAll<{ id: number; description: string; due_date: string }>(
    "SELECT id, description, due_date::text AS due_date FROM todos ORDER BY due_date ASC, id ASC"
  );
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    dueDate: row.due_date,
  }));
}

export async function createTodo(description: string, dueDate: string): Promise<Todo> {
  const trimmed = description.trim();
  if (!trimmed) {
    throw createActionError("VALIDATION", "Beskrivning krävs.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw createActionError("VALIDATION", "Ogiltigt datum.");
  }
  const row = await queryOne<{ id: number; description: string; due_date: string }>(
    "INSERT INTO todos (description, due_date) VALUES ($1, $2) RETURNING id, description, due_date::text AS due_date",
    [trimmed, dueDate]
  );
  if (!row) {
    throw createActionError("DATABASE", "Kunde inte skapa att göra-post.");
  }
  revalidatePath("/");
  return { id: row.id, description: row.description, dueDate: row.due_date };
}

export async function updateTodo(id: number, description: string, dueDate: string): Promise<Todo> {
  const trimmed = description.trim();
  if (!trimmed) {
    throw createActionError("VALIDATION", "Beskrivning krävs.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw createActionError("VALIDATION", "Ogiltigt datum.");
  }
  const row = await queryOne<{ id: number; description: string; due_date: string }>(
    "UPDATE todos SET description = $1, due_date = $2 WHERE id = $3 RETURNING id, description, due_date::text AS due_date",
    [trimmed, dueDate, id]
  );
  if (!row) {
    throw createActionError("NOT_FOUND", "Att göra-posten hittades inte.");
  }
  revalidatePath("/");
  return { id: row.id, description: row.description, dueDate: row.due_date };
}

export async function deleteTodo(id: number): Promise<void> {
  await query("DELETE FROM todos WHERE id = $1", [id]);
  revalidatePath("/");
}
