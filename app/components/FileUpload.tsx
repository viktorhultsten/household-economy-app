"use client";

import { ChangeEvent, useState, useEffect } from "react";
import { Account } from "../types";
import { getAccounts } from "../actions";

interface FileUploadProps {
  onFileLoad: (content: string, filename: string, accountId?: number) => void;
}

export default function FileUpload({ onFileLoad }: FileUploadProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0);

  useEffect(() => {
    async function loadAccounts() {
      const data = await getAccounts();
      // Filter to only Tillgång accounts
      const assetAccounts = data.filter((acc) => acc.group?.typ === "Tillgång");
      setAccounts(assetAccounts);
    }
    loadAccounts();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoad(content, file.name, selectedAccountId || undefined);
    };

    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="mb-6 rounded-lg bg-white shadow dark:bg-zinc-800 p-6">
      <div className="mb-4">
        <label
          htmlFor="account-select"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Standardkonto (tillgång) - valfritt
        </label>
        <select
          id="account-select"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
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

      <div>
        <label
          htmlFor="csv-upload"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          Ladda upp CSV-fil
        </label>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-900 dark:text-zinc-50
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-zinc-900 file:text-zinc-50
                     dark:file:bg-zinc-50 dark:file:text-zinc-900
                     hover:file:bg-zinc-700 dark:hover:file:bg-zinc-200
                     file:cursor-pointer cursor-pointer"
        />
      </div>
    </div>
  );
}
