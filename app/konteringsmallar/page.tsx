"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  KonteringsmallVy,
  ateraktiveraKonteringsmall,
  getAccounts,
  getKonteringsmallar,
  getRecurringItems,
  inaktiveraKonteringsmall,
  lasUppKonteringsmall,
  raderaKonteringsmall,
} from "../actions";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import KonteringsmallFormModal from "../components/KonteringsmallFormModal";
import { Formaterare, formaterare, procent } from "../lib/konteringsmallHarledning";
import {
  MallIndata,
  alternativAndel,
  mallStatistik,
  mallTillIndata,
  matchningText,
} from "../lib/konteringsmallSida";
import { Account } from "../types";

const TOM_MALL: MallIndata = {
  namn: "",
  nyckelord: null,
  ankarAccountId: null,
  beloppMin: null,
  beloppMax: null,
  dagIManaden: null,
  riktning: null,
  recurringItemId: null,
  alternativ: [],
};

type Bekraftelse = {
  title: string;
  message: string;
  confirmText: string;
  variant: "danger" | "warning" | "info";
  onConfirm: () => Promise<void>;
};

const felmeddelande = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message.replace(/^\[[A-Z_]+\] /, "") : fallback;

interface Siddata {
  mallar: KonteringsmallVy[];
  accounts: Account[];
  recurringItems: { id: number; namn: string }[];
}

async function hamtaSiddata(): Promise<Siddata> {
  const [mallar, accounts, recurring] = await Promise.all([
    getKonteringsmallar(),
    getAccounts(),
    getRecurringItems(),
  ]);
  return { mallar, accounts, recurringItems: recurring.map((r) => ({ id: r.id, namn: r.namn })) };
}

/** Mallid ur adressens ankare, `#mall-{id}`. */
function mallIdIAnkare(): number | null {
  const m = window.location.hash.match(/^#mall-(\d+)$/);
  return m ? Number(m[1]) : null;
}

export default function KonteringsmallarPage() {
  const [mallar, setMallar] = useState<KonteringsmallVy[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurringItems, setRecurringItems] = useState<{ id: number; namn: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [redigerar, setRedigerar] = useState<{ id: number | null; initial: MallIndata } | null>(null);
  const [bekraftelse, setBekraftelse] = useState<Bekraftelse | null>(null);
  const [fel, setFel] = useState("");
  const [markerad, setMarkerad] = useState<number | null>(null);

  const visa = useCallback((data: Siddata) => {
    setMallar(data.mallar);
    setAccounts(data.accounts);
    setRecurringItems(data.recurringItems);
    setLoading(false);
  }, []);
  const ladda = async () => visa(await hamtaSiddata());

  useEffect(() => {
    let aktiv = true;
    hamtaSiddata().then((data) => {
      if (aktiv) visa(data);
    });
    return () => {
      aktiv = false;
    };
  }, [visa]);

  // Länkar från bokföringsvyn pekar på #mall-{id}. Sidan laddar mallarna
  // efter att webbläsaren försökt scrolla, så det görs här.
  useEffect(() => {
    if (loading) return;
    const visaAnkare = () => {
      const id = mallIdIAnkare();
      setMarkerad(id);
      if (id !== null) document.getElementById(`mall-${id}`)?.scrollIntoView({ block: "center" });
    };
    visaAnkare();
    window.addEventListener("hashchange", visaAnkare);
    return () => window.removeEventListener("hashchange", visaAnkare);
  }, [loading]);

  const fmt = useMemo(
    () =>
      formaterare(
        new Map(accounts.map((a) => [a.id, { namn: a.namn, grupp: a.group?.namn ?? "" }]))
      ),
    [accounts]
  );
  const kontoMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const sorterade = useMemo(
    () => [...mallar].sort((a, b) => a.namn.localeCompare(b.namn, "sv-SE")),
    [mallar]
  );
  const aktiva = sorterade.filter((m) => m.status === "aktiv");
  const inaktiverade = sorterade.filter((m) => m.status === "inaktiverad");

  const utfor = (b: Omit<Bekraftelse, "onConfirm">, handling: () => Promise<void>) =>
    setBekraftelse({
      ...b,
      onConfirm: async () => {
        setBekraftelse(null);
        try {
          await handling();
        } catch (err) {
          setFel(felmeddelande(err, "Något gick fel"));
        }
        await ladda();
      },
    });

  const kortProps = (m: KonteringsmallVy): MallKortProps => ({
    mall: m,
    fmt,
    kontoMap,
    markerad: markerad === m.id,
    onAndra: () => setRedigerar({ id: m.id, initial: mallTillIndata(m) }),
    onLasUpp: () =>
      utfor(
        {
          title: "Lås upp mallen",
          message:
            "En olåst mall får appen justera, slå ihop eller ta bort i den nattliga mallanalysen.",
          confirmText: "Lås upp",
          variant: "info",
        },
        () => lasUppKonteringsmall(m.id)
      ),
    onInaktivera: () =>
      utfor(
        {
          title: "Inaktivera mallen",
          message:
            "Mallen föreslås inte längre. Den ligger kvar och hindrar appen från att härleda en mall för samma bankhändelser.",
          confirmText: "Inaktivera",
          variant: "warning",
        },
        () => inaktiveraKonteringsmall(m.id)
      ),
    onAteraktivera: () =>
      utfor(
        {
          title: "Återaktivera mallen",
          message: "Mallen föreslås igen i bokföringsvyn.",
          confirmText: "Återaktivera",
          variant: "info",
        },
        () => ateraktiveraKonteringsmall(m.id)
      ),
    onRadera: () =>
      utfor(
        {
          title: "Radera mallen",
          message:
            "Mallen och dess ändringslogg raderas permanent. Appen kan då hitta mönstret igen i nästa mallanalys.",
          confirmText: "Radera",
          variant: "danger",
        },
        () => raderaKonteringsmall(m.id)
      ),
  });

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
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Konteringsmallar</h1>
          <button
            onClick={() => setRedigerar({ id: null, initial: TOM_MALL })}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Ny mall
          </button>
        </div>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Mallarna är enda källan till konteringsförslag. Appen härleder och justerar olåsta mallar ur
          historiken; låsta mallar ändras bara av dig.
        </p>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Aktiva <span className="font-normal text-zinc-500">({aktiva.length})</span>
          </h2>
          {aktiva.length === 0 ? (
            <p className="rounded-lg bg-white p-6 text-sm text-zinc-600 shadow dark:bg-zinc-800 dark:text-zinc-400">
              Inga aktiva mallar. Skapa en här eller med &quot;Spara som mall&quot; i bokföringsvyn, eller
              vänta på nästa mallanalys.
            </p>
          ) : (
            <div className="space-y-3">
              {aktiva.map((m) => (
                <MallKort key={m.id} {...kortProps(m)} />
              ))}
            </div>
          )}
        </section>

        {inaktiverade.length > 0 && (
          <section>
            <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Inaktiverade <span className="font-normal text-zinc-500">({inaktiverade.length})</span>
            </h2>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Föreslås inte, men hindrar appen från att härleda en mall för samma bankhändelser.
            </p>
            <div className="space-y-3">
              {inaktiverade.map((m) => (
                <MallKort key={m.id} {...kortProps(m)} />
              ))}
            </div>
          </section>
        )}
      </main>

      {redigerar && (
        <KonteringsmallFormModal
          mallId={redigerar.id}
          initial={redigerar.initial}
          accounts={accounts}
          recurringItems={recurringItems}
          onClose={() => setRedigerar(null)}
          onSaved={async (id) => {
            setRedigerar(null);
            await ladda();
            setMarkerad(id);
            document.getElementById(`mall-${id}`)?.scrollIntoView({ block: "center" });
          }}
        />
      )}
      {bekraftelse && (
        <ConfirmModal
          title={bekraftelse.title}
          message={bekraftelse.message}
          confirmText={bekraftelse.confirmText}
          variant={bekraftelse.variant}
          onConfirm={bekraftelse.onConfirm}
          onCancel={() => setBekraftelse(null)}
        />
      )}
      {fel && <AlertModal message={fel} onClose={() => setFel("")} />}
    </div>
  );
}

interface MallKortProps {
  mall: KonteringsmallVy;
  fmt: Formaterare;
  kontoMap: Map<number, Account>;
  markerad: boolean;
  onAndra: () => void;
  onLasUpp: () => void;
  onInaktivera: () => void;
  onAteraktivera: () => void;
  onRadera: () => void;
}

const knappClass =
  "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700";

function Etikett({ children, ton }: { children: React.ReactNode; ton: "neutral" | "last" }) {
  const farg =
    ton === "last"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${farg}`}>{children}</span>;
}

function MallKort({
  mall,
  fmt,
  kontoMap,
  markerad,
  onAndra,
  onLasUpp,
  onInaktivera,
  onAteraktivera,
  onRadera,
}: MallKortProps) {
  const [visaLogg, setVisaLogg] = useState(false);
  const statistik = mallStatistik(mall);
  const senaste = mall.andringar[0];
  const alternativ = [...mall.alternativ].sort(
    (a, b) => (alternativAndel(mall, b) ?? 0) - (alternativAndel(mall, a) ?? 0)
  );
  const inaktiverad = mall.status === "inaktiverad";

  return (
    <article
      id={`mall-${mall.id}`}
      className={`scroll-mt-24 rounded-lg bg-white p-5 shadow dark:bg-zinc-800 ${
        markerad ? "ring-2 ring-amber-400 dark:ring-amber-500" : ""
      } ${inaktiverad ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{mall.namn}</h3>
            <Etikett ton="neutral">{mall.ursprung === "app" ? "Appen" : "Användare"}</Etikett>
            {mall.last ? <Etikett ton="last">Låst</Etikett> : <Etikett ton="neutral">Olåst</Etikett>}
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{matchningText(mall, kontoMap)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <button onClick={onAndra} className={knappClass}>
            Ändra
          </button>
          {mall.last && (
            <button onClick={onLasUpp} className={knappClass}>
              Lås upp
            </button>
          )}
          {inaktiverad ? (
            <>
              <button onClick={onAteraktivera} className={knappClass}>
                Återaktivera
              </button>
              <button
                onClick={onRadera}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Radera
              </button>
            </>
          ) : (
            <button onClick={onInaktivera} className={knappClass}>
              Inaktivera
            </button>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {alternativ.map((a) => {
          const andel = alternativAndel(mall, a);
          return (
            <li key={a.id} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-zinc-800 dark:text-zinc-200">{fmt.alternativ(a.rader)}</span>
              <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                {andel === null ? "–" : procent(andel)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {statistik.antal > 0
            ? `${statistik.antal} bankhändelser${statistik.senastAnvand ? ` · senast ${statistik.senastAnvand}` : ""}`
            : "Ingen statistik ännu"}
        </span>
        {mall.recurringItemId !== null && <span>Ger återkommande händelse</span>}
      </div>

      {senaste && (
        <div className="mt-3 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-700">
          <p className="line-clamp-2 text-zinc-600 dark:text-zinc-400">
            <span className="text-zinc-500">
              {senaste.tidpunkt} · {senaste.av === "app" ? "Appen" : "Du"}:
            </span>{" "}
            {senaste.andring}
          </p>
          <button
            onClick={() => setVisaLogg(!visaLogg)}
            className="mt-1 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {visaLogg ? "Dölj ändringslogg" : `Visa ändringslogg (${mall.andringar.length})`}
          </button>
          {visaLogg && (
            <ol className="mt-2 space-y-2">
              {mall.andringar.map((a) => (
                <li key={a.id} className="text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-500">
                    {a.tidpunkt} · {a.av === "app" ? "Appen" : "Du"}:
                  </span>{" "}
                  {a.andring}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}
