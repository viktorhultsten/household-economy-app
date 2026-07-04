"use client";

import { useState, useEffect } from "react";
import { RecurringItemStatus } from "../types";
import { getRecurringItemsStatus } from "../actions";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RecurringItemsSidebar() {
  const [statuses, setStatuses] = useState<RecurringItemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    loadStatuses();
  }, [selectedPeriod]);

  async function loadStatuses() {
    setLoading(true);
    const data = await getRecurringItemsStatus(selectedPeriod.year, selectedPeriod.month);
    setStatuses(data);
    setLoading(false);
  }

  function changePeriod(delta: number) {
    setSelectedPeriod((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;

      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }

      return { year: newYear, month: newMonth };
    });
  }

  const periodLabel = `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Återkommande
        </h3>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => changePeriod(-1)}
            className="px-2 py-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ←
          </button>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {periodLabel}
          </span>
          <button
            onClick={() => changePeriod(1)}
            className="px-2 py-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="p-4">
        {statuses.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
            Inga återkommande händelser för denna period
          </p>
        ) : (
          <div className="space-y-3">
            {statuses.map((status) => {
              const remaining = status.recurringItem.expectedPerMonth - status.currentPeriodCount;
              const isComplete = status.isComplete;

              return (
                <div
                  key={status.recurringItem.id}
                  className={`border rounded-md p-3 transition-colors ${
                    isComplete
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {status.recurringItem.namn}
                    </h4>
                    {isComplete && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Använt:</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {status.currentPeriodCount} / {status.recurringItem.expectedPerMonth}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Kvar:</span>
                      <span
                        className={`font-medium ${
                          remaining > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {remaining > 0 ? remaining : 0}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700">
                      <span className="text-zinc-600 dark:text-zinc-400">Belopp (nu):</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {formatSwedishAmount(status.currentPeriodAmount)} kr
                      </span>
                    </div>
                    {status.previousPeriodCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Belopp (förra):</span>
                        <span className="font-medium text-zinc-600 dark:text-zinc-400">
                          {formatSwedishAmount(status.previousPeriodAmount)} kr
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
