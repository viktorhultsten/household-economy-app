"use client";

import { useState, useEffect } from "react";
import { Verifikat } from "../types";
import {
  getPeriodiseringarOversikt,
  getVerifikat,
  PeriodiseringOversiktRad,
} from "../actions";
import VerifikatForm from "../components/VerifikatForm";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("sv-SE", { year: "numeric", month: "short" });
}

export default function PeriodiseringarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<PeriodiseringOversiktRad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerifikat, setSelectedVerifikat] = useState<Verifikat | null>(null);

  useEffect(() => {
    load();
  }, [year, month]);

  async function load() {
    setLoading(true);
    const data = await getPeriodiseringarOversikt(year, month);
    setRows(data);
    setLoading(false);
  }

  async function openHuvud(huvudId: number) {
    const fetched = await getVerifikat(huvudId);
    if (fetched) setSelectedVerifikat(fetched);
  }

  const totalKvar = rows.reduce((acc, r) => acc + r.kvar, 0);
  const totalAvdraget = rows.reduce((acc, r) => acc + r.avdraget, 0);
  const total = rows.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Periodiseringar</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (month === 1) {
                  setMonth(12);
                  setYear(year - 1);
                } else {
                  setMonth(month - 1);
                }
              }}
              className="px-3 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ← Föregående månad
            </button>
            <div className="flex gap-3">
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                <option value={1}>Januari</option>
                <option value={2}>Februari</option>
                <option value={3}>Mars</option>
                <option value={4}>April</option>
                <option value={5}>Maj</option>
                <option value={6}>Juni</option>
                <option value={7}>Juli</option>
                <option value={8}>Augusti</option>
                <option value={9}>September</option>
                <option value={10}>Oktober</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const y = currentYear - 2 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={() => {
                if (month === 12) {
                  setMonth(1);
                  setYear(year + 1);
                } else {
                  setMonth(month + 1);
                }
              }}
              className="px-3 py-2 text-sm font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Nästa månad →
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Belopp <span className="font-medium">avdraget</span> är kumulativt kostnadsfört till och
          med vald månad (inklusive startmånaden). <span className="font-medium">Kvar</span> är den
          del som ännu inte kostnadsförts.
        </p>

        {loading ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center text-zinc-600 dark:text-zinc-400">
            Laddar...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center text-zinc-600 dark:text-zinc-400">
            Inga aktiva periodiseringar för den valda perioden.
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Beskrivning
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Konto
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Totalt
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Avdraget
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Kvar
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.huvudId}
                    onClick={() => openHuvud(r.huvudId)}
                    className="border-b border-zinc-100 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-700/40 cursor-pointer"
                  >
                    <td className="px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                      {r.description}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {r.kontoNamn}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatMonth(r.startDate)}–{formatMonth(r.slutDate)} ({r.antalManader} mån)
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {formatSwedishAmount(r.total)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {formatSwedishAmount(r.avdraget)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
                      {formatSwedishAmount(r.kvar)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 font-semibold">
                  <td className="px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50" colSpan={3}>
                    Summa
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {formatSwedishAmount(total)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {formatSwedishAmount(totalAvdraget)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {formatSwedishAmount(totalKvar)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>

      {selectedVerifikat && (
        <VerifikatForm
          verifikat={selectedVerifikat}
          onClose={() => setSelectedVerifikat(null)}
          onSuccess={() => {
            setSelectedVerifikat(null);
            load();
          }}
          onOpenVerifikat={openHuvud}
        />
      )}
    </div>
  );
}
