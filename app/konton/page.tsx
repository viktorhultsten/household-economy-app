"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Account, AccountType } from "../types";
import { getAccounts, addAccount, deleteAccount } from "../actions";

export default function KontonPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    namn: "",
    grupp: "",
    typ: "Utgift" as AccountType,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const data = await getAccounts();
    setAccounts(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addAccount(newAccount);
    setNewAccount({ namn: "", grupp: "", typ: "Utgift" });
    setShowForm(false);
    await loadAccounts();
  }

  async function handleDelete(id: number) {
    if (confirm("Är du säker på att du vill ta bort detta konto?")) {
      await deleteAccount(id);
      await loadAccounts();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  // Group accounts by grupp
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.grupp]) {
      acc[account.grupp] = [];
    }
    acc[account.grupp].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
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
            Konton
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {showForm ? "Avbryt" : "Lägg till konto"}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-zinc-800">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Nytt konto
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Namn
                </label>
                <input
                  type="text"
                  value={newAccount.namn}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, namn: e.target.value })
                  }
                  required
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                  placeholder="t.ex. Drivmedel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Grupp
                </label>
                <input
                  type="text"
                  value={newAccount.grupp}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, grupp: e.target.value })
                  }
                  required
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                  placeholder="t.ex. Bil"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Typ
                </label>
                <select
                  value={newAccount.typ}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      typ: e.target.value as AccountType,
                    })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                >
                  <option value="Utgift">Utgift</option>
                  <option value="Intäkt">Intäkt</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Spara
              </button>
            </form>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga konton ännu. Lägg till ett konto för att komma igång.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAccounts).map(([grupp, accounts]) => (
              <div
                key={grupp}
                className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden"
              >
                <div className="bg-zinc-100 dark:bg-zinc-700 px-6 py-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {grupp}
                  </h3>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {account.namn}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm font-medium ${
                            account.typ === "Intäkt"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {account.typ}
                        </span>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
