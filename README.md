# Privatekonomi — Bokföring

En lokal [Next.js](https://nextjs.org)-app för privat ekonomihantering: importera
bankhändelser från CSV, bokför dem med dubbel bokföring och läs ut resultat- och
balansräkning. En användare, ingen autentisering. Se [CONTEXT.md](CONTEXT.md) för
domänspråk och [docs/adr/](docs/adr/) för arkitekturbeslut.

## Kom igång

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i webbläsaren.

Databasåtkomst styrs av `DATABASE_URL` i `.env` (Postgres). Standard pekar på
prod-databasen `economy`; sätt `DEV_DATABASE_URL`/`DEV_DB_NAME` för att arbeta
mot dev-databasen `economy_dev`.

## npm-scripts

### Applikation

| Script | Beskrivning |
| --- | --- |
| `npm run dev` | Startar Next.js-utvecklingsservern med hot reload. |
| `npm run build` | Bygger produktionsbundeln. |
| `npm run start` | Startar en redan byggd produktionsserver. |
| `npm run start:prod` | Bygger och startar produktionsservern i ett steg. |
| `npm test` | Kör testsviten i `tests/` med Node:s test runner via `tsx`. |
| `npm run lint` | Kör ESLint över kodbasen. |

### Databas och migrationer

Schemat definieras i [lib/schema.ts](lib/schema.ts). Migrationer genereras med
Drizzle och appliceras via egna skript som först **försonar och baselinear** det
pre-Drizzle-skapade prod-schemat (se
[docs/adr/0004-production-migration-workflow.md](docs/adr/0004-production-migration-workflow.md)).
Fullständigt prod-flöde: [docs/runbooks/prod-migration.md](docs/runbooks/prod-migration.md).

| Script | Mål | Beskrivning |
| --- | --- | --- |
| `npm run db:generate` | — | Genererar en migrationsfil i `drizzle/` från diff mot schemat. |
| `npm run db:migrate:test` | slängbar DB | Applicerar alla migrationer på en tom, temporär databas och bevisar att de är självständiga. |
| `npm run db:migrate:dev` | `economy_dev` | Försonar, baselinear och migrerar dev-databasen. |
| `npm run db:rehearse` | `economy_rehearsal` | Klonar prod (läsning endast) och repeterar hela migrationen med drift-kontroll mot det kanoniska schemat. Kör alltid före prod. |
| `npm run db:migrate:prod` | `economy` (prod) | Försonar, baselinear och migrerar prod. Kräver interaktiv bekräftelse av databasnamnet. |
| `npm run db:refresh` | `economy_dev` | Skriver över dev med en färsk kopia av prod via `pg_dump \| psql`. Prod behandlas strikt som läsbart och kopplas aldrig ner. |

### Konteringsmallar

Mallanalysen körs varje natt av tjänsten `mallanalys` i `docker-compose.yml`. Drift
och felsökning: [docs/runbooks/mallanalys.md](docs/runbooks/mallanalys.md). Hur nya
versioner rullas ut automatiskt: [docs/runbooks/drift.md](docs/runbooks/drift.md).

| Script | Mål | Beskrivning |
| --- | --- | --- |
| `npm run mallar:analys:dev` | `economy_dev` | Kör mallanalysen en gång: härleder mallar, sparar ändringarna och uppdaterar statistiken. |
| `npm run mallar:analys` | `DATABASE_URL` (prod) | Samma körning som den nattliga, mot prod. |
| `npm run mallar:harled:dev` | `economy_dev` | Kör härledningen och skriver ut resultatet, utan att spara. |
| `npm run mallar:kalibrera:dev` | `economy_dev` | Backtest av sannolikhetsmodellen, utan att spara. |

### Underhåll och diagnostik

| Script | Beskrivning |
| --- | --- |
| `npm run cleanup:orphaned-events` | Hittar och rensar bankhändelser vars kopplade verifikat inte längre finns. |
| `npm run cleanup:orphaned-transactions` | Hittar och rensar verifikat utan konteringsrader och avmarkerar deras bankhändelser. |
| `npm run diagnose:imports` | Skriver ut en översikt över senaste importer och deras bankhändelser för felsökning. |
