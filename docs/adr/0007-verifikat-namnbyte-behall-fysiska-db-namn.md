# Namnbyte till "verifikat" i kodlagret — behåll fysiska DB-namn

Ordlistan ([CONTEXT.md](../../CONTEXT.md)) har sedan tidigare "verifikat" som
kanoniskt begrepp och avråder från "transaktion", men koden, rutterna och UI:t
använde genomgående "transaction"/"transaktion". Vi byter därför namn i hela
kodlagret — TypeScript-typer (`Transaction` → `Verifikat`), komponenter
(`TransactionForm` → `VerifikatForm`), server-actions (`createTransaction` →
`createVerifikat`), rutten `/transactions` → `/verifikat` samt all synlig text —
så att ubik-språket blir konsekvent från databaskant till UI.

Vi behåller däremot de **fysiska Postgres-namnen oförändrade** (tabellen heter
fortsatt `transactions`, kolumnerna `transaction_id`, join-tabellen
`transaction_recurring_items` osv.), mappade via Drizzles namnsträngar
(`pgTable("transactions", …)`). Skälet är att ett fysiskt schemabyte skulle kräva
en migration genom prod-runbooken ([ADR 0004](0004-production-migration-workflow.md))
och en omskrivning av balansinvariant-triggern
([ADR 0003](0003-balance-invariant-choke-point.md)) — reell och svårreverserad
risk — för noll värde i det dagliga arbetet, eftersom fysiska kolumnnamn aldrig
syns i kod, rutter eller UI.

Konsekvensen är att en framtida läsare ser Drizzle-objektet `verifikat` mappa mot
tabellen `"transactions"`. Detta är avsiktligt och dokumenteras här så att
avvikelsen inte "rättas" av misstag. Ett framtida fysiskt namnbyte kan göras som
en separat, dedikerad migration om det någonsin bedöms värt kostnaden.
