"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Översikt" },
    { href: "/bokfor", label: "Bankhändelser" },
    { href: "/verifikat", label: "Verifikat" },
    { href: "/resultat", label: "Resultat" },
    { href: "/balans", label: "Balans" },
    { href: "/budget", label: "Budget" },
    { href: "/analys", label: "Analys" },
    { href: "/periodiseringar", label: "Periodiseringar" },
    { href: "/settings", label: "Inställningar" },
  ];

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-50 dark:hover:bg-zinc-700"
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
