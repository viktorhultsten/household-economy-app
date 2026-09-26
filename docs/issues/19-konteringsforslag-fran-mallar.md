# 19 — Konteringsförslag från konteringsmallar i bokföringsvyn

Status: Klar

## What to build

Byt ut dagens live-beräknade konteringsförslag mot förslag som **enbart** kommer från konteringsmallar, via modellen i issue 18. Den tidigare grupperingen av historiken tas bort.

Hur scenarierna visas i bokföringsvyn och bulkbokföringen:

- **Säker:** ett förslagskort, tydligt markerat som säkert.
- **Val:** alla alternativ bredvid varandra, presenterade som ett val snarare än en rangordning.
- **Splittrad:** inga kort, bara en kort notis om att händelsen bokförs på många olika sätt.
- **Okänd:** ingenting.
- **Spegling utan historik:** markeras som en kvalificerad gissning.
- **Inaktiverad mall:** matchar händelsen en inaktiverad mall visas en diskret notis med länk till mallen, så att användaren förstår varför inget föreslås.

Varje kort visar:
- mallens namn och alternativets andel;
- konteringsraderna i appens vanliga Debet/Kredit-stil, med föreslagna belopp;
- underlaget: antal verifikat och de senaste, i samma stil som i issue 09.

Ett förslag tillämpas aldrig automatiskt. Att välja ett förslag fyller formuläret, inklusive mallens återkommande händelse, men sparar inget.

## Acceptance criteria

- [x] Förslag kommer enbart från aktiva konteringsmallar, den gamla historikgrupperingen är borttagen
- [x] Varje scenario visas enligt ovan, utan hårdkodat antal förslag
- [x] Spegling utan historik markeras som kvalificerad gissning
- [x] Notis med länk när en inaktiverad mall matchar
- [x] Att välja ett förslag fyller konteringsrader och återkommande händelse men sparar inget
- [x] Fungerar i både enskild bokföring och bulkbokföring

## Implementation

- `getKonteringsforslag(bankEventId)` i `app/actions.ts` läser konton, historik, mallar och återkommande händelser (`lib/konteringsmallData.ts`, flyttad från `scripts/` och delad med härlednings- och kalibreringsskripten) och bedömer händelsen med modellen från issue 18.
- Den rena funktionen `byggKonteringsforslag` i `app/lib/konteringsforslag.ts` gör om bedömningen till scenario, kort och inaktiverade mallar. Varje kort har konteringsrader med föreslagna belopp (`alternativTillKonteringsrader`, speglade vid omvänd riktning), mallens återkommande händelse, antal verifikat och de fem senaste i underlaget (bara de som följer alternativet). Tester i `tests/konteringsforslag.test.ts`.
- Utan känt ankarkonto (import utan konto) matchar bara mallar utan ankare, och ankarraden lämnas utan konto åt användaren.
- `VerifikatForm` visar scenariot, och eftersom bulkbokföringen använder samma formulär gäller det båda. *Säker* visas som ett grönt kort märkt "Säkert förslag", *val* som likvärdiga kort under en rubrik som ber användaren välja, *splittrad* som en rad text och *okänd* som ingenting. Ett svar som kommer efter att bulkbokföringen bläddrat vidare kastas.
- Notisen om inaktiverade mallar länkar till `/konteringsmallar#mall-{id}`, som mallsidan i issue 20 behöver stödja.
- Den gamla historikgrupperingen (`scoreBeskrivning`, `rankMonster`, `distributeAmount` m.fl.) är borttagen. `konteringsforslagUtils.ts` innehåller bara tokeniseringen som mallarnas matchning använder.

## Blocked by

- 18-sannolikhet-och-scenarier
