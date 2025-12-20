"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Transaction } from "./types";
import FileUpload from "./components/FileUpload";
import { parseSwedishCSV } from "./utils/csvParser";
import { getTransactions, saveTransactions } from "./actions";

function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load transactions from database on mount
  useEffect(() => {
    async function loadTransactions() {
      const dbTransactions = await getTransactions();
      setTransactions(dbTransactions);
      setLoading(false);
    }
    loadTransactions();
  }, []);

  const handleFileLoad = async (content: string) => {
    const parsedTransactions = parseSwedishCSV(content);

    // Save to database
    await saveTransactions(parsedTransactions);

    // Reload from database to get the IDs
    const dbTransactions = await getTransactions();
    setTransactions(dbTransactions);
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Transaktioner
          </h1>
          <Link
            href="/konton"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Konton
          </Link>
        </div>

        <FileUpload onFileLoad={handleFileLoad} />

        {transactions.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga transaktioner ännu. Ladda upp en CSV-fil för att komma igång.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-zinc-800">
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
                    Konto
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Belopp
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
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {transaction.account ? (
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {transaction.account.namn}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500">
                            {transaction.account.grupp}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-600">
                          Inget konto
                        </span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium tabular-nums ${
                        transaction.amount >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatSwedishAmount(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
