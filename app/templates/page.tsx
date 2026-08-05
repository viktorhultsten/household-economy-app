"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookingTemplate, Account } from "../types";
import {
  getBookingTemplates,
  createBookingTemplate,
  updateBookingTemplate,
  deleteBookingTemplate,
  getAccounts,
} from "../actions";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import AccountSelectorModal from "../components/AccountSelectorModal";

interface TemplateRowInput {
  accountId: number;
  isDebet: boolean;
  description: string;
}

export default function MallarPage() {
  const [templates, setTemplates] = useState<BookingTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formRows, setFormRows] = useState<TemplateRowInput[]>([
    { accountId: 0, isDebet: true, description: "" },
  ]);
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [templatesData, accountsData] = await Promise.all([
      getBookingTemplates(),
      getAccounts(),
    ]);
    setTemplates(templatesData);
    setAccounts(accountsData);
    setLoading(false);
  }

  function resetForm() {
    setFormName("");
    setFormRows([{ accountId: 0, isDebet: true, description: "" }]);
    setShowForm(false);
    setEditingId(null);
  }

  function addRow() {
    setFormRows([...formRows, { accountId: 0, isDebet: false, description: "" }]);
  }

  function removeRow(index: number) {
    if (formRows.length > 1) {
      setFormRows(formRows.filter((_, i) => i !== index));
    }
  }

  function updateRow(index: number, field: keyof TemplateRowInput, value: any) {
    const newRows = [...formRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setFormRows(newRows);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formName.trim()) {
      setAlertMessage("Mallnamn måste anges");
      return;
    }

    const validRows = formRows.filter((row) => row.accountId > 0);
    if (validRows.length === 0) {
      setAlertMessage("Minst en rad med konto måste anges");
      return;
    }

    try {
      if (editingId) {
        await updateBookingTemplate(editingId, formName, validRows);
      } else {
        await createBookingTemplate(formName, validRows);
      }
      await loadData();
      resetForm();
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : "Ett fel uppstod");
    }
  }

  async function handleDelete(id: number) {
    setConfirmAction({
      title: "Ta bort mall",
      message: "Är du säker på att du vill ta bort denna mall? Denna åtgärd kan inte ångras.",
      onConfirm: async () => {
        try {
          await deleteBookingTemplate(id);
          await loadData();
          setConfirmAction(null);
        } catch (err) {
          setAlertMessage(err instanceof Error ? err.message : "Kunde inte ta bort mallen");
          setConfirmAction(null);
        }
      },
    });
  }

  function startEdit(template: BookingTemplate) {
    setEditingId(template.id);
    setFormName(template.namn);
    setFormRows(
      template.rows.map((row) => ({
        accountId: row.accountId,
        isDebet: row.isDebet,
        description: row.description || "",
      }))
    );
    setShowForm(true);
    setExpandedId(null);
  }

  function getAccountName(accountId: number): string {
    const account = accounts.find((a) => a.id === accountId);
    return account
      ? `${account.namn} (${account.group?.namn})`
      : "Okänt konto";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Bokningsmallar
          </h1>
          <button
            onClick={() => {
              if (showForm && !editingId) {
                resetForm();
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {showForm && !editingId ? "Avbryt" : "Lägg till mall"}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-zinc-800">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {editingId ? "Redigera mall" : "Ny bokingsmall"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Mallnamn
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="t.ex. Bensin, Hyra"
                  required
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Rader
                </label>
                <div className="space-y-3">
                  {formRows.map((row, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start border border-zinc-200 dark:border-zinc-700 rounded-md p-3"
                    >
                      <div className="flex-1 space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowAccountSelector(index)}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-left text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-600"
                        >
                          {(() => {
                            const selected =
                              row.accountId === 0
                                ? undefined
                                : accounts.find((a) => a.id === row.accountId);
                            if (!selected) return "Välj konto...";
                            return (
                              <>
                                <span>{selected.namn}</span>
                                {selected.group && (
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {" "}
                                    · {selected.group.namn} ({selected.group.typ})
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </button>
                        <div className="flex gap-2">
                          <select
                            value={row.isDebet ? "debet" : "kredit"}
                            onChange={(e) =>
                              updateRow(index, "isDebet", e.target.value === "debet")
                            }
                            className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          >
                            <option value="debet">Debet</option>
                            <option value="kredit">Kredit</option>
                          </select>
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              updateRow(index, "description", e.target.value)
                            }
                            placeholder="Beskrivning (valfritt)"
                            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          />
                        </div>
                      </div>
                      {formRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  className="mt-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  + Lägg till rad
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {editingId ? "Uppdatera" : "Spara"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              Inga bokningsmallar ännu. Klicka på "Lägg till mall" för att skapa
              en.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {template.namn}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {template.rows.length} rad
                      {template.rows.length !== 1 ? "er" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === template.id ? null : template.id
                        )
                      }
                      className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {expandedId === template.id ? "Dölj" : "Visa"}
                    </button>
                    <button
                      onClick={() => startEdit(template)}
                      className="mr-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>

                {expandedId === template.id && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-4 bg-zinc-50 dark:bg-zinc-900">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                          <th className="pb-2">Konto</th>
                          <th className="pb-2">Sida</th>
                          <th className="pb-2">Beskrivning</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {template.rows.map((row) => (
                          <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-700">
                            <td className="py-2 text-zinc-900 dark:text-zinc-50">
                              {getAccountName(row.accountId)}
                            </td>
                            <td className="py-2">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  row.isDebet
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                }`}
                              >
                                {row.isDebet ? "Debet" : "Kredit"}
                              </span>
                            </td>
                            <td className="py-2 text-zinc-600 dark:text-zinc-400 italic">
                              {row.description || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

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

      {showAccountSelector !== null && (
        <AccountSelectorModal
          accounts={accounts}
          selectedAccountId={formRows[showAccountSelector]?.accountId || 0}
          onSelect={(accountId) => {
            updateRow(showAccountSelector, "accountId", accountId);
            setShowAccountSelector(null);
          }}
          onClose={() => setShowAccountSelector(null)}
        />
      )}
    </div>
  );
}
