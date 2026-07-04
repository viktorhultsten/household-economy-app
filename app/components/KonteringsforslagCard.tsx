"use client";

import { KonteringsforslagMonster } from "../actions";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface KonteringsforslagCardProps {
  forslag: KonteringsforslagMonster;
  currentDescription?: string;
  onApply: () => void;
}

export default function KonteringsforslagCard({
  forslag,
  currentDescription,
  onApply,
}: KonteringsforslagCardProps) {
  const latestStod = forslag.stodVerifikat[0];

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-3 flex flex-col gap-2 min-w-0">
      <div className="text-xs text-blue-700 dark:text-blue-300">
        Bokfört {forslag.antal} {forslag.antal === 1 ? "gång" : "gånger"}
        {latestStod && (
          <>
            {" "}
            · Senast{" "}
            {latestStod.verifikatDate.toLocaleDateString("sv-SE")}
          </>
        )}
      </div>

      {forslag.recurringItem && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-800/40 px-2 py-0.5 font-medium text-blue-800 dark:text-blue-200">
            <span aria-hidden>↻</span>
            Återkommande: {forslag.recurringItem.namn}
          </span>
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
                {rad.accountName}
              </td>
              <td className="py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                {rad.isDebet
                  ? rad.amount.toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""}
              </td>
              <td className="py-1 pl-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                {!rad.isDebet
                  ? rad.amount.toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""}
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

      <details className="group">
        <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 select-none list-none flex items-center gap-1">
          <span className="group-open:hidden">▶</span>
          <span className="hidden group-open:inline">▼</span>
          Baserat på {forslag.antal} {forslag.antal === 1 ? "verifikat" : "verifikat"}
        </summary>
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {forslag.stodVerifikat.map((sv) => {
            const diffDesc =
              currentDescription &&
              sv.bankEventDescription.trim().toLowerCase() !==
                currentDescription.trim().toLowerCase()
                ? sv.bankEventDescription
                : null;
            return (
              <li
                key={sv.verifikatId}
                className="text-xs text-zinc-500 dark:text-zinc-400 flex items-baseline gap-1.5"
              >
                <span className="tabular-nums shrink-0">
                  {sv.verifikatDate.toLocaleDateString("sv-SE")}
                </span>
                <span className="tabular-nums shrink-0 text-zinc-700 dark:text-zinc-300">
                  {formatSwedishAmount(sv.bankEventAmount)} kr
                </span>
                {diffDesc && (
                  <span className="truncate italic">{diffDesc}</span>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
