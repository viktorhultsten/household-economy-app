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
  hasPosts?: boolean;
  group?: Group;
}

// CSV Import metadata
export interface Import {
  id: number;
  filename: string;
  importedAt: Date;
  totalEvents: number;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  accountId?: number;
  account?: Account;
  postedEvents?: number; // Count of events that have been posted/booked
}

// Bank events from CSV import - raw bank movements
export interface BankEvent {
  id: number;
  date: Date;
  description: string;
  amount: number;
  isPosted: boolean;
  transactionId?: number;
  importId?: number;
  import?: Import; // Include import data to access default account
}

// Accounting transaction with balanced posts
export interface Transaction {
  id: number;
  date: Date;
  description: string;
  bankEventId?: number;
  bankEvent?: BankEvent; // Include full bank event for displaying original description
  posts: Post[];
  recurringItems?: RecurringItem[]; // Associated recurring items
}

// Individual post/entry in a transaction
export interface Post {
  id: number;
  transactionId: number;
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

// Booking template for reusable transaction structures
export interface BookingTemplate {
  id: number;
  namn: string;
  createdAt: Date;
  rows: TemplateRow[];
}

// Template row - defines structure for a post in a transaction
export interface TemplateRow {
  id: number;
  templateId: number;
  accountId: number;
  account?: Account;
  isDebet: boolean; // true = debit side, false = credit side
  description?: string;
  rowOrder: number;
}

// Recurring item - track expected recurring transactions
export interface RecurringItem {
  id: number;
  namn: string;
  expectedPerMonth: number;
  activeMonths: number[]; // Array of month numbers 1-12
  createdAt: Date;
}

// Recurring item status for a specific period
export interface RecurringItemStatus {
  recurringItem: RecurringItem;
  currentPeriodCount: number;
  currentPeriodAmount: number;
  previousPeriodCount: number;
  previousPeriodAmount: number;
  isComplete: boolean;
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
