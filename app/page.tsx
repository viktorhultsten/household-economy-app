"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { BankEvent } from "./types";
import VerifikatForm from "./components/VerifikatForm";
import BulkBokforingVy from "./components/BulkBokforingVy";
import { getUnpostedBankEventsPaginated, flagBankEvent, unflagBankEvent } from "./actions";

const BATCH_SIZE = 25;

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
  const [events, setEvents] = useState<BankEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BankEvent | null>(null);
  const [showManualVerifikatForm, setShowManualVerifikatForm] = useState(false);
  const [showBulkVy, setShowBulkVy] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<BankEvent[]>([]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const hasMore = events.length < total;

  // Initial load
  useEffect(() => {
    async function loadInitial() {
      const { events: data, total: t } = await getUnpostedBankEventsPaginated(BATCH_SIZE, 0);
      setEvents(data);
      setTotal(t);
      setInitialLoading(false);
    }
    loadInitial();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (total > 0 && events.length >= total) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const { events: data, total: t } = await getUnpostedBankEventsPaginated(
      BATCH_SIZE,
      events.length
    );
    setEvents((prev) => [...prev, ...data]);
    setTotal(t);
    setLoadingMore(false);
    loadingRef.current = false;
  }, [events.length, total]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // After posting, the event leaves the att göra-listan; refetch the loaded
  // window (offset 0) so the change shows without teleporting scroll to top.
  const handlePostSuccess = useCallback(async () => {
    setSelectedEvent(null);
    setShowManualVerifikatForm(false);
    const windowSize = Math.max(BATCH_SIZE, events.length);
    const { events: data, total: t } = await getUnpostedBankEventsPaginated(windowSize, 0);
    setEvents(data);
    setTotal(t);
  }, [events.length]);

  const handleFlagChange = useCallback(async (updatedEvent: BankEvent) => {
    setSelectedEvent(updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
  }, []);

  const handleBulkOpen = useCallback(() => {
    setBulkQueue(events.filter((e) => !e.flagged).slice(0, BATCH_SIZE));
    setShowBulkVy(true);
  }, [events]);

  const handleBulkClose = useCallback(async () => {
    setShowBulkVy(false);
    setBulkQueue([]);
    const windowSize = Math.max(BATCH_SIZE, events.length);
    const { events: data, total: t } = await getUnpostedBankEventsPaginated(windowSize, 0);
    setEvents(data);
    setTotal(t);
  }, [events.length]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Bankhändelser
          </h1>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <button
                onClick={handleBulkOpen}
                className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-600 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Bokför {Math.min(total, BATCH_SIZE)} bankhändelser
              </button>
            )}
            <button
              onClick={() => setShowManualVerifikatForm(true)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Nytt verifikat
            </button>
          </div>
        </div>

        {total === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga obokförda bankhändelser. Gå till{" "}
              <Link href="/imports" className="text-zinc-900 dark:text-zinc-50 underline">
                Importer
              </Link>{" "}
              för att ladda upp en CSV-fil.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Ej bokförda ({total})
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
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatSwedishDate(event.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                        <div>
                          {event.description}
                          {event.flagged && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                <line x1="4" y1="22" x2="4" y2="15"/>
                              </svg>
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                {event.flagComment || "Flaggad"}
                              </span>
                            </div>
                          )}
                        </div>
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
                        <span className="inline-block px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          Bokför →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="py-6 text-center">
                {loadingMore && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Laddar…</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedEvent && (
        <VerifikatForm
          bankEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSuccess={handlePostSuccess}
          onFlagChange={handleFlagChange}
        />
      )}

      {showManualVerifikatForm && (
        <VerifikatForm
          onClose={() => setShowManualVerifikatForm(false)}
          onSuccess={handlePostSuccess}
        />
      )}

      {showBulkVy && (
        <BulkBokforingVy
          queue={bulkQueue}
          onClose={handleBulkClose}
        />
      )}
    </div>
  );
}
