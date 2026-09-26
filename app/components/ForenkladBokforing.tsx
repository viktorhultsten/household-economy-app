"use client";

import { useEffect, useRef, useState } from "react";
import { BankEvent } from "../types";
import { KonteringsforslagKort } from "../lib/konteringsforslag";
import { createVerifikat, isPeriodLocked, linkVerifikatToRecurringItem } from "../actions";
import { Forloppskarta, KoPilar, SegmentStatus, VyVaxlare } from "./BulkNavigering";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ForenkladBokforingProps {
  bankEvent: BankEvent;
  forslag: KonteringsforslagKort;
  nav: {
    currentIndex: number;
    total: number;
    segments: SegmentStatus[];
    onNavigate: (direction: -1 | 1) => void;
    onJump: (index: number) => void;
  };
  onVaxlaVy: () => void;
  onClose: () => void;
  /** Verifikatet är skapat — föräldern går vidare i kön. */
  onGodkand: (verifikatId: number) => Promise<void>;
}

/**
 * Förenklad bokföring av en bankhändelse med ett säkert konteringsförslag:
 * konteringen visas som den är, och användaren godkänner den.
 */
export default function ForenkladBokforing({
  bankEvent,
  forslag,
  nav,
  onVaxlaVy,
  onClose,
  onGodkand,
}: ForenkladBokforingProps) {
  const [description, setDescription] = useState(bankEvent.description);
  const [behallRecurring, setBehallRecurring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periodLast, setPeriodLast] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    isPeriodLocked(bankEvent.date).then(setPeriodLast);
  }, [bankEvent.date]);

  const godkann = async () => {
    if (loading || periodLast) return;
    setLoading(true);
    setError("");
    try {
      const verifikatId = await createVerifikat({
        date: bankEvent.date,
        description,
        bankEventId: bankEvent.id,
        posts: forslag.rader.map((r) => ({
          id: 0, // Sätts av servern
          verifikatId: 0, // Sätts av servern
          accountId: r.accountId,
          debet: r.debet,
          kredit: r.kredit,
          description: "",
        })),
      });
      if (forslag.recurringItem && behallRecurring) {
        await linkVerifikatToRecurringItem(verifikatId, forslag.recurringItem.id);
      }
      await onGodkand(verifikatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setLoading(false);
    }
  };

  // Samma kortkommandon som bokföringsvyn: Cmd/Ctrl+Enter godkänner,
  // Cmd/Ctrl+pilar bläddrar, Escape stänger.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        nav.onNavigate(-1);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
        e.preventDefault();
        nav.onNavigate(1);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [nav, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900">
      <div className="shrink-0 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Godkänn kontering</h2>
          <div className="flex items-center gap-4">
            <VyVaxlare vy="forenklad" onVaxla={onVaxlaVy} />
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              ✕
            </button>
          </div>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          godkann();
        }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}
            {periodLast && (
              <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                ⚠️ Perioden är låst. Du kan inte bokföra händelsen i denna period.
              </div>
            )}

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{bankEvent.description}</span>
                <span
                  className={`shrink-0 font-medium tabular-nums ${
                    bankEvent.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatSwedishAmount(bankEvent.amount)} kr
                </span>
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {bankEvent.date.toLocaleDateString("sv-SE")}
              </div>
            </div>

            <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-green-700 dark:text-green-400" aria-label="Säkert förslag">
                  ✓
                </span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{forslag.mallNamn}</span>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="pr-2 text-left text-xs font-normal text-zinc-500 dark:text-zinc-400">Konto</th>
                    <th className="w-28 text-right text-xs font-normal text-zinc-500 dark:text-zinc-400">Debet</th>
                    <th className="w-28 pl-2 text-right text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      Kredit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forslag.rader.map((rad, i) => (
                    <tr key={i} className="h-8 border-t border-green-200 dark:border-green-800/60">
                      <td className="pr-2 text-zinc-800 dark:text-zinc-200">{rad.accountName}</td>
                      <td className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {rad.debet > 0 ? formatSwedishAmount(rad.debet) : ""}
                      </td>
                      <td className="pl-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {rad.kredit > 0 ? formatSwedishAmount(rad.kredit) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {forslag.recurringItem && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Återkommande</span>
                {behallRecurring ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-0.5 pl-3 pr-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    ↻ {forslag.recurringItem.namn}
                    <button
                      type="button"
                      onClick={() => setBehallRecurring(false)}
                      className="rounded-full px-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                      aria-label="Koppla inte till återkommande händelse"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBehallRecurring(true)}
                    className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Koppla till {forslag.recurringItem.namn}
                  </button>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="forenklad-beskrivning"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Beskrivning
              </label>
              <input
                id="forenklad-beskrivning"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-4 border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
          <Forloppskarta segments={nav.segments} currentIndex={nav.currentIndex} onJump={nav.onJump} />
          <div className="flex items-center justify-between gap-3">
            <KoPilar
              currentIndex={nav.currentIndex}
              total={nav.total}
              disabled={loading}
              onNavigate={nav.onNavigate}
            />
            <button
              type="submit"
              disabled={loading || periodLast}
              className="rounded-md bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
            >
              {loading ? "Bokför..." : "Godkänn"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
