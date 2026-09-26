# 19 — Konteringsförslag från konteringsmallar i bokföringsvyn

Status: Ej påbörjad

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

- [ ] Förslag kommer enbart från aktiva konteringsmallar, den gamla historikgrupperingen är borttagen
- [ ] Varje scenario visas enligt ovan, utan hårdkodat antal förslag
- [ ] Spegling utan historik markeras som kvalificerad gissning
- [ ] Notis med länk när en inaktiverad mall matchar
- [ ] Att välja ett förslag fyller konteringsrader och återkommande händelse men sparar inget
- [ ] Fungerar i både enskild bokföring och bulkbokföring

## Blocked by

- 18-sannolikhet-och-scenarier
