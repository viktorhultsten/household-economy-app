"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DashboardOverview, RecurringItemStatus, Todo } from "./types";
import { getDashboardOverview, getRecurringItemsStatus, getTodos, createTodo, updateTodo, deleteTodo } from "./actions";
import PeriodSelector from "./components/PeriodSelector";
import DateInput from "./components/DateInput";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

function formatSEK(amount: number, decimals = 0): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(Math.round(amount));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function amountColor(amount: number): string {
  if (amount > 0) return "text-green-600 dark:text-green-400";
  if (amount < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-600 dark:text-zinc-400";
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
      <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center justify-between gap-4 tabular-nums">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatSEK(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [recurring, setRecurring] = useState<RecurringItemStatus[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [overview, recurringStatus] = await Promise.all([
        getDashboardOverview(year, month),
        getRecurringItemsStatus(year, month),
      ]);
      if (cancelled) return;
      setData(overview);
      setRecurring(recurringStatus);
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;
    getTodos().then((items) => {
      if (!cancelled) setTodos(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddTodo(description: string, dueDate: string) {
    const created = await createTodo(description, dueDate);
    setTodos((prev) => [...prev, created]);
  }

  async function handleUpdateTodo(id: number, description: string, dueDate: string) {
    const updated = await updateTodo(id, description, dueDate);
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleDeleteTodo(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(id);
  }

  const gridStroke = "#71717a";
  const axisTick = { fill: "#a1a1aa", fontSize: 11 };

  const missingRecurring = recurring.filter((r) => !r.isComplete);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Översikt
          </h1>
          <PeriodSelector
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />
        </div>

        {loading || !data ? (
          <p className="text-zinc-600 dark:text-zinc-400">Laddar…</p>
        ) : (
          <div
            className={`space-y-6 transition-opacity duration-150 ${
              refreshing ? "opacity-50" : "opacity-100"
            }`}
          >
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label={`Resultat ${MONTHS[month - 1]}`}
                value={data.kpi.periodResultat}
                sub={`Sparkvot ${formatPercent(data.kpi.periodSparkvot)}`}
              />
              <KpiCard
                label="Resultat R12"
                value={data.kpi.r12Resultat}
                sub={`Sparkvot ${formatPercent(data.kpi.r12Sparkvot)}`}
              />
              <KpiCard
                label={`Resultat ${year} (YTD)`}
                value={data.kpi.ytdResultat}
                sub={`Sparkvot ${formatPercent(data.kpi.ytdSparkvot)}`}
              />
              <TodoCard unposted={data.todo.unposted} flagged={data.todo.flagged} />
            </div>

            {/* R12 snitt (rullande 12 månaders genomsnitt) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                label="R12 snitt intäkter"
                value={data.kpi.r12Intakter / 12}
                sub="Genomsnitt per månad, senaste 12 mån"
              />
              <KpiCard
                label="R12 snitt utgifter"
                value={-data.kpi.r12Utgifter / 12}
                sub="Genomsnitt per månad, senaste 12 mån"
              />
              <KpiCard
                label="R12 snitt diff"
                value={data.kpi.r12Resultat / 12}
                sub="Genomsnitt per månad, senaste 12 mån"
              />
            </div>

            {/* Att göra-lista */}
            <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Att göra
              </h2>
              <TodoList todos={todos} onAdd={handleAddTodo} onUpdate={handleUpdateTodo} onDelete={handleDeleteTodo} />
            </section>

            {/* Income statement chart */}
            <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Intäkter, utgifter &amp; resultat — senaste 12 månaderna
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data.months} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.3 }} />
                  <YAxis tickFormatter={formatCompact} tick={axisTick} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="intakter" name="Intäkter" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="utgifter" name="Utgifter" fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="resultat" name="Resultat" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </section>

            {/* Budget vs utfall per month */}
            <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
              <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Budget mot utfall — senaste 12 månaderna
              </h2>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Budgeterat resultat jämfört med faktiskt utfall. Avvikelsen är
                utfall minus budget (positiv = bättre än budget).
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data.months} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.3 }} />
                  <YAxis tickFormatter={formatCompact} tick={axisTick} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="budgetResultat" name="Budget" fill="#a1a1aa" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="resultat" name="Utfall" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="resultatAvvikelse" name="Avvikelse" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Net worth chart */}
              <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Nettoförmögenhet över tid
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.months} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.3 }} />
                    <YAxis tickFormatter={formatCompact} tick={axisTick} tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="nettoformogenhet" name="Nettoförmögenhet" stroke="#2563eb" strokeWidth={2.5} fill="url(#nwFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </section>

              {/* Top expenses */}
              <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Största utgiftskategorier
                </h2>
                <TopExpenses data={data} />
              </section>
            </div>

            {/* Budget outliers per month */}
            <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
              <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Konton som avviker mest mot budget
              </h2>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Per månad, störst avvikelse först. Grön = bättre än budget, röd = sämre.
              </p>
              <div className="space-y-2">
                {data.monthDetails.map((detail) => (
                  <div
                    key={`${detail.year}-${detail.month}`}
                    className="flex flex-col gap-2 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-700/60 sm:flex-row sm:items-center"
                  >
                    <div className="w-20 shrink-0 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {detail.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detail.outliers.length === 0 ? (
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">
                          Inga avvikelser
                        </span>
                      ) : (
                        detail.outliers.map((o) => (
                          <span
                            key={o.accountId}
                            title={`Utfall ${formatSEK(o.actual)} · Budget ${formatSEK(o.budget)}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                              o.variance >= 0
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            <span className="font-medium">{o.accountName}</span>
                            <span className="tabular-nums">
                              {o.variance >= 0 ? "+" : ""}
                              {formatSEK(o.variance)}
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* YTD budget outliers */}
              <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Budgetavvikelser {year} (ackumulerat)
                </h2>
                {data.ytdOutliers.length === 0 ? (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">
                    Inga avvikelser att visa.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
                    {data.ytdOutliers.map((o) => (
                      <li key={o.accountId} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <span className="text-zinc-900 dark:text-zinc-50">{o.accountName}</span>
                          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            utfall {formatSEK(o.actual)} / budget {formatSEK(o.budget)}
                          </span>
                        </div>
                        <span className={`font-medium tabular-nums ${amountColor(o.variance)}`}>
                          {o.variance >= 0 ? "+" : ""}
                          {formatSEK(o.variance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/budget" className="mt-3 inline-block text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                  Till budget →
                </Link>
              </section>

              {/* Missing recurring items */}
              <section className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
                <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Återkommande som saknas — {MONTHS[month - 1]}
                </h2>
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Uppskattat belopp som väntas dras/sättas in, baserat på senaste
                  gången varje post bokfördes.
                </p>
                {missingRecurring.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Alla återkommande händelser är avklarade. 🎉
                  </p>
                ) : (
                  <RecurringExpected items={missingRecurring} />
                )}
                <Link href="/recurring" className="mt-3 inline-block text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                  Till återkommande →
                </Link>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow dark:bg-zinc-800">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${amountColor(value)}`}>
        {formatSEK(value)}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>
    </div>
  );
}

function TodoCard({ unposted, flagged }: { unposted: number; flagged: number }) {
  return (
    <Link
      href="/bokfor"
      className="block rounded-lg bg-white p-5 shadow transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700/60"
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Att göra</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
        {unposted}
        <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          obokförda
        </span>
      </p>
      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
        {flagged} flaggade · Bokför →
      </p>
    </Link>
  );
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function TodoList({
  todos,
  onAdd,
  onUpdate,
  onDelete,
}: {
  todos: Todo[];
  onAdd: (description: string, dueDate: string) => Promise<void>;
  onUpdate: (id: number, description: string, dueDate: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const today = todayISO();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !dueDate || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(description, dueDate);
      setDescription("");
      setDueDate("");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditDescription(todo.description);
    setEditDueDate(todo.dueDate);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDescription("");
    setEditDueDate("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null || !editDescription.trim() || !editDueDate || savingEdit) return;
    setSavingEdit(true);
    try {
      await onUpdate(editingId, editDescription, editDueDate);
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Vad ska göras?"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <DateInput value={dueDate} onChange={setDueDate} className="w-44" ariaLabel="Förfallodatum" />
        <button
          type="submit"
          disabled={submitting || !description.trim() || !dueDate}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Lägg till
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Inget att göra just nu.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
          {todos.map((todo) => {
            if (editingId === todo.id) {
              return (
                <li key={todo.id} className="py-2.5">
                  <form onSubmit={handleSaveEdit} className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Vad ska göras?"
                      autoFocus
                      className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <DateInput value={editDueDate} onChange={setEditDueDate} className="w-44" ariaLabel="Förfallodatum" />
                    <button
                      type="submit"
                      disabled={savingEdit || !editDescription.trim() || !editDueDate}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      Spara
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Avbryt
                    </button>
                  </form>
                </li>
              );
            }
            const overdue = todo.dueDate < today;
            return (
              <li key={todo.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-900 dark:text-zinc-50">
                    {todo.description}
                  </p>
                  <p
                    className={`mt-0.5 text-xs tabular-nums ${
                      overdue
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {overdue && (
                      <span className="mr-1.5 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        Akut
                      </span>
                    )}
                    {todo.dueDate}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => startEdit(todo)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                    aria-label="Redigera"
                  >
                    Redigera
                  </button>
                  <button
                    onClick={() => onDelete(todo.id)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                    aria-label="Ta bort"
                  >
                    Klar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TopExpenses({ data }: { data: DashboardOverview }) {
  const max = Math.max(1, ...data.topExpenses.map((e) => Math.abs(e.r12)));
  if (data.topExpenses.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500">Inga utgifter att visa.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.topExpenses.map((e) => (
        <li key={e.accountId}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-zinc-900 dark:text-zinc-50">{e.accountName}</span>
            <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-400 dark:text-zinc-500">
                {formatSEK(e.period)} mån ·{" "}
              </span>
              {formatSEK(e.r12)} R12
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-red-500/70"
              style={{ width: `${(Math.abs(e.r12) / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

type RecurringExpectedItem = RecurringItemStatus & {
  remaining: number;
  expectedTotal: number;
};

function RecurringExpected({ items }: { items: RecurringItemStatus[] }) {
  const withRemaining: RecurringExpectedItem[] = items.map((r) => {
    const remaining = Math.max(
      1,
      r.recurringItem.expectedPerMonth - r.currentPeriodCount
    );
    return { ...r, remaining, expectedTotal: r.estimatedAmount * remaining };
  });

  const expenses = withRemaining.filter((r) => r.flowType !== "income");
  const incomes = withRemaining.filter((r) => r.flowType === "income");
  const expenseSum = expenses.reduce((s, r) => s + r.expectedTotal, 0);
  const incomeSum = incomes.reduce((s, r) => s + r.expectedTotal, 0);

  return (
    <div className="space-y-4">
      <RecurringGroup title="Utgifter" items={expenses} sum={expenseSum} tone="expense" />
      {incomes.length > 0 && (
        <RecurringGroup title="Intäkter" items={incomes} sum={incomeSum} tone="income" />
      )}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm font-semibold dark:border-zinc-700">
        <span className="text-zinc-700 dark:text-zinc-300">Netto att vänta</span>
        <span className={`tabular-nums ${amountColor(incomeSum - expenseSum)}`}>
          {formatSEK(incomeSum - expenseSum)}
        </span>
      </div>
    </div>
  );
}

function RecurringGroup({
  title,
  items,
  sum,
  tone,
}: {
  title: string;
  items: RecurringExpectedItem[];
  sum: number;
  tone: "expense" | "income";
}) {
  if (items.length === 0) return null;
  const sumColor =
    tone === "income"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h3>
        <span className={`text-sm font-semibold tabular-nums ${sumColor}`}>
          {tone === "income" ? "+" : "−"}
          {formatSEK(sum)}
        </span>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
        {items.map((r) => (
          <li key={r.recurringItem.id} className="flex items-center justify-between py-1.5 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-zinc-900 dark:text-zinc-50">
                {r.recurringItem.namn}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                {r.currentPeriodCount}/{r.recurringItem.expectedPerMonth}
              </span>
            </span>
            <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
              {r.estimatedAmount > 0 ? formatSEK(r.expectedTotal) : "okänt"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
