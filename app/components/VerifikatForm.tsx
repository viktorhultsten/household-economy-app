"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Account, BankEvent, Post, BookingTemplate, RecurringItemStatus, Verifikat } from "../types";
import { getAccounts, createVerifikat, updateVerifikat, isPeriodLocked, getBookingTemplates, createBookingTemplate, getRecurringItemsStatus, linkVerifikatToRecurringItem, getRecurringItemForVerifikat, updateVerifikatRecurringItemLink, getKonteringsforslag, KonteringsforslagMonster, flagBankEvent, unflagBankEvent, getPeriodiseringskonto, createPeriodisering, updatePeriodisering, deletePeriodisering, getPeriodiseringForHuvud } from "../actions";
import AccountSelectorModal from "./AccountSelectorModal";
import ConfirmModal from "./ConfirmModal";
import KonteringsforslagCard from "./KonteringsforslagCard";

type PostInput = Omit<Post, "id" | "verifikatId">;

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

interface BulkNavProps {
  currentIndex: number;
  total: number;
  isSaved: boolean;
  onNavigate: (direction: -1 | 1) => void;
  onSaved: (verifikatId: number) => Promise<void>;
  segments: Array<"saved" | "flagged" | "pending">;
  onJump: (index: number) => void;
}

interface VerifikatFormProps {
  bankEvent?: BankEvent;
  verifikat?: Verifikat; // If provided, we're editing
  onClose: () => void;
  onSuccess: () => void;
  onFlagChange?: (updated: BankEvent) => void;
  bulkNav?: BulkNavProps;
  onOpenVerifikat?: (verifikatId: number) => void;
}

export default function VerifikatForm({
  bankEvent,
  verifikat,
  onClose,
  onSuccess,
  onFlagChange,
  bulkNav,
  onOpenVerifikat,
}: VerifikatFormProps) {
  const isEditing = !!verifikat;
  const verifikatBankEvent = verifikat?.bankEvent || bankEvent;
  const isPeriodiseringHuvud = verifikat?.periodisering?.role === "huvud";
  const isPeriodiseringLankat = verifikat?.periodisering?.role === "lankat";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<BookingTemplate[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItemStatus[]>([]);
  const [recurringLoaded, setRecurringLoaded] = useState(false);
  const [selectedRecurringItemId, setSelectedRecurringItemId] = useState<number | null>(null);

  const initialDate = verifikat?.date || bankEvent?.date || new Date();
  const initialDescription = verifikat?.description || bankEvent?.description || "";
  const initialPosts = useMemo<PostInput[]>(() => {
    // If editing, use existing posts
    if (verifikat) {
      return verifikat.posts.map((post) => ({
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
  }, [bankEvent, verifikat]);

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
  const recurringItemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [periodLockWarning, setPeriodLockWarning] = useState("");

  // Periodisering state (see docs/adr/0008)
  const [periodisera, setPeriodisera] = useState(false);
  const [targetDate, setTargetDate] = useState<Date>(initialDate);
  const [anchorAccountId, setAnchorAccountId] = useState<number>(
    bankEvent?.import?.accountId ?? 0
  );
  const [periodiseringskontoName, setPeriodiseringskontoName] = useState<string | null>(null);
  const [hasPeriodiseringskonto, setHasPeriodiseringskonto] = useState(true);
  const [periodiseringLockWarning, setPeriodiseringLockWarning] = useState("");
  const [showPeriodiseringSaveConfirm, setShowPeriodiseringSaveConfirm] = useState(false);
  const [showPeriodiseringDeleteConfirm, setShowPeriodiseringDeleteConfirm] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);

  // Flag state (only relevant when bankEvent is provided)
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [showUnflagConfirm, setShowUnflagConfirm] = useState(false);
  const [flagComment, setFlagComment] = useState(bankEvent?.flagComment ?? "");
  const [flagLoading, setFlagLoading] = useState(false);
  const isFlagged = bankEvent?.flagged ?? false;

  const [pendingNavDirection, setPendingNavDirection] = useState<-1 | 1 | null>(null);
  const [pendingNavIndex, setPendingNavIndex] = useState<number | null>(null);

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
      if (isEditing && verifikat && !isPeriodiseringHuvud) {
        const existingRecurringItemId = await getRecurringItemForVerifikat(verifikat.id);
        setSelectedRecurringItemId(existingRecurringItemId);
        // Re-baseline so a pre-existing recurring link isn't counted as an unsaved change
        setBaseline(
          serializeFormState(initialDate, initialDescription, initialPosts, existingRecurringItemId)
        );
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, isEditing, verifikat]);

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
          `Perioden ${year}-${String(month).padStart(2, "0")} är låst. Du kan inte spara verifikat i denna period.`
        );
      } else {
        setPeriodLockWarning("");
      }
    }
    checkPeriodLock();
  }, [date]);

  // Load default periodiseringskonto availability/name once.
  useEffect(() => {
    getPeriodiseringskonto().then((konto) => {
      setHasPeriodiseringskonto(!!konto);
      setPeriodiseringskontoName(konto?.namn ?? null);
    });
  }, []);

  // When editing a periodisering huvudverifikat, load the logical kontering.
  useEffect(() => {
    if (!isPeriodiseringHuvud || !verifikat) return;
    let cancelled = false;
    getPeriodiseringForHuvud(verifikat.id).then((details) => {
      if (cancelled || !details) return;
      const logicalPosts = details.posts.map((p) => ({
        accountId: p.accountId,
        debet: Number(p.debet) || 0,
        kredit: Number(p.kredit) || 0,
        description: p.description || "",
      }));
      setPeriodisera(true);
      setDate(details.bankDate);
      setTargetDate(details.targetDate);
      setAnchorAccountId(details.anchorAccountId);
      setDescription(details.description);
      setPosts(logicalPosts);
      setSelectedRecurringItemId(details.recurringItemId);
      setBaseline(
        serializeFormState(details.bankDate, details.description, logicalPosts, details.recurringItemId)
      );
      Promise.all([
        isPeriodLocked(details.bankDate),
        isPeriodLocked(details.targetDate),
      ]).then(([bankLocked, targetLocked]) => {
        if (bankLocked || targetLocked) {
          setPeriodiseringLockWarning(
            "Perioden är låst — periodiseringen kan inte ändras eller tas bort."
          );
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isPeriodiseringHuvud, verifikat]);

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
  const bankEventAmount = verifikatBankEvent
    ? Math.abs(verifikatBankEvent.amount)
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

  const attemptNavigate = (direction: -1 | 1) => {
    if (isDirty) {
      setPendingNavDirection(direction);
      setShowCloseConfirm(true);
    } else {
      bulkNav?.onNavigate(direction);
    }
  };

  const attemptJump = (index: number) => {
    if (index === bulkNav?.currentIndex) return;
    if (isDirty) {
      setPendingNavIndex(index);
      setShowCloseConfirm(true);
    } else {
      bulkNav?.onJump(index);
    }
  };

  // Cmd/Ctrl+Enter saves; Escape asks before closing when there are changes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Let nested modals own their own keys
      if (showCloseConfirm || showAccountSelector !== null || showFlagInput || showUnflagConfirm) return;
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      } else if (bulkNav && (e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        attemptNavigate(-1);
      } else if (bulkNav && (e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
        e.preventDefault();
        attemptNavigate(1);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCloseConfirm, showAccountSelector, showFlagInput, showUnflagConfirm, isDirty, onClose]);

  const updatePost = (
    index: number,
    field: keyof Omit<Post, "id" | "verifikatId">,
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
          verifikatId: 0,
        };
      } else {
        // For manual verifikat, just set up the structure with 0s
        // User will fill in amounts, but at least accounts are set
        return {
          accountId: row.accountId,
          debet: 0,
          kredit: 0,
          description: row.description || "",
          verifikatId: 0,
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
      const recurringId = f.recurringItem.id;
      // Wait for the selection to render, then scroll it into view
      requestAnimationFrame(() => {
        recurringItemRefs.current.get(recurringId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
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

  const handleFlag = async () => {
    if (!bankEvent) return;
    setFlagLoading(true);
    try {
      await flagBankEvent(bankEvent.id, flagComment);
      const updated: BankEvent = { ...bankEvent, flagged: true, flagComment: flagComment.trim() || undefined };
      onFlagChange?.(updated);
      setShowFlagInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte flagga händelsen");
    } finally {
      setFlagLoading(false);
    }
  };

  const handleUnflag = async () => {
    if (!bankEvent) return;
    setFlagLoading(true);
    try {
      await unflagBankEvent(bankEvent.id);
      const updated: BankEvent = { ...bankEvent, flagged: false, flagComment: undefined };
      onFlagChange?.(updated);
      setFlagComment("");
      setShowFlagInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte avflagga händelsen");
    } finally {
      setFlagLoading(false);
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

    // Periodisering-specific validation (create or huvud edit)
    if (periodisera) {
      if (!hasPeriodiseringskonto) {
        setError("Inget förvalt periodiseringskonto är satt. Markera ett konto i kontovyn först.");
        return;
      }
      if (!posts.some((p) => p.accountId === anchorAccountId)) {
        setError("Välj vilken rad som är ankarrad (ligger kvar på bankdatumet).");
        return;
      }
      if (targetDate.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)) {
        setError("Måldatumet måste skilja sig från bankhändelsens datum.");
        return;
      }
      if (periodiseringLockWarning) {
        setError(periodiseringLockWarning);
        return;
      }
    }

    // Editing an existing periodisering: confirm the linked verifikat will change.
    if (isPeriodiseringHuvud) {
      setShowPeriodiseringSaveConfirm(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setLoading(true);

    try {
      // Update an existing periodisering (huvudverifikat edit).
      if (isPeriodiseringHuvud && verifikat) {
        await updatePeriodisering(verifikat.id, {
          description,
          bankDate: date,
          targetDate,
          anchorAccountId,
          posts: posts.map((p) => ({
            accountId: p.accountId,
            debet: p.debet,
            kredit: p.kredit,
            description: p.description,
          })),
          recurringItemId: selectedRecurringItemId,
        });
        onSuccess();
        onClose();
        return;
      }

      // Create a new periodisering from a bank event.
      if (!isEditing && bankEvent && periodisera) {
        const huvudId = await createPeriodisering({
          bankEventId: bankEvent.id,
          description,
          bankDate: date,
          targetDate,
          anchorAccountId,
          posts: posts.map((p) => ({
            accountId: p.accountId,
            debet: p.debet,
            kredit: p.kredit,
            description: p.description,
          })),
          recurringItemId: selectedRecurringItemId,
        });

        if (bulkNav) {
          await bulkNav.onSaved(huvudId);
        } else {
          onSuccess();
          onClose();
        }
        return;
      }

      if (isEditing) {
        // Update existing verifikat
        await updateVerifikat(verifikat!.id, {
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
        await updateVerifikatRecurringItemLink(verifikat!.id, selectedRecurringItemId);

        if (bulkNav) {
          // Bulk mode: stay open, clear dirty state
          onSuccess();
          setBaseline(serializeFormState(date, description, posts, selectedRecurringItemId));
          setLoading(false);
        } else {
          onSuccess();
          onClose();
        }
      } else {
        // Create new verifikat
        const verifikatId = await createVerifikat({
          date,
          description,
          bankEventId: bankEvent?.id,
          posts: posts.map((p) => ({
            ...p,
            id: 0, // Will be set by server
            verifikatId: 0, // Will be set by server
          })),
        });

        // Link to recurring item if selected
        if (selectedRecurringItemId) {
          await linkVerifikatToRecurringItem(verifikatId, selectedRecurringItemId);
        }

        if (bulkNav) {
          // Bulk mode: notify parent; parent will remount form in saved/edit state
          await bulkNav.onSaved(verifikatId);
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ett fel uppstod");
      setLoading(false);
    }
  };

  const handleDeletePeriodisering = async () => {
    if (!verifikat) return;
    setLoading(true);
    try {
      await deletePeriodisering(verifikat.id);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ta bort periodiseringen");
      setLoading(false);
      setShowPeriodiseringDeleteConfirm(false);
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex bg-white dark:bg-zinc-900">
      <div className="w-full flex overflow-hidden">
        {/* Main Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              {isEditing ? "Redigera verifikat" : verifikatBankEvent ? "Bokför verifikat" : "Nytt verifikat"}
              {bulkNav?.isSaved && (
                <span className="inline-flex items-center gap-1 text-sm font-normal text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Bokförd
                </span>
              )}
            </h2>
            <button
              onClick={attemptClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
          {verifikatBankEvent && (
            <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Bankhändelse:
              </div>
              <div className="text-sm text-zinc-900 dark:text-zinc-50 font-medium">
                {verifikatBankEvent.description}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {verifikatBankEvent.amount.toLocaleString("sv-SE", {
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

          {isPeriodiseringLankat && verifikat?.periodisering && (
            <div className="mb-4 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-100">
              <div className="font-medium mb-1">Länkat periodiseringsverifikat</div>
              <p className="mb-3">
                Det här verifikatet är en del av en periodisering och kan inte redigeras
                direkt. Öppna huvudverifikatet för att ändra eller ta bort periodiseringen.
              </p>
              {onOpenVerifikat && (
                <button
                  type="button"
                  onClick={() => onOpenVerifikat(verifikat.periodisering!.motpartVerifikatId)}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Gå till huvudverifikat
                </button>
              )}
            </div>
          )}

          {periodiseringLockWarning && (
            <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
              ⚠️ {periodiseringLockWarning}
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
                Verifikatbeskrivning
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


          {verifikatBankEvent && (!isEditing || isPeriodiseringHuvud) && (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                <input
                  type="checkbox"
                  checked={periodisera}
                  disabled={isPeriodiseringHuvud}
                  onChange={(e) => {
                    setPeriodisera(e.target.checked);
                    if (!e.target.checked) {
                      setTargetDate(date);
                    }
                  }}
                  className="h-4 w-4"
                />
                Periodisera till en annan period
              </label>

              {periodisera && (
                <div className="space-y-3 pl-6">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Kostnaden/intäkten bokförs på måldatumet via periodiseringskontot
                    {periodiseringskontoName ? ` (${periodiseringskontoName})` : ""}, medan
                    bankraden ligger kvar på bankhändelsens datum. Två länkade verifikat skapas.
                  </p>

                  {!hasPeriodiseringskonto && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                      Inget förvalt periodiseringskonto är satt. Markera ett konto som
                      &quot;Förvalt periodiseringskonto&quot; i kontovyn först.
                    </div>
                  )}

                  <div className="w-56">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Måldatum (period att flytta till)
                    </label>
                    <input
                      type="date"
                      value={targetDate.toISOString().split("T")[0]}
                      onChange={(e) => setTargetDate(new Date(e.target.value))}
                      lang="sv-SE"
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Markera ankarraden (bankraden som ligger kvar på bankdatumet) i
                    postlistan nedan.
                  </p>
                </div>
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
                  {periodisera && (
                    <div className="w-14 shrink-0 text-center">
                      <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Ankare
                      </label>
                      <input
                        type="radio"
                        name="periodisering-anchor"
                        checked={anchorAccountId === post.accountId && post.accountId !== 0}
                        disabled={post.accountId === 0 || isPeriodiseringLankat}
                        onChange={() => setAnchorAccountId(post.accountId)}
                        className="mt-2 h-4 w-4"
                        title="Ankarrad — ligger kvar på bankhändelsens datum"
                      />
                    </div>
                  )}
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
          {bulkNav && bulkNav.segments.length > 1 && (
            <div className="flex gap-0.5" role="group" aria-label="Förloppskarta">
              {bulkNav.segments.map((status, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => attemptJump(i)}
                  aria-label={`Gå till händelse ${i + 1}`}
                  aria-current={i === bulkNav.currentIndex ? "true" : undefined}
                  className={[
                    "flex-1 min-w-[6px] h-2 rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-300",
                    status === "saved"
                      ? "bg-green-500"
                      : status === "flagged"
                      ? "bg-white border border-zinc-300 dark:bg-zinc-300 dark:border-zinc-400"
                      : "bg-amber-400",
                    i === bulkNav.currentIndex
                      ? "ring-2 ring-zinc-700 dark:ring-zinc-100 ring-offset-1 ring-offset-white dark:ring-offset-zinc-800"
                      : "opacity-70 hover:opacity-100",
                  ].join(" ")}
                />
              ))}
            </div>
          )}
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                disabled={loading}
              >
                {showSaveTemplate ? "Dölj" : "Spara som mall"}
              </button>
              {bulkNav && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <button
                    type="button"
                    onClick={() => attemptNavigate(-1)}
                    disabled={bulkNav.currentIndex === 0 || loading}
                    className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
                    aria-label="Föregående händelse"
                  >
                    ‹
                  </button>
                  <span className="tabular-nums select-none">
                    {bulkNav.currentIndex + 1} av {bulkNav.total}
                  </span>
                  <button
                    type="button"
                    onClick={() => attemptNavigate(1)}
                    disabled={bulkNav.currentIndex === bulkNav.total - 1 || loading}
                    className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
                    aria-label="Nästa händelse"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {bankEvent && (
                <button
                  type="button"
                  onClick={() => {
                    if (isFlagged) {
                      setShowUnflagConfirm(true);
                    } else {
                      setShowFlagInput((v) => !v);
                    }
                  }}
                  disabled={flagLoading || loading}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 ${
                    isFlagged
                      ? "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill={isFlagged ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                  {isFlagged
                    ? <span className="max-w-[16rem] truncate">{bankEvent.flagComment || "Flaggad"}</span>
                    : "Flagga"}
                </button>
              )}
              {isPeriodiseringHuvud && (
                <button
                  type="button"
                  onClick={() => setShowPeriodiseringDeleteConfirm(true)}
                  disabled={loading || !!periodiseringLockWarning}
                  className="px-4 py-2 text-sm font-semibold rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ta bort periodisering
                </button>
              )}
              <button
                type="submit"
                disabled={!isBalanced || loading || !!periodLockWarning || !amountMatchesBankEvent || !allAmountRowsHaveAccount || !!periodiseringLockWarning || isPeriodiseringLankat || (periodisera && !hasPeriodiseringskonto)}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading
                  ? "Sparar..."
                  : isPeriodiseringHuvud
                  ? "Spara periodisering"
                  : periodisera
                  ? "Skapa periodisering"
                  : isEditing
                  ? "Spara verifikat"
                  : "Skapa verifikat"}
              </button>
              {bulkNav?.isSaved && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Bokförd
                </span>
              )}
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
              Inga återkommande händelser för denna månad.{" "}
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
                  ref={(el) => {
                    if (el) {
                      recurringItemRefs.current.set(item.recurringItem.id, el);
                    } else {
                      recurringItemRefs.current.delete(item.recurringItem.id);
                    }
                  }}
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
                          key={usage.verifikatId}
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

      {showUnflagConfirm && bankEvent && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-800 shadow-xl p-6">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Avflagga bankhändelse
            </h3>
            {bankEvent.flagComment && (
              <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2 mb-4">
                {bankEvent.flagComment}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUnflagConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => { setShowUnflagConfirm(false); handleUnflag(); }}
                disabled={flagLoading}
                className="px-4 py-2 text-sm font-semibold rounded-md border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40 disabled:opacity-50"
              >
                Avflagga
              </button>
            </div>
          </div>
        </div>
      )}

      {showFlagInput && bankEvent && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-800 shadow-xl p-6">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Flagga bankhändelse
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Varför är händelsen inte redo att bokföras?
            </p>
            <textarea
              value={flagComment}
              onChange={(e) => setFlagComment(e.target.value)}
              placeholder="T.ex. saknar underlag, behöver utredas..."
              rows={3}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50 resize-none mb-4"
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setShowFlagInput(false); }
                else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!flagLoading) handleFlag();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFlagInput(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleFlag}
                disabled={flagLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                {flagLoading ? "Sparar..." : "Flagga"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && (
        <ConfirmModal
          title="Kasta osparade ändringar?"
          message={
            pendingNavDirection !== null || pendingNavIndex !== null
              ? "Du har osparade ändringar. Vill du bläddra vidare utan att spara?"
              : "Du har ändringar som inte sparats. Vill du stänga utan att spara?"
          }
          confirmText={pendingNavDirection !== null || pendingNavIndex !== null ? "Bläddra vidare" : "Stäng utan att spara"}
          cancelText="Fortsätt redigera"
          variant="warning"
          onConfirm={() => {
            setShowCloseConfirm(false);
            if (pendingNavDirection !== null) {
              const dir = pendingNavDirection;
              setPendingNavDirection(null);
              bulkNav?.onNavigate(dir);
            } else if (pendingNavIndex !== null) {
              const idx = pendingNavIndex;
              setPendingNavIndex(null);
              bulkNav?.onJump(idx);
            } else {
              onClose();
            }
          }}
          onCancel={() => {
            setShowCloseConfirm(false);
            setPendingNavDirection(null);
            setPendingNavIndex(null);
          }}
        />
      )}

      {showPeriodiseringSaveConfirm && (
        <ConfirmModal
          title="Spara ändrad periodisering?"
          message="Båda de länkade verifikaten skrivs om utifrån den logiska konteringen. Vill du fortsätta?"
          confirmText="Spara periodisering"
          cancelText="Avbryt"
          variant="warning"
          onConfirm={() => {
            setShowPeriodiseringSaveConfirm(false);
            performSave();
          }}
          onCancel={() => setShowPeriodiseringSaveConfirm(false)}
        />
      )}

      {showPeriodiseringDeleteConfirm && (
        <ConfirmModal
          title="Ta bort periodisering?"
          message="Både huvud- och det länkade verifikatet tas bort. Bankhändelsen blir obokförd igen. Vill du fortsätta?"
          confirmText="Ta bort periodisering"
          cancelText="Avbryt"
          variant="danger"
          onConfirm={handleDeletePeriodisering}
          onCancel={() => setShowPeriodiseringDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
