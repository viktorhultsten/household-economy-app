"use client";

import { useState, useEffect } from "react";
import { RecurringItem } from "../types";
import { getRecurringItems, createRecurringItem, updateRecurringItem, deleteRecurringItem, getRecurringItemMonthlyOverview } from "../actions";
import ConfirmModal from "../components/ConfirmModal";

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "Maj" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Okt" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

export default function UpprepningarPage() {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemExpected, setNewItemExpected] = useState(1);
  const [newItemMonths, setNewItemMonths] = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12]);
  const [editName, setEditName] = useState("");
  const [editExpected, setEditExpected] = useState(1);
  const [editMonths, setEditMonths] = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyOverviews, setMonthlyOverviews] = useState<Map<number, Map<number, number>>>(new Map());

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      loadMonthlyOverviews();
    }
  }, [items, selectedYear]);

  async function loadItems() {
    setLoading(true);
    const data = await getRecurringItems();
    setItems(data);
    setLoading(false);
  }

  async function loadMonthlyOverviews() {
    const overviews = new Map<number, Map<number, number>>();

    for (const item of items) {
      const monthlyData = await getRecurringItemMonthlyOverview(item.id, selectedYear);
      const monthMap = new Map<number, number>();
      monthlyData.forEach(({ month, count }) => {
        monthMap.set(month, count);
      });
      overviews.set(item.id, monthMap);
    }

    setMonthlyOverviews(overviews);
  }

  async function handleAdd() {
    if (!newItemName.trim()) {
      setError("Namn måste anges");
      return;
    }

    if (newItemExpected < 1) {
      setError("Förväntat antal måste vara minst 1");
      return;
    }

    if (newItemMonths.length === 0) {
      setError("Minst en månad måste väljas");
      return;
    }

    try {
      await createRecurringItem(newItemName, newItemExpected, newItemMonths);
      setNewItemName("");
      setNewItemExpected(1);
      setNewItemMonths([1,2,3,4,5,6,7,8,9,10,11,12]);
      setShowAddForm(false);
      setError("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte lägga till post");
    }
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) {
      setError("Namn måste anges");
      return;
    }

    if (editExpected < 1) {
      setError("Förväntat antal måste vara minst 1");
      return;
    }

    if (editMonths.length === 0) {
      setError("Minst en månad måste väljas");
      return;
    }

    try {
      await updateRecurringItem(id, editName, editExpected, editMonths);
      setEditingId(null);
      setError("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte uppdatera post");
    }
  }

  async function handleDelete(id: number) {
    setConfirmAction({
      title: "Ta bort återkommande post",
      message: "Är du säker på att du vill ta bort denna återkommande post?",
      onConfirm: async () => {
        try {
          await deleteRecurringItem(id);
          await loadItems();
          setConfirmAction(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Kunde inte ta bort post");
          setConfirmAction(null);
        }
      },
    });
  }

  function startEdit(item: RecurringItem) {
    setEditingId(item.id);
    setEditName(item.namn);
    setEditExpected(item.expectedPerMonth);
    setEditMonths(item.activeMonths);
  }

  function toggleMonth(month: number, isEdit: boolean) {
    if (isEdit) {
      setEditMonths((prev) =>
        prev.includes(month)
          ? prev.filter((m) => m !== month)
          : [...prev, month].sort((a, b) => a - b)
      );
    } else {
      setNewItemMonths((prev) =>
        prev.includes(month)
          ? prev.filter((m) => m !== month)
          : [...prev, month].sort((a, b) => a - b)
      );
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
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Återkommande
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                År:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Lägg till
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="mb-6 rounded-lg bg-white shadow dark:bg-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Lägg till återkommande post
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Namn
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="T.ex. Hyra, Djurförsäkring"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Förväntat antal per månad
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItemExpected || ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : parseInt(e.target.value);
                    setNewItemExpected(val as number);
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "" || parseInt(e.target.value) < 1) {
                      setNewItemExpected(1);
                    }
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Aktiva månader
                </label>
                <div className="flex flex-wrap gap-2">
                  {MONTHS.map((month) => (
                    <button
                      key={month.value}
                      type="button"
                      onClick={() => toggleMonth(month.value, false)}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                        newItemMonths.includes(month.value)
                          ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                          : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
                      }`}
                    >
                      {month.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Spara
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItemName("");
                    setNewItemExpected(1);
                    setError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga återkommande poster ännu. Klicka på "Lägg till" för att skapa en.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Namn
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Förväntat per månad
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Aktiva månader ({selectedYear})
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    {editingId === item.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="1"
                            value={editExpected || ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : parseInt(e.target.value);
                              setEditExpected(val as number);
                            }}
                            onBlur={(e) => {
                              if (e.target.value === "" || parseInt(e.target.value) < 1) {
                                setEditExpected(1);
                              }
                            }}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 text-center"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {MONTHS.map((month) => (
                              <button
                                key={month.value}
                                type="button"
                                onClick={() => toggleMonth(month.value, true)}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                  editMonths.includes(month.value)
                                    ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                                    : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
                                }`}
                              >
                                {month.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleUpdate(item.id)}
                            className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 mr-3"
                          >
                            Spara
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setError("");
                            }}
                            className="text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-300"
                          >
                            Avbryt
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {item.namn}
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-zinc-600 dark:text-zinc-400">
                          {item.expectedPerMonth}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex flex-wrap gap-1">
                            {item.activeMonths.sort((a, b) => a - b).map((monthNum) => {
                              const month = MONTHS.find((m) => m.value === monthNum);
                              const itemMonthData = monthlyOverviews.get(item.id);
                              const count = itemMonthData?.get(monthNum) || 0;
                              const expected = item.expectedPerMonth;

                              return (
                                <span
                                  key={monthNum}
                                  className="px-2 py-1 text-xs rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1"
                                  title={`${month?.label}: ${count}/${expected} transaktioner`}
                                >
                                  <span>{month?.label}</span>
                                  <span className="flex items-center gap-0.5">
                                    {[...Array(expected)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                                          i < count
                                            ? 'bg-green-600 dark:bg-green-400'
                                            : 'bg-zinc-300 dark:bg-zinc-600'
                                        }`}
                                      />
                                    ))}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 mr-3"
                          >
                            Redigera
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Ta bort
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
