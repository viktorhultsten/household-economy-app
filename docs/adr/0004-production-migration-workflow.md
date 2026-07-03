# Produktionsmigrationer: baseline + repetera på klon

Produktionsdatabasen (`economy`) skapades innan Drizzle infördes — schemat
byggdes från gamla `schema.sql` vid runtime och ad-hoc-SQL applicerades för hand.
Den saknar därför Drizzles migrationshistorik, och dess faktiska schema kan
avvika från vad `0000_silky_kronos` beskriver (t.ex. `date`-kolumner som ligger
kvar som `TEXT`, eller tabeller som lades till via handkörda migrationer).

Vi migrerar prod enligt två principer:

1. **Försona och baselinea en gång.** Prods faktiska schema avvek från Drizzles
   `0000` (constraint-namn som `*_fkey`/`*_key` i stället för `*_fk`/`*_unique`,
   `TEXT`-kolumner som borde vara `date`, saknade `NOT NULL`, samt döda kolumner
   från den borttagna periodförskjutningen). `npm run db:migrate:prod` kör därför
   en **idempotent försoning** ([scripts/reconcile.ts](../../scripts/reconcile.ts))
   som byter constraint-namn, konverterar kolumntyper, lägger till `NOT NULL` och
   släpper döda objekt, registrerar sedan `0000` som applicerad
   ([scripts/baseline.ts](../../scripts/baseline.ts)) och applicerar nya
   migrationer. Varje steg är en no-op när databasen redan är i linje, så samma
   kommando är säkert att köra om och håller dev/prod identiska med en
   nybyggd databas.

2. **Repetera alltid på en klon först.** `npm run db:rehearse` kopierar prod
   (läsning endast, via `pg_dump`) till en slängbar databas, kör hela
   prod-proceduren där, och jämför resultatet mot ett kanoniskt schema byggt
   enbart från migrationerna. En tom diff bevisar att prods verkliga schema
   matchar det kanoniska innan vi rör prod. Kvarvarande skillnader åtgärdas i
   `reconcile.ts` (eller, om rent kosmetiska, i differ-normaliseringen) först.

Migrationer körs som ett **medvetet manuellt steg** (`npm run db:migrate:prod`)
före utrullning av ny app-image — inte automatiskt vid container-start. En
`pg_dump`-backup tas manuellt före varje körning. Fullständigt flöde finns i
[docs/runbooks/prod-migration.md](../runbooks/prod-migration.md).

Alternativet — att baselinea och migrera prod direkt utan repetition — förkastades:
eftersom prods verkliga schema inte går att härleda ur koden (det beror på vilka
ad-hoc-migrationer som historiskt kördes) skulle dold drift upptäckas först på
prod. Kostnaden för en repetition på en klon är låg och gör varje framtida
migration förutsägbar.
