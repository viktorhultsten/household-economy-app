"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Account } from "../types";

interface AccountSelectorModalProps {
  accounts: Account[];
  selectedAccountId: number;
  onSelect: (accountId: number) => void;
  onClose: () => void;
  showAllOption?: boolean; // Optional prop to show "All accounts" option
}

export default function AccountSelectorModal({
  accounts,
  selectedAccountId,
  onSelect,
  onClose,
  showAllOption = false,
}: AccountSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // Use capture phase to catch the event before it reaches other modals
    document.addEventListener("keydown", handleEscape, { capture: true });
    return () => document.removeEventListener("keydown", handleEscape, { capture: true });
  }, [onClose]);

  const { groupedAccounts, flatAccounts } = useMemo(() => {
    // Filter accounts by search term (search in account name, group name, and type)
    const searchLower = searchTerm.toLowerCase();
    const filtered = accounts.filter((account) =>
      account.namn.toLowerCase().includes(searchLower) ||
      account.group?.namn.toLowerCase().includes(searchLower) ||
      account.group?.typ.toLowerCase().includes(searchLower)
    );

    // Group accounts by group name
    const grouped = filtered.reduce((acc, account) => {
      const groupName = account.group?.namn || "Ingen grupp";
      if (!acc.has(groupName)) {
        acc.set(groupName, []);
      }
      acc.get(groupName)!.push(account);
      return acc;
    }, new Map<string, Account[]>());

    // Sort groups alphabetically
    const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "sv-SE")
    );

    // Sort accounts within each group alphabetically
    sortedGroups.forEach(([, accs]) => {
      accs.sort((a, b) => a.namn.localeCompare(b.namn, "sv-SE"));
    });

    // Create flat list for keyboard navigation
    const flat: Account[] = [];
    if (showAllOption) {
      // Add a fake account for "All accounts" option
      flat.push({ id: 0, namn: "Alla konton", groupId: 0 });
    }
    sortedGroups.forEach(([, accs]) => {
      flat.push(...accs);
    });

    return { groupedAccounts: sortedGroups, flatAccounts: flat };
  }, [accounts, searchTerm, showAllOption]);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatAccounts.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < flatAccounts.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (flatAccounts[highlightedIndex]) {
          onSelect(flatAccounts[highlightedIndex].id);
          onClose();
        }
        break;
    }
  };

  // Helper function to highlight search term in text
  const highlightText = (text: string, search: string) => {
    if (!search) return text;

    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-700 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Get current highlighted account index within flat list
  const getAccountIndex = (accountId: number): number => {
    return flatAccounts.findIndex((acc) => acc.id === accountId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-lg bg-white dark:bg-zinc-800 shadow-xl max-w-2xl w-full h-[80vh] flex flex-col">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Välj konto
            </h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Sök konto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <table className="w-full">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Kontonamn
                </th>
                <th className="text-left px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Grupp
                </th>
                <th className="text-left px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Typ
                </th>
              </tr>
            </thead>
            <tbody>
              {showAllOption && (
                <tr
                  onClick={() => {
                    onSelect(0);
                    onClose();
                  }}
                  className={`cursor-pointer border-b border-zinc-100 dark:border-zinc-700 ${
                    highlightedIndex === 0
                      ? "bg-blue-100 dark:bg-blue-900"
                      : selectedAccountId === 0
                      ? "bg-zinc-200 dark:bg-zinc-700"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Alla konton
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    -
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    -
                  </td>
                </tr>
              )}
              {groupedAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    Inga konton hittades
                  </td>
                </tr>
              ) : (
                groupedAccounts.map(([groupName, groupAccounts]) => (
                  <React.Fragment key={`group-${groupName}`}>
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 sticky"
                      >
                        {groupName}
                      </td>
                    </tr>
                    {groupAccounts.map((account) => {
                      const accountIndex = getAccountIndex(account.id);
                      const isHighlighted = accountIndex === highlightedIndex;

                      return (
                        <tr
                          key={account.id}
                          onClick={() => {
                            onSelect(account.id);
                            onClose();
                          }}
                          className={`cursor-pointer border-b border-zinc-100 dark:border-zinc-700 ${
                            isHighlighted
                              ? "bg-blue-100 dark:bg-blue-900"
                              : account.id === selectedAccountId
                              ? "bg-zinc-200 dark:bg-zinc-700"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                            {highlightText(account.namn, searchTerm)}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {account.group?.namn ? highlightText(account.group.namn, searchTerm) : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {account.group?.typ ? highlightText(account.group.typ, searchTerm) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
