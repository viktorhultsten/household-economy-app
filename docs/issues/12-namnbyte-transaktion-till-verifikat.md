# 12 — Namnbyte transaktion → verifikat (kod, rutter, UI)

Status: Klar

## What to build

Byt namn i hela kodlagret från "transaction"/"transaktion" till "verifikat", i linje med ordlistan i [CONTEXT.md](../../CONTEXT.md) och beslutet i [ADR 0007](../adr/0007-verifikat-namnbyte-behall-fysiska-db-namn.md). Bytet omfattar TypeScript-typer (`Transaction` → `Verifikat`), komponenter (`TransactionForm` → `VerifikatForm`, `TransactionList` → `VerifikatList`), server-actions (`createTransaction` → `createVerifikat` osv.), rutten `/transactions` → `/verifikat`, navigationen och all synlig text.

De **fysiska Postgres-namnen lämnas oförändrade** (tabellen `transactions`, kolumnerna `transaction_id`, join-tabellen `transaction_recurring_items` osv.), mappade via Drizzles namnsträngar. Ingen databasmigration ingår.

Primärknappen när ett nytt verifikat skapas ska stå **"Skapa verifikat"**; vid redigering av ett befintligt verifikat ska den stå **"Spara verifikat"**. Synliga etiketter byts: "Transaktioner" → "Verifikat", "Ny transaktion" → "Nytt verifikat", "Transaktionsbeskrivning" → "Verifikatbeskrivning".

## Acceptance criteria

- [x] TypeScript-typer, komponenter och server-actions byter namn från transaction till verifikat
- [x] Rutten `/transactions` byter till `/verifikat` och navigationen pekar rätt
- [x] All synlig text säger "verifikat" i stället för "transaktion"
- [x] Primärknapp säger "Skapa verifikat" vid nytt och "Spara verifikat" vid redigering
- [x] Fysiska DB-tabell- och kolumnnamn är oförändrade (ingen migration)
- [x] Befintliga tester passerar efter namnbytet (uppdaterade importer/namn)

## Blocked by

- None - can start immediately
