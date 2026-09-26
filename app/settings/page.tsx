import Link from "next/link";

export default function InstallningarPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
          Inställningar
        </h1>

        {/* Hantera */}
        <div className="mb-8 rounded-lg bg-white shadow dark:bg-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Hantera
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Hantera konton och perioder.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/accounts"
              className="inline-block px-4 py-2 text-sm font-medium rounded-md transition-colors bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
            >
              Konton
            </Link>
            <Link
              href="/periods"
              className="inline-block px-4 py-2 text-sm font-medium rounded-md transition-colors bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
            >
              Perioder
            </Link>
          </div>
        </div>

        {/* Säkerhetskopiering */}
        <div className="mb-8 rounded-lg bg-white shadow dark:bg-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Säkerhetskopiering
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Ladda ner hela databasen som en komprimerad säkerhetskopia.
          </p>
          <a
            href="/api/export"
            download
            title="Exportera databasen som komprimerad säkerhetskopia"
            className="inline-block px-4 py-2 text-sm font-medium rounded-md transition-colors bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Exportera databas
          </a>
        </div>
      </main>
    </div>
  );
}
