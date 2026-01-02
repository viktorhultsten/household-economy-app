"use client";

import React, { useState } from "react";
import { CustomResultView, Account, Group, AccountType } from "../types";
import CustomViewSelector from "./CustomViewSelector";
import {
  createCustomResultView,
  updateCustomResultView,
  deleteCustomResultView,
} from "../actions";

interface CustomViewManagerProps {
  views: CustomResultView[];
  accounts: Account[];
  groups: Group[];
  onClose: () => void;
  onViewsChanged: () => void;
}

export default function CustomViewManager({
  views,
  accounts,
  groups,
  onClose,
  onViewsChanged,
}: CustomViewManagerProps) {
  const [editingView, setEditingView] = useState<CustomResultView | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewName, setViewName] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<AccountType[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateNew = () => {
    setViewName("");
    setSelectedAccountIds([]);
    setSelectedGroupIds([]);
    setSelectedTypes([]);
    setIsCreating(true);
    setEditingView(null);
  };

  const handleEdit = (view: CustomResultView) => {
    setViewName(view.namn);
    setSelectedAccountIds(view.accounts || []);
    setSelectedGroupIds(view.groups || []);
    setSelectedTypes(view.types || []);
    setEditingView(view);
    setIsCreating(false);
  };

  const handleDelete = async (viewId: number) => {
    if (
      !confirm(
        "Är du säker på att du vill ta bort den här vyn? Detta kan inte ångras."
      )
    ) {
      return;
    }

    try {
      await deleteCustomResultView(viewId);
      onViewsChanged();
    } catch (error) {
      alert("Kunde inte ta bort vyn: " + (error as Error).message);
    }
  };

  const handleSave = async () => {
    if (!viewName.trim()) {
      alert("Ange ett namn för vyn");
      return;
    }

    setIsSaving(true);
    try {
      if (editingView) {
        await updateCustomResultView(
          editingView.id,
          viewName,
          selectedAccountIds,
          selectedGroupIds,
          selectedTypes
        );
      } else {
        await createCustomResultView(
          viewName,
          selectedAccountIds,
          selectedGroupIds,
          selectedTypes
        );
      }
      setIsCreating(false);
      setEditingView(null);
      onViewsChanged();
    } catch (error) {
      alert("Kunde inte spara vyn: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingView(null);
  };

  const getSelectionSummary = (view: CustomResultView) => {
    const parts: string[] = [];
    if (view.types && view.types.length > 0) {
      parts.push(`${view.types.length} typ${view.types.length > 1 ? "er" : ""}`);
    }
    if (view.groups && view.groups.length > 0) {
      parts.push(`${view.groups.length} grupp${view.groups.length > 1 ? "er" : ""}`);
    }
    if (view.accounts && view.accounts.length > 0) {
      parts.push(`${view.accounts.length} konto${view.accounts.length > 1 ? "n" : ""}`);
    }
    return parts.length > 0 ? parts.join(", ") : "Inga filter";
  };

  const getCurrentSelectionSummary = () => {
    const parts: string[] = [];
    if (selectedTypes.length > 0) {
      parts.push(`${selectedTypes.length} typ${selectedTypes.length > 1 ? "er" : ""}`);
    }
    if (selectedGroupIds.length > 0) {
      parts.push(`${selectedGroupIds.length} grupp${selectedGroupIds.length > 1 ? "er" : ""}`);
    }
    if (selectedAccountIds.length > 0) {
      parts.push(`${selectedAccountIds.length} konto${selectedAccountIds.length > 1 ? "n" : ""}`);
    }
    return parts.length > 0 ? parts.join(", ") : "Inga filter";
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Hantera anpassade vyer</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!isCreating && !editingView ? (
              <div className="space-y-4">
                <button
                  onClick={handleCreateNew}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <span>+</span>
                  <span>Skapa ny vy</span>
                </button>

                {views.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Inga anpassade vyer ännu. Skapa en för att börja filtrera dina konton.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {views.map((view) => (
                      <div
                        key={view.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold">{view.namn}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {getSelectionSummary(view)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(view)}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                            >
                              Redigera
                            </button>
                            <button
                              onClick={() => handleDelete(view.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                            >
                              Ta bort
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Namn på vy
                  </label>
                  <input
                    type="text"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="t.ex. Huvudsakliga utgifter"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Konton att visa
                  </label>
                  <button
                    onClick={() => setShowSelector(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getCurrentSelectionSummary()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Klicka för att välja
                    </div>
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Sparar..." : "Spara"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isCreating && !editingView && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Stäng
              </button>
            </div>
          )}
        </div>
      </div>

      {showSelector && (
        <CustomViewSelector
          accounts={accounts}
          groups={groups}
          selectedAccountIds={selectedAccountIds}
          selectedGroupIds={selectedGroupIds}
          selectedTypes={selectedTypes}
          onSelectionChange={(accountIds, groupIds, types) => {
            setSelectedAccountIds(accountIds);
            setSelectedGroupIds(groupIds);
            setSelectedTypes(types);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  );
}
