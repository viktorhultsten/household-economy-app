"use client";

import { useState } from "react";

import { MallanalysKorning } from "../actions";

const STATUS: Record<MallanalysKorning["status"], { text: string; farg: string }> = {
  klar: {
    text: "Lyckades",
    farg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  fel: { text: "Misslyckades", farg: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  pagar: { text: "Pågår", farg: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
};

function StatusEtikett({ status }: { status: MallanalysKorning["status"] }) {
  const { text, farg } = STATUS[status];
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${farg}`}>{text}</span>;
}

/** Ändringarna i en körning, med länk till mallen när den finns kvar på sidan. */
function Andringar({ korning }: { korning: MallanalysKorning }) {
  if (korning.andringar.length === 0) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Inga mallar ändrades.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {korning.andringar.map((a) => (
        <li key={a.id} className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400" title={a.andring}>
          {a.mallStatus === "borttagen" ? (
            <span className="font-medium text-zinc-500 line-through">{a.mallnamn}</span>
          ) : (
            <a
              href={`#mall-${a.mallId}`}
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
            >
              {a.mallnamn}
            </a>
          )}
          : {a.andring}
        </li>
      ))}
    </ul>
  );
}

function Felruta({ fel }: { fel: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <p className="font-medium">Mallanalysen misslyckades. Inga mallar ändrades i körningen.</p>
      <p className="mt-1 break-words font-mono text-xs">{fel}</p>
    </div>
  );
}

function TidigareKorning({ korning }: { korning: MallanalysKorning }) {
  const [oppen, setOppen] = useState(false);
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{korning.startad}</span>
        <StatusEtikett status={korning.status} />
        <span className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-400">
          {korning.status === "fel" ? korning.fel : korning.sammanfattning}
        </span>
        {korning.andringar.length > 0 && (
          <button
            onClick={() => setOppen(!oppen)}
            className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {oppen ? "Dölj ändringar" : `Visa ändringar (${korning.andringar.length})`}
          </button>
        )}
      </div>
      {oppen && (
        <div className="mt-2 pl-4">
          <Andringar korning={korning} />
        </div>
      )}
    </li>
  );
}

/** Senaste mallanalysen, vad den kom fram till och tidigare körningar. */
export default function MallanalysPanel({ korningar }: { korningar: MallanalysKorning[] }) {
  const [visaHistorik, setVisaHistorik] = useState(false);
  const [senaste, ...tidigare] = korningar;

  if (!senaste) {
    return (
      <section className="mb-10 rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Mallanalys</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Mallanalysen har inte körts ännu. Den körs varje natt och härleder mallar ur historiken.
        </p>
      </section>
    );
  }

  const senastLyckade = senaste.status === "klar" ? null : tidigare.find((k) => k.status === "klar");

  return (
    <section className="mb-10 rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Mallanalys</h2>
        <StatusEtikett status={senaste.status} />
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {senaste.status === "pagar" ? "Pågår sedan" : "Senast körd"} {senaste.startad}
        {senaste.status !== "klar" &&
          (senastLyckade
            ? ` · senast lyckade körning ${senastLyckade.startad}`
            : " · ingen lyckad körning ännu")}
      </p>

      <div className="mt-3 space-y-3">
        {senaste.status === "fel" && senaste.fel && <Felruta fel={senaste.fel} />}
        {senaste.status === "klar" && (
          <>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{senaste.sammanfattning}</p>
            <Andringar korning={senaste} />
          </>
        )}
      </div>

      {tidigare.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-700">
          <button
            onClick={() => setVisaHistorik(!visaHistorik)}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {visaHistorik ? "Dölj tidigare körningar" : `Visa tidigare körningar (${tidigare.length})`}
          </button>
          {visaHistorik && (
            <ol className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-700">
              {tidigare.map((k) => (
                <TidigareKorning key={k.id} korning={k} />
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
