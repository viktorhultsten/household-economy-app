import type { Datum } from "./lib/datum";

export type AccountType = "Intäkt" | "Utgift" | "Tillgång" | "Skuld";

export interface Group {
  id: number;
  namn: string;
  typ: AccountType;
}

export interface Account {
  id: number;
  namn: string;
  groupId: number;
  excludeFromBudget?: boolean;
  isPeriodiseringDefault?: boolean;
  reconciledThrough?: string | null;
  hasPosts?: boolean;
  group?: Group;
}

// CSV Import metadata
export interface Import {
  id: number;
  filename: string;
  importedAt: Date;
  totalEvents: number;
  dateRangeStart: Datum;
  dateRangeEnd: Datum;
  accountId?: number;
  account?: Account;
  postedEvents?: number; // Count of events that have been posted/booked
  isExternal?: boolean; // Extern import: bokförs mot ett skuldkonto, inte ett bankkonto
}

// Bank events from CSV import - raw bank movements
export interface BankEvent {
  id: number;
  date: Datum;
  description: string;
  amount: number;
  isPosted: boolean;
  flagged?: boolean;
  flagComment?: string;
  isIrrelevant?: boolean; // Markerad irrelevant i en extern import; utesluts ur att göra-listan
  verifikatId?: number;
  importId?: number;
  import?: Import; // Include import data to access default account
}

// Link between a huvudverifikat and its länkade verifikat in a periodförskjutning
// (1 länkat) or periodisering (N länkade). See docs/adr/0008 and 0009.
export interface PeriodiseringLink {
  role: "huvud" | "lankat";
  kind: "forskjutning" | "periodisering";
  motpartVerifikatId: number;
  motpartDate: Datum;
}

// Accounting verifikat with balanced posts (double-entry bookkeeping unit)
export interface Verifikat {
  id: number;
  date: Datum;
  description: string;
  bankEventId?: number;
  bankEvent?: BankEvent; // Include full bank event for displaying original description
  posts: Post[];
  recurringItems?: RecurringItem[]; // Associated recurring items
  periodiseringParentId?: number; // Set on the länkat verifikat, points to huvudverifikat
  periodisering?: PeriodiseringLink; // Resolved link info for display/click-through
  isExternal?: boolean; // Härstammar från en extern import (bokförd mot skuldkonto)
}

// Individual post/entry in a verifikat
export interface Post {
  id: number;
  verifikatId: number;
  accountId: number;
  account?: Account;
  debet: number;
  kredit: number;
  description?: string;
}

// Period lock for accounting periods
export interface PeriodLock {
  id: number;
  year: number;
  month: number;
  lockedAt: Date;
  lockedBy?: string;
}

// Recurring item - track expected recurring transactions
export interface RecurringItem {
  id: number;
  namn: string;
  expectedPerMonth: number;
  activeMonths: number[]; // Array of month numbers 1-12
  createdAt: Date;
}

// A verifikat that used a recurring item (for context in the sidebar)
export interface RecurringItemUsage {
  verifikatId: number;
  date: Datum;
  description: string;
  amount: number;
}

// Recurring item status for a specific period
export interface RecurringItemStatus {
  recurringItem: RecurringItem;
  currentPeriodCount: number;
  currentPeriodAmount: number;
  previousPeriodCount: number;
  previousPeriodAmount: number;
  isComplete: boolean;
  recentUsages: RecurringItemUsage[];
  // Estimated amount expected for one occurrence this month, based on the most
  // recent historical usage. Positive magnitude.
  estimatedAmount: number;
  // Classification of the money flow, derived from the accounts touched by the
  // most recent usage. "other" = pure balance-sheet movement (e.g. a transfer).
  flowType: "expense" | "income" | "other";
}

// Budget - monthly budget amount for an account
export interface Budget {
  id: number;
  accountId: number;
  year: number;
  month: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Budget with account details for display
export interface BudgetWithAccount extends Budget {
  account: Account;
}

// Budget vs actual comparison for a specific period
export interface BudgetComparison {
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  budgetAmount: number;
  actualAmount: number;
  variance: number; // positive = under budget (good for expenses)
  variancePercent: number;
  hasBudget: boolean; // false if no budget set
}

// Helper type for bulk budget setting (all 12 months)
export interface YearlyBudget {
  accountId: number;
  year: number;
  monthlyAmounts: number[]; // Array of 12 numbers (index 0 = January, 11 = December)
}

// Per-month budget vs actual for a single account (kontoanalys)
export interface AccountAnalysisMonth {
  year: number;
  month: number; // 1-12
  label: string; // display label, e.g. "Januari" or "sep -25"
  budget: number;
  actual: number;
  variance: number; // good-sense: positive = better than budget
}

// Full year budget/actual breakdown for one account
export interface AccountAnalysis {
  accountId: number;
  accountName: string;
  groupName: string;
  groupType: AccountType;
  mode: "calendar" | "r12";
  year: number; // calendar year, or end year for R12
  months: AccountAnalysisMonth[]; // always 12 entries
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
}

// Custom result view - allows filtering which accounts to show in result view
export interface CustomResultView {
  id: number;
  namn: string;
  createdAt: Date;
  updatedAt: Date;
  accounts?: number[]; // Array of selected account IDs
  groups?: number[]; // Array of selected group IDs
  types?: AccountType[]; // Array of selected account types
}

// Custom result view with full details
export interface CustomResultViewWithDetails {
  id: number;
  namn: string;
  createdAt: Date;
  updatedAt: Date;
  accounts: Account[];
  groups: Group[];
  types: AccountType[];
}

// Account balance for a specific period
export interface AccountBalance {
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  balance: number;
}

// Account balance with month-over-month change
export interface AccountBalanceWithChange extends AccountBalance {
  previousBalance: number;
  changeAmount: number;
  changePercent: number;
}

// --- Dashboard / Översikt ---

// A single month in the 12-month dashboard series
export interface DashboardMonth {
  year: number;
  month: number;
  label: string; // short Swedish label, e.g. "jul -25"
  intakter: number;
  utgifter: number;
  resultat: number; // intakter - utgifter
  nettoformogenhet: number; // tillgångar - skulder at month end
  budgetIntakter: number; // budgeted income for the month
  budgetUtgifter: number; // budgeted expenses for the month
  budgetResultat: number; // budgetIntakter - budgetUtgifter
  resultatAvvikelse: number; // resultat - budgetResultat (positive = better than budget)
}

// An income-statement account that deviates from its budget
export interface BudgetOutlier {
  accountId: number;
  accountName: string;
  groupType: AccountType;
  actual: number;
  budget: number;
  variance: number; // good-sense: positive = better than budget, negative = worse
}

// Per-month detail with the accounts that deviate most from budget
export interface DashboardMonthDetail {
  year: number;
  month: number;
  label: string;
  outliers: BudgetOutlier[];
}

// Aggregated result KPIs for period / R12 / YTD
export interface DashboardKpi {
  periodResultat: number;
  periodIntakter: number;
  periodSparkvot: number; // resultat / intakter
  r12Resultat: number;
  r12Intakter: number;
  r12Utgifter: number;
  r12Sparkvot: number;
  ytdResultat: number;
  ytdIntakter: number;
  ytdSparkvot: number;
}

// A top expense account (selected month + rolling 12 months)
export interface DashboardTopExpense {
  accountId: number;
  accountName: string;
  period: number;
  r12: number;
}

// Everything the dashboard needs, computed in one pass over 12 months
export interface DashboardOverview {
  year: number;
  month: number;
  months: DashboardMonth[]; // chronological, oldest first
  monthDetails: DashboardMonthDetail[]; // most recent first
  kpi: DashboardKpi;
  todo: { unposted: number; flagged: number };
  topExpenses: DashboardTopExpense[];
  ytdOutliers: BudgetOutlier[];
}

// Fristående att göra-post på översiktsvyn (beskrivning + förfallodatum)
export interface Todo {
  id: number;
  description: string;
  dueDate: string; // ISO-datum (YYYY-MM-DD)
}
