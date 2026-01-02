"use client";

import { useState, useEffect, memo } from "react";
import { Transaction } from "../types";
import { getTransactionsPaginated, deleteTransaction } from "../actions";
import TransactionForm from "./TransactionForm";
import ConfirmModal from "./ConfirmModal";

function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TransactionListProps {
  searchQuery: string;
  sortField: "date" | "description" | "accounts";
  sortDirection: "asc" | "desc";
  filterAccountType: string;
  filterAccountId: number;
  filterDateFrom: string;
  filterDateTo: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalChange: (total: number) => void;
}

const TransactionList = memo(function TransactionList({
  searchQuery,
  sortField,
  sortDirection,
  filterAccountType,
  filterAccountId,
  filterDateFrom,
  filterDateTo,
  currentPage,
  onPageChange,
  onTotalChange,
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const itemsPerPage = 50;

  useEffect(() => {
    loadTransactions();
  }, [currentPage, searchQuery, sortField, sortDirection, filterAccountType, filterAccountId, filterDateFrom, filterDateTo]);

  async function loadTransactions() {
    setLoading(true);
    const offset = (currentPage - 1) * itemsPerPage;
    const { transactions: data, total } = await getTransactionsPaginated(
      itemsPerPage,
      offset,
      searchQuery,
      sortField,
      sortDirection,
      filterAccountType,
      filterAccountId,
      filterDateFrom,
      filterDateTo
    );
    setTransactions(data);
    onTotalChange(total);
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

  const totalTransactions = transactions.length;

  if (loading) {
    return (
      <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Inga transaktioner ännu.
        </p>
      </div>
    );
  }

  return (
    <>
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
                          {transaction.originalTransactionId && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              Periodförskjuten
                            </span>
                          )}
                          {transaction.recurringItems && transaction.recurringItems.length > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" title={transaction.recurringItems.map(ri => ri.namn).join(", ")}>
                              Återkommande
                            </span>
                          )}
                        </div>
                        {transaction.bankEvent && (
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            Från bankhändelse: {transaction.bankEvent.description}
                          </div>
                        )}
                        {transaction.originalTransactionId && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Periodförskjuten från transaktion #{transaction.originalTransactionId}
                            {transaction.periodShiftDate && (
                              <> till period {formatSwedishDate(transaction.periodShiftDate)}</>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          disabled={!!transaction.originalTransactionId}
                          className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(transaction.id)}
                          disabled={!!transaction.originalTransactionId}
                          className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  </th>
                </tr>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-6 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Konto
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Beskrivning
                  </th>
                  <th className="px-6 py-2 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Debet
                  </th>
                  <th className="px-6 py-2 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Kredit
                  </th>
                </tr>
              </thead>
              <tbody>
                {transaction.posts.map((post, idx) => (
                  <tr
                    key={post.id}
                    className={idx % 2 === 0 ? "bg-white dark:bg-zinc-800" : "bg-zinc-50 dark:bg-zinc-900/30"}
                  >
                    <td className="px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                      {post.account?.namn || "—"}
                      {post.account?.group && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          ({post.account.group.namn})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {post.description || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {post.debet > 0 ? formatSwedishAmount(post.debet) : ""}
                    </td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {post.kredit > 0 ? formatSwedishAmount(post.kredit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {selectedTransaction && (
        <TransactionForm
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deleteConfirmId !== null && (
        <ConfirmModal
          title="Ta bort transaktion"
          message="Är du säker på att du vill ta bort denna transaktion? Detta går inte att ångra."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
});

export default TransactionList;
