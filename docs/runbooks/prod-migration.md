# Runbook: migrera produktionsdatabasen

Produktionsdatabasen (`economy`) och dev-databasen (`economy_dev`) ligger på samma
Docker-Postgres på Ubuntu-maskinen i det lokala nätet. Din laptops `.env`
`DATABASE_URL` pekar på **`economy` (prod)** som standard.

Produktionsdatabasen (`economy`) skapades innan Drizzle fanns (byggd från gamla `schema.sql`
vid runtime plus handkörda ad-hoc-migrationer). Den saknar därför Drizzles migrationshistorik
**och** dess faktiska schema avvek från Drizzle-schemat (constraint-namn, `TEXT`- i stället för
`date`-kolumner, saknade `NOT NULL`, döda kolumner från borttagna funktioner). Både
baselineingen och denna **försoning** sköts automatiskt och idempotent av
`npm run db:migrate:prod` (via `scripts/reconcile.ts` + `scripts/baseline.ts`). Stegen är
no-ops när databasen redan är i linje, så det är säkert att köra om.

`npm run db:rehearse` bevisar på en klon av prod att försoning + baseline + migrate ger ett
schema som är identiskt med det kanoniska Drizzle-schemat innan du rör prod.

## Standardflöde vid varje migration

Kör alltid i denna ordning. Steg 1 och 2 är obligatoriska säkerhetsnät.

### 1. Repetera på en klon av prod

```bash
npm run db:rehearse
```

Detta kopierar prod (läsning endast) till `economy_rehearsal`, kör samma
försoning + baseline + migrate som prod kommer få, och gör en **drift-kontroll**
genom att jämföra klonens schema mot ett kanoniskt schema byggt enbart från
migrationerna.

- **`✅ Drift check passed`** → prod matchar Drizzle-schemat, fortsätt.
- **`❌ Drift detected`** → utöka [scripts/reconcile.ts](../../scripts/reconcile.ts)
  (eller differ-normaliseringen om skillnaden är rent kosmetisk) och repetera om
  innan du rör prod.

### 2. Ta en backup av prod

```bash
mkdir -p backups
pg_dump "$DATABASE_URL" > "backups/economy-$(date +%Y%m%d-%H%M%S).sql"
```

Detta är din återställningspunkt. Spara sökvägen.

### 3. Applicera migrationen på prod

```bash
npm run db:migrate:prod
```

Skriptet visar värd + databasnamn och kräver att du skriver databasnamnet
(`economy`) för att fortsätta. Det försonar schemat, baselineel:ar om historik
saknas och applicerar sedan alla nya migrationer — allt idempotent.

> Vill du skippa den interaktiva bekräftelsen (t.ex. i ett skript):
> `CONFIRM_PROD_MIGRATION=economy npm run db:migrate:prod`.

### 4. Rulla ut appen

Deploya den nya app-imagen efter att migrationen gått igenom:

```bash
docker compose up -d --build
```

## Om något går fel: återställ från backup

```bash
# Anslut till maintenance-databasen (postgres) på samma server.
psql "<...>/postgres" -c 'DROP DATABASE "economy"'
psql "<...>/postgres" -c 'CREATE DATABASE "economy"'
psql "$DATABASE_URL" < backups/economy-<timestamp>.sql
```

## Att skapa nya migrationer (utvecklingsflöde)

1. Ändra schemat i [lib/schema.ts](../../lib/schema.ts).
2. Generera migration: `npm run db:generate` (granska SQL:en i `drizzle/`).
3. Verifiera att den är självständig på en tom databas: `npm run db:migrate:test`.
4. Applicera på dev: `npm run db:migrate:dev`.
5. När du är redo för prod: följ standardflödet ovan.

## Kommandokarta

| Kommando | Mål | Effekt |
| --- | --- | --- |
| `npm run db:generate` | — | Genererar migrationsfil från schema-diff |
| `npm run db:migrate:dev` | `economy_dev` | Baseline + migrate på dev |
| `npm run db:migrate:test` | slängbar DB | Bevisar att migrationerna är självständiga |
| `npm run db:rehearse` | `economy_rehearsal` | Klonar prod, repeterar migration, drift-kontroll |
| `npm run db:migrate:prod` | `economy` (prod) | Baseline + migrate på prod (med bekräftelse) |
