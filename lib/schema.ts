import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const groups = pgTable(
  "groups",
  {
    id: serial("id").primaryKey(),
    namn: text("namn").notNull().unique(),
    typ: text("typ").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    check("groups_typ_check", sql`${table.typ} IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld')`),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    namn: text("namn").notNull(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id),
    excludeFromBudget: integer("exclude_from_budget").notNull().default(0),
    isPeriodiseringDefault: integer("is_periodisering_default").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("accounts_periodisering_default_unique")
      .on(table.isPeriodiseringDefault)
      .where(sql`${table.isPeriodiseringDefault} = 1`),
  ]
);

export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  importedAt: timestamp("imported_at").defaultNow(),
  totalEvents: integer("total_events").notNull(),
  dateRangeStart: date("date_range_start", { mode: "string" }).notNull(),
  dateRangeEnd: date("date_range_end", { mode: "string" }).notNull(),
  accountId: integer("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  // Extern import: bokförs mot ett skuldkonto (privat konto som inte bokförs),
  // till skillnad från en vanlig bankimport mot ett tillgångskonto.
  isExternal: boolean("is_external").notNull().default(false),
});

export const verifikat = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    bankEventId: integer("bank_event_id").references((): AnyPgColumn => bankEvents.id),
    periodiseringParentId: integer("periodisering_parent_id").references(
      (): AnyPgColumn => verifikat.id,
      { onDelete: "cascade" }
    ),
    periodiseringKind: text("periodisering_kind"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    check(
      "transactions_periodisering_kind_check",
      sql`${table.periodiseringKind} IN ('forskjutning', 'periodisering')`
    ),
  ]
);

export const bankEvents = pgTable("bank_events", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  isPosted: integer("is_posted").notNull().default(0),
  flagged: boolean("flagged").notNull().default(false),
  flagComment: text("flag_comment"),
  // Markerad som irrelevant i en extern import: tas inte med i att göra-listan
  // och bokförs aldrig. Kan ångras.
  isIrrelevant: boolean("is_irrelevant").notNull().default(false),
  verifikatId: integer("transaction_id").references((): AnyPgColumn => verifikat.id),
  importId: integer("import_id").references(() => imports.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    verifikatId: integer("transaction_id")
      .notNull()
      .references(() => verifikat.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    debet: numeric("debet", { precision: 15, scale: 2 }).notNull().default("0"),
    kredit: numeric("kredit", { precision: 15, scale: 2 }).notNull().default("0"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    check(
      "posts_debet_kredit_check",
      sql`((${table.debet} > 0 AND ${table.kredit} = 0) OR (${table.kredit} > 0 AND ${table.debet} = 0) OR (${table.debet} = 0 AND ${table.kredit} = 0))`
    ),
  ]
);

export const periodLocks = pgTable(
  "period_locks",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    lockedAt: timestamp("locked_at").defaultNow(),
    lockedBy: text("locked_by"),
  },
  (table) => [unique("period_locks_year_month_unique").on(table.year, table.month)]
);

export const bookingTemplates = pgTable("booking_templates", {
  id: serial("id").primaryKey(),
  namn: text("namn").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templateRows = pgTable("template_rows", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => bookingTemplates.id, { onDelete: "cascade" }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  isDebet: boolean("is_debet").notNull(),
  description: text("description"),
  rowOrder: integer("row_order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recurringItems = pgTable("recurring_items", {
  id: serial("id").primaryKey(),
  namn: text("namn").notNull().unique(),
  expectedPerMonth: integer("expected_per_month").notNull().default(1),
  activeMonths: integer("active_months")
    .array()
    .notNull()
    .default(sql`ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::integer[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const verifikatRecurringItems = pgTable(
  "transaction_recurring_items",
  {
    id: serial("id").primaryKey(),
    verifikatId: integer("transaction_id")
      .notNull()
      .references(() => verifikat.id, { onDelete: "cascade" }),
    recurringItemId: integer("recurring_item_id")
      .notNull()
      .references(() => recurringItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("transaction_recurring_items_transaction_id_recurring_item_id_unique").on(
      table.verifikatId,
      table.recurringItemId
    ),
  ]
);

export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check("budgets_month_check", sql`${table.month} >= 1 AND ${table.month} <= 12`),
    unique("budgets_account_id_year_month_unique").on(table.accountId, table.year, table.month),
    index("idx_budgets_account_year").on(table.accountId, table.year),
    index("idx_budgets_year_month").on(table.year, table.month),
  ]
);

export const customResultViews = pgTable("custom_result_views", {
  id: serial("id").primaryKey(),
  namn: varchar("namn", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customResultViewAccounts = pgTable(
  "custom_result_view_accounts",
  {
    id: serial("id").primaryKey(),
    viewId: integer("view_id")
      .notNull()
      .references(() => customResultViews.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("custom_result_view_accounts_view_id_account_id_unique").on(table.viewId, table.accountId),
    index("idx_custom_view_accounts_view_id").on(table.viewId),
  ]
);

export const customResultViewGroups = pgTable(
  "custom_result_view_groups",
  {
    id: serial("id").primaryKey(),
    viewId: integer("view_id")
      .notNull()
      .references(() => customResultViews.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("custom_result_view_groups_view_id_group_id_unique").on(table.viewId, table.groupId),
    index("idx_custom_view_groups_view_id").on(table.viewId),
  ]
);

export const customResultViewTypes = pgTable(
  "custom_result_view_types",
  {
    id: serial("id").primaryKey(),
    viewId: integer("view_id")
      .notNull()
      .references(() => customResultViews.id, { onDelete: "cascade" }),
    accountType: varchar("account_type", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "custom_result_view_types_account_type_check",
      sql`${table.accountType} IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld')`
    ),
    unique("custom_result_view_types_view_id_account_type_unique").on(table.viewId, table.accountType),
    index("idx_custom_view_types_view_id").on(table.viewId),
  ]
);
