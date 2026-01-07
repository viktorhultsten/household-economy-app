"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AccountType, CustomResultView, Account, Group } from "../types";
import {
  getResultBudgetComparison,
  getAccount11MonthsHistory,
  getCustomResultViews,
  getAccounts,
  getGroups,
} from "../actions";
import CustomViewManager from "../components/CustomViewManager";
import { isAccountInCustomView } from "../lib/customViewUtils";

interface AccountBalance {
  accountId: number;
  accountName: string;
  groupId: number;
  groupName: string;
  groupType: AccountType;
  periodActual: number;
  periodBudget: number;
  periodVariance: number;
  r12Actual: number;
  r12Budget: number;
  r12Variance: number;
  ytdActual: number;
  ytdBudget: number;
  ytdVariance: number;
}

interface MonthHistory {
  year: number;
  month: number;
  monthName: string;
  periodActual: number;
  periodBudget: number;
  periodVariance: number;
  r12Actual: number;
  r12Budget: number;
  r12Variance: number;
  ytdActual: number;
  ytdBudget: number;
  ytdVariance: number;
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function getVarianceColor(variance: number): string {
  if (variance > 0) {
    return "text-green-600 dark:text-green-400";
  } else if (variance < 0) {
    return "text-red-600 dark:text-red-400";
  }
  return "text-zinc-600 dark:text-zinc-400";
}

export default function ResultatPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [accountsHistory, setAccountsHistory] = useState<Map<number, MonthHistory[]>>(new Map());
  const [loadingAccounts, setLoadingAccounts] = useState<Set<number>>(new Set());

  // View mode: "r12" or "ytd" (year-to-date/current year)
  const [viewMode, setViewMode] = useState<"r12" | "ytd">("r12");

  // Custom view state
  const [customViews, setCustomViews] = useState<CustomResultView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);
  const [showViewManager, setShowViewManager] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    loadBalances();
    loadCustomViews();
    loadAccountsAndGroups();
  }, [year, month]);

  async function loadCustomViews() {
    const views = await getCustomResultViews();
    setCustomViews(views);
  }

  async function loadAccountsAndGroups() {
    const [accountsData, groupsData] = await Promise.all([
      getAccounts(),
      getGroups(),
    ]);
    setAccounts(accountsData);
    setGroups(groupsData);
  }

  async function loadBalances() {
    setLoading(true);
    const data = await getResultBudgetComparison(year, month);
    setBalances(data);
    setLoading(false);
  }

  async function handleAccountClick(accountId: number) {
    // Toggle expansion for this specific account
    const newExpandedAccounts = new Set(expandedAccounts);

    if (expandedAccounts.has(accountId)) {
      // Collapse this account
      newExpandedAccounts.delete(accountId);
      setExpandedAccounts(newExpandedAccounts);

      // Remove history for this account
      const newHistory = new Map(accountsHistory);
      newHistory.delete(accountId);
      setAccountsHistory(newHistory);
    } else {
      // Expand this account
      newExpandedAccounts.add(accountId);
      setExpandedAccounts(newExpandedAccounts);

      // Mark as loading
      const newLoading = new Set(loadingAccounts);
      newLoading.add(accountId);
      setLoadingAccounts(newLoading);

      // Fetch history for this account
      const data = await getAccount11MonthsHistory(accountId, year, month);

      // Store history
      const newHistory = new Map(accountsHistory);
      newHistory.set(accountId, data);
      setAccountsHistory(newHistory);

      // Remove loading state
      const finalLoading = new Set(loadingAccounts);
      finalLoading.delete(accountId);
      setLoadingAccounts(finalLoading);
    }
  }

  // Filter balances based on selected custom view
  const selectedView = customViews.find((v) => v.id === selectedViewId);
  const filteredBalances = selectedViewId && selectedView
    ? balances.filter((balance) =>
        isAccountInCustomView(
          balance.accountId,
          balance.groupId,
          balance.groupType,
          selectedView
        )
      )
    : balances;

  // Group balances by type -> group -> accounts
  const grouped = filteredBalances.reduce((acc, balance) => {
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
  const typeTotals: Record<AccountType, {
    periodActual: number;
    periodBudget: number;
    periodVariance: number;
    r12Actual: number;
    r12Budget: number;
    r12Variance: number;
    ytdActual: number;
    ytdBudget: number;
    ytdVariance: number;
  }> = {
    Intäkt: { periodActual: 0, periodBudget: 0, periodVariance: 0, r12Actual: 0, r12Budget: 0, r12Variance: 0, ytdActual: 0, ytdBudget: 0, ytdVariance: 0 },
    Utgift: { periodActual: 0, periodBudget: 0, periodVariance: 0, r12Actual: 0, r12Budget: 0, r12Variance: 0, ytdActual: 0, ytdBudget: 0, ytdVariance: 0 },
    Tillgång: { periodActual: 0, periodBudget: 0, periodVariance: 0, r12Actual: 0, r12Budget: 0, r12Variance: 0, ytdActual: 0, ytdBudget: 0, ytdVariance: 0 },
    Skuld: { periodActual: 0, periodBudget: 0, periodVariance: 0, r12Actual: 0, r12Budget: 0, r12Variance: 0, ytdActual: 0, ytdBudget: 0, ytdVariance: 0 },
  };

  filteredBalances.forEach((balance) => {
    typeTotals[balance.groupType].periodActual += balance.periodActual;
    typeTotals[balance.groupType].periodBudget += balance.periodBudget;
    typeTotals[balance.groupType].periodVariance += balance.periodVariance;
    typeTotals[balance.groupType].r12Actual += balance.r12Actual;
    typeTotals[balance.groupType].r12Budget += balance.r12Budget;
    typeTotals[balance.groupType].r12Variance += balance.r12Variance;
    typeTotals[balance.groupType].ytdActual += balance.ytdActual;
    typeTotals[balance.groupType].ytdBudget += balance.ytdBudget;
    typeTotals[balance.groupType].ytdVariance += balance.ytdVariance;
  });

  const groupTotals: Record<string, {
    periodActual: number;
    periodBudget: number;
    periodVariance: number;
    r12Actual: number;
    r12Budget: number;
    r12Variance: number;
    ytdActual: number;
    ytdBudget: number;
    ytdVariance: number;
  }> = {};
  filteredBalances.forEach((balance) => {
    const key = `${balance.groupType}-${balance.groupName}`;
    if (!groupTotals[key]) {
      groupTotals[key] = { periodActual: 0, periodBudget: 0, periodVariance: 0, r12Actual: 0, r12Budget: 0, r12Variance: 0, ytdActual: 0, ytdBudget: 0, ytdVariance: 0 };
    }
    groupTotals[key].periodActual += balance.periodActual;
    groupTotals[key].periodBudget += balance.periodBudget;
    groupTotals[key].periodVariance += balance.periodVariance;
    groupTotals[key].r12Actual += balance.r12Actual;
    groupTotals[key].r12Budget += balance.r12Budget;
    groupTotals[key].r12Variance += balance.r12Variance;
    groupTotals[key].ytdActual += balance.ytdActual;
    groupTotals[key].ytdBudget += balance.ytdBudget;
    groupTotals[key].ytdVariance += balance.ytdVariance;
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
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Resultat
            </h1>
            {/* R12 / YTD Toggle */}
            <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-1">
              <button
                onClick={() => setViewMode("r12")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "r12"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                }`}
              >
                R12
              </button>
              <button
                onClick={() => setViewMode("ytd")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "ytd"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                }`}
              >
                Innevarande år
              </button>
            </div>
          </div>
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

        {/* Custom View Switcher */}
        <div className="mb-6 flex items-center gap-3">
          <select
            value={selectedViewId || ""}
            onChange={(e) =>
              setSelectedViewId(e.target.value ? parseInt(e.target.value) : null)
            }
            className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
          >
            <option value="">Alla konton</option>
            {customViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.namn}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowViewManager(true)}
            className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 whitespace-nowrap"
          >
            Hantera vyer
          </button>
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
                    <h2 className={`text-xl font-bold ${getTypeColor(type)} mb-3`}>
                      {type}
                    </h2>
                    <div className="grid grid-cols-7 gap-4 text-sm">
                      <div className="col-span-1"></div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Period faktisk</div>
                        <div className={`font-bold tabular-nums ${getTypeColor(type)}`}>
                          {formatSwedishAmount(typeTotal.periodActual)} kr
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Period budget</div>
                        <div className={`font-bold tabular-nums ${getTypeColor(type)}`}>
                          {formatSwedishAmount(typeTotal.periodBudget)} kr
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Period avvik</div>
                        <div className={`font-bold tabular-nums ${getVarianceColor(typeTotal.periodVariance)}`}>
                          {typeTotal.periodVariance > 0 ? "+" : ""}{formatSwedishAmount(typeTotal.periodVariance)} kr
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {viewMode === "r12" ? "R12" : "Innevarande år"} faktisk
                        </div>
                        <div className={`font-bold tabular-nums ${getTypeColor(type)}`}>
                          {formatSwedishAmount(viewMode === "r12" ? typeTotal.r12Actual : typeTotal.ytdActual)} kr
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {viewMode === "r12" ? "R12" : "Innevarande år"} budget
                        </div>
                        <div className={`font-bold tabular-nums ${getTypeColor(type)}`}>
                          {formatSwedishAmount(viewMode === "r12" ? typeTotal.r12Budget : typeTotal.ytdBudget)} kr
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {viewMode === "r12" ? "R12" : "Innevarande år"} avvik
                        </div>
                        <div className={`font-bold tabular-nums ${getVarianceColor(viewMode === "r12" ? typeTotal.r12Variance : typeTotal.ytdVariance)}`}>
                          {(viewMode === "r12" ? typeTotal.r12Variance : typeTotal.ytdVariance) > 0 ? "+" : ""}{formatSwedishAmount(viewMode === "r12" ? typeTotal.r12Variance : typeTotal.ytdVariance)} kr
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          Konto
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          Period<br/>Faktisk
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          Period<br/>Budget
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          Period<br/>Avvik
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          {viewMode === "r12" ? "R12" : "Innevarande år"}<br/>Faktisk
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          {viewMode === "r12" ? "R12" : "Innevarande år"}<br/>Budget
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          {viewMode === "r12" ? "R12" : "Innevarande år"}<br/>Avvik
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {Object.keys(typeGroups).map((groupName) => {
                        const accounts = typeGroups[groupName];
                        const groupTotal = groupTotals[`${type}-${groupName}`];

                        return (
                          <React.Fragment key={groupName}>
                            {/* Group Header Row */}
                            <tr className="bg-zinc-50 dark:bg-zinc-800">
                              <td className="px-6 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {groupName}
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                {formatSwedishAmount(groupTotal.periodActual)} kr
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                {formatSwedishAmount(groupTotal.periodBudget)} kr
                              </td>
                              <td className={`px-4 py-2 text-right text-sm font-semibold tabular-nums ${getVarianceColor(groupTotal.periodVariance)}`}>
                                {groupTotal.periodVariance > 0 ? "+" : ""}{formatSwedishAmount(groupTotal.periodVariance)} kr
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                {formatSwedishAmount(viewMode === "r12" ? groupTotal.r12Actual : groupTotal.ytdActual)} kr
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                                {formatSwedishAmount(viewMode === "r12" ? groupTotal.r12Budget : groupTotal.ytdBudget)} kr
                              </td>
                              <td className={`px-4 py-2 text-right text-sm font-semibold tabular-nums ${getVarianceColor(viewMode === "r12" ? groupTotal.r12Variance : groupTotal.ytdVariance)}`}>
                                {(viewMode === "r12" ? groupTotal.r12Variance : groupTotal.ytdVariance) > 0 ? "+" : ""}{formatSwedishAmount(viewMode === "r12" ? groupTotal.r12Variance : groupTotal.ytdVariance)} kr
                              </td>
                            </tr>

                            {/* Account Rows */}
                            {accounts.map((account) => (
                              <React.Fragment key={account.accountId}>
                                <tr
                                  onClick={() => handleAccountClick(account.accountId)}
                                  className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer"
                                >
                                  <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    {account.accountName}
                                    {expandedAccounts.has(account.accountId) && " ▼"}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                    {formatSwedishAmount(account.periodActual)} kr
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                    {formatSwedishAmount(account.periodBudget)} kr
                                  </td>
                                  <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${getVarianceColor(account.periodVariance)}`}>
                                    {account.periodVariance > 0 ? "+" : ""}{formatSwedishAmount(account.periodVariance)} kr
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                    {formatSwedishAmount(viewMode === "r12" ? account.r12Actual : account.ytdActual)} kr
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                    {formatSwedishAmount(viewMode === "r12" ? account.r12Budget : account.ytdBudget)} kr
                                  </td>
                                  <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${getVarianceColor(viewMode === "r12" ? account.r12Variance : account.ytdVariance)}`}>
                                    {(viewMode === "r12" ? account.r12Variance : account.ytdVariance) > 0 ? "+" : ""}{formatSwedishAmount(viewMode === "r12" ? account.r12Variance : account.ytdVariance)} kr
                                  </td>
                                </tr>

                                {/* Historical months details */}
                                {expandedAccounts.has(account.accountId) && (
                                  <tr key={`${account.accountId}-details`}>
                                    <td colSpan={7} className="px-0 py-0 bg-zinc-50 dark:bg-zinc-900">
                                      {loadingAccounts.has(account.accountId) ? (
                                        <div className="px-6 py-4">
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Laddar historik...
                                          </p>
                                        </div>
                                      ) : !accountsHistory.has(account.accountId) || accountsHistory.get(account.accountId)!.length === 0 ? (
                                        <div className="px-6 py-4">
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Ingen historik tillgänglig
                                          </p>
                                        </div>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                            {accountsHistory.get(account.accountId)!.map((monthData) => (
                                              <tr key={`${monthData.year}-${monthData.month}`} className="bg-zinc-100/50 dark:bg-zinc-800/50">
                                                <td className="px-6 py-2 text-zinc-600 dark:text-zinc-400 font-medium">
                                                  {monthData.monthName} {monthData.year}
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                                                  {formatSwedishAmount(monthData.periodActual)} kr
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                                                  {formatSwedishAmount(monthData.periodBudget)} kr
                                                </td>
                                                <td className={`px-4 py-2 text-right tabular-nums font-semibold ${getVarianceColor(monthData.periodVariance)}`}>
                                                  {monthData.periodVariance > 0 ? "+" : ""}{formatSwedishAmount(monthData.periodVariance)} kr
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                                                  {formatSwedishAmount(viewMode === "r12" ? monthData.r12Actual : monthData.ytdActual)} kr
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                                                  {formatSwedishAmount(viewMode === "r12" ? monthData.r12Budget : monthData.ytdBudget)} kr
                                                </td>
                                                <td className={`px-4 py-2 text-right tabular-nums font-semibold ${getVarianceColor(viewMode === "r12" ? monthData.r12Variance : monthData.ytdVariance)}`}>
                                                  {(viewMode === "r12" ? monthData.r12Variance : monthData.ytdVariance) > 0 ? "+" : ""}{formatSwedishAmount(viewMode === "r12" ? monthData.r12Variance : monthData.ytdVariance)} kr
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Custom View Manager Modal */}
      {showViewManager && (
        <CustomViewManager
          views={customViews}
          accounts={accounts}
          groups={groups}
          onClose={() => setShowViewManager(false)}
          onViewsChanged={() => {
            loadCustomViews();
          }}
        />
      )}
    </div>
  );
}
