"use client";

import React, { useState, useEffect } from "react";
import { Account, Group, AccountType } from "../types";

interface CustomViewSelectorProps {
  accounts: Account[];
  groups: Group[];
  selectedAccountIds: number[];
  selectedGroupIds: number[];
  selectedTypes: AccountType[];
  onSelectionChange: (
    accountIds: number[],
    groupIds: number[],
    types: AccountType[]
  ) => void;
  onClose: () => void;
}

export default function CustomViewSelector({
  accounts,
  groups,
  selectedAccountIds,
  selectedGroupIds,
  selectedTypes,
  onSelectionChange,
  onClose,
}: CustomViewSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"types" | "groups" | "accounts">("types");
  const [localAccountIds, setLocalAccountIds] = useState<Set<number>>(
    new Set(selectedAccountIds)
  );
  const [localGroupIds, setLocalGroupIds] = useState<Set<number>>(
    new Set(selectedGroupIds)
  );
  const [localTypes, setLocalTypes] = useState<Set<AccountType>>(
    new Set(selectedTypes)
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape, { capture: true });
    return () =>
      document.removeEventListener("keydown", handleEscape, { capture: true });
  }, [onClose]);

  const handleSave = () => {
    onSelectionChange(
      Array.from(localAccountIds),
      Array.from(localGroupIds),
      Array.from(localTypes)
    );
    onClose();
  };

  const toggleAccountType = (type: AccountType) => {
    const newTypes = new Set(localTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setLocalTypes(newTypes);
  };

  const toggleGroup = (groupId: number) => {
    const newGroupIds = new Set(localGroupIds);
    if (newGroupIds.has(groupId)) {
      newGroupIds.delete(groupId);
    } else {
      newGroupIds.add(groupId);
    }
    setLocalGroupIds(newGroupIds);
  };

  const toggleAccount = (accountId: number) => {
    const newAccountIds = new Set(localAccountIds);
    if (newAccountIds.has(accountId)) {
      newAccountIds.delete(accountId);
    } else {
      newAccountIds.add(accountId);
    }
    setLocalAccountIds(newAccountIds);
  };

  const accountTypes: AccountType[] = ["Intäkt", "Utgift", "Tillgång", "Skuld"];

  // Filter and group accounts by group for display
  const filteredAccounts = accounts.filter((account) =>
    account.namn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.group?.namn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const groupName = account.group?.namn || "Ingen grupp";
    if (!acc.has(groupName)) {
      acc.set(groupName, []);
    }
    acc.get(groupName)!.push(account);
    return acc;
  }, new Map<string, Account[]>());

  const sortedGroups = Array.from(groupedAccounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "sv-SE")
  );

  sortedGroups.forEach(([, accs]) => {
    accs.sort((a, b) => a.namn.localeCompare(b.namn, "sv-SE"));
  });

  const filteredGroupsList = groups.filter((group) =>
    group.namn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.typ.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectionCount =
    localAccountIds.size + localGroupIds.size + localTypes.size;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">
            Välj konton att visa
          </h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("types")}
              className={`px-4 py-2 rounded ${
                activeTab === "types"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Kontotyper
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-4 py-2 rounded ${
                activeTab === "groups"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Grupper
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-4 py-2 rounded ${
                activeTab === "accounts"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              Individuella konton
            </button>
          </div>

          {(activeTab === "groups" || activeTab === "accounts") && (
            <input
              type="text"
              placeholder="Sök..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              autoFocus
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "types" && (
            <div className="space-y-2">
              {accountTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localTypes.has(type)}
                    onChange={() => toggleAccountType(type)}
                    className="mr-3 h-5 w-5"
                  />
                  <span className="text-lg">{type}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === "groups" && (
            <div className="space-y-2">
              {filteredGroupsList.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localGroupIds.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="mr-3 h-5 w-5"
                  />
                  <div>
                    <div className="font-medium">{group.namn}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {group.typ}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="space-y-4">
              {sortedGroups.map(([groupName, accs]) => (
                <div key={groupName}>
                  <div className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {groupName}
                  </div>
                  <div className="space-y-1 ml-4">
                    {accs.map((account) => (
                      <label
                        key={account.id}
                        className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={localAccountIds.has(account.id)}
                          onChange={() => toggleAccount(account.id)}
                          className="mr-3 h-4 w-4"
                        />
                        <span>{account.namn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectionCount} val
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Spara
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
