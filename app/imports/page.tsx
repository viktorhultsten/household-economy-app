"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Import, BankEvent } from "../types";
import { getImports, getImportWithEvents, deleteImport, saveBankEvents, unmarkBankEventIrrelevant } from "../actions";
import ImportModal from "../components/ImportModal";
import ConfirmModal from "../components/ConfirmModal";

function formatSwedishDateTime(date: Date): string {
  return date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    filename: string;
    importedAt: Date;
    totalEvents: number;
  } | null>(null);

  useEffect(() => {
    loadImports();
  }, []);

  async function loadImports() {
    const data = await getImports();
    setImports(data);
    setLoading(false);
  }

  async function handleImport(
    parsedEvents: Omit<BankEvent, "id" | "isPosted" | "verifikatId">[],
    filename: string,
    accountId?: number,
    isExternal?: boolean
  ) {
    // Save to database
    await saveBankEvents(parsedEvents, filename, accountId, isExternal);

    // Reload imports
    await loadImports();

    // Close modal and collapse any expanded import
    setShowImportModal(false);
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

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;

    await deleteImport(deleteConfirm.id);
    await loadImports();
    if (expandedImportId === deleteConfirm.id) {
      setExpandedImportId(null);
      setExpandedEvents([]);
    }
    setDeleteConfirm(null);
  }

  async function handleUndoIrrelevant(eventId: number) {
    await unmarkBankEventIrrelevant(eventId);
    setExpandedEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, isIrrelevant: false } : e))
    );
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
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Importer
          </h1>
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Importera CSV
          </button>
        </div>

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
                        {imp.isExternal && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            Extern
                          </span>
                        )}
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {expandedImportId === imp.id ? "▼" : "▶"}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
                        <div>
                          <span className="font-medium">Import-ID:</span> #{imp.id}
                        </div>
                        <div>
                          <span className="font-medium">Importerad:</span>{" "}
                          {formatSwedishDateTime(imp.importedAt)}
                        </div>
                        <div>
                          <span className="font-medium">Antal händelser:</span>{" "}
                          {imp.totalEvents}
                        </div>
                        <div>
                          <span className="font-medium">Datumspann:</span>{" "}
                          {imp.dateRangeStart} -{" "}
                          {imp.dateRangeEnd}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((imp.postedEvents ?? 0) > 0) {
                          return; // Don't open modal if there are posted events
                        }
                        setDeleteConfirm({
                          id: imp.id,
                          filename: imp.filename,
                          importedAt: imp.importedAt,
                          totalEvents: imp.totalEvents,
                        });
                      }}
                      disabled={(imp.postedEvents ?? 0) > 0}
                      title={(imp.postedEvents ?? 0) > 0 ? `Kan inte ta bort - ${imp.postedEvents} händelse${imp.postedEvents === 1 ? '' : 'r'} har bokförts` : 'Ta bort import'}
                      className={`ml-4 px-3 py-1.5 text-xs font-medium rounded-md border ${
                        (imp.postedEvents ?? 0) > 0
                          ? 'border-zinc-300 bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600'
                          : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900 cursor-pointer'
                      }`}
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
                            {[...expandedEvents]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((event) => (
                              <tr
                                key={event.id}
                                className={
                                  event.isPosted || event.isIrrelevant
                                    ? "opacity-60"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                }
                              >
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                                  {event.date}
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
                                  {event.isIrrelevant ? (
                                    <div className="inline-flex items-center gap-2">
                                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                        Irrelevant
                                      </span>
                                      <button
                                        onClick={() => handleUndoIrrelevant(event.id)}
                                        className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                      >
                                        Ångra
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                        event.isPosted
                                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      }`}
                                    >
                                      {event.isPosted ? "Bokförd" : "Ej bokförd"}
                                    </span>
                                  )}
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

      {showImportModal && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Ta bort import"
          message={`Är du säker på att du vill ta bort importen "${deleteConfirm.filename}" (Import-ID: #${deleteConfirm.id}, importerad: ${formatSwedishDateTime(deleteConfirm.importedAt)}, ${deleteConfirm.totalEvents} händelser)? Alla bankhändelser från denna import kommer också tas bort.`}
          confirmText="Ta bort"
          cancelText="Avbryt"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
