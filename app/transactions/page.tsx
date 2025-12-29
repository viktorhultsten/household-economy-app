"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Transaction } from "../types";
import { getTransactionsPaginated, deleteTransaction } from "../actions";
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

export default function TransaktionerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const itemsPerPage = 50;

  useEffect(() => {
    loadTransactions();
  }, [currentPage]); // Reload when page changes

  async function loadTransactions() {
    setLoading(true);
    const offset = (currentPage - 1) * itemsPerPage;
    const { transactions: data, total } = await getTransactionsPaginated(itemsPerPage, offset);
    setTransactions(data);
    setTotalTransactions(total);
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

  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

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

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Transaktioner
          </h1>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {totalTransactions} transaktioner totalt
            {totalPages > 1 && ` (sida ${currentPage} av ${totalPages})`}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Beskrivning
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Konton
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Åtgärd
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {transactions.map((transaction) => (
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
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          {expandedId === transaction.id ? "Dölj" : "Visa"}
                        </button>
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(transaction.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                        >
                          Ta bort
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  ← Föregående
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Sida {currentPage} av {totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Nästa →
                </button>
              </div>
            )}
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
