# Dagdatum som text, aldrig som `Date`

En bankhändelse har ett datum och ingen tid. Verifikat, importintervall och periodiseringar ärver det datumet. Alla sådana **dagdatum** hanteras i appen som texten `"YYYY-MM-DD"`, typen `Datum` i `app/lib/datum.ts`, hela vägen från databasen till skärmen och tillbaka. De blir aldrig ett JavaScript-`Date`.

## Varför

Ett `Date` är en tidpunkt, inte en dag. Vilken dag en tidpunkt faller på beror på tidszonen. Förut:

- gjorde `pg` om varje `date`-kolumn till ett `Date` vid midnatt i serverns tidszon;
- läste formuläret datumet med `toISOString()`, alltså i UTC;
- sparade servern `toISOString()` tillbaka.

I produktion kör containern i UTC, så felen tog ut varandra. På en server i svensk tid visade bokföringsvyn dagen före bankhändelsens datum och skulle ha sparat den. Rapporternas månadsintervall tog med föregående månads sista dag. Fältet för datum godkände aldrig ett inskrivet datum i en webbläsare öster om UTC.

## Beslut

- `pg` returnerar `date`-kolumner som text (typparser i `lib/db.ts`).
- Dagdatum i typerna är `Datum`, och datum skickas som text i SQL-parametrar.
- Uträkningar med dagdatum (månadens första och sista dag, att lägga till månader eller dagar, veckodag) görs med funktionerna i `app/lib/datum.ts`. De är rena och ger samma svar i alla tidszoner.
- Den enda övergången från tidpunkt till dag är `idag()`, som tar den lokala kalenderdagen.
- **Tidsstämplar** (när något skapades, importerades eller låstes) är fortfarande `Date`, eftersom de är tidpunkter.

## Konsekvenser

- Appen ger samma datum oavsett serverns och webbläsarens tidszon. `TZ` behöver inte sättas för webbappen.
- Datum visas som de lagras, `ÅÅÅÅ-MM-DD`, vilket är samma format som `sv-SE` gav tidigare.
- Ny kod som behöver ett dagdatum ska använda `Datum` och `app/lib/datum.ts`, inte `new Date(...)`.
