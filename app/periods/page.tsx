"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PeriodLock } from "../types";
import { getPeriodLocks, lockPeriod, unlockPeriod } from "../actions";
import ConfirmModal from "../components/ConfirmModal";

export default function PerioderPage() {
  const [locks, setLocks] = useState<PeriodLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockYear, setLockYear] = useState("");
  const [lockMonth, setLockMonth] = useState("");
  const [error, setError] = useState("");
  const [unlockConfirm, setUnlockConfirm] = useState<{ year: number; month: number } | null>(
    null
  );

  useEffect(() => {
    loadLocks();
  }, []);

  async function loadLocks() {
    const data = await getPeriodLocks();
    setLocks(data);
    setLoading(false);
  }

  async function handleLockPeriod() {
    setError("");

    if (!lockYear || !lockMonth) {
      setError("Välj både år och månad");
      return;
    }

    try {
      await lockPeriod(parseInt(lockYear), parseInt(lockMonth));
      setLockYear("");
      setLockMonth("");
      await loadLocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
    }
  }

  async function handleUnlockConfirm() {
    if (!unlockConfirm) return;

    try {
      await unlockPeriod(unlockConfirm.year, unlockConfirm.month);
      setUnlockConfirm(null);
      await loadLocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setUnlockConfirm(null);
    }
  }

  function formatPeriod(year: number, month: number): string {
    const monthNames = [
      "Januari",
      "Februari",
      "Mars",
      "April",
      "Maj",
      "Juni",
      "Juli",
      "Augusti",
      "September",
      "Oktober",
      "November",
      "December",
    ];
    return `${monthNames[month - 1]} ${year}`;
  }

  function formatDateTime(date: Date): string {
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
          Periodlåsning
        </h1>

        {/* Info Box */}
        <div className="mb-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Om periodlåsning
          </h2>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            När en period är låst kan inga transaktioner för den perioden skapas, ändras eller
            tas bort. Detta skyddar bokföringen från oavsiktliga ändringar. Lås perioder när
            bokföringen är klar och granskad.
          </p>
        </div>

        {/* Lock New Period */}
        <div className="mb-8 rounded-lg bg-white shadow dark:bg-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Lås ny period
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                År
              </label>
              <select
                value={lockYear}
                onChange={(e) => setLockYear(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value="">Välj år...</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Månad
              </label>
              <select
                value={lockMonth}
                onChange={(e) => setLockMonth(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value="">Välj månad...</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {formatPeriod(2000, month).split(" ")[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleLockPeriod}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Lås period
          </button>
        </div>

        {/* Locked Periods List */}
        <div className="rounded-lg bg-white shadow dark:bg-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Låsta perioder ({locks.length})
            </h2>
          </div>

          {locks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                Inga låsta perioder ännu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {locks.map((lock) => (
                <div
                  key={lock.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                >
                  <div>
                    <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatPeriod(lock.year, lock.month)}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Låst: {formatDateTime(lock.lockedAt)}
                      {lock.lockedBy && ` av ${lock.lockedBy}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setUnlockConfirm({ year: lock.year, month: lock.month })}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                  >
                    Lås upp
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {unlockConfirm && (
        <ConfirmModal
          title="Lås upp period"
          message={`Är du säker på att du vill låsa upp perioden ${formatPeriod(
            unlockConfirm.year,
            unlockConfirm.month
          )}? Detta gör det möjligt att ändra transaktioner för denna period igen.`}
          confirmText="Lås upp"
          cancelText="Avbryt"
          variant="warning"
          onConfirm={handleUnlockConfirm}
          onCancel={() => setUnlockConfirm(null)}
        />
      )}
    </div>
  );
}
