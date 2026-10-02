"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Analysverktygen. Ett nytt verktyg läggs till här och under app/analys/<verktyg>.
const verktyg = [{ href: "/analys/kontohistorik", label: "Kontohistorik" }];

export default function AnalysFlikar() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
      {verktyg.map((v) => {
        const isActive = pathname === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}
