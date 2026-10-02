"use client";

import { useState } from "react";
import { Account } from "../../types";

interface Props {
  accounts: Account[];
  valda: number[];
  onChange: (kontoIds: number[]) => void;
}

function Piller({ vald, onClick, children }: { vald: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={vald}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        vald
          ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Konton som klickbara piller grupperade per grupp. Sökningen filtrerar på
 * både konto- och gruppnamn, så att t.ex. "försäkr" hittar försäkringskonton i
 * alla grupper; träffarna kan sedan väljas med ett klick. Ihopfälld visar den
 * bara de valda kontona.
 */
export default function KontoValjare({ accounts, valda, onChange }: Props) {
  const [sok, setSok] = useState("");
  const [oppen, setOppen] = useState(valda.length === 0);
  const valdaSet = new Set(valda);

  const term = sok.trim().toLocaleLowerCase("sv-SE");
  const traffar = term
    ? accounts.filter((a) => `${a.group?.namn ?? ""} ${a.namn}`.toLocaleLowerCase("sv-SE").includes(term))
    : accounts;

  const grupper: { namn: string; konton: Account[] }[] = [];
  for (const a of traffar) {
    const namn = a.group?.namn ?? "";
    const sista = grupper[grupper.length - 1];
    if (sista?.namn === namn) sista.konton.push(a);
    else grupper.push({ namn, konton: [a] });
  }

  function satt(ids: number[], markerad: boolean) {
    const nya = new Set(valdaSet);
    for (const id of ids) {
      if (markerad) nya.add(id);
      else nya.delete(id);
    }
    // Kontoplanens ordning, så att URL:en blir stabil.
    onChange(accounts.filter((a) => nya.has(a.id)).map((a) => a.id));
  }

  const traffIds = traffar.map((a) => a.id);
  const allaTraffarValda = traffIds.length > 0 && traffIds.every((id) => valdaSet.has(id));
  const valdaKonton = accounts.filter((a) => valdaSet.has(a.id));

  return (
    <div className="mb-4 rounded-lg bg-white shadow dark:bg-zinc-800">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Konton</span>

        {oppen ? (
          <>
            <input
              type="search"
              value={sok}
              onChange={(e) => setSok(e.target.value)}
              placeholder="Sök konto eller grupp…"
              autoFocus
              className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
            />
            <button
              type="button"
              onClick={() => satt(traffIds, !allaTraffarValda)}
              disabled={traffIds.length === 0}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {allaTraffarValda ? "Avmarkera" : "Välj"} {term ? `${traffIds.length} träffar` : "alla"}
            </button>
          </>
        ) : valdaKonton.length === 0 ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Inga valda</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {valdaKonton.map((a) => (
              <span
                key={a.id}
                className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
              >
                {a.namn} <span className="text-zinc-500 dark:text-zinc-400">· {a.group?.namn}</span>
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {valda.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Rensa
            </button>
          )}
          <button
            type="button"
            onClick={() => setOppen(!oppen)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {oppen ? "Klar" : "Ändra"}
          </button>
        </div>
      </div>

      {oppen && (
        <div className="space-y-4 border-t border-zinc-200 px-4 py-4 dark:border-zinc-700">
          {grupper.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Inga konton matchar sökningen.</p>
          ) : (
            grupper.map((g) => {
              const ids = g.konton.map((a) => a.id);
              const allaValda = ids.every((id) => valdaSet.has(id));
              return (
                <div key={g.namn}>
                  <button
                    type="button"
                    onClick={() => satt(ids, !allaValda)}
                    title={allaValda ? "Avmarkera gruppen" : "Välj hela gruppen"}
                    className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    {g.namn}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {g.konton.map((a) => (
                      <Piller key={a.id} vald={valdaSet.has(a.id)} onClick={() => satt([a.id], !valdaSet.has(a.id))}>
                        {a.namn}
                      </Piller>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
