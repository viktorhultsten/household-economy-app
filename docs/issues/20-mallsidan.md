# 20 — Mallsidan: se och justera konteringsmallar

Status: Klar

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

- [x] Lista med ursprung, låsstatus, matchningsattribut, alternativ, statistik och senaste ändring
- [x] Skapa och justera mall, med låsfråga vid sparande
- [x] Låsa upp låst mall
- [x] Inaktivera, återaktivera och radera. Inaktiverade mallar visas i egen sektion, borttagna visas inte
- [x] Ändringslogg per mall, där användarens ändringar loggas
- [x] "Spara som mall" från bokföringsvyn med förifyllda matchningsattribut och låsfråga

## Implementation

- Sidan ligger på `/konteringsmallar` (länk "Mallar" i navigeringen). Aktiva och inaktiverade mallar visas i var sin sektion, sorterade på namn; borttagna filtreras bort i `getKonteringsmallar`. Varje kort har ankaret `mall-{id}`, och sidan scrollar till och markerar mallen när den laddats, eftersom webbläsarens egen ankarscroll sker innan mallarna finns.
- Den rena modulen `app/lib/konteringsmallSida.ts` har matchningen i läsbar form (`matchningText`), statistik per mall, validering, ändringsloggens texter och förifyllningen för "Spara som mall". Tester i `tests/konteringsmallSida.test.ts`. Loggtexterna använder samma formaterare och jämförelse (`formaterare`, `jamfor`) som härledningen, så att appens och användarens ändringar skrivs likadant.
- Server actions i `app/actions.ts`: `getKonteringsmallar`, `sparaKonteringsmall`, `lasUppKonteringsmall`, `inaktiveraKonteringsmall`, `ateraktiveraKonteringsmall`, `raderaKonteringsmall` och `forifyllKonteringsmall`. Varje ändring loggas med `av = 'anvandare'`; en sparning utan ändringar loggas inte. Alternativ med samma struktur som tidigare behåller sin statistik när mallen justeras.
- Formuläret (`KonteringsmallFormModal`) används både på mallsidan och från bokföringsvyn. Validering: mallen måste matcha på nyckelord, belopp eller dag i månaden (bara ankarkonto eller riktning matchar i praktiken allt), varje alternativ måste gå jämnt ut (motsatt sida minus samma sida = 100 %) och två alternativ får inte ha samma konton. Efter validering ställs låsfrågan, som sparar mallen låst eller olåst. Mallen kan också ge en återkommande händelse.
- Låsning sker bara via låsfrågan när mallen sparas; en låst mall kan låsas upp direkt i listan. Radering är bara möjlig för inaktiverade mallar och tar bort mallen helt, med alternativ och ändringslogg.
- "Spara som mall" i bokföringsformuläret visas när det finns en bankhändelse. Förifyllningen tar orden i beskrivningen som nyckelord, importens konto som ankarkonto och konteringen (relativt ankarraden, så att en spegling ger samma alternativ) som enda alternativ, plus vald återkommande händelse. Riktning, belopp och dag lämnas tomma, eftersom de bara ska användas när de särskiljer.

## Blocked by

- 16-konteringsmall-datamodell
