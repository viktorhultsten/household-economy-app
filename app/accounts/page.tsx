"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Account, Group, AccountType } from "../types";
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getGroups,
  addGroup,
  updateGroup,
  deleteGroup,
} from "../actions";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

export default function KontonPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupInModal, setNewGroupInModal] = useState({
    namn: "",
    typ: "Utgift" as AccountType,
  });
  const [newAccount, setNewAccount] = useState({
    namn: "",
    groupId: 0,
  });
  const [newGroup, setNewGroup] = useState({
    namn: "",
    typ: "Utgift" as AccountType,
  });
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountGroupId, setEditAccountGroupId] = useState(0);
  const [editAccountExcludeFromBudget, setEditAccountExcludeFromBudget] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showGroupsModal) {
        setShowGroupsModal(false);
        setEditingGroup(null);
        setCreatingGroup(false);
        setNewGroupInModal({ namn: "", typ: "Utgift" });
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showGroupsModal]);

  async function loadData() {
    const [accountsData, groupsData] = await Promise.all([
      getAccounts(),
      getGroups(),
    ]);
    setAccounts(accountsData);
    setGroups(groupsData);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let groupId = newAccount.groupId;

    // If user wants to create a new group
    if (showNewGroupInput && newGroup.namn) {
      groupId = await addGroup(newGroup);
      await loadData(); // Reload to get the new group
    }

    if (groupId === 0) {
      setAlertMessage("Välj en grupp eller skapa en ny!");
      return;
    }

    await addAccount({ namn: newAccount.namn, groupId });
    setNewAccount({ namn: "", groupId: 0 });
    setNewGroup({ namn: "", typ: "Utgift" });
    setShowForm(false);
    setShowNewGroupInput(false);
    loadData();
  }

  async function handleDelete(id: number) {
    setConfirmAction({
      title: "Ta bort konto",
      message: "Är du säker på att du vill ta bort detta konto?",
      onConfirm: async () => {
        await deleteAccount(id);
        await loadData();
        setConfirmAction(null);
      },
    });
  }

  async function handleUpdateGroup(group: Group) {
    await updateGroup(group);
    setEditingGroup(null);
    await loadData();
  }

  async function handleDeleteGroup(id: number) {
    setConfirmAction({
      title: "Ta bort grupp",
      message: "Är du säker på att du vill ta bort denna grupp? Alla konton i gruppen kommer också tas bort.",
      onConfirm: async () => {
        await deleteGroup(id);
        await loadData();
        setConfirmAction(null);
      },
    });
  }

  async function handleCreateGroup() {
    if (!newGroupInModal.namn) {
      setAlertMessage("Gruppnamn måste anges!");
      return;
    }
    await addGroup(newGroupInModal);
    setNewGroupInModal({ namn: "", typ: "Utgift" });
    setCreatingGroup(false);
    await loadData();
  }

  function startEditAccount(account: Account) {
    setEditingAccount(account);
    setEditAccountName(account.namn);
    setEditAccountGroupId(account.groupId);
    setEditAccountExcludeFromBudget(account.excludeFromBudget || false);
  }

  async function handleUpdateAccount() {
    if (!editingAccount) return;

    if (!editAccountName.trim()) {
      setAlertMessage("Kontonamn måste anges!");
      return;
    }

    if (editAccountGroupId === 0) {
      setAlertMessage("Välj en grupp!");
      return;
    }

    await updateAccount({
      id: editingAccount.id,
      namn: editAccountName,
      groupId: editAccountGroupId,
      excludeFromBudget: editAccountExcludeFromBudget,
    });

    setEditingAccount(null);
    setEditAccountName("");
    setEditAccountGroupId(0);
    setEditAccountExcludeFromBudget(false);
    await loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  // Group accounts by group name
  const groupedAccounts = accounts.reduce((acc, account) => {
    const groupName = account.group?.namn || "Ingen grupp";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Tillbaka till transaktioner
          </Link>
        </div>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Konton
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGroupsModal(true)}
              className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-600 dark:bg-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-500"
            >
              Hantera grupper
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {showForm ? "Avbryt" : "Lägg till konto"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-zinc-800">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Nytt konto
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Namn
                </label>
                <input
                  type="text"
                  value={newAccount.namn}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, namn: e.target.value })
                  }
                  required
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                  placeholder="t.ex. Drivmedel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Grupp
                </label>
                {!showNewGroupInput ? (
                  <div className="space-y-2">
                    <select
                      value={newAccount.groupId}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          groupId: parseInt(e.target.value),
                        })
                      }
                      required={!showNewGroupInput}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    >
                      <option value={0}>Välj grupp...</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.namn} ({group.typ})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewGroupInput(true)}
                      className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      + Skapa ny grupp
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 border border-zinc-300 dark:border-zinc-600 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Ny grupp
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewGroupInput(false);
                          setNewGroup({ namn: "", typ: "Utgift" });
                        }}
                        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      >
                        Avbryt
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newGroup.namn}
                      onChange={(e) =>
                        setNewGroup({ ...newGroup, namn: e.target.value })
                      }
                      required={showNewGroupInput}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                      placeholder="Gruppnamn"
                    />
                    <select
                      value={newGroup.typ}
                      onChange={(e) =>
                        setNewGroup({
                          ...newGroup,
                          typ: e.target.value as AccountType,
                        })
                      }
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    >
                      <option value="Intäkt">Intäkt</option>
                      <option value="Utgift">Utgift</option>
                      <option value="Tillgång">Tillgång</option>
                      <option value="Skuld">Skuld</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Spara
              </button>
            </form>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga konton ännu. Lägg till ett konto för att komma igång.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAccounts).map(([grupp, accounts]) => (
              <div
                key={grupp}
                className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden"
              >
                <div className="bg-zinc-100 dark:bg-zinc-700 px-6 py-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {grupp}
                  </h3>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                    >
                      {editingAccount?.id === account.id ? (
                        <>
                          <div className="flex-1 flex gap-3 items-center">
                            <input
                              type="text"
                              value={editAccountName}
                              onChange={(e) => setEditAccountName(e.target.value)}
                              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                              placeholder="Kontonamn"
                            />
                            <select
                              value={editAccountGroupId}
                              onChange={(e) => setEditAccountGroupId(parseInt(e.target.value))}
                              className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                            >
                              <option value={0}>Välj grupp...</option>
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.namn} ({group.typ})
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={editAccountExcludeFromBudget}
                                onChange={(e) => setEditAccountExcludeFromBudget(e.target.checked)}
                                className="rounded border-zinc-300 dark:border-zinc-600"
                              />
                              <span className="text-xs">Uteslut från budget</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={handleUpdateAccount}
                              className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              Spara
                            </button>
                            <button
                              onClick={() => {
                                setEditingAccount(null);
                                setEditAccountName("");
                                setEditAccountGroupId(0);
                                setEditAccountExcludeFromBudget(false);
                              }}
                              className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              Avbryt
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {account.namn}
                              {account.excludeFromBudget && (
                                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 italic">
                                  (exkluderad från budget)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span
                              className={`text-sm font-medium ${
                                account.group?.typ === "Intäkt"
                                  ? "text-green-600 dark:text-green-400"
                                  : account.group?.typ === "Utgift"
                                  ? "text-red-600 dark:text-red-400"
                                  : account.group?.typ === "Tillgång"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-orange-600 dark:text-orange-400"
                              }`}
                            >
                              {account.group?.typ}
                            </span>
                            <button
                              onClick={() => startEditAccount(account)}
                              className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              Redigera
                            </button>
                            <button
                              onClick={() => handleDelete(account.id)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                            >
                              Ta bort
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showGroupsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Hantera grupper
                </h2>
                <button
                  onClick={() => {
                    setShowGroupsModal(false);
                    setEditingGroup(null);
                    setCreatingGroup(false);
                    setNewGroupInModal({ namn: "", typ: "Utgift" });
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                {!creatingGroup ? (
                  <button
                    onClick={() => setCreatingGroup(true)}
                    className="w-full rounded-md border-2 border-dashed border-zinc-300 dark:border-zinc-600 px-4 py-3 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:border-zinc-500"
                  >
                    + Skapa ny grupp
                  </button>
                ) : (
                  <div className="border border-zinc-300 dark:border-zinc-600 rounded-md p-4 bg-zinc-50 dark:bg-zinc-700/50">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Gruppnamn
                        </label>
                        <input
                          type="text"
                          value={newGroupInModal.namn}
                          onChange={(e) =>
                            setNewGroupInModal({ ...newGroupInModal, namn: e.target.value })
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          placeholder="t.ex. Bil"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Typ
                        </label>
                        <select
                          value={newGroupInModal.typ}
                          onChange={(e) =>
                            setNewGroupInModal({
                              ...newGroupInModal,
                              typ: e.target.value as AccountType,
                            })
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                        >
                          <option value="Intäkt">Intäkt</option>
                          <option value="Utgift">Utgift</option>
                          <option value="Tillgång">Tillgång</option>
                          <option value="Skuld">Skuld</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateGroup}
                          className="flex-1 px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Skapa
                        </button>
                        <button
                          onClick={() => {
                            setCreatingGroup(false);
                            setNewGroupInModal({ namn: "", typ: "Utgift" });
                          }}
                          className="flex-1 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-700 rounded-md p-3"
                  >
                    {editingGroup?.id === group.id ? (
                      <>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editingGroup.namn}
                            onChange={(e) =>
                              setEditingGroup({ ...editingGroup, namn: e.target.value })
                            }
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          />
                        </div>
                        <div className="w-32">
                          <select
                            value={editingGroup.typ}
                            onChange={(e) =>
                              setEditingGroup({
                                ...editingGroup,
                                typ: e.target.value as AccountType,
                              })
                            }
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          >
                            <option value="Intäkt">Intäkt</option>
                            <option value="Utgift">Utgift</option>
                            <option value="Tillgång">Tillgång</option>
                            <option value="Skuld">Skuld</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleUpdateGroup(editingGroup)}
                          className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Spara
                        </button>
                        <button
                          onClick={() => setEditingGroup(null)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Avbryt
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {group.namn}
                          </p>
                        </div>
                        <div className="w-32">
                          <span
                            className={`text-sm font-medium ${
                              group.typ === "Intäkt"
                                ? "text-green-600 dark:text-green-400"
                                : group.typ === "Utgift"
                                ? "text-red-600 dark:text-red-400"
                                : group.typ === "Tillgång"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-orange-600 dark:text-orange-400"
                            }`}
                          >
                            {group.typ}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                        >
                          Ta bort
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {groups.length === 0 && (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                  Inga grupper ännu. Skapa en grupp genom att lägga till ett konto.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage("")}
          variant="error"
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
