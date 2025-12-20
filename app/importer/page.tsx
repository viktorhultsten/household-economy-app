"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Import, BankEvent } from "../types";
import { getImports, getImportWithEvents, deleteImport, saveBankEvents } from "../actions";
import FileUpload from "../components/FileUpload";
import { parseSwedishCSV } from "../utils/csvParser";

function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ImporterPage() {
  const [imports, setImports] = useState<Import[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedImportId, setExpandedImportId] = useState<number | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<BankEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    loadImports();
  }, []);

  async function loadImports() {
    const data = await getImports();
    setImports(data);
    setLoading(false);
  }

  async function handleFileLoad(content: string, filename: string) {
    const parsedEvents = parseSwedishCSV(content);

    // Save to database
    await saveBankEvents(parsedEvents, filename);

    // Reload imports
    await loadImports();

    // If we had an import expanded, collapse it
    setExpandedImportId(null);
    setExpandedEvents([]);
  }

  async function handleExpand(importId: number) {
    if (expandedImportId === importId) {
      // Collapse if already expanded
      setExpandedImportId(null);
      setExpandedEvents([]);
      return;
    }

    setLoadingEvents(true);
    setExpandedImportId(importId);

    const data = await getImportWithEvents(importId);
    if (data) {
      setExpandedEvents(data.events);
    }
    setLoadingEvents(false);
  }

  async function handleDelete(id: number, filename: string) {
    if (
      confirm(
        `Är du säker på att du vill ta bort importen "${filename}"? Alla bankhändelser från denna import kommer också tas bort.`
      )
    ) {
      await deleteImport(id);
      await loadImports();
      if (expandedImportId === id) {
        setExpandedImportId(null);
        setExpandedEvents([]);
      }
    }
  }

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
            ← Tillbaka till transaktioner
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Importer
          </h1>
        </div>

        <FileUpload onFileLoad={handleFileLoad} />

        {imports.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga importer ännu. Ladda upp en CSV-fil för att komma igång.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  onClick={() => handleExpand(imp.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          {imp.filename}
                        </h2>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {expandedImportId === imp.id ? "▼" : "▶"}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
                        <div>
                          <span className="font-medium">Importerad:</span>{" "}
                          {formatSwedishDate(imp.importedAt)}
                        </div>
                        <div>
                          <span className="font-medium">Antal händelser:</span>{" "}
                          {imp.totalEvents}
                        </div>
                        <div>
                          <span className="font-medium">Datumspann:</span>{" "}
                          {formatSwedishDate(imp.dateRangeStart)} -{" "}
                          {formatSwedishDate(imp.dateRangeEnd)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(imp.id, imp.filename);
                      }}
                      className="ml-4 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>

                {expandedImportId === imp.id && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    {loadingEvents ? (
                      <div className="p-6 text-center">
                        <p className="text-zinc-600 dark:text-zinc-400">
                          Laddar händelser...
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
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
                              <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            {expandedEvents.map((event) => (
                              <tr
                                key={event.id}
                                className={
                                  event.isPosted
                                    ? "opacity-60"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                }
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
                                <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      event.isPosted
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                                  >
                                    {event.isPosted ? "Bokförd" : "Ej bokförd"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
