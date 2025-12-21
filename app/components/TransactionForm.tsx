"use client";

import { useState, useEffect } from "react";
import { Account, BankEvent, Post, BookingTemplate } from "../types";
import { getAccounts, createTransaction, isPeriodLocked, getBookingTemplates, createBookingTemplate } from "../actions";

interface TransactionFormProps {
  bankEvent?: BankEvent;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionForm({
  bankEvent,
  onClose,
  onSuccess,
}: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<BookingTemplate[]>([]);
  const [date, setDate] = useState(
    bankEvent?.date || new Date()
  );
  const [description, setDescription] = useState(bankEvent?.description || "");
  const [posts, setPosts] = useState<Omit<Post, "id" | "transactionId">[]>([
    {
      accountId: 0,
      debet: bankEvent && bankEvent.amount > 0 ? bankEvent.amount : 0,
      kredit: bankEvent && bankEvent.amount < 0 ? -bankEvent.amount : 0,
      description: "",
    },
    {
      accountId: 0,
      debet: bankEvent && bankEvent.amount < 0 ? -bankEvent.amount : 0,
      kredit: bankEvent && bankEvent.amount > 0 ? bankEvent.amount : 0,
      description: "",
    },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [periodLockWarning, setPeriodLockWarning] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    async function loadData() {
      const [accountsData, templatesData] = await Promise.all([
        getAccounts(),
        getBookingTemplates(),
      ]);
      setAccounts(accountsData);
      setTemplates(templatesData);
    }
    loadData();
  }, []);

  useEffect(() => {
    async function checkPeriodLock() {
      const isLocked = await isPeriodLocked(date);
      if (isLocked) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        setPeriodLockWarning(
          `Perioden ${year}-${String(month).padStart(2, "0")} är låst. Du kan inte spara transaktioner i denna period.`
        );
      } else {
        setPeriodLockWarning("");
      }
    }
    checkPeriodLock();
  }, [date]);

  const totalDebet = posts.reduce((sum, post) => sum + post.debet, 0);
  const totalKredit = posts.reduce((sum, post) => sum + post.kredit, 0);
  const difference = totalDebet - totalKredit;
  const isBalanced = Math.abs(difference) < 0.01; // Allow small floating point errors

  const updatePost = (
    index: number,
    field: keyof Omit<Post, "id" | "transactionId">,
    value: number | string
  ) => {
    const newPosts = [...posts];
    const currentPost = newPosts[index];

    // Validation: When updating debit or credit, clear the other field if both would have values
    if (field === "debet" && typeof value === "number") {
      if (value > 0 && currentPost.kredit > 0) {
        newPosts[index] = { ...currentPost, debet: value, kredit: 0 };
      } else {
        newPosts[index] = { ...currentPost, debet: value };
      }
    } else if (field === "kredit" && typeof value === "number") {
      if (value > 0 && currentPost.debet > 0) {
        newPosts[index] = { ...currentPost, kredit: value, debet: 0 };
      } else {
        newPosts[index] = { ...currentPost, kredit: value };
      }
    } else {
      newPosts[index] = { ...currentPost, [field]: value };
    }

    setPosts(newPosts);
  };

  const loadTemplate = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Template loads account structure using isDebet flag to determine which side
    // If there's a bank event, we can pre-fill the amounts based on the template structure
    const newPosts = template.rows.map((row) => {
      // Use isDebet flag from template to set up the correct side
      if (bankEvent) {
        // For bank events, put the amount on the correct side based on template
        const amount = Math.abs(bankEvent.amount);
        return {
          accountId: row.accountId,
          debet: row.isDebet ? amount : 0,
          kredit: !row.isDebet ? amount : 0,
          description: row.description || "",
          transactionId: 0,
        };
      } else {
        // For manual transactions, just set up the structure with 0s
        // User will fill in amounts, but at least accounts are set
        return {
          accountId: row.accountId,
          debet: 0,
          kredit: 0,
          description: row.description || "",
          transactionId: 0,
        };
      }
    });

    setPosts(newPosts);
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      setError("Mallnamn måste anges");
      return;
    }

    if (posts.some((p) => p.accountId === 0)) {
      setError("Alla poster måste ha ett konto innan mall kan sparas");
      return;
    }

    try {
      const templateRows = posts.map((post) => ({
        accountId: post.accountId,
        isDebet: post.debet > 0,
        description: post.description,
      }));

      await createBookingTemplate(templateName, templateRows);

      // Reload templates
      const templatesData = await getBookingTemplates();
      setTemplates(templatesData);

      setShowSaveTemplate(false);
      setTemplateName("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara mall");
    }
  };

  const addPost = () => {
    setPosts([
      ...posts,
      {
        accountId: 0,
        debet: 0,
        kredit: 0,
        description: "",
      },
    ]);
  };

  const removePost = (index: number) => {
    if (posts.length > 2) {
      setPosts(posts.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isBalanced) {
      setError("Posterna måste summera till noll!");
      return;
    }

    if (posts.some((p) => p.accountId === 0)) {
      setError("Alla poster måste ha ett konto!");
      return;
    }

    setLoading(true);

    try {
      await createTransaction({
        date,
        description,
        bankEventId: bankEvent?.id,
        posts: posts.map((p) => ({
          ...p,
          transactionId: 0, // Will be set by server
        })),
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {bankEvent ? "Bokför transaktion" : "Ny transaktion"}
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
          {bankEvent && (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Bankhändelse: {bankEvent.description} (
              {bankEvent.amount.toLocaleString("sv-SE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              )
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {periodLockWarning && (
            <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
              ⚠️ {periodLockWarning}
            </div>
          )}

          {templates.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Använd bokföringsmall
              </label>
              <select
                onChange={(e) => loadTemplate(parseInt(e.target.value))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value="">Välj mall...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.namn}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={date.toISOString().split("T")[0]}
                onChange={(e) => setDate(new Date(e.target.value))}
                required
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Beskrivning
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Poster
              </label>
              <button
                type="button"
                onClick={addPost}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                + Lägg till post
              </button>
            </div>

            <div className="space-y-3">
              {posts.map((post, index) => (
                <div
                  key={index}
                  className="flex gap-3 items-start border border-zinc-200 dark:border-zinc-700 rounded-md p-3"
                >
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Konto
                    </label>
                    <select
                      value={post.accountId}
                      onChange={(e) =>
                        updatePost(index, "accountId", parseInt(e.target.value))
                      }
                      required
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    >
                      <option value={0}>Välj konto...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.namn} ({account.group?.namn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Debet
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={post.debet || ""}
                      onChange={(e) =>
                        updatePost(index, "debet", e.target.value === "" ? 0 : parseFloat(e.target.value))
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  <div className="w-32">
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Kredit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={post.kredit || ""}
                      onChange={(e) =>
                        updatePost(index, "kredit", e.target.value === "" ? 0 : parseFloat(e.target.value))
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Beskrivning (valfri)
                    </label>
                    <input
                      type="text"
                      value={post.description}
                      onChange={(e) =>
                        updatePost(index, "description", e.target.value)
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  {posts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePost(index)}
                      className="mt-6 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Debet: {totalDebet.toLocaleString("sv-SE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Kredit: {totalKredit.toLocaleString("sv-SE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <span
                className={`font-medium tabular-nums ${
                  isBalanced
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {isBalanced
                  ? "Balanserad ✓"
                  : `Skillnad: ${difference.toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} kr`}
              </span>
            </div>
          </div>

          {showSaveTemplate && (
            <div className="mb-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-900">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Mallnamn
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="T.ex. Hyra, Lön, etc."
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
                <button
                  type="button"
                  onClick={saveAsTemplate}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Spara mall
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveTemplate(false);
                    setTemplateName("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              disabled={loading}
            >
              {showSaveTemplate ? "Dölj" : "Spara som mall"}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                disabled={loading}
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={!isBalanced || loading || !!periodLockWarning}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Sparar..." : "Spara transaktion"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
