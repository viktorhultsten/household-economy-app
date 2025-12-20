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
  amount: number;
  description?: string;
}
