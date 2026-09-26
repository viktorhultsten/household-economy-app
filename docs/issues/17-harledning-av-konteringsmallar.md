# 17 — Härledning av konteringsmallar ur historik

Status: Klar

## What to build

En ren, deterministisk funktion som tar historiska verifikat med bankhändelser och befintliga mallar, och returnerar vilka mallar som ska skapas, justeras eller tas bort. Den körs inte automatiskt här (det gör issue 21), men den ska kunna köras från ett skript mot dev-databasen.

**Historik.** Varje verifikat delas upp i ankarrad (importens konto, annars den enda tillgångsraden) och motkonton, uttryckta relativt ankarraden. Periodiseringar utesluts. En spegling räknas därmed som samma konteringsalternativ.

**Matchningsattribut.**
- **Nyckelord:** ett ord i beskrivningen blir nyckelord när det förekommer tillräckligt ofta och huvudsakligen leder till samma mall. Nyckelord som inte tillför täckning (t.ex. "maxi" bredvid "ica") tas bort.
- **Beloppsintervall:** används när samma ord leder till olika alternativ som skiljs åt av beloppet.
- **Dag i månaden:** används när den ger ett tätt mönster. Avståndet mäts i kalenderdagar över månadsskiften, med förankring från början eller slut av månaden, beroende på vad som ger tätast mönster.
- **Riktning:** används bara när in- och utbetalningar bokförs på olika sätt, och inte bara speglat.

**Konteringsalternativ.** Liknande bankhändelser som konterats på olika sätt blir alternativ i *samma* mall, med andel. Alternativ med få förekomster och låg andel (outliers) tas inte med. Andelarna vid split bestäms robust (t.ex. median) så att enstaka avvikande split inte slår igenom.

**Samspel med befintliga mallar.**
- **Låsta och inaktiverade mallar:** en härledd mall skapas inte om den i huvudsak skulle matcha samma historiska bankhändelser som en låst eller inaktiverad mall.
- **Olåsta mallar** (även de användaren skapat) får justeras, slås ihop eller tas bort. Borttagning markerar mallen som borttagen.
- **Identitet:** en befintlig olåst mall uppdateras i stället för att en ny skapas när de matchar i huvudsak samma händelser. Ändrade nyckelord eller beloppsgränser ger alltså ingen ny mall.

Resultatet innehåller en beskrivning av varje ändring, så att ändringsloggen och körningsloggen kan fyllas (issue 21).

## Acceptance criteria

- [x] Ren funktion: historik + befintliga mallar → skapa/justera/ta bort, med ändringsbeskrivningar
- [x] Spegling räknas som samma alternativ, egen mall bara när motsatt riktning bokförs på annat sätt
- [x] Nyckelord, beloppsintervall, dag i månaden och riktning används bara när de särskiljer
- [x] Dag i månaden mäts över månadsskiften (30/6–1/7 och 28/2–1/3 är nära)
- [x] Flera vanliga konteringar blir alternativ i samma mall, outliers tas inte med
- [x] Låsta och inaktiverade mallar blockerar konkurrerande härledda mallar via överlapp i matchade händelser
- [x] Olåsta mallar justeras på plats i stället för att dupliceras
- [x] Test som täcker: butikskedja med flera filialer, speglad kreditering, bonus som egen mall, beloppsseparerade alternativ, dragning runt månadsskifte, outlier, blockering från låst och inaktiverad mall
- [x] Skript som kör härledningen mot dev-databasen och skriver ut resultatet, utan att spara något

## Implementation

- Härledningen ligger i `app/lib/konteringsmallHarledning.ts` (`harledKonteringsmallar`), med gränserna samlade i `HARLEDNING_PARAMETRAR`. Tester i `tests/konteringsmallHarledning.test.ts`.
- `npm run mallar:harled:dev` kör härledningen mot dev-databasen och skriver ut resultatet utan att spara.
- **Nyckelord** väljs girigt: ordet med flest händelser av sitt vanligaste alternativ först, bland händelser som inget tidigare ord tagit. Ett ord vars vanligaste alternativ står för under hälften (ortnamn, "överföring", "swish") blir ingen mall.
- **Delning** under ett nyckelord prövar riktning, ytterligare nyckelord, beloppsgräns och dag i månaden, och väljer den som ger flest händelser med sitt vanligaste alternativ. Riktning och belopp delar i två kompletterande mallar. Ytterligare nyckelord och dag bryter ut en *specifikare* mall (t.ex. `ica` + `försäkr`), men den övriga mallen matchar fortfarande de utbrutna händelserna, eftersom modellen inte kan uttrycka "inte". Ankarkonto sätts aldrig på härledda mallar. Alternativen är relativa ankaret, så samma mönster på bankkonto och skuldkonto är samma alternativ.
- **Matchningssemantik** (`matcharMall`, återanvänds i issue 19): *alla* nyckelord måste finnas bland beskrivningens ord (samma tokenisering som issue 11). Beloppsintervallet gäller absolutbeloppet, och övriga attribut gäller bara när de är satta.
- **Identitet**: först par med Jaccard ≥ 0,5 på matchade historiska händelser, sedan olåsta mallar vars händelser till största delen ryms i en härledd mall. Den första justeras och övriga slås ihop (tas bort). En olåst mall med minst `minStod` matchade händelser som inte motsvaras av något mönster tas bort. En mall med mindre underlag lämnas orörd, så att en nyskapad användarmall inte försvinner.
- **Att ta vidare till issue 18/19**: när en specifikare mall (fler nyckelord eller dag) och en allmännare mall matchar samma bankhändelse bör den specifikare vinna, på samma sätt som riktningsmallen vinner för sin riktning.

## Blocked by

- 16-konteringsmall-datamodell
