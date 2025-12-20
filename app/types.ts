export type AccountType = "Intäkt" | "Utgift";

export interface Account {
  id: number;
  namn: string;
  grupp: string;
  typ: AccountType;
}

// Bank events from CSV import - raw bank movements
export interface BankEvent {
  id: number;
  date: Date;
  description: string;
  amount: number;
  isPosted: boolean;
  transactionId?: number;
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
