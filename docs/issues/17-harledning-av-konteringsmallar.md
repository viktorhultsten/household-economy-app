# 17 — Härledning av konteringsmallar ur historik

Status: Ej påbörjad

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

- [ ] Ren funktion: historik + befintliga mallar → skapa/justera/ta bort, med ändringsbeskrivningar
- [ ] Spegling räknas som samma alternativ, egen mall bara när motsatt riktning bokförs på annat sätt
- [ ] Nyckelord, beloppsintervall, dag i månaden och riktning används bara när de särskiljer
- [ ] Dag i månaden mäts över månadsskiften (30/6–1/7 och 28/2–1/3 är nära)
- [ ] Flera vanliga konteringar blir alternativ i samma mall, outliers tas inte med
- [ ] Låsta och inaktiverade mallar blockerar konkurrerande härledda mallar via överlapp i matchade händelser
- [ ] Olåsta mallar justeras på plats i stället för att dupliceras
- [ ] Test som täcker: butikskedja med flera filialer, speglad kreditering, bonus som egen mall, beloppsseparerade alternativ, dragning runt månadsskifte, outlier, blockering från låst och inaktiverad mall
- [ ] Skript som kör härledningen mot dev-databasen och skriver ut resultatet, utan att spara något

## Blocked by

- 16-konteringsmall-datamodell
