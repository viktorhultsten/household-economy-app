# 01 — Ta bort periodförskjutning helt

## What to build

Ta bort den halvbyggda och inkoherenta periodförskjutnings-funktionen helt och hållet, end-to-end. Funktionen dubbelräknar belopp (kopierar samma konteringsrader till ett nytt datum), saknar UI för att skapas, och `bridge_account_id` skrivs aldrig. Den är beslutad som out of scope och får övervägas för återimplementation senare som en riktig periodisering via interimskonto.

Berör alla lager: datamodell, server actions, typer och UI. Befintliga verifikat ska vara oförändrade efter borttaget (inga data går förlorade utöver de döda kolumnerna/länkarna).

Omfattar bland annat:
- Datamodell: kolumnerna `original_transaction_id`, `period_shift_date`, `bridge_account_id` på `transactions` (samt migrationsfilen `lib/migrations/add_linked_transactions.sql`).
- `app/types.ts`: `periodShiftDate`, `bridgeAccountId`, `originalTransactionId`, `linkedTransaction` på `Transaction`.
- `app/actions.ts`: periodförskjutnings-grenen i `createTransaction`, tillhörande läsning/mapping och `periodShiftBonus`.
- `app/components/TransactionForm.tsx` och `app/components/TransactionList.tsx`: all UI som skapar/visar "Periodförskjuten".

## Acceptance criteria

- [ ] Inga referenser till period-shift/bridge-begrepp kvarstår i typer, server actions eller UI
- [ ] Döda kolumner tas bort via en migration; befintliga verifikat och konteringsrader är intakta
- [ ] Appen bygger och lint passerar
- [ ] TransactionList visar inte längre "Periodförskjuten"-etiketter

## Blocked by

- None - can start immediately
