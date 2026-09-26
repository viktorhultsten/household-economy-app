"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { sparaKonteringsmall } from "../actions";
import { MAX_DAG_FONSTER, MallIndata, normaliseraMall, valideraMall } from "../lib/konteringsmallSida";
import { DagForankring, Riktning, Sida } from "../lib/konteringsmallUtils";
import { Account } from "../types";
import AccountSelectorModal from "./AccountSelectorModal";

interface RadForm {
  accountId: number;
  sida: Sida;
  procent: string;
}

interface KonteringsmallFormModalProps {
  /** null skapar en ny mall. */
  mallId: number | null;
  initial: MallIndata;
  accounts: Account[];
  recurringItems: { id: number; namn: string }[];
  /** Visas under rubriken, t.ex. bankhändelsen mallen skapas ur. */
  kontext?: string;
  onSaved: (mallId: number) => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50";
const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1";
const hintClass = "text-xs text-zinc-500 dark:text-zinc-400";

const tillText = (x: number | null | undefined) => (x === null || x === undefined ? "" : String(x));
const tillTal = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
const tillProcent = (andel: number) => String(Math.round(andel * 100 * 10000) / 10000);

/**
 * Formulär för att skapa eller justera en konteringsmall. När mallen sparas
 * får användaren frågan om den ska låsas.
 */
export default function KonteringsmallFormModal({
  mallId,
  initial,
  accounts,
  recurringItems,
  kontext,
  onSaved,
  onClose,
}: KonteringsmallFormModalProps) {
  const [namn, setNamn] = useState(initial.namn);
  const [nyckelord, setNyckelord] = useState((initial.nyckelord ?? []).join(", "));
  const [ankarAccountId, setAnkarAccountId] = useState<number | null>(initial.ankarAccountId);
  const [riktning, setRiktning] = useState<Riktning | "">(initial.riktning ?? "");
  const [beloppMin, setBeloppMin] = useState(tillText(initial.beloppMin));
  const [beloppMax, setBeloppMax] = useState(tillText(initial.beloppMax));
  const [dagForankring, setDagForankring] = useState<DagForankring | "">(
    initial.dagIManaden?.forankring ?? ""
  );
  const [dag, setDag] = useState(tillText(initial.dagIManaden?.dag));
  const [dagFonster, setDagFonster] = useState(tillText(initial.dagIManaden?.fonster ?? 0));
  const [recurringItemId, setRecurringItemId] = useState<number | null>(initial.recurringItemId);
  const [alternativ, setAlternativ] = useState<RadForm[][]>(
    initial.alternativ.length
      ? initial.alternativ.map((a) =>
          a.rader.map((r) => ({ accountId: r.accountId, sida: r.sida, procent: tillProcent(r.andel) }))
        )
      : [[{ accountId: 0, sida: "motsatt", procent: "100" }]]
  );
  const [fel, setFel] = useState("");
  const [lasfraga, setLasfraga] = useState<MallIndata | null>(null);
  const [sparar, setSparar] = useState(false);
  const [kontoval, setKontoval] = useState<{ alt: number; rad: number } | null>(null);

  const kontoMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const ankarkonton = useMemo(
    () =>
      accounts
        .filter((a) => a.group?.typ === "Tillgång" || a.group?.typ === "Skuld" || a.id === ankarAccountId)
        .sort((a, b) => a.namn.localeCompare(b.namn, "sv-SE")),
    [accounts, ankarAccountId]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || kontoval !== null || sparar) return;
      e.preventDefault();
      e.stopPropagation();
      if (lasfraga) setLasfraga(null);
      else onClose();
    };
    document.addEventListener("keydown", handleKey, { capture: true });
    return () => document.removeEventListener("keydown", handleKey, { capture: true });
  }, [kontoval, lasfraga, sparar, onClose]);

  const kontonamn = (id: number) => {
    const a = kontoMap.get(id);
    return a ? `${a.namn} (${a.group?.namn})` : "Välj konto…";
  };

  const uppdateraRad = (alt: number, rad: number, andring: Partial<RadForm>) =>
    setAlternativ((prev) =>
      prev.map((a, i) => (i === alt ? a.map((r, j) => (j === rad ? { ...r, ...andring } : r)) : a))
    );

  const tillIndata = (): MallIndata => ({
    namn,
    nyckelord: nyckelord.split(","),
    ankarAccountId,
    riktning: riktning || null,
    beloppMin: tillTal(beloppMin),
    beloppMax: tillTal(beloppMax),
    dagIManaden: dagForankring
      ? { forankring: dagForankring, dag: tillTal(dag) ?? NaN, fonster: tillTal(dagFonster) ?? 0 }
      : null,
    recurringItemId,
    alternativ: alternativ.map((rader) => ({
      rader: rader.map((r) => ({
        accountId: r.accountId,
        sida: r.sida,
        andel: (tillTal(r.procent) ?? NaN) / 100,
      })),
    })),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Formuläret kan ligga i en portal under bokföringsformuläret — låt inte submit bubbla dit.
    e.stopPropagation();
    const indata = normaliseraMall(tillIndata());
    const valideringsfel = valideraMall(indata, kontoMap);
    if (valideringsfel) {
      setFel(valideringsfel);
      return;
    }
    setFel("");
    setLasfraga(indata);
  };

  const spara = async (last: boolean) => {
    if (!lasfraga) return;
    setSparar(true);
    try {
      const id = await sparaKonteringsmall(mallId, lasfraga, last);
      onSaved(id);
    } catch (err) {
      setFel(err instanceof Error ? err.message.replace(/^\[[A-Z_]+\] /, "") : "Kunde inte spara mallen");
      setLasfraga(null);
    } finally {
      setSparar(false);
    }
  };

  const innehall = (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-zinc-800">
        {lasfraga ? (
          <div>
            <div className="p-6">
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Ska mallen låsas?
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">Låst:</span> appen ändrar
                  aldrig mallen. Den utvärderas och får statistik, och appen skapar inga konkurrerande mallar
                  för det den matchar.
                </li>
                <li>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">Olåst:</span> appen får
                  justera, slå ihop eller ta bort mallen i den nattliga mallanalysen — och kan alltså även
                  ändra tillbaka det du just sparat.
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setLasfraga(null)}
                disabled={sparar}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Tillbaka
              </button>
              <button
                type="button"
                onClick={() => spara(false)}
                disabled={sparar}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-700"
              >
                Lämna olåst
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => spara(true)}
                disabled={sparar}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Lås mallen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {mallId === null ? "Ny konteringsmall" : "Ändra konteringsmall"}
                </h3>
                {kontext && <p className={`mt-1 ${hintClass}`}>{kontext}</p>}
              </div>

              <div>
                <label className={labelClass}>Namn</label>
                <input
                  type="text"
                  value={namn}
                  onChange={(e) => setNamn(e.target.value)}
                  autoFocus
                  className={inputClass}
                />
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Matchning</legend>
                <p className={hintClass}>Lämna ett attribut tomt om det inte särskiljer.</p>
                <div>
                  <label className={labelClass}>Nyckelord</label>
                  <input
                    type="text"
                    value={nyckelord}
                    onChange={(e) => setNyckelord(e.target.value)}
                    placeholder="t.ex. ica, maxi"
                    className={inputClass}
                  />
                  <p className={`mt-1 ${hintClass}`}>
                    Kommaseparerade. Alla ord måste finnas i bankhändelsens beskrivning.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Ankarkonto</label>
                    <select
                      value={ankarAccountId ?? ""}
                      onChange={(e) => setAnkarAccountId(e.target.value ? Number(e.target.value) : null)}
                      className={inputClass}
                    >
                      <option value="">Alla konton</option>
                      {ankarkonton.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.namn} ({a.group?.namn})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Riktning</label>
                    <select
                      value={riktning}
                      onChange={(e) => setRiktning(e.target.value as Riktning | "")}
                      className={inputClass}
                    >
                      <option value="">Båda (spegling följer mallen)</option>
                      <option value="ut">Utbetalning</option>
                      <option value="in">Inbetalning</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Belopp från (kr)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={beloppMin}
                      onChange={(e) => setBeloppMin(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Belopp till (kr)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={beloppMax}
                      onChange={(e) => setBeloppMax(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className={`-mt-1 ${hintClass}`}>Absolutbelopp, så att en spegling matchar samma intervall.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Dag i månaden</label>
                    <select
                      value={dagForankring}
                      onChange={(e) => setDagForankring(e.target.value as DagForankring | "")}
                      className={inputClass}
                    >
                      <option value="">Används inte</option>
                      <option value="borjan">Dag N</option>
                      <option value="slut">N dagar före månadsslut</option>
                    </select>
                  </div>
                  {dagForankring && (
                    <>
                      <div>
                        <label className={labelClass}>
                          {dagForankring === "borjan" ? "Dag" : "Dagar före (0 = sista)"}
                        </label>
                        <input
                          type="number"
                          min={dagForankring === "borjan" ? 1 : 0}
                          max={dagForankring === "borjan" ? 31 : 30}
                          value={dag}
                          onChange={(e) => setDag(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fönster ± dagar</label>
                        <input
                          type="number"
                          min={0}
                          max={MAX_DAG_FONSTER}
                          value={dagFonster}
                          onChange={(e) => setDagFonster(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Konteringsalternativ
                </legend>
                <p className={hintClass}>
                  Motkonton relativt bankraden. Motsatt sida är det vanliga motkontot; andelarna på motsatt sida
                  minus samma sida ska bli 100 %.
                </p>
                {alternativ.map((rader, ai) => (
                  <div
                    key={ai}
                    className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Alternativ {ai + 1}
                      </span>
                      {alternativ.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAlternativ((prev) => prev.filter((_, i) => i !== ai))}
                          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          Ta bort alternativ
                        </button>
                      )}
                    </div>
                    {rader.map((r, ri) => (
                      <div key={ri} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setKontoval({ alt: ai, rad: ri })}
                          className={`${inputClass} flex-1 truncate text-left`}
                        >
                          {kontonamn(r.accountId)}
                        </button>
                        <select
                          value={r.sida}
                          onChange={(e) => uppdateraRad(ai, ri, { sida: e.target.value as Sida })}
                          className="rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                        >
                          <option value="motsatt">Motsatt sida</option>
                          <option value="samma">Samma sida</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={r.procent}
                            onChange={(e) => uppdateraRad(ai, ri, { procent: e.target.value })}
                            className="w-20 rounded-md border border-zinc-300 px-2 py-2 text-right text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                          />
                          <span className="text-sm text-zinc-500">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAlternativ((prev) =>
                              prev.map((a, i) => (i === ai ? a.filter((_, j) => j !== ri) : a))
                            )
                          }
                          disabled={rader.length === 1}
                          className="px-2 text-zinc-400 hover:text-red-600 disabled:opacity-30"
                          aria-label="Ta bort rad"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setAlternativ((prev) =>
                          prev.map((a, i) =>
                            i === ai ? [...a, { accountId: 0, sida: "motsatt", procent: "" }] : a
                          )
                        )
                      }
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      + Lägg till rad
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setAlternativ((prev) => [...prev, [{ accountId: 0, sida: "motsatt", procent: "100" }]])
                  }
                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  + Lägg till alternativ
                </button>
              </fieldset>

              {recurringItems.length > 0 && (
                <div>
                  <label className={labelClass}>Återkommande händelse</label>
                  <select
                    value={recurringItemId ?? ""}
                    onChange={(e) => setRecurringItemId(e.target.value ? Number(e.target.value) : null)}
                    className={inputClass}
                  >
                    <option value="">Ingen</option>
                    {recurringItems.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.namn}
                      </option>
                    ))}
                  </select>
                  <p className={`mt-1 ${hintClass}`}>Väljs i formuläret när mallens förslag tillämpas.</p>
                </div>
              )}

              {fel && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {fel}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Spara
              </button>
            </div>
          </form>
        )}
      </div>

      {kontoval && (
        <AccountSelectorModal
          accounts={accounts}
          selectedAccountId={alternativ[kontoval.alt][kontoval.rad].accountId}
          onSelect={(accountId) => {
            uppdateraRad(kontoval.alt, kontoval.rad, { accountId });
            setKontoval(null);
          }}
          onClose={() => setKontoval(null)}
        />
      )}
    </div>
  );

  return createPortal(innehall, document.body);
}
