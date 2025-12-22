"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BankEvent } from "./types";
import TransactionForm from "./components/TransactionForm";
import { getBankEvents } from "./actions";

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
  const [bankEvents, setBankEvents] = useState<BankEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<BankEvent | null>(null);
  const [showManualTransactionForm, setShowManualTransactionForm] = useState(false);

  useEffect(() => {
    loadBankEvents();
  }, []);

  async function loadBankEvents() {
    const events = await getBankEvents();
    setBankEvents(events);
    setLoading(false);
  }

  const handlePostSuccess = async () => {
    await loadBankEvents();
    setSelectedEvent(null);
    setShowManualTransactionForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  const unpostedEvents = bankEvents.filter((e) => !e.isPosted);
  const postedEvents = bankEvents.filter((e) => e.isPosted);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Bankhändelser
          </h1>
          <button
            onClick={() => setShowManualTransactionForm(true)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Ny transaktion
          </button>
        </div>

        {bankEvents.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga bankhändelser ännu. Gå till{" "}
              <Link href="/imports" className="text-zinc-900 dark:text-zinc-50 underline">
                Importer
              </Link>{" "}
              för att ladda upp en CSV-fil.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {unpostedEvents.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Ej bokförda ({unpostedEvents.length})
                </h2>
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
                        <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Belopp
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Åtgärd
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {unpostedEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {formatSwedishDate(event.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {event.description}
                          </td>
                          <td
                            className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium tabular-nums ${
                              event.amount >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatSwedishAmount(event.amount)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                            <button
                              onClick={() => setSelectedEvent(event)}
                              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                            >
                              Bokför →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {postedEvents.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Bokförda ({postedEvents.length})
                </h2>
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
                        <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Belopp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {postedEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 opacity-60"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {formatSwedishDate(event.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                            {event.description}
                          </td>
                          <td
                            className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium tabular-nums ${
                              event.amount >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatSwedishAmount(event.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedEvent && (
        <TransactionForm
          bankEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSuccess={handlePostSuccess}
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
