"use client";

export type SegmentStatus = "saved" | "flagged" | "pending";

/** Segmenterad förloppskarta över kön — ett klickbart segment per händelse. */
export function Forloppskarta({
  segments,
  currentIndex,
  onJump,
}: {
  segments: SegmentStatus[];
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  if (segments.length <= 1) return null;
  return (
    <div className="flex gap-0.5" role="group" aria-label="Förloppskarta">
      {segments.map((status, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump(i)}
          aria-label={`Gå till händelse ${i + 1}`}
          aria-current={i === currentIndex ? "true" : undefined}
          className={[
            "flex-1 min-w-[6px] h-2 rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-300",
            status === "saved"
              ? "bg-green-500"
              : status === "flagged"
              ? "bg-white border border-zinc-300 dark:bg-zinc-300 dark:border-zinc-400"
              : "bg-amber-400",
            i === currentIndex
              ? "ring-2 ring-zinc-700 dark:ring-zinc-100 ring-offset-1 ring-offset-white dark:ring-offset-zinc-800"
              : "opacity-70 hover:opacity-100",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/** ‹ x av N › — bläddring i kön. */
export function KoPilar({
  currentIndex,
  total,
  disabled = false,
  onNavigate,
}: {
  currentIndex: number;
  total: number;
  disabled?: boolean;
  onNavigate: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
      <button
        type="button"
        onClick={() => onNavigate(-1)}
        disabled={currentIndex === 0 || disabled}
        className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
        aria-label="Föregående händelse"
      >
        ‹
      </button>
      <span className="tabular-nums select-none">
        {currentIndex + 1} av {total}
      </span>
      <button
        type="button"
        onClick={() => onNavigate(1)}
        disabled={currentIndex === total - 1 || disabled}
        className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
        aria-label="Nästa händelse"
      >
        ›
      </button>
    </div>
  );
}

/** Växlar mellan förenklad och vanlig bokföringsvy när säkra händelser godkänns. */
export function VyVaxlare({
  vy,
  onVaxla,
}: {
  vy: "forenklad" | "vanlig";
  onVaxla: () => void;
}) {
  const knapp = (aktiv: boolean) =>
    `px-3 py-1 text-xs font-medium rounded ${
      aktiv
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-50"
        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;
  return (
    <div className="inline-flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-900" role="group" aria-label="Vy">
      <button
        type="button"
        aria-pressed={vy === "forenklad"}
        onClick={vy === "forenklad" ? undefined : onVaxla}
        className={knapp(vy === "forenklad")}
      >
        Förenklad
      </button>
      <button
        type="button"
        aria-pressed={vy === "vanlig"}
        onClick={vy === "vanlig" ? undefined : onVaxla}
        className={knapp(vy === "vanlig")}
      >
        Vanlig
      </button>
    </div>
  );
}
