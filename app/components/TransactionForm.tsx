"use client";

import { useState, useEffect } from "react";
import { Account, BankEvent, Post, BookingTemplate, RecurringItemStatus, Transaction } from "../types";
import { getAccounts, createTransaction, updateTransaction, isPeriodLocked, getBookingTemplates, createBookingTemplate, getRecurringItemsStatus, linkTransactionToRecurringItem, getRecurringItemForTransaction, updateTransactionRecurringItemLink } from "../actions";
import AccountSelectorModal from "./AccountSelectorModal";

interface TransactionFormProps {
  bankEvent?: BankEvent;
  transaction?: Transaction; // If provided, we're editing
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionForm({
  bankEvent,
  transaction,
  onClose,
  onSuccess,
}: TransactionFormProps) {
  const isEditing = !!transaction;
  const transactionBankEvent = transaction?.bankEvent || bankEvent;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<BookingTemplate[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItemStatus[]>([]);
  const [selectedRecurringItemId, setSelectedRecurringItemId] = useState<number | null>(null);
  const [date, setDate] = useState(
    transaction?.date || bankEvent?.date || new Date()
  );
  const [description, setDescription] = useState(
    transaction?.description || bankEvent?.description || ""
  );
  const [posts, setPosts] = useState<Omit<Post, "id" | "transactionId">[]>(() => {
    // If editing, use existing posts
    if (transaction) {
      return transaction.posts.map((post) => ({
        accountId: post.accountId,
        debet: Number(post.debet) || 0,
        kredit: Number(post.kredit) || 0,
        description: post.description || "",
      }));
    }

    // If bankEvent has an import with an accountId, preset the appropriate row
    const importAccountId = bankEvent?.import?.accountId || 0;

    // The tillgång row should always be on top
    // If amount is positive: tillgång gets debet (first row)
    // If amount is negative: tillgång gets kredit (still first row)
    return [
      {
        // First row: always the tillgång account
        accountId: importAccountId,
        debet: bankEvent && bankEvent.amount > 0 ? bankEvent.amount : 0,
        kredit: bankEvent && bankEvent.amount < 0 ? -bankEvent.amount : 0,
        description: "",
      },
      {
        // Second row: the opposing account
        accountId: 0,
        debet: bankEvent && bankEvent.amount < 0 ? -bankEvent.amount : 0,
        kredit: bankEvent && bankEvent.amount > 0 ? bankEvent.amount : 0,
        description: "",
      },
    ];
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [periodLockWarning, setPeriodLockWarning] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);

  // Store raw input strings for debit/credit fields to allow typing commas
  const [debetInputs, setDebetInputs] = useState<{ [key: number]: string }>({});
  const [kreditInputs, setKreditInputs] = useState<{ [key: number]: string }>({});

  // Period shift state - initialize from transaction if editing
  const [enablePeriodShift, setEnablePeriodShift] = useState(!!transaction?.periodShiftDate);
  const [periodShiftDate, setPeriodShiftDate] = useState<Date | null>(
    transaction?.periodShiftDate || null
  );
  const [periodShiftLockWarning, setPeriodShiftLockWarning] = useState("");

  useEffect(() => {
    async function loadData() {
      // Use period shift date for recurring items if enabled, otherwise use the transaction date
      const effectiveDate = enablePeriodShift && periodShiftDate ? periodShiftDate : date;
      const year = effectiveDate.getFullYear();
      const month = effectiveDate.getMonth() + 1;
      const [accountsData, templatesData, recurringItemsData] = await Promise.all([
        getAccounts(),
        getBookingTemplates(),
        getRecurringItemsStatus(year, month),
      ]);
      setAccounts(accountsData);
      setTemplates(templatesData);
      setRecurringItems(recurringItemsData);

      // If editing, load the existing recurring item link
      if (isEditing && transaction) {
        const existingRecurringItemId = await getRecurringItemForTransaction(transaction.id);
        setSelectedRecurringItemId(existingRecurringItemId);
      }
    }
    loadData();
  }, [date, enablePeriodShift, periodShiftDate, isEditing, transaction]);

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

  useEffect(() => {
    async function checkPeriodShiftLock() {
      if (!enablePeriodShift || !periodShiftDate) {
        setPeriodShiftLockWarning("");
        return;
      }

      const isLocked = await isPeriodLocked(periodShiftDate);
      if (isLocked) {
        const year = periodShiftDate.getFullYear();
        const month = periodShiftDate.getMonth() + 1;
        setPeriodShiftLockWarning(
          `Periodförskjutningen kan inte sparas: Perioden ${year}-${String(month).padStart(2, "0")} är låst.`
        );
      } else {
        setPeriodShiftLockWarning("");
      }
    }
    checkPeriodShiftLock();
  }, [enablePeriodShift, periodShiftDate]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

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
        // Template structure stays the same regardless of positive/negative amount
        // The sign of the amount determines which "type" of transaction it is
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

    if (enablePeriodShift) {
      if (!periodShiftDate) {
        setError("Bokföringsdatum för periodförskjutning måste anges!");
        return;
      }
      if (periodShiftLockWarning) {
        setError("Periodförskjutningen kan inte sparas - målperioden är låst!");
        return;
      }
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Update existing transaction
        await updateTransaction(transaction!.id, {
          date,
          description,
          posts: posts.map((p) => ({
            accountId: p.accountId,
            debet: p.debet,
            kredit: p.kredit,
            description: p.description,
          })),
        });

        // Update recurring item link
        await updateTransactionRecurringItemLink(transaction!.id, selectedRecurringItemId);
      } else {
        // Create new transaction
        const transactionId = await createTransaction({
          date,
          description,
          bankEventId: bankEvent?.id,
          posts: posts.map((p) => ({
            ...p,
            id: 0, // Will be set by server
            transactionId: 0, // Will be set by server
          })),
          periodShiftDate: enablePeriodShift ? periodShiftDate! : undefined,
        });

        // Link to recurring item if selected
        if (selectedRecurringItemId) {
          await linkTransactionToRecurringItem(transactionId, selectedRecurringItemId);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex overflow-hidden">
        {/* Main Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Redigera transaktion" : transactionBankEvent ? "Bokför transaktion" : "Ny transaktion"}
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
          {transactionBankEvent && (
            <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Bankhändelse:
              </div>
              <div className="text-sm text-zinc-900 dark:text-zinc-50 font-medium">
                {transactionBankEvent.description}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {transactionBankEvent.amount.toLocaleString("sv-SE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                kr
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
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
                Transaktionsbeskrivning
                {bankEvent && (
                  <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    (Redigera vid behov)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder={bankEvent ? "Redigera beskrivning..." : "Beskrivning..."}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>
          </div>

          {/* Period Shift Section */}
          {transactionBankEvent && !isEditing && (
            <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="enable-period-shift"
                  checked={enablePeriodShift}
                  onChange={(e) => {
                    setEnablePeriodShift(e.target.checked);
                    if (!e.target.checked) {
                      setPeriodShiftDate(null);
                      setPeriodShiftLockWarning("");
                    }
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                <label htmlFor="enable-period-shift" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Periodförskjutning (flytta till annan bokföringsperiod)
                </label>
              </div>

              {enablePeriodShift && (
                <>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                    Skapar två separata transaktioner: en för bankhändelsen (idag) och en för rätt bokföringsperiod.
                    Du behöver själv skapa konteringsposterna som kopplar dessa samman.
                  </p>

                  {periodShiftLockWarning && (
                    <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                      ⚠️ {periodShiftLockWarning}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Bokföringsdatum (rätt period)
                    </label>
                    <input
                      type="date"
                      value={periodShiftDate?.toISOString().split("T")[0] || ""}
                      onChange={(e) => setPeriodShiftDate(e.target.value ? new Date(e.target.value) : null)}
                      required={enablePeriodShift}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>
                </>
              )}
            </div>
          )}

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
                    <button
                      type="button"
                      onClick={() => setShowAccountSelector(index)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-left text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                    >
                      {post.accountId === 0
                        ? "Välj konto..."
                        : accounts.find((a) => a.id === post.accountId)?.namn ||
                          "Välj konto..."}
                    </button>
                  </div>

                  <div className="w-32">
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Debet
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={debetInputs[index] ?? (post.debet > 0 ? String(post.debet).replace('.', ',') : "")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '');
                        // Only update if it's a valid number format (allows comma or dot)
                        if (value === "" || /^[0-9]*[,.]?[0-9]*$/.test(value)) {
                          // Store the raw input
                          setDebetInputs({ ...debetInputs, [index]: value });
                          // Parse and update the post
                          const numValue = value === "" ? 0 : parseFloat(value.replace(',', '.')) || 0;
                          updatePost(index, "debet", numValue);
                        }
                      }}
                      onBlur={() => {
                        // Clear the input string on blur to show formatted value
                        const newInputs = { ...debetInputs };
                        delete newInputs[index];
                        setDebetInputs(newInputs);
                      }}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>

                  <div className="w-32">
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Kredit
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={kreditInputs[index] ?? (post.kredit > 0 ? String(post.kredit).replace('.', ',') : "")}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '');
                        // Only update if it's a valid number format (allows comma or dot)
                        if (value === "" || /^[0-9]*[,.]?[0-9]*$/.test(value)) {
                          // Store the raw input
                          setKreditInputs({ ...kreditInputs, [index]: value });
                          // Parse and update the post
                          const numValue = value === "" ? 0 : parseFloat(value.replace(',', '.')) || 0;
                          updatePost(index, "kredit", numValue);
                        }
                      }}
                      onBlur={() => {
                        // Clear the input string on blur to show formatted value
                        const newInputs = { ...kreditInputs };
                        delete newInputs[index];
                        setKreditInputs(newInputs);
                      }}
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
                {loading ? "Sparar..." : isEditing ? "Uppdatera" : "Spara transaktion"}
              </button>
            </div>
          </div>
        </form>
        </div>

        {/* Recurring Items Sidebar */}
        <div className="w-80 border-l border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Återkommande
            </h3>
            {enablePeriodShift && periodShiftDate && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Visar för period: {periodShiftDate.toLocaleDateString("sv-SE", { year: "numeric", month: "long" })}
              </p>
            )}
          </div>
          {recurringItems.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
              Inga återkommande transaktioner för denna månad.{" "}
              <span className="block mt-2 text-xs">
                Skapa återkommande poster på{" "}
                <a href="/recurring" className="underline hover:text-zinc-900 dark:hover:text-zinc-50">
                  Återkommande
                </a>{" "}
                sidan.
              </span>
            </p>
          ) : (
            <div className="space-y-2">
              {recurringItems.map((item) => (
                <button
                  key={item.recurringItem.id}
                  type="button"
                  onClick={() => setSelectedRecurringItemId(
                    selectedRecurringItemId === item.recurringItem.id
                      ? null
                      : item.recurringItem.id
                  )}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedRecurringItemId === item.recurringItem.id
                      ? "border-zinc-900 dark:border-zinc-50 bg-zinc-100 dark:bg-zinc-800"
                      : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                      {item.recurringItem.namn}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.isComplete
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    }`}>
                      {item.currentPeriodCount}/{item.recurringItem.expectedPerMonth}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Denna månad:</span>
                      <span className="font-medium tabular-nums">
                        {item.currentPeriodAmount.toLocaleString("sv-SE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} kr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Förra månaden:</span>
                      <span className="font-medium tabular-nums">
                        {item.previousPeriodAmount.toLocaleString("sv-SE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} kr
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAccountSelector !== null && (
        <AccountSelectorModal
          accounts={accounts}
          selectedAccountId={posts[showAccountSelector]?.accountId || 0}
          onSelect={(accountId) => {
            updatePost(showAccountSelector, "accountId", accountId);
            setShowAccountSelector(null);
          }}
          onClose={() => setShowAccountSelector(null)}
        />
      )}
    </div>
  );
}
