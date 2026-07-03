# 02 — Drizzle-fundament (HITL)

## What to build

Lägg grunden för Drizzle ORM som nytt datalager enligt ADR 0002. Definiera hela databasschemat i TypeScript med Drizzle, sätt upp `drizzle-kit` för versionerade migrationer, och ersätt den runtime-körning av `schema.sql` som idag sker i `lib/db.ts` vid första anrop.

Detta är en **HITL**-skiva: schemats slutgiltiga form ska granskas innan resten byggs ovanpå. Två domänbeslut ska befästas i schemat:
- Datumkolumner (`transactions.date`, `bank_events.date`, `imports.date_range_*`) blir SQL **`date`** (kalenderdatum, ingen tid/tidszon) i stället för `TEXT`.
- All pengar-representation är **`numeric`/`decimal`**, aldrig float.

Schemat ska vara den enda källan till sanning; `drizzle-kit`-migrationer genererar databasstrukturen. Ingen server-action-migrering sker i denna skiva (det görs i #03) — här levereras schema, migrationskonfiguration och en genererad initial migration som matchar nuvarande (efter #01 rensade) databas.

## Acceptance criteria

- [x] Drizzle och `drizzle-kit` är installerade och konfigurerade mot `DATABASE_URL`
- [x] Hela nuvarande schemat är definierat i TypeScript med `date`-kolumner för datum och `numeric` för belopp
- [x] En initial `drizzle-kit`-migration är genererad och kan appliceras mot en tom databas
- [x] Runtime-körningen av `schema.sql` i `lib/db.ts` är borttagen
- [x] Schemat är granskat och godkänt av människa innan #03 påbörjas

## Blocked by

- 01-ta-bort-periodforskjutning
