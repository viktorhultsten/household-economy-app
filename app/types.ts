export type AccountType = "Intäkt" | "Utgift";

export interface Account {
  id: number;
  namn: string;
  grupp: string;
  typ: AccountType;
}

export interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  accountId?: number;
  account?: Account;
}
