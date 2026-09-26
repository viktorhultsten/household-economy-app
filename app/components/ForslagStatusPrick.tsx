import { ForslagStatus } from "../lib/konteringsforslag";

// Samma färger som förslagskorten i bokföringsvyn: grönt säkert, blått val, grått inget.
const FARG: Record<ForslagStatus, string> = {
  saker: "bg-green-500",
  val: "bg-blue-500",
  okand: "bg-zinc-300 dark:bg-zinc-600",
};

const ETIKETT: Record<ForslagStatus, string> = {
  saker: "Säkert konteringsförslag",
  val: "Konteringsförslag att välja bland",
  okand: "Inget konteringsförslag",
};

/** Liten prick med appens bedömning av en bankhändelse. `null` medan den bedöms. */
export default function ForslagStatusPrick({ status }: { status: ForslagStatus | null }) {
  if (status === null) {
    return (
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full bg-zinc-200 animate-pulse dark:bg-zinc-700"
        aria-label="Bedöms"
      />
    );
  }
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${FARG[status]}`} aria-label={ETIKETT[status]} />;
}
