"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AccountType, Transaction } from "../types";
import { getAccountBalances, getAccountTransactionsForPeriod, getTransaction } from "../actions";
import TransactionEditModal from "../components/TransactionEditModal";

interface AccountBalance {
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  balance: number;
}

interface AccountTransaction {
  transactionId: number;
  date: Date;
  description: string;
  postDebet: number;
  postKredit: number;
  postDescription: string | null;
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function getTypeColor(type: AccountType): string {
  switch (type) {
    case "Intäkt":
      return "text-green-600 dark:text-green-400";
    case "Utgift":
      return "text-red-600 dark:text-red-400";
    case "Tillgång":
      return "text-blue-600 dark:text-blue-400";
    case "Skuld":
      return "text-orange-600 dark:text-orange-400";
  }
}

export default function ResultatPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadBalances();
  }, [year, month]);

  async function loadBalances() {
    setLoading(true);
    const data = await getAccountBalances(year, month);
    // Filter to only income statement accounts (Intäkt and Utgift)
    const incomeStatementData = data.filter(
      (balance) => balance.groupType === "Intäkt" || balance.groupType === "Utgift"
    );
    setBalances(incomeStatementData);
    setLoading(false);
  }

  async function handleAccountClick(accountId: number) {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      setTransactions([]);
      return;
    }

    setExpandedAccountId(accountId);
    setLoadingTransactions(true);
    const data = await getAccountTransactionsForPeriod(accountId, year, month);
    setTransactions(data);
    setLoadingTransactions(false);
  }

  async function handleTransactionClick(transactionId: number) {
    const txn = await getTransaction(transactionId);
    if (txn) {
      setSelectedTransaction(txn);
    }
  }

  async function handleEditSuccess() {
    setSelectedTransaction(null);
    await loadBalances();
    // Reload transactions if an account is expanded
    if (expandedAccountId !== null) {
      const data = await getAccountTransactionsForPeriod(expandedAccountId, year, month);
      setTransactions(data);
    }
  }

  // Group balances by type -> group -> accounts
  const grouped = balances.reduce((acc, balance) => {
    if (!acc[balance.groupType]) {
      acc[balance.groupType] = {};
    }
    if (!acc[balance.groupType][balance.groupName]) {
      acc[balance.groupType][balance.groupName] = [];
    }
    acc[balance.groupType][balance.groupName].push(balance);
    return acc;
  }, {} as Record<AccountType, Record<string, AccountBalance[]>>);

  // Calculate totals
  const typeTotals: Record<AccountType, number> = {
    Intäkt: 0,
    Utgift: 0,
    Tillgång: 0,
    Skuld: 0,
  };

  balances.forEach((balance) => {
    typeTotals[balance.groupType] += balance.balance;
  });

  const groupTotals: Record<string, number> = {};
  balances.forEach((balance) => {
    const key = `${balance.groupType}-${balance.groupName}`;
    if (!groupTotals[key]) {
      groupTotals[key] = 0;
    }
    groupTotals[key] += balance.balance;
  });

  // Generate month/year options
  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Mars" },
    { value: 4, label: "April" },
    { value: 5, label: "Maj" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Augusti" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Tillbaka till transaktioner
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Resultat
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (month === 1) {
                  setMonth(12);
                  setYear(year - 1);
                } else {
                  setMonth(month - 1);
                }
              }}
              className="px-3 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ← Föregående månad
            </button>
            <div className="flex gap-3">
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (month === 12) {
                  setMonth(1);
                  setYear(year + 1);
                } else {
                  setMonth(month + 1);
                }
              }}
              className="px-3 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Nästa månad →
            </button>
          </div>
        </div>

        {balances.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga konton ännu. Gå till{" "}
              <Link href="/accounts" className="text-zinc-900 dark:text-zinc-50 underline">
                Konton
              </Link>{" "}
              för att lägga till konton.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(Object.keys(grouped) as AccountType[]).map((type) => {
              const typeGroups = grouped[type];
              const typeTotal = typeTotals[type];

              return (
                <div key={type} className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden">
                  {/* Type Header */}
                  <div className="bg-zinc-100 dark:bg-zinc-700 px-6 py-4 border-b border-zinc-200 dark:border-zinc-600">
                    <div className="flex items-center justify-between">
                      <h2 className={`text-xl font-bold ${getTypeColor(type)}`}>
                        {type}
                      </h2>
                      <span className={`text-xl font-bold tabular-nums ${getTypeColor(type)}`}>
                        {formatSwedishAmount(typeTotal)} kr
                      </span>
                    </div>
                  </div>

                  {/* Groups */}
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {Object.keys(typeGroups).map((groupName) => {
                      const accounts = typeGroups[groupName];
                      const groupTotal = groupTotals[`${type}-${groupName}`];

                      return (
                        <div key={groupName} className="px-6 py-4">
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                              {groupName}
                            </h3>
                            <span className="text-lg font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                              {formatSwedishAmount(groupTotal)} kr
                            </span>
                          </div>

                          {/* Accounts */}
                          <div className="space-y-2 ml-4">
                            {accounts.map((account) => (
                              <div key={account.accountId}>
                                <button
                                  onClick={() => handleAccountClick(account.accountId)}
                                  className="w-full flex items-center justify-between py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded px-2 -mx-2 transition-colors"
                                >
                                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {account.accountName}
                                    {expandedAccountId === account.accountId && " ▼"}
                                  </span>
                                  <span className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                    {formatSwedishAmount(account.balance)} kr
                                  </span>
                                </button>

                                {/* Transaction details */}
                                {expandedAccountId === account.accountId && (
                                  <div className="mt-2 ml-4 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
                                    {loadingTransactions ? (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                                        Laddar transaktioner...
                                      </p>
                                    ) : transactions.length === 0 ? (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                                        Inga transaktioner denna månad
                                      </p>
                                    ) : (
                                      <div className="space-y-2 py-2">
                                        {transactions.map((txn) => (
                                          <button
                                            key={txn.transactionId}
                                            onClick={() => handleTransactionClick(txn.transactionId)}
                                            className="w-full text-left text-xs border-b border-zinc-100 dark:border-zinc-800 pb-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-2 -mx-2 transition-colors"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1">
                                                <div className="text-zinc-900 dark:text-zinc-50 font-medium">
                                                  {txn.description}
                                                </div>
                                                {txn.postDescription && (
                                                  <div className="text-zinc-500 dark:text-zinc-400 italic mt-0.5">
                                                    {txn.postDescription}
                                                  </div>
                                                )}
                                                <div className="text-zinc-400 dark:text-zinc-500 mt-0.5">
                                                  {formatSwedishDate(txn.date)}
                                                </div>
                                              </div>
                                              <div className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                                {txn.postDebet > 0 && (
                                                  <span className="text-blue-600 dark:text-blue-400">
                                                    D: {formatSwedishAmount(txn.postDebet)} kr
                                                  </span>
                                                )}
                                                {txn.postKredit > 0 && (
                                                  <span className="text-amber-600 dark:text-amber-400">
                                                    K: {formatSwedishAmount(txn.postKredit)} kr
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedTransaction && (
        <TransactionEditModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
