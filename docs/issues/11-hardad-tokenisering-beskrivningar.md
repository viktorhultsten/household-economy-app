# 11 — Härdad tokenisering av bankhändelse-beskrivningar

Status: Att göra

## What to build

Förbättra normaliseringen av beskrivningar så att matchningen bygger på varumärkes-/namntoken i stället för referensbrus. Behåll alfabetiska token även korta varumärken (`sl`, `ica`) som i dag filtreras bort på grund av längdgränsen. Rena sifferton­ken ska **inte** särskilja en matchning — "SL 123" och "SL 324" ska betraktas som samma — men ett **identiskt delat sifferton­ken** (t.ex. ett återkommande OCR-/referensnummer) ska tvärtom **förstärka** matchningen och dra ihop de verifikaten till samma gruppering.

Där enbart siffror skiljer och inget namn finns kvar hamnar fallet naturligt i det tvetydiga läget och löses genom att flera förslag visas.

## Acceptance criteria

- [ ] Korta alfabetiska varumärkestoken (`sl`, `ica`) behålls i matchningen
- [ ] Rena sifferton­ken särskiljer inte: "SL 123" och "SL 324" matchar
- [ ] Identiskt delat sifferton­ken förstärker matchning/gruppering
- [ ] Swish-rader med olika mottagarnamn hålls isär
- [ ] Test som täcker SL-numren, identiskt OCR-nummer och åtskilda Swish-mottagare

## Blocked by

- 08-rankade-konteringsmonster-forslagskort
