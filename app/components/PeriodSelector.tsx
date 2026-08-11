"use client";

import { useEffect, useRef, useState } from "react";

interface PeriodSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export default function PeriodSelector({ year, month, onChange }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synka årsvyn till valt år när popupen öppnas
  useEffect(() => {
    if (open) setViewYear(year);
  }, [open, year]);

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

  function goPrevious() {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  }

  function goNext() {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  }

  function selectMonth(m: number) {
    onChange(viewYear, m);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <div className="inline-flex items-stretch rounded-md border border-zinc-300 bg-white text-sm dark:border-zinc-600 dark:bg-zinc-800">
        <button
          type="button"
          onClick={goPrevious}
          aria-label="Föregående månad"
          className="flex items-center px-2.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="min-w-[9rem] border-x border-zinc-300 px-4 py-2 text-center font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-50 dark:hover:bg-zinc-700"
        >
          {MONTHS[month - 1]} {year}
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Nästa månad"
          className="flex items-center px-2.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 0 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Välj period"
          className="absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Föregående år"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Nästa år"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 0 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((label, i) => {
              const m = i + 1;
              const selected = m === month && viewYear === year;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => selectMonth(m)}
                  className={`rounded px-2 py-1.5 text-sm transition-colors ${
                    selected
                      ? "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
