# 09 — Underlag: senaste 5 stödverifikat i förslagskortet

Status: Klar

## What to build

Låt varje konteringsförslag visa det underlag som ligger bakom mönstret, så att användaren själv kan bedöma beloppsvariation och varför ett visst mönster föreslås. Kortet visar "Baserat på N verifikat" och de **senaste 5** stödverifikaten som en kompakt lista med *datum + belopp*, plus den ursprungliga bankhändelse-beskrivningen när den skiljer sig från den aktuella (t.ex. "SL 123" vs "SL 324").

Underlaget är sekundärt i kortet — mönstret och det föreslagna beloppet förblir det primära. Server-actionet levererar redan stödverifikaten per mönster; denna slice ytmaterialiserar dem i gränssnittet.

## Acceptance criteria

- [x] Varje förslagskort visar antal stödverifikat och de senaste 5 (datum + belopp)
- [x] Bankhändelse-beskrivningen visas per rad när den skiljer sig från den aktuella
- [x] Underlaget är visuellt underordnat mönstret och det föreslagna beloppet
- [x] Belopp formateras med appens `formatSwedishAmount`

## Blocked by

- 08-rankade-konteringsmonster-forslagskort
