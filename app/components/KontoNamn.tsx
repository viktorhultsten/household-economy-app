import { Account } from "../types";

/** Kontonamnet följt av gruppen inom parentes, som i sparade verifikat. */
export default function KontoNamn({ account }: { account: Pick<Account, "namn" | "group"> | null | undefined }) {
  return (
    <>
      {account?.namn || "—"}
      {account?.group && (
        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">({account.group.namn})</span>
      )}
    </>
  );
}
