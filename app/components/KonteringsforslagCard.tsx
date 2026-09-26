"use client";

import { KonteringsforslagKort } from "../lib/konteringsforslag";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface KonteringsforslagCardProps {
  forslag: KonteringsforslagKort;
  /** Säkert förslag — det enda som visas för händelsen. */
  saker: boolean;
  currentDescription?: string;
  onApply: () => void;
}

export default function KonteringsforslagCard({
  forslag,
  saker,
  currentDescription,
  onApply,
}: KonteringsforslagCardProps) {
  return (
    <div
      className={`rounded-md border p-3 flex flex-col gap-2 min-w-0 ${
        saker
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {forslag.mallNamn}
        </span>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
          {Math.round(forslag.andel * 100)} %
        </span>
      </div>

      {(saker || forslag.gissning || forslag.recurringItem) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {saker && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-800/40 px-2 py-0.5 font-medium text-green-800 dark:text-green-200">
              <span aria-hidden>✓</span>
              Säkert förslag
            </span>
          )}
          {forslag.gissning && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-800/40 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-200"
              title="Mallen har ingen tidigare händelse i den här riktningen. Förslaget speglar hur mallen annars bokförs."
            >
              Kvalificerad gissning
            </span>
          )}
          {forslag.recurringItem && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-800/40 px-2 py-0.5 font-medium text-blue-800 dark:text-blue-200">
              <span aria-hidden>↻</span>
              Återkommande: {forslag.recurringItem.namn}
            </span>
          )}
        </div>
      )}

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left font-normal text-zinc-500 dark:text-zinc-400 pb-1 pr-2">
              Konto
            </th>
            <th className="text-right font-normal text-zinc-500 dark:text-zinc-400 pb-1 w-20">
              Debet
            </th>
            <th className="text-right font-normal text-zinc-500 dark:text-zinc-400 pb-1 w-20 pl-2">
              Kredit
            </th>
          </tr>
        </thead>
        <tbody>
          {forslag.rader.map((rad, i) => (
            <tr
              key={i}
              className="border-t border-blue-100 dark:border-blue-800/50"
            >
              <td className="py-1 pr-2 text-zinc-800 dark:text-zinc-200 truncate max-w-0 w-full">
                {rad.accountId ? (
                  rad.accountName
                ) : (
                  <span className="italic text-zinc-500 dark:text-zinc-400">Välj konto</span>
                )}
              </td>
              <td className="py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                {rad.debet > 0 ? formatSwedishAmount(rad.debet) : ""}
              </td>
              <td className="py-1 pl-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                {rad.kredit > 0 ? formatSwedishAmount(rad.kredit) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={onApply}
        className="self-start text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        Använd
      </button>

      {forslag.antal > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 select-none list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            Baserat på {forslag.antal} verifikat
          </summary>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {forslag.senaste.map((u) => {
              const diffDesc =
                currentDescription &&
                u.beskrivning.trim().toLowerCase() !==
                  currentDescription.trim().toLowerCase()
                  ? u.beskrivning
                  : null;
              return (
                <li
                  key={u.bankEventId}
                  className="text-xs text-zinc-500 dark:text-zinc-400 flex items-baseline gap-1.5"
                >
                  <span className="tabular-nums shrink-0">{u.datum}</span>
                  <span className="tabular-nums shrink-0 text-zinc-700 dark:text-zinc-300">
                    {formatSwedishAmount(u.belopp)} kr
                  </span>
                  {diffDesc && (
                    <span className="truncate italic">{diffDesc}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
