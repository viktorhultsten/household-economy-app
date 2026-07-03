"use client";

import { ChangeEvent, useState, useEffect } from "react";
import { Account } from "../types";
import { getAccounts } from "../actions";
import { parseSwedishCSV, ParseSwedishCSVResult } from "../utils/csvParser";

interface ImportModalProps {
  onImport: (
    events: ParseSwedishCSVResult["events"],
    filename: string,
    accountId?: number
  ) => Promise<void> | void;
  onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState<ParseSwedishCSVResult | null>(
    null
  );
  const [fileReadError, setFileReadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      const data = await getAccounts();
      // Filter to only Tillgång accounts
      const assetAccounts = data.filter((acc) => acc.group?.typ === "Tillgång");
      setAccounts(assetAccounts);
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isImporting) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, isImporting]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewResult(null);
      setFileReadError(null);
    }
  };

  const handleParsePreview = () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setFileReadError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseSwedishCSV(content);
      setPreviewResult(parsed);
      setIsImporting(false);
    };

    reader.onerror = () => {
      setIsImporting(false);
      setFileReadError("Fel vid läsning av fil");
    };

    reader.readAsText(selectedFile, "UTF-8");
  };

  const handleConfirmImport = async () => {
    if (!selectedFile || !previewResult) return;

    setIsImporting(true);
    setFileReadError(null);

    try {
      await onImport(
        previewResult.events,
        selectedFile.name,
        selectedAccountId || undefined
      );
    } catch {
      setFileReadError("Kunde inte importera filen");
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-lg bg-white dark:bg-zinc-800 shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Importera CSV-fil
            </h3>
            <button
              onClick={onClose}
              disabled={isImporting}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Account Selector */}
          <div>
            <label
              htmlFor="modal-account-select"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Standardkonto (tillgång) - valfritt
            </label>
            <select
              id="modal-account-select"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
              disabled={isImporting}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={0}>Inget standardkonto</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.namn} ({account.group?.namn})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Om valt kommer bankhändelser föreslå detta konto baserat på belopp (positiv = debet, negativ = kredit)
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label
              htmlFor="modal-csv-upload"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Välj CSV-fil
            </label>
            <input
              id="modal-csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
              className="block w-full text-sm text-zinc-900 dark:text-zinc-50
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-zinc-900 file:text-zinc-50
                         dark:file:bg-zinc-50 dark:file:text-zinc-900
                         hover:file:bg-zinc-700 dark:hover:file:bg-zinc-200
                         file:cursor-pointer cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Vald fil: {selectedFile.name}
              </p>
            )}
          </div>

          {previewResult && (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Förhandsgranskning av import
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {previewResult.events.length} giltiga händelser kommer importeras.
                </p>
                {previewResult.skippedRows.length > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {previewResult.skippedRows.length} rad
                    {previewResult.skippedRows.length === 1 ? "" : "er"} skippas.
                  </p>
                )}
              </div>

              {previewResult.skippedRows.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-900">
                  <ul className="space-y-2 text-xs text-amber-900 dark:text-amber-200">
                    {previewResult.skippedRows.map((row) => (
                      <li key={`${row.lineNumber}-${row.reason}`}>
                        Rad {row.lineNumber}: {row.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {fileReadError && (
            <p className="text-sm text-red-600 dark:text-red-400">{fileReadError}</p>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Avbryt
          </button>
          <button
            onClick={previewResult ? handleConfirmImport : handleParsePreview}
            disabled={!selectedFile || isImporting}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting
              ? previewResult
                ? "Importerar..."
                : "Läser fil..."
              : previewResult
                ? "Bekräfta import"
                : "Förhandsgranska"}
          </button>
        </div>
      </div>
    </div>
  );
}
