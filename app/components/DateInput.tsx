"use client";

import { useEffect, useRef, useState } from "react";

// Native <input type="date"> visar datum – både textformatet och kalender-
// popupen – enligt webbläsarens UI-locale, inte sidans lang-attribut. Det ger
// amerikanskt format (mm/dd/yyyy) och söndag som första veckodag. Därför är
// både fältet och kalendern egen-byggda så att de alltid är svenska:
// ISO-format (ÅÅÅÅ-MM-DD) och måndag som första veckodag.
interface DateInputProps {
  value: string; // ISO "YYYY-MM-DD" eller "" för tomt
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  className?: string; // appliceras på wrappern (bredd/layout)
  ariaLabel?: string;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const MANADER = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

// Måndag först
const VECKODAGAR = ["Må", "Ti", "On", "To", "Fr", "Lö", "Sö"];

function isValidISO(value: string): boolean {
  if (!ISO_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

// Veckodag med måndag = 0 ... söndag = 6
function mondayFirstWeekday(year: number, month: number, day: number): number {
  return (new Date(year, month, day).getDay() + 6) % 7;
}

export default function DateInput({
  value,
  onChange,
  required,
  id,
  className,
  ariaLabel,
}: DateInputProps) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  // Synka kalendern till valt datum (eller idag) när den öppnas
  useEffect(() => {
    if (!open) return;
    const base = isValidISO(text) ? new Date(`${text}T00:00:00`) : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setText(next);
    if (next === "" || isValidISO(next)) onChange(next);
  }

  function selectDay(day: number) {
    const iso = toISO(viewYear, viewMonth, day);
    setText(iso);
    onChange(iso);
    setOpen(false);
  }

  function stepMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const now = new Date();
  const todayISO = toISO(now.getFullYear(), now.getMonth(), now.getDate());
  const leading = mondayFirstWeekday(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleTextChange}
        placeholder="ÅÅÅÅ-MM-DD"
        required={required}
        id={id}
        maxLength={10}
        aria-label={ariaLabel}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-10 text-sm text-zinc-900 tabular-nums placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Öppna kalender"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5a.25.25 0 0 0-.25.25v8a1.25 1.25 0 0 0 1.25 1.25h10.5A1.25 1.25 0 0 0 16.5 15.25v-8a.25.25 0 0 0-.25-.25H4.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Välj datum"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              aria-label="Föregående månad"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {MANADER[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              aria-label="Nästa månad"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 0 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            {VECKODAGAR.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const iso = toISO(viewYear, viewMonth, day);
              const selected = iso === text;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`flex h-8 items-center justify-center rounded text-sm tabular-nums transition-colors ${
                    selected
                      ? "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : isToday
                        ? "font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 dark:text-zinc-50 dark:ring-zinc-600"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
