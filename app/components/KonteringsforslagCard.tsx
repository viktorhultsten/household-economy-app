"use client";

import { useState } from "react";
import { KonteringsforslagKort } from "../lib/konteringsforslag";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// En färgskala per kort — ett säkert förslag är grönt rakt igenom, ett val blått.
const TON = {
  saker: {
    kort: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
    linje: "border-green-200 dark:border-green-800/60",
    knapp: "bg-green-700 hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500",
  },
  val: {
    kort: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
    linje: "border-blue-100 dark:border-blue-800/50",
    knapp: "bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500",
  },
  laddar: {
    kort: "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
    linje: "border-zinc-200 dark:border-zinc-700",
    knapp: "",
  },
};

// Fasta radhöjder så att skelettet och det färdiga kortet blir lika höga.
const RUBRIKRAD = "h-7";
const TABELLHUVUD = "h-5";
const TABELLRAD = "h-6";
const KORTBREDD = "w-[28rem] max-w-full";

interface KonteringsforslagCardProps {
  forslag: KonteringsforslagKort;
  /** Säkert förslag — det enda som visas för händelsen. */
  saker: boolean;
  currentDescription?: string;
  /** Förslaget har fyllts i formuläret. */
  anvant?: boolean;
  onApply: () => void;
}

export default function KonteringsforslagCard({
  forslag,
  saker,
  currentDescription,
  anvant = false,
  onApply,
}: KonteringsforslagCardProps) {
  const [visaUnderlag, setVisaUnderlag] = useState(false);
  const ton = saker ? TON.saker : TON.val;

  return (
    <div className={`${KORTBREDD} shrink-0 snap-start rounded-md border px-3 py-2 ${ton.kort}`}>
      <div className={`flex items-center gap-2 min-w-0 ${RUBRIKRAD}`}>
        {saker && (
          <span
            className="text-green-700 dark:text-green-400 shrink-0"
            title="Säkert förslag"
            aria-label="Säkert förslag"
          >
            ✓
          </span>
        )}
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {forslag.mallNamn}
        </span>
        {forslag.gissning && (
          <span
            className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-800/40 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200"
            title="Mallen har ingen tidigare händelse i den här riktningen. Förslaget speglar hur mallen annars bokförs."
          >
            Gissning
          </span>
        )}
        {forslag.recurringItem && (
          <span
            className="min-w-0 truncate rounded-full bg-white/70 dark:bg-zinc-800/60 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300"
            title={`Återkommande: ${forslag.recurringItem.namn}`}
          >
            ↻ {forslag.recurringItem.namn}
          </span>
        )}

        <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {Math.round(forslag.andel * 100)} %
        </span>
        {forslag.antal > 0 && (
          <button
            type="button"
            onClick={() => setVisaUnderlag((v) => !v)}
            aria-expanded={visaUnderlag}
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 whitespace-nowrap"
            title={`Baserat på ${forslag.antal} verifikat`}
          >
            {forslag.antal} ver. {visaUnderlag ? "▴" : "▾"}
          </button>
        )}
        <button
          type="button"
          onClick={onApply}
          className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-md text-white ${ton.knapp}`}
        >
          {anvant ? "Använt ✓" : "Använd"}
        </button>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className={TABELLHUVUD}>
            <th className="text-left font-normal text-zinc-500 dark:text-zinc-400 pr-2">
              Konto
            </th>
            <th className="text-right font-normal text-zinc-500 dark:text-zinc-400 w-24">
              Debet
            </th>
            <th className="text-right font-normal text-zinc-500 dark:text-zinc-400 w-24 pl-2">
              Kredit
            </th>
          </tr>
        </thead>
        <tbody>
          {forslag.rader.map((rad, i) => (
            <tr key={i} className={`border-t ${ton.linje} ${TABELLRAD}`}>
              <td className="pr-2 text-zinc-800 dark:text-zinc-200 truncate max-w-0 w-full">
                {rad.accountId ? (
                  rad.accountName
                ) : (
                  <span className="italic text-zinc-500 dark:text-zinc-400">Välj konto</span>
                )}
              </td>
              <td className="text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                {rad.debet > 0 ? formatSwedishAmount(rad.debet) : ""}
              </td>
              <td className="pl-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                {rad.kredit > 0 ? formatSwedishAmount(rad.kredit) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {visaUnderlag && (
        <ul className={`mt-1 pt-1 border-t ${ton.linje} flex flex-col gap-0.5`}>
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
                {diffDesc && <span className="truncate italic">{diffDesc}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Samma struktur och radhöjder som ett kort med två konteringsrader — det
 * vanligaste utfallet — så att platshållarna tar exakt lika mycket plats.
 */
function SkelettInnehall() {
  const stapel = "rounded bg-zinc-200 dark:bg-zinc-700";
  return (
    <>
      <div className={`flex items-center gap-2 ${RUBRIKRAD}`}>
        <div className={`h-3 w-40 ${stapel}`} />
        <div className={`ml-auto h-6 w-16 ${stapel}`} />
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className={TABELLHUVUD}>
            <th className="pr-2">
              <div className={`h-2.5 w-12 ${stapel}`} />
            </th>
            <th className="w-24" />
            <th className="w-24 pl-2" />
          </tr>
        </thead>
        <tbody>
          {[0, 1].map((i) => (
            <tr key={i} className={`border-t ${TON.laddar.linje} ${TABELLRAD}`}>
              <td className="pr-2">
                <div className={`h-2.5 w-32 ${stapel}`} />
              </td>
              <td>
                <div className={`ml-auto h-2.5 w-16 ${stapel}`} />
              </td>
              <td className="pl-2" />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Platshållare medan förslagen laddas. */
export function KonteringsforslagCardSkeleton() {
  return (
    <div
      className={`${KORTBREDD} rounded-md border px-3 py-2 animate-pulse ${TON.laddar.kort}`}
      aria-hidden
    >
      <SkelettInnehall />
    </div>
  );
}

/**
 * Ruta i kortets storlek med ett meddelande, när inget förslag ges. Blå när
 * användaren behöver avgöra själv (splittrad), annars grå.
 */
export function KonteringsforslagTomRuta({
  ton = "neutral",
  children,
}: {
  ton?: "val" | "neutral";
  children: React.ReactNode;
}) {
  const kort = ton === "val" ? TON.val.kort : TON.laddar.kort;
  const text = ton === "val" ? "text-blue-800 dark:text-blue-200" : "text-zinc-500 dark:text-zinc-400";
  return (
    <div className={`${KORTBREDD} relative rounded-md border px-3 py-2 ${kort}`}>
      <div className="invisible" aria-hidden>
        <SkelettInnehall />
      </div>
      <div className={`absolute inset-0 flex items-center justify-center px-4 text-center text-sm ${text}`}>
        <div>{children}</div>
      </div>
    </div>
  );
}
