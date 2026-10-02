import AnalysFlikar from "./AnalysFlikar";

export default function AnalysLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Analys</h1>
        <AnalysFlikar />
        {children}
      </main>
    </div>
  );
}
