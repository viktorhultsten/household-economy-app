"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOverskott } from "../../actions";
import PeriodSelector from "../../components/PeriodSelector";
import { idag } from "../../lib/datum";
import { Manad, manadAv, manadDelar, manadEtikett, manadFor } from "../../lib/kontohistorik";
import {
  Ackumulering,
  Belopp,
  NOLL,
  Overskottsrad,
  ackumuleradeManader,
  avvikelse,
  rad,
  summaFor,
  tolvManaderTill,
} from "../../lib/overskott";

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function teckenFarg(belopp: number): string {
  if (belopp > 0) return "text-green-600 dark:text-green-400";
  if (belopp < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-600 dark:text-zinc-400";
}

function Avvik({ belopp }: { belopp: number }) {
  return (
    <span className={teckenFarg(belopp)}>
      {belopp > 0 ? "+" : ""}
      {formatSwedishAmount(belopp)} kr
    </span>
  );
}

interface Tabellrad {
  nyckel: string;
  etikett: string;
  varde: (r: Overskottsrad) => number;
  /** Summarad i fetstil, eller kontorad indragen under bundet sparande. */
  stil?: "summa" | "konto";
}

function tabellrader(konton: { id: number; namn: string }[]): Tabellrad[] {
  return [
    { nyckel: "intakter", etikett: "Intäkter", varde: (r) => r.intakter },
    { nyckel: "utgifter", etikett: "Utgifter", varde: (r) => r.utgifter },
    { nyckel: "resultat", etikett: "Resultat", varde: (r) => r.resultat, stil: "summa" },
    ...konton.map<Tabellrad>((k) => ({
      nyckel: `konto-${k.id}`,
      etikett: k.namn,
      varde: (r) => r.bundet[k.id] ?? 0,
      stil: "konto",
    })),
    { nyckel: "bundet", etikett: "Bundet sparande", varde: (r) => r.bundetTotalt },
    { nyckel: "overskott", etikett: "Överskott", varde: (r) => r.overskott, stil: "summa" },
  ];
}

interface Kolumn {
  faktiskt: Overskottsrad;
  budget: Overskottsrad;
  avvik: Overskottsrad;
}

function kolumn(faktiskt: Belopp, budget: Belopp): Kolumn {
  const f = rad(faktiskt);
  const b = rad(budget);
  return { faktiskt: f, budget: b, avvik: avvikelse(f, b) };
}

export default function Overskott() {
  const [till, setTill] = useState<Manad>(manadFor(idag()));
  const [ackumulering, setAckumulering] = useState<Ackumulering>("r12");
  const [faktiskt, setFaktiskt] = useState<Map<Manad, Belopp>>(new Map());
  const [budget, setBudget] = useState<Map<Manad, Belopp>>(new Map());
  const [konton, setKonton] = useState<{ id: number; namn: string }[]>([]);
  // Månaden som datan hör till; skiljer den sig från vald månad laddas den.
  const [laddadFor, setLaddadFor] = useState<Manad | null>(null);

  useEffect(() => {
    let aktuell = true;
    getOverskott(till).then((data) => {
      if (!aktuell) return;
      setFaktiskt(new Map(Object.entries(data.faktiskt)));
      setBudget(new Map(Object.entries(data.budget)));
      setKonton(data.konton);
      setLaddadFor(till);
    });
    return () => {
      aktuell = false;
    };
  }, [till]);

  const loading = laddadFor !== till;
  const { ar, manad } = manadDelar(till);
  const ackManader = ackumuleradeManader(till, ackumulering);
  const ackEtikett = ackumulering === "r12" ? "R12" : "Innevarande år";
  const period = kolumn(faktiskt.get(till) ?? NOLL, budget.get(till) ?? NOLL);
  const ack = kolumn(summaFor(ackManader, faktiskt), summaFor(ackManader, budget));
  const manader = tolvManaderTill(till).reverse();

  return (
    <div className={`transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-1">
          {(["r12", "ytd"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAckumulering(a)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                ackumulering === a
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              }`}
            >
              {a === "r12" ? "R12" : "Innevarande år"}
            </button>
          ))}
        </div>
        <PeriodSelector year={ar} month={manad} align="right" onChange={(y, m) => setTill(manadAv(y, m))} />
      </div>

      {!loading && konton.length === 0 && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Inget konto är markerat som bundet sparande, så överskottet är lika med resultatet. Markera
          t.ex. bolånet eller pensionskontot under{" "}
          <Link href="/accounts" className="underline">
            Konton
          </Link>
          .
        </p>
      )}

      <div className="mb-8 overflow-x-auto rounded-lg bg-white shadow dark:bg-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-50"></th>
              {["Faktisk", "Budget", "Avvik"].map((k) => (
                <th key={`p-${k}`} className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {manadEtikett(till)}
                  <br />
                  {k}
                </th>
              ))}
              {["Faktisk", "Budget", "Avvik"].map((k) => (
                <th key={`a-${k}`} className="px-4 py-3 text-right text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {ackEtikett}
                  <br />
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {tabellrader(konton).map(({ nyckel, etikett, varde, stil }) => {
              const summa = stil === "summa";
              const cell = summa
                ? "px-4 py-3 text-right font-bold tabular-nums"
                : "px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50";
              const belopp = (n: number) =>
                summa ? <span className={teckenFarg(n)}>{formatSwedishAmount(n)} kr</span> : `${formatSwedishAmount(n)} kr`;
              return (
                <tr key={nyckel} className={summa ? "bg-zinc-50 dark:bg-zinc-900/40" : ""}>
                  <td
                    className={`py-3 ${stil === "konto" ? "pl-10 pr-6 text-xs" : "px-6"} ${
                      summa ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {etikett}
                  </td>
                  <td className={cell}>{belopp(varde(period.faktiskt))}</td>
                  <td className={cell}>{belopp(varde(period.budget))}</td>
                  <td className={`${cell} font-semibold`}>
                    <Avvik belopp={varde(period.avvik)} />
                  </td>
                  <td className={cell}>{belopp(varde(ack.faktiskt))}</td>
                  <td className={cell}>{belopp(varde(ack.budget))}</td>
                  <td className={`${cell} font-semibold`}>
                    <Avvik belopp={varde(ack.avvik)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Per månad</h2>
      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              {["Månad", "Resultat", "Bundet sparande", "Överskott", "Budget", "Avvik"].map((k, i) => (
                <th
                  key={k}
                  className={`px-4 py-3 text-xs font-semibold text-zinc-900 dark:text-zinc-50 ${
                    i === 0 ? "px-6 text-left" : "text-right"
                  }`}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {manader.map((m) => {
              const { faktiskt: f, budget: b, avvik } = kolumn(faktiskt.get(m) ?? NOLL, budget.get(m) ?? NOLL);
              return (
                <tr key={m}>
                  <td className="px-6 py-2 text-zinc-600 dark:text-zinc-400">{manadEtikett(m)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatSwedishAmount(f.resultat)} kr
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatSwedishAmount(f.bundetTotalt)} kr
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold tabular-nums ${teckenFarg(f.overskott)}`}>
                    {formatSwedishAmount(f.overskott)} kr
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatSwedishAmount(b.overskott)} kr
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <Avvik belopp={avvik.overskott} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
