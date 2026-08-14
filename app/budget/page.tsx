"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AccountType, Account, BudgetComparison, AccountAnalysis } from "../types";
import {
  getAllAccountsBudgetComparison,
  getAccounts,
  getBudgetsForAccount,
  setBudgetsForYear,
  getAccountAnalysis,
} from "../actions";
import AlertModal from "../components/AlertModal";
import PeriodSelector from "../components/PeriodSelector";

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

const MONTHS = [
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

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [comparisons, setComparisons] = useState<BudgetComparison[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState("");

  // Kontoanalys state
  const [analysisAccountId, setAnalysisAccountId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisRefresh, setAnalysisRefresh] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<"calendar" | "r12">("calendar");
  const [analysisEnd, setAnalysisEnd] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  // Edit budget modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editYear, setEditYear] = useState(now.getFullYear());
  const [monthlyBudgets, setMonthlyBudgets] = useState<number[]>(Array(12).fill(0));
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    loadData();
  }, [year]);

  useEffect(() => {
    if (analysisAccountId === null) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    setAnalysisLoading(true);
    const request =
      analysisMode === "r12"
        ? getAccountAnalysis(analysisAccountId, analysisEnd.year, "r12", analysisEnd.month)
        : getAccountAnalysis(analysisAccountId, editYear, "calendar");
    request
      .then((data) => {
        if (!cancelled) setAnalysis(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setAnalysis(null);
          setAlertMessage(err instanceof Error ? err.message : "Kunde inte ladda kontoanalys");
        }
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysisAccountId, editYear, analysisMode, analysisEnd.year, analysisEnd.month, analysisRefresh]);

  useEffect(() => {
    if (!showBudgetModal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeWorkspace();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showBudgetModal]);

  useEffect(() => {
    if (!editingAccount) return;
    let cancelled = false;
    getBudgetsForAccount(editingAccount.id, editYear).then((existingBudgets) => {
      if (cancelled) return;
      const amounts = Array(12).fill(0);
      existingBudgets.forEach((budget) => {
        amounts[budget.month - 1] = budget.amount;
      });
      setMonthlyBudgets(amounts);
    });
    return () => {
      cancelled = true;
    };
  }, [editingAccount, editYear]);

  async function loadData() {
    setLoading(true);
    const [comparisonData, accountsData] = await Promise.all([
      getAllAccountsBudgetComparison(year, 12),
      getAccounts(),
    ]);
    setComparisons(comparisonData);
    setAccounts(accountsData);
    setLoading(false);
  }

  function openBudgetEditor(accountId: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setEditingAccount(account);
    setEditYear(year);
    setAnalysisAccountId(accountId);
    setShowBudgetModal(true);
  }

  async function saveBudget() {
    if (!editingAccount) return;

    setSavingBudget(true);
    try {
      await setBudgetsForYear(editingAccount.id, editYear, monthlyBudgets);
      // Refresh quietly (no global loading flag) so scroll position and the modal stay put
      const comparisonData = await getAllAccountsBudgetComparison(year, 12);
      setComparisons(comparisonData);
      setAnalysisRefresh((n) => n + 1); // Refresh the analysis panel with new budget
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : "Kunde inte spara budget");
    } finally {
      setSavingBudget(false);
    }
  }

  function closeWorkspace() {
    setShowBudgetModal(false);
    setEditingAccount(null);
    setAnalysisAccountId(null);
    setAnalysis(null);
  }

  function updateMonthlyBudget(monthIndex: number, value: string) {
    const newBudgets = [...monthlyBudgets];
    newBudgets[monthIndex] = value === "" ? 0 : parseFloat(value);
    setMonthlyBudgets(newBudgets);
  }

  function copyToAllMonths(amount: number) {
    setMonthlyBudgets(Array(12).fill(amount));
  }

  // Group comparisons by type -> group -> accounts
  const grouped = comparisons.reduce((acc, comparison) => {
    if (!acc[comparison.groupType]) {
      acc[comparison.groupType] = {};
    }
    if (!acc[comparison.groupType][comparison.groupName]) {
      acc[comparison.groupType][comparison.groupName] = [];
    }
    acc[comparison.groupType][comparison.groupName].push(comparison);
    return acc;
  }, {} as Record<AccountType, Record<string, BudgetComparison[]>>);

  // Calculate totals
  const typeTotals: Record<AccountType, { budget: number }> = {
    Intäkt: { budget: 0 },
    Utgift: { budget: 0 },
    Tillgång: { budget: 0 },
    Skuld: { budget: 0 },
  };

  comparisons.forEach((comp) => {
    typeTotals[comp.groupType].budget += comp.budgetAmount;
  });

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
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Budget
          </h1>
          <div>
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
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>Klicka på ett konto för att ställa in budget för alla 12 månader. Budget är oberoende av periodlås.</p>
            <p className="text-xs">
              <strong>OBS:</strong> För balansposter (Tillgång/Skuld) representerar budgeten den förväntade <em>förändringen</em> per månad,
              inte det totala saldot. För resultatposter (Intäkt/Utgift) är budgeten summan av verifikat för månaden.
            </p>
          </div>
        </div>

        {comparisons.length === 0 ? (
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
                      <div className="text-right">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">Budget</p>
                        <span className={`text-lg font-bold tabular-nums ${getTypeColor(type)}`}>
                          {formatSwedishAmount(typeTotal.budget)} kr
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Konto
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Budget
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {Object.keys(typeGroups).map((groupName) => {
                        const accountComparisons = typeGroups[groupName];

                        return (
                          <React.Fragment key={groupName}>
                            {/* Group Header Row */}
                            <tr className="bg-zinc-50 dark:bg-zinc-800">
                              <td colSpan={2} className="px-6 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {groupName}
                              </td>
                            </tr>

                            {/* Account Rows */}
                            {accountComparisons.map((comp) => (
                              <tr
                                key={comp.accountId}
                                onClick={() => openBudgetEditor(comp.accountId)}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer"
                              >
                                <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                                  {comp.accountName}
                                  {!comp.hasBudget && (
                                    <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 italic">
                                      (ingen budget)
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {formatSwedishAmount(comp.budgetAmount)} kr
                                </td>
                              </tr>
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

      {/* Kontoanalys + budget workspace */}
      {showBudgetModal && editingAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {editingAccount.namn}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {editingAccount.group?.namn} ({editingAccount.group?.typ})
                  </p>
                </div>
                <button
                  onClick={closeWorkspace}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Left: Analys */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Analys
                  </h3>
                  <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-600 overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => setAnalysisMode("calendar")}
                      className={`px-3 py-1.5 ${
                        analysisMode === "calendar"
                          ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      Kalenderår
                    </button>
                    <button
                      onClick={() => setAnalysisMode("r12")}
                      className={`px-3 py-1.5 border-l border-zinc-300 dark:border-zinc-600 ${
                        analysisMode === "r12"
                          ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      R12
                    </button>
                  </div>
                </div>
                {analysisMode === "r12" && (
                  <div className="mb-3 overflow-x-auto">
                    <PeriodSelector
                      year={analysisEnd.year}
                      month={analysisEnd.month}
                      onChange={(year, month) => setAnalysisEnd({ year, month })}
                    />
                  </div>
                )}
                {analysisLoading ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Laddar analys...</p>
                ) : analysis ? (
                  <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                            Månad
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                            Budget
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                            Utfall
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                            Differens
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {analysis.months.map((m) => (
                          <tr key={`${m.year}-${m.month}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                            <td className="px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50">
                              {m.label}
                            </td>
                            <td className="px-3 py-2 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatSwedishAmount(m.budget)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatSwedishAmount(m.actual)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right text-sm font-medium tabular-nums ${
                                m.variance >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatSwedishAmount(m.variance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 font-semibold">
                          <td className="px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50">Totalt</td>
                          <td className="px-3 py-2 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatSwedishAmount(analysis.totalBudget)}
                          </td>
                          <td className="px-3 py-2 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatSwedishAmount(analysis.totalActual)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right text-sm tabular-nums ${
                              analysis.totalVariance >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatSwedishAmount(analysis.totalVariance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">Ingen data.</p>
                )}
              </div>

              {/* Right: Budgetverktyg */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
                  Ställ in budget
                </h3>
                {/* Year selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  År
                </label>
                <select
                  value={editYear}
                  onChange={(e) => setEditYear(parseInt(e.target.value))}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick actions */}
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Snabbåtgärd: Kopiera belopp till alla månader
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Belopp"
                    id="quickCopyAmount"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const value = parseFloat((e.target as HTMLInputElement).value);
                        if (!isNaN(value)) {
                          copyToAllMonths(value);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("quickCopyAmount") as HTMLInputElement;
                      if (input) {
                        const value = parseFloat(input.value);
                        if (!isNaN(value)) {
                          copyToAllMonths(value);
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-700 text-zinc-50 hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                  >
                    Kopiera
                  </button>
                </div>
              </div>

              {/* Monthly budgets grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MONTHS.map((m, index) => (
                  <div key={m.value}>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {m.label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={monthlyBudgets[index] || ""}
                      onChange={(e) => updateMonthlyBudget(index, e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={closeWorkspace}
                className="rounded-md px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-700"
              >
                Stäng
              </button>
              <button
                onClick={saveBudget}
                disabled={savingBudget}
                className="rounded-md px-4 py-2 text-sm font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
              >
                {savingBudget ? "Sparar..." : "Spara budget"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage("")}
          variant="error"
        />
      )}
    </div>
  );
}
