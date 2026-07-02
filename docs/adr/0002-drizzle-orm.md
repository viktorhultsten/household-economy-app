# Drizzle ORM med drizzle-kit-migrationer

Dataåtkomsten flyttas från handskriven SQL (rå `pg` + hjälpare i `lib/db.ts`) till **Drizzle ORM**. Schemat definieras i TypeScript och **drizzle-kit** blir den enda källan till sanning för databasstrukturen med versionerade migrationer.

Detta ersätter det tidigare upplägget där hela `schema.sql` kördes vid runtime och parallella, oversionerade SQL-filer (`migrations/`, `lib/migrations/`) applicerades ad-hoc via skript — vilket riskerade drift mellan `schema.sql` och faktisk databas.

Drizzle valdes framför Prisma (eget query-språk passar de komplexa resultat-/balansaggregeringarna sämre) och Kysely (saknar schema-/migrationslösning). Drizzle är SQL-nära: rå SQL kan fortfarande användas via `sql`-taggen för finkalibrerade resultat- och balansfrågor, så inget uttrycksfullt går förlorat.
