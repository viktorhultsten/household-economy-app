"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Account, Verifikat } from "../../types";
import { getAccounts, getKontohistorik, getVerifikat } from "../../actions";
import VerifikatForm from "../../components/VerifikatForm";
import PeriodSelector from "../../components/PeriodSelector";
import { idag } from "../../lib/datum";
import {
  KontohistorikPost,
  Manad,
  Urval,
  byggMatris,
  cellSumma,
  kortDatum,
  manadAv,
  manadDelar,
  manadEtikett,
  manaderMellan,
  tolkaUrval,
  urvalTillSok,
} from "../../lib/kontohistorik";
import KontoValjare from "./KontoValjare";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ManadValjare({
  label,
  value,
  align,
  onChange,
}: {
  label: string;
  value: Manad;
  align: "left" | "right";
  onChange: (m: Manad) => void;
}) {
  const { ar, manad } = manadDelar(value);
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      {label}
      <PeriodSelector year={ar} month={manad} align={align} onChange={(y, m) => onChange(manadAv(y, m))} />
    </div>
  );
}

export default function Kontohistorik() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dagensDatum = idag();

  const urval = tolkaUrval(
    {
      konton: searchParams.get("konton"),
      fran: searchParams.get("fran"),
      till: searchParams.get("till"),
    },
    dagensDatum
  );
  const urvalNyckel = urvalTillSok(urval);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [poster, setPoster] = useState<KontohistorikPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVerifikat, setSelectedVerifikat] = useState<Verifikat | null>(null);
  const senasteAnrop = useRef(0);

  useEffect(() => {
    getAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    load();
    // urvalNyckel fångar hela urvalet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urvalNyckel]);

  async function load() {
    const anrop = ++senasteAnrop.current;
    setRefreshing(true);
    const data = await getKontohistorik(urval.kontoIds, urval.fran, urval.till);
    // Ett senare urval kan ha hunnit före; visa bara svaret på det senaste.
    if (anrop !== senasteAnrop.current) return;
    setPoster(data);
    setLoading(false);
    setRefreshing(false);
  }

  function andraUrval(andring: Partial<Urval>) {
    const nytt = { ...urval, ...andring };
    if (nytt.fran > nytt.till) [nytt.fran, nytt.till] = [nytt.till, nytt.fran];
    router.replace(`${pathname}?${urvalTillSok(nytt)}`, { scroll: false });
  }

  async function oppnaVerifikat(id: number) {
    const fetched = await getVerifikat(id);
    if (fetched) setSelectedVerifikat(fetched);
  }

  const manader = manaderMellan(urval.fran, urval.till);
  const innevarande = dagensDatum.slice(0, 7);
  const matris = useMemo(() => byggMatris(poster), [poster]);

  // Valda konton grupperade per grupp, i kontoplanens ordning.
  const grupper = useMemo(() => {
    const valda = new Set(urval.kontoIds);
    const resultat: { namn: string; konton: Account[] }[] = [];
    for (const a of accounts) {
      if (!valda.has(a.id)) continue;
      const namn = a.group?.namn ?? "";
      const sista = resultat[resultat.length - 1];
      if (sista?.namn === namn) sista.konton.push(a);
      else resultat.push({ namn, konton: [a] });
    }
    return resultat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, urvalNyckel]);

  return (
    <div>
      <KontoValjare
        accounts={accounts}
        valda={urval.kontoIds}
        onChange={(kontoIds) => andraUrval({ kontoIds })}
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <ManadValjare label="Från" value={urval.fran} align="left" onChange={(fran) => andraUrval({ fran })} />
        <ManadValjare label="Till" value={urval.till} align="right" onChange={(till) => andraUrval({ till })} />
      </div>

      {grupper.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-zinc-600 shadow dark:bg-zinc-800 dark:text-zinc-400">
          Välj ett eller flera konton för att se deras historik.
        </div>
      ) : loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-zinc-600 shadow dark:bg-zinc-800 dark:text-zinc-400">
          Laddar...
        </div>
      ) : (
        <div
          className={`overflow-x-auto rounded-lg bg-white shadow transition-opacity duration-150 dark:bg-zinc-800 ${
            refreshing ? "opacity-50" : "opacity-100"
          }`}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                <th className="sticky left-0 z-1 bg-zinc-50 px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
                  Konto
                </th>
                {manader.map((m) => (
                  <th
                    key={m}
                    className={`whitespace-nowrap px-3 py-3 text-left text-xs font-semibold ${
                      m === innevarande ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {manadEtikett(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupper.map((g) => (
                <React.Fragment key={g.namn}>
                  <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <td className="sticky left-0 z-1 whitespace-nowrap bg-zinc-50 px-6 py-2 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                      {g.namn}
                    </td>
                    <td colSpan={manader.length} />
                  </tr>

                  {g.konton.map((konto) => {
                    const rad = manader.map((m) => matris.get(konto.id)?.get(m) ?? []);
                    const harSummor = rad.some((cell) => cell.length > 1);
                    return (
                      <React.Fragment key={konto.id}>
                        <tr className="border-t border-zinc-200 align-top dark:border-zinc-700">
                          <td className="sticky left-0 z-1 whitespace-nowrap bg-white px-6 py-2 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {konto.namn}
                          </td>
                          {rad.map((cell, i) => (
                            <td
                              key={manader[i]}
                              className="min-w-44 border-l border-zinc-100 px-3 py-1 dark:border-zinc-700/50"
                            >
                              {cell.length === 0 ? (
                                <div className="py-1 text-zinc-300 dark:text-zinc-600">—</div>
                              ) : (
                                <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                  {cell.map((p) => (
                                    <button
                                      key={p.verifikatId}
                                      type="button"
                                      onClick={() => oppnaVerifikat(p.verifikatId)}
                                      title={p.text}
                                      className="-mx-1 flex w-[calc(100%+0.5rem)] flex-col rounded px-1 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    >
                                      <span className="flex justify-between gap-2">
                                        <span className="text-zinc-500 tabular-nums dark:text-zinc-400">
                                          {kortDatum(p.date)}
                                        </span>
                                        <span className="font-medium text-zinc-900 tabular-nums dark:text-zinc-50">
                                          {formatSwedishAmount(p.belopp)}
                                        </span>
                                      </span>
                                      <span className="max-w-48 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                        {p.text}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>

                        {/* Summan på en egen rad, så att den hamnar på samma höjd i alla månader. */}
                        {harSummor && (
                          <tr className="text-xs">
                            <td className="sticky left-0 z-1 bg-white px-6 pb-2 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              Summa
                            </td>
                            {rad.map((cell, i) => (
                              <td
                                key={manader[i]}
                                className="border-l border-zinc-100 px-3 pb-2 text-right font-semibold text-zinc-900 tabular-nums dark:border-zinc-700/50 dark:text-zinc-50"
                              >
                                {cell.length > 1 && (
                                  <div className="border-t border-zinc-300 pt-1 dark:border-zinc-600">
                                    {formatSwedishAmount(cellSumma(cell))}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedVerifikat && (
        <VerifikatForm
          verifikat={selectedVerifikat}
          onClose={() => setSelectedVerifikat(null)}
          onSuccess={() => {
            setSelectedVerifikat(null);
            load();
          }}
          onOpenVerifikat={oppnaVerifikat}
        />
      )}
    </div>
  );
}
