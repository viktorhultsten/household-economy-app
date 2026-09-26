# 21 — Nattlig mallanalys med körningslogg

Status: Ej påbörjad

## What to build

Kör härledningen från issue 17 automatiskt varje natt, helt utan användarens inblandning, och gör resultatet synligt.

**Körning**
- **Tjänst:** en egen tjänst i `docker-compose` kör ett skript enligt schema mot databasen.
- **Vad skriptet gör:** hämtar historik och befintliga mallar, tillämpar härledningen och uppdaterar statistiken för alla mallar, även låsta.
- **Ändringar:** skrivs i en databastransaktion, så att en avbruten körning inte lämnar halva ändringar.
- **Parallella körningar:** kan inte ske. En körning som startar medan en annan pågår avbryts.

**Loggning**
- **Körningslogg:** varje körning loggas med start, slut, status, analyserad historik, antal skapade, justerade och borttagna mallar, samt eventuellt fel.
- **Ändringslogg:** varje ändring appen gör skrivs i mallens ändringslogg.

**Synlighet**
- **På mallsidan:**
  - när analysen senast kördes och om den lyckades;
  - vad den kom fram till, med länkar till berörda mallar;
  - ett tydligt fel om senaste körningen misslyckades.
- **Historik:** tidigare körningar går att se.

**Manuell körning**
- **Skriptet:** kan även köras manuellt (`npm run`-skript), så att dev-databasen och kalibreringen i issue 18 kan testas utan att vänta en natt.

## Acceptance criteria

- [ ] Tjänst i `docker-compose` som kör mallanalysen varje natt
- [ ] Ändringar sker atomiskt, och parallella körningar förhindras
- [ ] Körningslogg och ändringslogg fylls av varje körning
- [ ] Mallsidan visar senaste körning, resultat, eventuella fel och tidigare körningar
- [ ] `npm run`-skript för manuell körning
- [ ] Runbook eller README-avsnitt om hur tjänsten driftsätts och felsöks

## Blocked by

- 17-harledning-av-konteringsmallar
- 20-mallsidan
