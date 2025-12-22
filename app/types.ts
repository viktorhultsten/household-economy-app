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
}

// Accounting transaction with balanced posts
export interface Transaction {
  id: number;
  date: Date;
  description: string;
  bankEventId?: number;
  posts: Post[];
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
