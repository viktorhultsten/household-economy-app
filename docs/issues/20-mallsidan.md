# 20 — Mallsidan: se och justera konteringsmallar

Status: Ej påbörjad

## What to build

En ny mallsida där användaren ser det gemensamma regelverket och arbetar i det tillsammans med appen.

**Lista**
- **Per mall:** namn, ursprung (app/användare), låst eller olåst, matchningsattribut i läsbar form (t.ex. "ica, willys · utgift · dag 23–27"), konteringsalternativ med andel, statistik från senaste mallanalysen (antal bankhändelser och senast använd) och en kort beskrivning av senaste ändringen.
- **Sektioner:** inaktiverade mallar ligger i en egen sektion. Borttagna mallar visas inte.

**Skapa och justera**
- **Formulär:** användaren kan skapa en mall och ändra matchningsattribut och alternativ.
- **Låsfrågan:** när en mall sparas får användaren frågan om den ska låsas. Frågan förklarar konsekvensen: en låst mall ändras aldrig av appen, medan en olåst kan justeras och även ändras tillbaka.
- **Lås upp:** en låst mall kan låsas upp.

**Inaktivera**
- **Inaktivera:** en aktiv mall kan inaktiveras, och den föreslås då inte längre.
- **Återaktivera eller radera:** en inaktiverad mall kan återaktiveras, eller raderas så att appen får hitta mönstret igen.

**Länkar från bokföringsvyn**
- **Ankare:** notisen om inaktiverade mallar i bokföringsvyn (issue 19) länkar till `/konteringsmallar#mall-{id}`. Sidan ska ligga där och varje mall ha det ankaret.

**Ändringslogg**
- **Innehåll:** varje mall har en ändringslogg som visar vad appen och användaren gjort med den över tid.

**Från bokföringsvyn**
- **Spara som mall:** konteringen i formuläret kan sparas som en ny mall, förifylld med matchningsattribut utifrån bankhändelsen. Samma låsfråga visas.

## Acceptance criteria

- [ ] Lista med ursprung, låsstatus, matchningsattribut, alternativ, statistik och senaste ändring
- [ ] Skapa och justera mall, med låsfråga vid sparande
- [ ] Låsa upp låst mall
- [ ] Inaktivera, återaktivera och radera. Inaktiverade mallar visas i egen sektion, borttagna visas inte
- [ ] Ändringslogg per mall, där användarens ändringar loggas
- [ ] "Spara som mall" från bokföringsvyn med förifyllda matchningsattribut och låsfråga

## Blocked by

- 16-konteringsmall-datamodell
