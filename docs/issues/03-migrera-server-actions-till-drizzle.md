# 03 — Migrera server actions till Drizzle

## What to build

Skriv om alla server actions i `app/actions.ts` från handskriven `pg`-SQL till Drizzle enligt ADR 0002. Ta bort de gamla, oversionerade migrationsfilerna (`migrations/`, `lib/migrations/`) och de ad-hoc-skript som applicerade dem, så att `drizzle-kit` blir enda migrationsvägen.

Finkalibrerade aggregeringar (resultat- och balansräkning) får fortsatt använda rå SQL via Drizzles `sql`-tagg där det är tydligare. I samband med omskrivningen ska den duplicerade läslogiken i `getAllTransactions` och `getTransactionsPaginated` konsolideras till en gemensam query/mapping.

## Acceptance criteria

- [x] Alla server actions läser/skriver via Drizzle
- [x] `getAllTransactions` och `getTransactionsPaginated` delar gemensam query- och mapping-logik (ingen copy-paste)
- [x] Resultat- och balansräkning ger samma värden som före migreringen (inkl. korrekta månadsgränser utan tidszonsberoende)
- [x] Mapparna `migrations/` och `lib/migrations/` samt tillhörande ad-hoc-skript är borttagna
- [x] Appen bygger, lint passerar, och samtliga vyer fungerar

## Blocked by

- 02-drizzle-fundament
