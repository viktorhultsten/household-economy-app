"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import TransactionList from "../components/TransactionList";
import TransactionForm from "../components/TransactionForm";
import AccountSelectorModal from "../components/AccountSelectorModal";
import { Account } from "../types";
import { getAccounts } from "../actions";

export default function TransaktionerPage() {
  const [showManualTransactionForm, setShowManualTransactionForm] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const itemsPerPage = 50;

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "description" | "accounts">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterAccountType, setFilterAccountType] = useState<string>("all");
  const [filterAccountId, setFilterAccountId] = useState<number>(0);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Load accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      const accountsData = await getAccounts();
      setAccounts(accountsData);
    }
    loadAccounts();
  }, []);

  // Debounce search query
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 300);
  };

  function clearFilters() {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSortField("date");
    setSortDirection("desc");
    setFilterAccountType("all");
    setFilterAccountId(0);
    setFilterDateFrom("");
    setFilterDateTo("");
    setCurrentPage(1);
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    sortField !== "date" ||
    sortDirection !== "desc" ||
    filterAccountType !== "all" ||
    filterAccountId !== 0 ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  async function handlePostSuccess() {
    setShowManualTransactionForm(false);
    // Force reload by resetting page
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8">
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

        {/* Search and Filter Controls */}
        <div className="mb-6 rounded-lg bg-white shadow dark:bg-zinc-800 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Sök
              </label>
              <input
                type="text"
                placeholder="Sök efter beskrivning, konto..."
                value={searchQuery}
                onChange={(e) => {
                  updateSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>

            {/* Specific Account Filter */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Konto
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAccountSelector(true)}
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-left text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                >
                  {selectedAccount ? `${selectedAccount.namn} (${selectedAccount.group?.namn})` : "Alla konton"}
                </button>
                {selectedAccount && (
                  <button
                    onClick={() => {
                      setSelectedAccount(null);
                      setFilterAccountId(0);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Account Type Filter */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Kontotyp
              </label>
              <select
                value={filterAccountType}
                onChange={(e) => {
                  setFilterAccountType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value="all">Alla typer</option>
                <option value="Intäkt">Intäkt</option>
                <option value="Utgift">Utgift</option>
                <option value="Tillgång">Tillgång</option>
                <option value="Skuld">Skuld</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Sortera efter
              </label>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-") as [typeof sortField, typeof sortDirection];
                  setSortField(field);
                  setSortDirection(direction);
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value="date-desc">Datum (nyast först)</option>
                <option value="date-asc">Datum (äldst först)</option>
                <option value="description-asc">Beskrivning (A-Ö)</option>
                <option value="description-desc">Beskrivning (Ö-A)</option>
                <option value="accounts-asc">Konton (A-Ö)</option>
                <option value="accounts-desc">Konton (Ö-A)</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Från datum
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                lang="sv-SE"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Till datum
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                lang="sv-SE"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="lg:col-start-4 flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Rensa filter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transaction List - Memoized Component */}
        <TransactionList
          searchQuery={debouncedSearchQuery}
          sortField={sortField}
          sortDirection={sortDirection}
          filterAccountType={filterAccountType}
          filterAccountId={filterAccountId}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onTotalChange={setTotalTransactions}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 rounded-lg bg-white shadow dark:bg-zinc-800 px-6 py-4 flex items-center justify-between">
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
      </main>

      {showManualTransactionForm && (
        <TransactionForm
          onClose={() => setShowManualTransactionForm(false)}
          onSuccess={handlePostSuccess}
        />
      )}

      {showAccountSelector && (
        <AccountSelectorModal
          accounts={accounts}
          selectedAccountId={filterAccountId}
          onSelect={(accountId) => {
            const account = accounts.find(a => a.id === accountId);
            setSelectedAccount(account || null);
            setFilterAccountId(accountId);
            setCurrentPage(1);
            setShowAccountSelector(false);
          }}
          onClose={() => setShowAccountSelector(false)}
        />
      )}
    </div>
  );
}
