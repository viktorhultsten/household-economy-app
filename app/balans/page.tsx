"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AccountType, Verifikat } from "../types";
import { getAccountBalancesWithChangeBudget, getAccountTransactionsForPeriod, getVerifikat } from "../actions";
import VerifikatForm from "../components/VerifikatForm";

interface AccountBalance {
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
}

interface AccountVerifikatEntry {
  verifikatId: number;
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

function getChangeColor(changeAmount: number): string {
  if (changeAmount > 0) {
    return "text-green-600 dark:text-green-400";
  } else if (changeAmount < 0) {
    return "text-red-600 dark:text-red-400";
  }
  return "text-zinc-500 dark:text-zinc-400";
}

function formatPercentage(changeAmount: number, previousAmount: number): string {
  if (previousAmount === 0) {
    return changeAmount !== 0 ? "N/A" : "0%";
  }
  const percent = (changeAmount / Math.abs(previousAmount)) * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

function getVarianceColor(variance: number): string {
  if (variance > 0) {
    return "text-green-600 dark:text-green-400";
  } else if (variance < 0) {
    return "text-red-600 dark:text-red-400";
  }
  return "text-zinc-500 dark:text-zinc-400";
}

export default function BalansPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<AccountVerifikatEntry[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedVerifikat, setSelectedVerifikat] = useState<Verifikat | null>(null);

  useEffect(() => {
    loadBalances();
  }, [year, month]);

  async function loadBalances() {
    setLoading(true);
    const data = await getAccountBalancesWithChangeBudget(year, month);
    // Filter to only balance sheet accounts (Tillgång and Skuld)
    const balanceSheetData = data.filter(
      (balance) => balance.groupType === "Tillgång" || balance.groupType === "Skuld"
    );
    setBalances(balanceSheetData);
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

  async function handleVerifikatClick(verifikatId: number) {
    const v = await getVerifikat(verifikatId);
    if (v) {
      setSelectedVerifikat(v);
    }
  }

  async function handleEditSuccess() {
    setSelectedVerifikat(null);
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

  const typeChanges: Record<AccountType, number> = {
    Intäkt: 0,
    Utgift: 0,
    Tillgång: 0,
    Skuld: 0,
  };

  const typePreviousTotals: Record<AccountType, number> = {
    Intäkt: 0,
    Utgift: 0,
    Tillgång: 0,
    Skuld: 0,
  };

  balances.forEach((balance) => {
    typeTotals[balance.groupType] += balance.balance;
    typeChanges[balance.groupType] += balance.changeAmount;
    typePreviousTotals[balance.groupType] += balance.previousBalance;
  });

  const groupTotals: Record<string, number> = {};
  const groupChanges: Record<string, number> = {};
  const groupPreviousTotals: Record<string, number> = {};
  balances.forEach((balance) => {
    const key = `${balance.groupType}-${balance.groupName}`;
    if (!groupTotals[key]) {
      groupTotals[key] = 0;
      groupChanges[key] = 0;
      groupPreviousTotals[key] = 0;
    }
    groupTotals[key] += balance.balance;
    groupChanges[key] += balance.changeAmount;
    groupPreviousTotals[key] += balance.previousBalance;
  });

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
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Balans
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
                <option value={1}>Januari</option>
                <option value={2}>Februari</option>
                <option value={3}>Mars</option>
                <option value={4}>April</option>
                <option value={5}>Maj</option>
                <option value={6}>Juni</option>
                <option value={7}>Juli</option>
                <option value={8}>Augusti</option>
                <option value={9}>September</option>
                <option value={10}>Oktober</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const y = currentYear - 2 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
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
              const typeChange = typeChanges[type];
              const typePreviousTotal = typePreviousTotals[type];

              return (
                <div key={type} className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden">
                  {/* Type Header */}
                  <div className="bg-zinc-100 dark:bg-zinc-700 px-6 py-4 border-b border-zinc-200 dark:border-zinc-600">
                    <div className="flex items-center justify-between">
                      <h2 className={`text-xl font-bold ${getTypeColor(type)}`}>
                        {type}
                      </h2>
                      <div className="flex items-center gap-8">
                        <span className={`text-xl font-bold tabular-nums ${getTypeColor(type)}`}>
                          {formatSwedishAmount(typeTotal)} kr
                        </span>
                        <div className="min-w-[180px] text-right">
                          <span className={`text-lg font-semibold tabular-nums ${getChangeColor(typeChange)}`}>
                            {typeChange >= 0 ? '+' : ''}{formatSwedishAmount(typeChange)} kr
                          </span>
                          <span className={`text-sm ml-2 ${getChangeColor(typeChange)}`}>
                            ({formatPercentage(typeChange, typePreviousTotal)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Groups */}
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {Object.keys(typeGroups).map((groupName) => {
                      const accounts = typeGroups[groupName];
                      const groupTotal = groupTotals[`${type}-${groupName}`];
                      const groupChange = groupChanges[`${type}-${groupName}`];
                      const groupPreviousTotal = groupPreviousTotals[`${type}-${groupName}`];

                      return (
                        <div key={groupName} className="px-6 py-4">
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                              {groupName}
                            </h3>
                            <div className="flex items-center gap-8">
                              <span className="text-lg font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                {formatSwedishAmount(groupTotal)} kr
                              </span>
                              <div className="min-w-[180px] text-right">
                                <span className={`text-base font-medium tabular-nums ${getChangeColor(groupChange)}`}>
                                  {groupChange >= 0 ? '+' : ''}{formatSwedishAmount(groupChange)} kr
                                </span>
                                <span className={`text-sm ml-2 ${getChangeColor(groupChange)}`}>
                                  ({formatPercentage(groupChange, groupPreviousTotal)})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Accounts */}
                          <div className="space-y-2 ml-4">
                            {accounts.map((account) => (
                              <div key={account.accountId}>
                                <button
                                  onClick={() => handleAccountClick(account.accountId)}
                                  className="w-full hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded px-2 -mx-2 transition-colors"
                                >
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                      {account.accountName}
                                      {expandedAccountId === account.accountId && " ▼"}
                                    </span>
                                    <div className="flex items-center gap-8">
                                      <span className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                        {formatSwedishAmount(account.balance)} kr
                                      </span>
                                      <div className="min-w-[180px] text-right">
                                        <span className={`text-sm tabular-nums ${getChangeColor(account.changeAmount)}`}>
                                          {account.changeAmount >= 0 ? '+' : ''}{formatSwedishAmount(account.changeAmount)} kr
                                        </span>
                                        <span className={`text-xs ml-2 ${getChangeColor(account.changeAmount)}`}>
                                          ({formatPercentage(account.changeAmount, account.previousBalance)})
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {account.hasBudget && (
                                    <div className="flex items-center justify-end gap-8 pb-2 border-t border-zinc-100 dark:border-zinc-700 mt-1 pt-1">
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums text-right">
                                        <span className="mr-2">Budget:</span>
                                        {account.budgetAmount >= 0 ? '+' : ''}{formatSwedishAmount(account.budgetAmount)} kr
                                      </div>
                                      <div className="min-w-[180px] text-right">
                                        <span className={`text-xs tabular-nums ${getVarianceColor(account.variance)}`}>
                                          <span className="mr-1">Avvikelse:</span>
                                          {account.variance >= 0 ? '+' : ''}{formatSwedishAmount(account.variance)} kr
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </button>

                                {/* Verifikat details */}
                                {expandedAccountId === account.accountId && (
                                  <div className="mt-2 ml-4 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
                                    {loadingTransactions ? (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                                        Laddar verifikat...
                                      </p>
                                    ) : transactions.length === 0 ? (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                                        Inga verifikat denna månad
                                      </p>
                                    ) : (
                                      <div className="space-y-2 py-2">
                                        {transactions.map((txn) => (
                                          <button
                                            key={txn.verifikatId}
                                            onClick={() => handleVerifikatClick(txn.verifikatId)}
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

      {selectedVerifikat && (
        <VerifikatForm
          verifikat={selectedVerifikat}
          onClose={() => setSelectedVerifikat(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
