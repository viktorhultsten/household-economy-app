# 16 — Konteringsmall: datamodell och borttagning av gamla mallar

Status: Ej påbörjad

## What to build

Lägg grunden för konteringsmallar enligt [ADR-0010](../adr/0010-konteringsmallar-som-enda-forslagskalla.md). Additiv migration ersätter bokföringsmallarna (`booking_templates`, `template_rows`) med en modell för:

- **Konteringsmall**: namn, ursprung (användare/app), låst, status (aktiv/inaktiverad/borttagen), samt matchningsattribut: nyckelord, ankarkonto, beloppsintervall, dag i månaden (med förankring från månadens början eller slut samt ett fönster) och riktning. Alla matchningsattribut är nullbara. Kan ge en återkommande händelse.
- **Konteringsalternativ**: tillhör en mall. Motkonton med sida **relativt ankarraden** (samma/motsatt) och andel vid split, samt statistik från senaste mallanalysen (antal, viktad andel, senast använd).
- **Ändringslogg**: en post per ändring av en mall, med tidpunkt, vem (app/användare) och vad som ändrades.
- **Körningslogg**: en post per mallanalys, med start, slut, status, analyserad historik, en sammanfattning av ändringar och eventuellt fel.

De befintliga bokföringsmallarna och deras rader raderas. Deras gränssnitt (mallsidan, mallväljaren och "Spara som mall" i bokföringsformuläret) tas bort i samma slice, så att appen aldrig har två mallbegrepp samtidigt. Den oanvända `getBookingSuggestion` tas bort. Issues 16–21 släpps tillsammans, så funktionalitet som saknas mellan dem behöver inte hållas vid liv.

Rena typer och omvandlingar (mall ↔ konteringsrader för en given bankhändelse, inklusive spegling) läggs i en egen modul utan databasberoende, så att de kan testas direkt.

## Acceptance criteria

- [ ] Migration för mall, alternativ, ändringslogg och körningslogg (körs via prod-runbooken)
- [ ] Befintliga bokföringsmallar raderas, gamla tabeller och gammalt mall-UI tas bort
- [ ] `getBookingSuggestion` borttagen
- [ ] Ren funktion som omvandlar ett konteringsalternativ till konteringsrader för en bankhändelse: ankarraden får hela beloppet, motkontona fördelas enligt andel med öres-rest på största raden, och sidorna vänds vid spegling
- [ ] Test som täcker omvandlingen, inklusive split, spegling och balansinvariant (debet = kredit)

## Blocked by

- None - can start immediately
