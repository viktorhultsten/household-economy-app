"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { BankEvent } from "../types";
import VerifikatForm from "../components/VerifikatForm";
import BulkBokforingVy from "../components/BulkBokforingVy";
import ForslagStatusPrick from "../components/ForslagStatusPrick";
import { ForslagStatus, KonteringsforslagKort } from "../lib/konteringsforslag";
import {
  getBankhandelseStatusar,
  getSakraBankhandelser,
  getUnpostedBankEventsPaginated,
  markBankEventIrrelevant,
} from "../actions";

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

export default function BokforPage() {
  const [events, setEvents] = useState<BankEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BankEvent | null>(null);
  const [showManualVerifikatForm, setShowManualVerifikatForm] = useState(false);
  const [showBulkVy, setShowBulkVy] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<BankEvent[]>([]);
  // Satt när kön består av säkra händelser att godkänna.
  const [sakraForslag, setSakraForslag] = useState<Map<number, KonteringsforslagKort> | undefined>();
  const [oppnarSakra, setOppnarSakra] = useState(false);
  // Appens bedömning per obokförd händelse; null medan den körs.
  const [statusar, setStatusar] = useState<Record<number, ForslagStatus> | null>(null);
  const [antalSakra, setAntalSakra] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const hasMore = events.length < total;

  // Bedömningen hänger på historiken, så den körs om efter varje ändring.
  const laddaStatusar = useCallback(async () => {
    const { status, antalSakra: n } = await getBankhandelseStatusar();
    setStatusar(status);
    setAntalSakra(n);
  }, []);

  useEffect(() => {
    laddaStatusar();
  }, [laddaStatusar]);

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
    laddaStatusar();
  }, [events.length, laddaStatusar]);

  const handleFlagChange = useCallback(async (updatedEvent: BankEvent) => {
    setSelectedEvent(updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    laddaStatusar();
  }, [laddaStatusar]);

  const handleMarkIrrelevant = useCallback(async (eventId: number) => {
    await markBankEventIrrelevant(eventId);
    const windowSize = Math.max(BATCH_SIZE, events.length);
    const { events: data, total: t } = await getUnpostedBankEventsPaginated(windowSize, 0);
    setEvents(data);
    setTotal(t);
    laddaStatusar();
  }, [events.length, laddaStatusar]);

  const handleBulkOpen = useCallback(() => {
    setSakraForslag(undefined);
    setBulkQueue(events.filter((e) => !e.flagged).slice(0, BATCH_SIZE));
    setShowBulkVy(true);
  }, [events]);

  // Kön hämtas på nytt vid öppning, så att den speglar aktuell bedömning.
  const handleSakraOpen = useCallback(async () => {
    setOppnarSakra(true);
    try {
      const sakra = await getSakraBankhandelser(BATCH_SIZE);
      if (sakra.length === 0) {
        laddaStatusar();
        return;
      }
      setSakraForslag(new Map(sakra.map((s) => [s.event.id, s.forslag])));
      setBulkQueue(sakra.map((s) => s.event));
      setShowBulkVy(true);
    } finally {
      setOppnarSakra(false);
    }
  }, [laddaStatusar]);

  const handleBulkClose = useCallback(async () => {
    setShowBulkVy(false);
    setBulkQueue([]);
    setSakraForslag(undefined);
    const windowSize = Math.max(BATCH_SIZE, events.length);
    const { events: data, total: t } = await getUnpostedBankEventsPaginated(windowSize, 0);
    setEvents(data);
    setTotal(t);
    laddaStatusar();
  }, [events.length, laddaStatusar]);

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
            {antalSakra > 0 && (
              <button
                onClick={handleSakraOpen}
                disabled={oppnarSakra}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 dark:bg-green-600 dark:hover:bg-green-500"
              >
                Godkänn {Math.min(antalSakra, BATCH_SIZE)} säkra
              </button>
            )}
            {total > 0 && (
              <button
                onClick={handleBulkOpen}
                className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-600 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Bokför {Math.min(total, BATCH_SIZE)} bankhändelser
              </button>
            )}
            <Link
              href="/imports"
              className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
            >
              Importer
            </Link>
            <button
              onClick={() => setShowManualVerifikatForm(true)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Nytt verifikat
            </button>
          </div>
        </div>

        {total === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-12 text-center">
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Allt klart! 🎉
            </p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
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
                        <div className="flex items-center gap-3">
                          <ForslagStatusPrick status={statusar?.[event.id] ?? null} />
                          {formatSwedishDate(event.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                        <div>
                          {event.description}
                          {event.import?.isExternal && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                Extern
                              </span>
                              {event.import.account?.namn && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {event.import.account.namn}
                                </span>
                              )}
                            </div>
                          )}
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
                        <div className="flex items-center justify-end gap-2">
                          {event.import?.isExternal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkIrrelevant(event.id);
                              }}
                              className="inline-block px-3 py-1.5 text-xs font-medium rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40"
                              title="Ta bort händelsen från att göra-listan utan att bokföra den"
                            >
                              Irrelevant
                            </button>
                          )}
                          <span className="inline-block px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            Bokför →
                          </span>
                        </div>
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
          sakraForslag={sakraForslag}
          onClose={handleBulkClose}
        />
      )}
    </div>
  );
}
