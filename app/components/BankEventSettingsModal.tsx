"use client";

import { useEffect, useRef, useState } from "react";
import { BankEvent } from "../types";

interface BankEventSettingsModalProps {
  bankEvent: BankEvent;
  onDelete: () => Promise<void>;
  onAdjustAmount: (amount: number) => Promise<void>;
  onClose: () => void;
}

// Avsiktligt undanstoppad inställningsdialog för en obokförd bankhändelse:
// dels att permanent justera ett felaktigt belopp (t.ex. när banken i
// efterhand ändrat ett preliminärt kortköp till sitt slutgiltiga belopp) utan
// att göra om hela importen, dels att radera en oönskad händelse (t.ex. en
// dubblett i en icke-extern import) permanent ur systemet.
export default function BankEventSettingsModal({
  bankEvent,
  onDelete,
  onAdjustAmount,
  onClose,
}: BankEventSettingsModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState(() => bankEvent.amount.toString().replace(".", ","));
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, loading]);

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte radera bankhändelsen");
      setLoading(false);
    }
  };

  const handleSaveAmount = async () => {
    const normalised = amountInput.trim().replace(",", ".");
    const parsed = Number(normalised);
    if (!normalised || !Number.isFinite(parsed)) {
      setError("Ange ett giltigt belopp");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onAdjustAmount(parsed);
      setEditingAmount(false);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte justera beloppet");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-lg bg-white dark:bg-zinc-800 shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Inställningar för bankhändelse
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {bankEvent.description} ·{" "}
            {bankEvent.amount.toLocaleString("sv-SE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            kr
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {editingAmount ? (
            <div className="mb-4 rounded-md border border-zinc-200 dark:border-zinc-700 p-3">
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Nytt belopp
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Beloppet ändras permanent för denna bankhändelse. Används t.ex. när banken i
                efterhand ändrat ett preliminärt belopp till sitt slutgiltiga.
              </p>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveAmount();
                  }
                }}
                disabled={loading}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 disabled:opacity-50"
              />
              <div className="flex items-center justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAmount(false);
                    setError("");
                    setAmountInput(bankEvent.amount.toString().replace(".", ","));
                  }}
                  disabled={loading}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleSaveAmount}
                  disabled={loading}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-50"
                >
                  {loading ? "Sparar..." : "Spara belopp"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingAmount(true)}
              className="w-full mb-3 rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-700"
            >
              Justera belopp
            </button>
          )}

          {!editingAmount && (!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              Radera bankhändelse
            </button>
          ) : (
            <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                Bankhändelsen raderas permanent ur importen. Det går inte att ångra.
              </p>
            </div>
          ))}
        </div>

        {!editingAmount && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded-b-lg">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              Avbryt
            </button>
            {confirming && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-md px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white disabled:opacity-50"
              >
                {loading ? "Raderar..." : "Radera permanent"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
