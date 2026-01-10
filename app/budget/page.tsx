"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AccountType, Account, BudgetComparison } from "../types";
import {
  getAllAccountsBudgetComparison,
  getAccounts,
  getBudgetsForAccount,
  setBudgetsForYear,
} from "../actions";
import AlertModal from "../components/AlertModal";

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

  // Edit budget modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editYear, setEditYear] = useState(now.getFullYear());
  const [monthlyBudgets, setMonthlyBudgets] = useState<number[]>(Array(12).fill(0));
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    loadData();
  }, [year]);

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

  async function openBudgetEditor(accountId: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setEditingAccount(account);
    setEditYear(year);

    // Load existing budgets for this account/year
    const existingBudgets = await getBudgetsForAccount(accountId, year);
    const amounts = Array(12).fill(0);
    existingBudgets.forEach((budget) => {
      amounts[budget.month - 1] = budget.amount;
    });
    setMonthlyBudgets(amounts);
    setShowBudgetModal(true);
  }

  async function saveBudget() {
    if (!editingAccount) return;

    setSavingBudget(true);
    try {
      await setBudgetsForYear(editingAccount.id, editYear, monthlyBudgets);
      setShowBudgetModal(false);
      setEditingAccount(null);
      await loadData(); // Reload to show updated budgets
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : "Kunde inte spara budget");
    } finally {
      setSavingBudget(false);
    }
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
              inte det totala saldot. För resultatposter (Intäkt/Utgift) är budgeten summan av transaktioner för månaden.
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

      {/* Budget Editor Modal */}
      {showBudgetModal && editingAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Ställ in budget: {editingAccount.namn}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {editingAccount.group?.namn} ({editingAccount.group?.typ})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBudgetModal(false);
                    setEditingAccount(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
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

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingAccount(null);
                }}
                className="rounded-md px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-700"
              >
                Avbryt
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
