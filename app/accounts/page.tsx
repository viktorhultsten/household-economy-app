"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Account, Group, AccountType } from "../types";
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  setPeriodiseringskonto,
  setBundetSparande,
  getGroups,
  addGroup,
  updateGroup,
  deleteGroup,
} from "../actions";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const TYP_ORDNING: AccountType[] = ["Tillgång", "Skuld", "Intäkt", "Utgift"];

const TYP_FARG: Record<AccountType, string> = {
  Tillgång: "text-blue-600 dark:text-blue-400",
  Skuld: "text-orange-600 dark:text-orange-400",
  Intäkt: "text-green-600 dark:text-green-400",
  Utgift: "text-red-600 dark:text-red-400",
};

interface GroupSection {
  grupp: string;
  groupId: number | null;
  typ: AccountType | null;
  accounts: Account[];
}

function BundetSparandeKnapp({ pa, onClick }: { pa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pa}
      aria-label="Bundet sparande"
      title={pa ? "Bundet sparande: på" : "Bundet sparande: av"}
      onClick={onClick}
      className="flex items-center gap-2"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          pa ? "bg-emerald-600 dark:bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            pa ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className={`w-6 text-left text-xs ${pa ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-400"}`}>
        {pa ? "På" : "Av"}
      </span>
    </button>
  );
}

export default function KontonPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupInModal, setNewGroupInModal] = useState({
    namn: "",
    typ: "Utgift" as AccountType,
  });
  const [addingToGroupId, setAddingToGroupId] = useState<number | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountGroupId, setEditAccountGroupId] = useState(0);

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

  async function handleAddAccount(groupId: number) {
    if (!newAccountName.trim()) {
      setAlertMessage("Kontonamn måste anges!");
      return;
    }

    await addAccount({ namn: newAccountName.trim(), groupId });
    setNewAccountName("");
    setAddingToGroupId(null);
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
  }

  function stopEditAccount() {
    setEditingAccount(null);
    setEditAccountName("");
    setEditAccountGroupId(0);
  }

  async function handleSetPeriodiseringskonto(accountId: number | null) {
    await setPeriodiseringskonto(accountId);
    await loadData();
  }

  async function handleToggleBundetSparande(account: Account) {
    const pa = !account.isBundetSparande;
    // Visa ändringen direkt; laddningen efteråt bekräftar den.
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, isBundetSparande: pa } : a)));
    await setBundetSparande(account.id, pa);
    await loadData();
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

    if (editingAccount.hasPosts && editAccountGroupId !== editingAccount.groupId) {
      setAlertMessage(
        "Kontot har konteringsrader och kan därför inte byta grupp eller kontotyp."
      );
      return;
    }

    await updateAccount({
      id: editingAccount.id,
      namn: editAccountName,
      groupId: editAccountGroupId,
    });

    stopEditAccount();
    await loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  // Group accounts by group id, keyed on all known groups so empty groups still show up
  const accountsByGroupId = new Map<number, Account[]>();
  const ungroupedAccounts: Account[] = [];
  for (const account of accounts) {
    if (account.group) {
      const list = accountsByGroupId.get(account.group.id) ?? [];
      list.push(account);
      accountsByGroupId.set(account.group.id, list);
    } else {
      ungroupedAccounts.push(account);
    }
  }

  const sorteradeGrupper = [...groups].sort(
    (a, b) => TYP_ORDNING.indexOf(a.typ) - TYP_ORDNING.indexOf(b.typ) || a.namn.localeCompare(b.namn, "sv")
  );
  const sektioner = (typer: AccountType[]): GroupSection[] =>
    sorteradeGrupper
      .filter((g) => typer.includes(g.typ))
      .map((g) => ({ grupp: g.namn, groupId: g.id, typ: g.typ, accounts: accountsByGroupId.get(g.id) ?? [] }));
  const balansSektioner = sektioner(["Tillgång", "Skuld"]);
  const resultatSektioner = sektioner(["Intäkt", "Utgift"]);
  if (ungroupedAccounts.length > 0) {
    resultatSektioner.push({ grupp: "Ingen grupp", groupId: null, typ: null, accounts: ungroupedAccounts });
  }

  const balanskonton = sorteradeGrupper
    .filter((g) => g.typ === "Tillgång" || g.typ === "Skuld")
    .flatMap((g) => (accountsByGroupId.get(g.id) ?? []).map((a) => ({ ...a, gruppNamn: g.namn })));
  const periodiseringskonto = accounts.find((a) => a.isPeriodiseringDefault);

  function renderSection({ grupp, groupId, typ, accounts }: GroupSection) {
    const arBalans = typ === "Tillgång" || typ === "Skuld";
    return (
      <div key={grupp} className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden">
        <div className="bg-zinc-100 dark:bg-zinc-700 px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{grupp}</h3>
            {typ && <span className={`text-xs font-medium ${TYP_FARG[typ]}`}>{typ}</span>}
          </div>
          <div className="flex items-center gap-4">
            {arBalans && accounts.length > 0 && (
              <span className="hidden sm:inline text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Bundet sparande
              </span>
            )}
            {groupId !== null && (
              <button
                onClick={() => {
                  setAddingToGroupId(groupId);
                  setNewAccountName("");
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                + Lägg till konto
              </button>
            )}
          </div>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {addingToGroupId === groupId && groupId !== null && (
            <div className="flex items-center gap-3 px-6 py-4 bg-zinc-50 dark:bg-zinc-700/50">
              <input
                type="text"
                autoFocus
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddAccount(groupId);
                  if (e.key === "Escape") {
                    setAddingToGroupId(null);
                    setNewAccountName("");
                  }
                }}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                placeholder="t.ex. Drivmedel"
              />
              <button
                onClick={() => handleAddAccount(groupId)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Spara
              </button>
              <button
                onClick={() => {
                  setAddingToGroupId(null);
                  setNewAccountName("");
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Avbryt
              </button>
            </div>
          )}
          {accounts.length === 0 && addingToGroupId !== groupId && (
            <p className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">Inga konton i denna grupp än.</p>
          )}
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
            >
              {editingAccount?.id === account.id ? (
                <>
                  <div className="flex-1 min-w-0 flex flex-wrap gap-3 items-center">
                    <input
                      type="text"
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      className="flex-1 min-w-[8rem] rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                      placeholder="Kontonamn"
                    />
                    <select
                      value={editAccountGroupId}
                      onChange={(e) => setEditAccountGroupId(parseInt(e.target.value))}
                      disabled={editingAccount.hasPosts}
                      className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                    >
                      <option value={0}>Välj grupp...</option>
                      {sorteradeGrupper.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.namn} ({group.typ})
                        </option>
                      ))}
                    </select>
                    {editingAccount.hasPosts && (
                      <p className="max-w-xs text-xs text-amber-700 dark:text-amber-300">
                        Grupp kan inte ändras eftersom kontot redan har konteringsrader.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={handleUpdateAccount}
                      className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Spara
                    </button>
                    <button
                      onClick={stopEditAccount}
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
                      {account.isPeriodiseringDefault && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 italic">
                          (förvalt periodiseringskonto)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {arBalans && (
                      <BundetSparandeKnapp
                        pa={account.isBundetSparande ?? false}
                        onClick={() => handleToggleBundetSparande(account)}
                      />
                    )}
                    <button
                      onClick={() => startEditAccount(account)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
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
          </div>
        </div>

        <div className="mb-10 rounded-lg bg-white shadow dark:bg-zinc-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Förvalt periodiseringskonto</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bryggar verifikaten vid periodisering och periodförskjutning.
            </p>
          </div>
          <select
            value={periodiseringskonto?.id ?? ""}
            onChange={(e) => handleSetPeriodiseringskonto(e.target.value ? parseInt(e.target.value) : null)}
            className="w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
          >
            <option value="">Inget valt</option>
            {balanskonton.map((a) => (
              <option key={a.id} value={a.id}>
                {a.gruppNamn} – {a.namn}
              </option>
            ))}
          </select>
        </div>

        {balansSektioner.length === 0 && resultatSektioner.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga grupper ännu. Skapa en grupp för att komma igång.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {balansSektioner.length > 0 && (
              <section>
                <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Balanskonton</h2>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Tillgångar och skulder. Konton med bundet sparande dras av i{" "}
                  <Link href="/analys/overskott" className="underline">
                    överskottet
                  </Link>
                  .
                </p>
                <div className="space-y-6">{balansSektioner.map(renderSection)}</div>
              </section>
            )}
            {resultatSektioner.length > 0 && (
              <section>
                <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Resultatkonton</h2>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Intäkter och utgifter.</p>
                <div className="space-y-6">{resultatSektioner.map(renderSection)}</div>
              </section>
            )}
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
