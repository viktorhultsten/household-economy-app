"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Transaction } from "../types";
import { getAllTransactions, deleteTransaction } from "../actions";
import TransactionEditModal from "../components/TransactionEditModal";
import ConfirmModal from "../components/ConfirmModal";

function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type SortField = "date" | "description" | "accounts";
type SortDirection = "asc" | "desc";

export default function TransaktionerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterAccountType, setFilterAccountType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    const data = await getAllTransactions();
    setTransactions(data);
    setLoading(false);
  }

  async function handleDeleteConfirm() {
    if (deleteConfirmId === null) return;

    await deleteTransaction(deleteConfirmId);
    await loadTransactions();
    setExpandedId(null);
    setDeleteConfirmId(null);
  }

  async function handleEditSuccess() {
    await loadTransactions();
    setSelectedTransaction(null);
  }

  function handleExpand(id: number) {
    setExpandedId(expandedId === id ? null : id);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  // Filter and search logic
  const filteredAndSortedTransactions = transactions
    .filter((txn) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = txn.description.toLowerCase().includes(query);
        const matchesBankEvent = txn.bankEvent?.description.toLowerCase().includes(query) ?? false;
        const matchesAccount = txn.posts.some(
          (post) =>
            post.account?.namn.toLowerCase().includes(query) ||
            post.account?.group?.namn.toLowerCase().includes(query)
        );
        const matchesPostDescription = txn.posts.some(
          (post) => post.description?.toLowerCase().includes(query)
        );
        if (!matchesDescription && !matchesBankEvent && !matchesAccount && !matchesPostDescription) {
          return false;
        }
      }

      // Account type filter
      if (filterAccountType !== "all") {
        const hasAccountType = txn.posts.some(
          (post) => post.account?.group?.typ === filterAccountType
        );
        if (!hasAccountType) return false;
      }

      // Date range filter
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        if (txn.date < fromDate) return false;
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (txn.date > toDate) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison = a.date.getTime() - b.date.getTime();
          break;
        case "description":
          comparison = a.description.localeCompare(b.description, "sv-SE");
          break;
        case "accounts":
          comparison = a.posts.length - b.posts.length;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
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
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Tillbaka
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
            Transaktioner
          </h1>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Sök
              </label>
              <input
                type="text"
                placeholder="Sök efter beskrivning, konto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-400"
              />
            </div>

            {/* Account Type Filter */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Kontotyp
              </label>
              <select
                value={filterAccountType}
                onChange={(e) => setFilterAccountType(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value="all">Alla typer</option>
                <option value="Intäkt">Intäkt</option>
                <option value="Utgift">Utgift</option>
                <option value="Tillgång">Tillgång</option>
                <option value="Skuld">Skuld</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterAccountType("all");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Rensa filter
              </button>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Från datum
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Till datum
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Visar {filteredAndSortedTransactions.length} av {transactions.length} transaktioner
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga transaktioner ännu.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      Datum
                      {sortField === "date" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort("description")}
                      className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      Beskrivning
                      {sortField === "description" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleSort("accounts")}
                      className="ml-auto flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      Konton
                      {sortField === "accounts" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Åtgärd
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {filteredAndSortedTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatSwedishDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      {transaction.bankEvent && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-2">
                          <span>Bankhändelse: {transaction.bankEvent.description}</span>
                          <span className={`font-medium tabular-nums ${
                            transaction.bankEvent.amount >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatSwedishAmount(transaction.bankEvent.amount)} kr
                          </span>
                        </div>
                      )}
                      <div className="text-sm text-zinc-900 dark:text-zinc-50">
                        {transaction.description}
                      </div>
                      {expandedId === transaction.id && (
                        <div className="mt-3 space-y-2 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
                          {transaction.posts.map((post) => (
                            <div
                              key={post.id}
                              className="flex items-start justify-between gap-4 text-xs"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {post.account?.namn}
                                </div>
                                <div className="text-zinc-500 dark:text-zinc-400">
                                  {post.account?.group?.namn} ({post.account?.group?.typ})
                                </div>
                                {post.description && (
                                  <div className="text-zinc-500 dark:text-zinc-400 italic mt-0.5">
                                    {post.description}
                                  </div>
                                )}
                              </div>
                              <div className="font-medium tabular-nums whitespace-nowrap text-zinc-900 dark:text-zinc-50">
                                {post.debet > 0 && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    D: {formatSwedishAmount(post.debet)} kr
                                  </span>
                                )}
                                {post.kredit > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    K: {formatSwedishAmount(post.kredit)} kr
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                      {transaction.posts.length} konton
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleExpand(transaction.id)}
                          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                          {expandedId === transaction.id ? "Dölj" : "Visa"}
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-600">|</span>
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                          Redigera
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-600">|</span>
                        <button
                          onClick={() => setDeleteConfirmId(transaction.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Ta bort
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {deleteConfirmId !== null && (
        <ConfirmModal
          title="Ta bort transaktion"
          message="Är du säker på att du vill ta bort denna transaktion? Denna åtgärd kan inte ångras."
          confirmText="Ta bort"
          cancelText="Avbryt"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
