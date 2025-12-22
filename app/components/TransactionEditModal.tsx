"use client";

import { useState, useEffect } from "react";
import { Transaction, Account } from "../types";
import { getAccounts, updateTransaction } from "../actions";

interface TransactionEditModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransactionEditModal({
  transaction,
  onClose,
  onSuccess,
}: TransactionEditModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [posts, setPosts] = useState<
    Array<{
      id?: number;
      accountId: number;
      debet: number;
      kredit: number;
      description: string;
    }>
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
    initializeForm();
  }, [transaction]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  async function loadAccounts() {
    const data = await getAccounts();
    setAccounts(data);
  }

  function initializeForm() {
    // Format date as YYYY-MM-DD for input
    const dateStr = transaction.date.toISOString().split("T")[0];
    setDate(dateStr);
    setDescription(transaction.description);
    setPosts(
      transaction.posts.map((post) => ({
        id: post.id,
        accountId: post.accountId,
        debet: post.debet,
        kredit: post.kredit,
        description: post.description || "",
      }))
    );
  }

  function calculateBalance(): { totalDebet: number; totalKredit: number; difference: number } {
    const totalDebet = posts.reduce((sum, post) => sum + post.debet, 0);
    const totalKredit = posts.reduce((sum, post) => sum + post.kredit, 0);
    return {
      totalDebet,
      totalKredit,
      difference: totalDebet - totalKredit,
    };
  }

  function addPost() {
    setPosts([...posts, { accountId: 0, debet: 0, kredit: 0, description: "" }]);
  }

  function removePost(index: number) {
    setPosts(posts.filter((_, i) => i !== index));
  }

  function updatePost(
    index: number,
    field: "accountId" | "debet" | "kredit" | "description",
    value: number | string
  ) {
    const updated = [...posts];
    if (field === "accountId") {
      updated[index].accountId = value as number;
    } else if (field === "debet") {
      updated[index].debet = value as number;
    } else if (field === "kredit") {
      updated[index].kredit = value as number;
    } else {
      updated[index].description = value as string;
    }
    setPosts(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!date || !description) {
      setError("Datum och beskrivning krävs");
      return;
    }

    if (posts.length < 2) {
      setError("Minst två posteringar krävs");
      return;
    }

    if (posts.some((p) => p.accountId === 0)) {
      setError("Alla posteringar måste ha ett konto");
      return;
    }

    const { difference } = calculateBalance();
    if (Math.abs(difference) > 0.001) {
      setError(`Posteringarna balanserar inte (skillnad: ${formatSwedishAmount(difference)} kr)`);
      return;
    }

    setLoading(true);

    try {
      await updateTransaction(transaction.id, {
        date: new Date(date),
        description,
        posts,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setLoading(false);
    }
  }

  const { totalDebet, totalKredit, difference } = calculateBalance();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-lg bg-white dark:bg-zinc-800 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Redigera transaktion
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Datum
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Beskrivning
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Posteringar
              </h3>
              <button
                type="button"
                onClick={addPost}
                className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                + Lägg till postering
              </button>
            </div>

            <div className="space-y-3">
              {posts.map((post, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-start p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                >
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Konto
                    </label>
                    <select
                      value={post.accountId}
                      onChange={(e) =>
                        updatePost(index, "accountId", parseInt(e.target.value))
                      }
                      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                      required
                    >
                      <option value={0}>Välj konto...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.namn} ({account.group?.namn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Debet (kr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={post.debet}
                      onChange={(e) =>
                        updatePost(index, "debet", parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Kredit (kr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={post.kredit}
                      onChange={(e) =>
                        updatePost(index, "kredit", parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Beskrivning (valfri)
                    </label>
                    <input
                      type="text"
                      value={post.description}
                      onChange={(e) => updatePost(index, "description", e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removePost(index)}
                      className="w-full rounded-md bg-red-600 px-2 py-1.5 text-sm font-semibold text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                      disabled={posts.length <= 2}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Total Debet:
                </span>
                <span className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatSwedishAmount(totalDebet)} kr
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Total Kredit:
                </span>
                <span className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatSwedishAmount(totalKredit)} kr
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-300 dark:border-zinc-700">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Balans:
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    Math.abs(difference) < 0.001
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {Math.abs(difference) < 0.001 ? "Balanserad ✓" : `Skillnad: ${formatSwedishAmount(difference)} kr`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-700"
              disabled={loading}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50"
              disabled={loading || Math.abs(difference) > 0.001}
            >
              {loading ? "Sparar..." : "Spara ändringar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
