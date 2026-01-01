"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Transaction } from "../types";
import { getTransactionsPaginated, deleteTransaction } from "../actions";
import TransactionEditModal from "../components/TransactionEditModal";
import TransactionForm from "../components/TransactionForm";
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
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showManualTransactionForm, setShowManualTransactionForm] = useState(false);

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
    setDeleteConfirmId(null);
  }

  async function handleEditSuccess() {
    await loadTransactions();
    setSelectedTransaction(null);
  }

  async function handlePostSuccess() {
    await loadTransactions();
    setShowManualTransactionForm(false);
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
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {totalTransactions} transaktioner totalt
              {totalPages > 1 && ` (sida ${currentPage} av ${totalPages})`}
            </div>
            <button
              onClick={() => setShowManualTransactionForm(true)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Ny transaktion
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga transaktioner ännu.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden"
              >
                {/* Posts Table with Header */}
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[35%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800">
                      <th colSpan={4} className="px-6 py-4 text-left border-b border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {formatSwedishDate(transaction.date)}
                              </span>
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {transaction.description}
                              </span>
                            </div>
                            {transaction.bankEvent && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
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
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedTransaction(transaction)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
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
                        </div>
                      </th>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="px-6 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Konto
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Beskrivning
                      </th>
                      <th className="px-6 py-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Debet
                      </th>
                      <th className="px-6 py-2 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Kredit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {transaction.posts.map((post) => (
                      <tr
                        key={post.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                      >
                        <td className="px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                          <div className="font-medium">{post.account?.namn}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {post.account?.group?.namn} ({post.account?.group?.typ})
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400 italic">
                          {post.description || "-"}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                          {post.debet > 0 ? `${formatSwedishAmount(post.debet)} kr` : "-"}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                          {post.kredit > 0 ? `${formatSwedishAmount(post.kredit)} kr` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="rounded-lg bg-white shadow dark:bg-zinc-800 px-6 py-4 flex items-center justify-between">
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

      {showManualTransactionForm && (
        <TransactionForm
          onClose={() => setShowManualTransactionForm(false)}
          onSuccess={handlePostSuccess}
        />
      )}
    </div>
  );
}
