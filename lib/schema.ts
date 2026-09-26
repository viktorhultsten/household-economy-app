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
    // Klarmarkering: kontot är avstämt t.o.m. detta datum; avstämningen
    // ignorerar poster före datumet eftersom saldot är korrekt fram till dess.
    reconciledThrough: date("reconciled_through", { mode: "string" }),
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

// Konteringsmallar (ADR-0010): enda källan till konteringsförslag. Alla
// matchningsattribut är nullbara och används bara när de särskiljer.
export const konteringsmallar = pgTable(
  "konteringsmallar",
  {
    id: serial("id").primaryKey(),
    namn: text("namn").notNull(),
    ursprung: text("ursprung").notNull(),
    last: boolean("last").notNull().default(false),
    status: text("status").notNull().default("aktiv"),
    nyckelord: text("nyckelord").array(),
    ankarAccountId: integer("ankar_account_id").references(() => accounts.id),
    // Beloppsintervall i absolutbelopp, så att en spegling matchar samma intervall.
    beloppMin: numeric("belopp_min", { precision: 15, scale: 2 }),
    beloppMax: numeric("belopp_max", { precision: 15, scale: 2 }),
    // Förväntad dag: 'borjan' = dag N i månaden, 'slut' = N dagar före månadsslut.
    dagForankring: text("dag_forankring"),
    dag: integer("dag"),
    dagFonster: integer("dag_fonster"),
    riktning: text("riktning"),
    // Utdata: återkommande händelse som mallen ger när den tillämpas.
    recurringItemId: integer("recurring_item_id").references(() => recurringItems.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("konteringsmallar_ursprung_check", sql`${table.ursprung} IN ('anvandare', 'app')`),
    check(
      "konteringsmallar_status_check",
      sql`${table.status} IN ('aktiv', 'inaktiverad', 'borttagen')`
    ),
    check("konteringsmallar_riktning_check", sql`${table.riktning} IN ('in', 'ut')`),
    check(
      "konteringsmallar_dag_check",
      sql`(${table.dagForankring} IS NULL AND ${table.dag} IS NULL AND ${table.dagFonster} IS NULL) OR (${table.dagForankring} IN ('borjan', 'slut') AND ${table.dag} BETWEEN 0 AND 31 AND ${table.dagFonster} >= 0)`
    ),
    check(
      "konteringsmallar_belopp_check",
      sql`${table.beloppMin} IS NULL OR ${table.beloppMax} IS NULL OR ${table.beloppMin} <= ${table.beloppMax}`
    ),
    index("idx_konteringsmallar_status").on(table.status),
  ]
);

// Ett sätt att kontera det en mall matchar, med statistik från senaste mallanalysen.
export const konteringsalternativ = pgTable(
  "konteringsalternativ",
  {
    id: serial("id").primaryKey(),
    mallId: integer("mall_id")
      .notNull()
      .references(() => konteringsmallar.id, { onDelete: "cascade" }),
    antal: integer("antal").notNull().default(0),
    viktadAndel: numeric("viktad_andel", { precision: 7, scale: 6 }),
    senastAnvand: date("senast_anvand", { mode: "string" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_konteringsalternativ_mall_id").on(table.mallId)]
);

// Motkonto i ett alternativ: sida relativt ankarraden och andel av ankarbeloppet.
export const konteringsalternativRader = pgTable(
  "konteringsalternativ_rader",
  {
    id: serial("id").primaryKey(),
    alternativId: integer("alternativ_id")
      .notNull()
      .references(() => konteringsalternativ.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    sida: text("sida").notNull(),
    andel: numeric("andel", { precision: 9, scale: 6 }).notNull(),
  },
  (table) => [
    check("konteringsalternativ_rader_sida_check", sql`${table.sida} IN ('samma', 'motsatt')`),
    check("konteringsalternativ_rader_andel_check", sql`${table.andel} > 0`),
    index("idx_konteringsalternativ_rader_alternativ_id").on(table.alternativId),
  ]
);

// En post per mallanalys (nattlig körning).
export const mallanalysKorningar = pgTable(
  "mallanalys_korningar",
  {
    id: serial("id").primaryKey(),
    startad: timestamp("startad").notNull().defaultNow(),
    avslutad: timestamp("avslutad"),
    status: text("status").notNull().default("pagar"),
    historikFran: date("historik_fran", { mode: "string" }),
    historikTill: date("historik_till", { mode: "string" }),
    antalVerifikat: integer("antal_verifikat"),
    antalSkapade: integer("antal_skapade"),
    antalJusterade: integer("antal_justerade"),
    antalBorttagna: integer("antal_borttagna"),
    sammanfattning: text("sammanfattning"),
    fel: text("fel"),
  },
  (table) => [
    check("mallanalys_korningar_status_check", sql`${table.status} IN ('pagar', 'klar', 'fel')`),
  ]
);

// En post per ändring av en mall, av appen eller användaren.
export const konteringsmallAndringar = pgTable(
  "konteringsmall_andringar",
  {
    id: serial("id").primaryKey(),
    mallId: integer("mall_id")
      .notNull()
      .references(() => konteringsmallar.id, { onDelete: "cascade" }),
    tidpunkt: timestamp("tidpunkt").notNull().defaultNow(),
    av: text("av").notNull(),
    andring: text("andring").notNull(),
    korningId: integer("korning_id").references(() => mallanalysKorningar.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    check("konteringsmall_andringar_av_check", sql`${table.av} IN ('app', 'anvandare')`),
    index("idx_konteringsmall_andringar_mall_id").on(table.mallId),
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

// Fristående att göra-poster på översiktsvyn: beskrivning + förfallodatum.
// Passerat datum flaggas som akut i UI; ingen koppling till bokföringen.
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
