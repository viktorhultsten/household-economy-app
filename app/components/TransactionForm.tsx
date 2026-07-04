"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Account, BankEvent, Post, BookingTemplate, RecurringItemStatus, Transaction } from "../types";
import { getAccounts, createTransaction, updateTransaction, isPeriodLocked, getBookingTemplates, createBookingTemplate, getRecurringItemsStatus, linkTransactionToRecurringItem, getRecurringItemForTransaction, updateTransactionRecurringItemLink, getKonteringsforslag, KonteringsforslagMonster } from "../actions";
import AccountSelectorModal from "./AccountSelectorModal";
import ConfirmModal from "./ConfirmModal";
import KonteringsforslagCard from "./KonteringsforslagCard";

type PostInput = Omit<Post, "id" | "transactionId">;

// Serialize the editable state so we can detect unsaved changes (dirty state)
function serializeFormState(
  date: Date,
  description: string,
  posts: PostInput[],
  recurringItemId: number | null
) {
  return JSON.stringify({
    date: date.toISOString().slice(0, 10),
    description,
    posts: posts.map((p) => ({
      accountId: p.accountId,
      debet: p.debet,
      kredit: p.kredit,
      description: p.description || "",
    })),
    recurringItemId,
  });
}

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
  const [recurringLoaded, setRecurringLoaded] = useState(false);
  const [selectedRecurringItemId, setSelectedRecurringItemId] = useState<number | null>(null);

  const initialDate = transaction?.date || bankEvent?.date || new Date();
  const initialDescription = transaction?.description || bankEvent?.description || "";
  const initialPosts = useMemo<PostInput[]>(() => {
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
  }, [bankEvent, transaction]);

  const [date, setDate] = useState(initialDate);
  const [description, setDescription] = useState(initialDescription);
  const [posts, setPosts] = useState<PostInput[]>(initialPosts);
  // Baseline snapshot for dirty detection; updated once async edit data loads
  const [baseline, setBaseline] = useState(() =>
    serializeFormState(initialDate, initialDescription, initialPosts, null)
  );
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [periodLockWarning, setPeriodLockWarning] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);

  // Store raw input strings for debit/credit fields to allow typing commas
  const [debetInputs, setDebetInputs] = useState<{ [key: number]: string }>({});
  const [kreditInputs, setKreditInputs] = useState<{ [key: number]: string }>({});

  const [forslag, setForslag] = useState<KonteringsforslagMonster[]>([]);
  const [forslagLoaded, setForslagLoaded] = useState(false);
  const [forslagDismissed, setForslagDismissed] = useState(false);

  useEffect(() => {
    async function loadData() {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const [accountsData, templatesData, recurringItemsData] = await Promise.all([
        getAccounts(),
        getBookingTemplates(),
        getRecurringItemsStatus(year, month),
      ]);
      setAccounts(accountsData);
      setTemplates(templatesData);
      setRecurringItems(recurringItemsData);
      setRecurringLoaded(true);

      // If editing, load the existing recurring item link
      if (isEditing && transaction) {
        const existingRecurringItemId = await getRecurringItemForTransaction(transaction.id);
        setSelectedRecurringItemId(existingRecurringItemId);
        // Re-baseline so a pre-existing recurring link isn't counted as an unsaved change
        setBaseline(
          serializeFormState(initialDate, initialDescription, initialPosts, existingRecurringItemId)
        );
      }
    }
    loadData();
  }, [date, isEditing, transaction]);

  // Fetch konteringsförslag when creating a new transaction from a bank event
  useEffect(() => {
    if (isEditing || !bankEvent) return;
    setForslagDismissed(false);
    setForslag([]);
    setForslagLoaded(false);
    getKonteringsforslag(bankEvent.description, bankEvent.amount, bankEvent.date).then(
      (results) => {
        setForslag(results);
        setForslagLoaded(true);
      }
    );
  }, [bankEvent, isEditing]);

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

  // Lock background scroll while the full-screen view is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Trap Tab focus within the view so the background page can't be reached
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", handleTab);
    return () => container.removeEventListener("keydown", handleTab);
  }, []);

  const totalDebet = posts.reduce((sum, post) => sum + post.debet, 0);
  const totalKredit = posts.reduce((sum, post) => sum + post.kredit, 0);
  const difference = totalDebet - totalKredit;
  const isBalanced = Math.abs(difference) < 0.01; // Allow small floating point errors

  // When booking from a bank event, the balanced total must equal the bank
  // event's amount (UI-only check, see docs/adr/0005). Prevents e.g. booking a
  // 500 kr purchase as 120 kr.
  const bankEventAmount = transactionBankEvent
    ? Math.abs(transactionBankEvent.amount)
    : null;
  const amountMatchesBankEvent =
    bankEventAmount === null || Math.abs(totalDebet - bankEventAmount) < 0.01;

  // Every row that carries an amount must have an account selected.
  const allAmountRowsHaveAccount = posts.every(
    (post) => (post.debet === 0 && post.kredit === 0) || post.accountId !== 0
  );

  const isDirty =
    serializeFormState(date, description, posts, selectedRecurringItemId) !== baseline;

  const attemptClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Cmd/Ctrl+Enter saves; Escape asks before closing when there are changes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Let nested modals own their own keys
      if (showCloseConfirm || showAccountSelector !== null) return;
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCloseConfirm, showAccountSelector, isDirty, onClose]);

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

  const applyForslag = (f: KonteringsforslagMonster) => {
    const newPosts = f.rader.map((r) => ({
      accountId: r.accountId,
      debet: r.isDebet ? r.amount : 0,
      kredit: r.isDebet ? 0 : r.amount,
      description: "",
    }));
    setPosts(newPosts);
    if (f.recurringItem) {
      setSelectedRecurringItemId(f.recurringItem.id);
    }
    setForslagDismissed(true);
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

    if (bankEventAmount !== null && !amountMatchesBankEvent) {
      setError(
        `Summan (${totalDebet.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kr) måste stämma med bankhändelsens belopp (${bankEventAmount.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kr)!`
      );
      return;
    }

    if (posts.some((p) => p.accountId === 0)) {
      setError("Alla poster måste ha ett konto!");
      return;
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
    <div ref={containerRef} className="fixed inset-0 z-50 flex bg-white dark:bg-zinc-900">
      <div className="w-full flex overflow-hidden">
        {/* Main Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {isEditing ? "Redigera transaktion" : transactionBankEvent ? "Bokför transaktion" : "Ny transaktion"}
            </h2>
            <button
              onClick={attemptClose}
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

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

          {/* Konteringsförslag — reserved-height slot so nothing jumps while loading */}
          {!isEditing && bankEvent && !forslagDismissed && (
            <div className="mb-4">
              {!forslagLoaded ? (
                <div className="flex gap-3">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-28 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 animate-pulse"
                    >
                      <div className="mb-3 h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                      <div className="mb-2 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
                      <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
                    </div>
                  ))}
                </div>
              ) : forslag.length === 0 ? (
                <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Hittade inga konteringsförslag.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Konteringsförslag
                    </p>
                    <button
                      type="button"
                      onClick={() => setForslagDismissed(true)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-lg leading-none"
                      aria-label="Stäng förslag"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {forslag.map((f) => (
                      <div key={f.monsterNyckel} className="flex-1 min-w-[14rem]">
                        <KonteringsforslagCard
                          forslag={f}
                          currentDescription={bankEvent?.description}
                          onApply={() => applyForslag(f)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                lang="sv-SE"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Transaktionsbeskrivning
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


          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Poster
              </label>
              <button
                type="button"
                onClick={addPost}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Lägg till post
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
                      onFocus={(e) => e.target.select()}
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
                      onFocus={(e) => e.target.select()}
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

            {bankEventAmount !== null && isBalanced && !amountMatchesBankEvent && (
              <div className="mt-2 rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                Summan ({totalDebet.toLocaleString("sv-SE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kr) stämmer inte med bankhändelsens belopp ({bankEventAmount.toLocaleString("sv-SE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kr).
              </div>
            )}
          </div>
          </div>

          {/* Sammanfattningssektion — alltid längst ner */}
          <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-6 py-4 space-y-4">
          {showSaveTemplate && (
            <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-900">
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

          <div className="flex gap-3 justify-between">
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
                onClick={attemptClose}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                disabled={loading}
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={!isBalanced || loading || !!periodLockWarning || !amountMatchesBankEvent || !allAmountRowsHaveAccount}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Sparar..." : isEditing ? "Uppdatera" : "Spara transaktion"}
              </button>
            </div>
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
          </div>
          {!recurringLoaded ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 animate-pulse"
                >
                  <div className="mb-3 h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          ) : recurringItems.length === 0 ? (
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
              {[...recurringItems].sort((a, b) => Number(a.isComplete) - Number(b.isComplete)).map((item) => (
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
                  {item.recentUsages.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Senaste
                      </div>
                      {item.recentUsages.map((usage) => (
                        <div
                          key={usage.transactionId}
                          className="flex items-baseline justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                        >
                          <span className="tabular-nums shrink-0 text-zinc-500 dark:text-zinc-500">
                            {usage.date.toLocaleDateString("sv-SE")}
                          </span>
                          <span className="truncate flex-1 min-w-0">
                            {usage.description}
                          </span>
                          <span className="tabular-nums shrink-0 font-medium">
                            {usage.amount.toLocaleString("sv-SE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} kr
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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

      {showCloseConfirm && (
        <ConfirmModal
          title="Kasta osparade ändringar?"
          message="Du har ändringar som inte sparats. Vill du stänga utan att spara?"
          confirmText="Stäng utan att spara"
          cancelText="Fortsätt redigera"
          variant="warning"
          onConfirm={() => {
            setShowCloseConfirm(false);
            onClose();
          }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  );
}
