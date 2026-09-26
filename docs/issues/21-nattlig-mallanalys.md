# 21 — Nattlig mallanalys med körningslogg

Status: Klar

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

- [x] Tjänst i `docker-compose` som kör mallanalysen varje natt
- [x] Ändringar sker atomiskt, och parallella körningar förhindras
- [x] Körningslogg och ändringslogg fylls av varje körning
- [x] Mallsidan visar senaste körning, resultat, eventuella fel och tidigare körningar
- [x] `npm run`-skript för manuell körning
- [x] Runbook eller README-avsnitt om hur tjänsten driftsätts och felsöks

## Implementation

- Körningen ligger i `lib/mallanalys.ts` (`korMallanalys`). Ett advisory lock hindrar parallella körningar; en körning som inte får låset loggas som misslyckad utan att röra något. Körningsloggens post skrivs före transaktionen, så att även en misslyckad körning syns. Ändringarna, statistiken och körningens resultat skrivs sedan i en transaktion som också låser `konteringsmallar` för skrivning, så att användarens ändringar väntar i stället för att skrivas över. Poster som fortfarande står som *pågår* när låset tagits markeras som avbrutna.
- De rena delarna ligger i `app/lib/mallanalys.ts`, med tester i `tests/mallanalys.test.ts`. `alternativStatistik` räknar statistiken per alternativ ur mallens underlag, dvs. de historiska bankhändelser mallen matchar: antal (speglingar inräknade), senast använd och en nyhetsviktad andel av hela underlaget, med samma halveringstid som sannolikhetsmodellen. Statistiken räknas på samma sätt för alla mallar som inte är borttagna, efter att ändringarna sparats. `sammanfattaKorning` ger körningsloggens antal och text.
- Varje ändring loggas i mallens ändringslogg med härledningens beskrivning, `av = 'app'` och `korning_id`. Statistikuppdateringar loggas inte, eftersom de inte ändrar mallen. Alternativ med samma struktur som tidigare behåller sitt id.
- Körningsloggen har fått kolumnerna `antal_skapade`, `antal_justerade` och `antal_borttagna` (migration `0009_mallanalys_antal`). `antal_verifikat` är antalet analyserade bankhändelser, och sammanfattningen tar även med oförändrade och blockerade mallar och antalet uteslutna bankhändelser.
- `scripts/mallanalys.ts` kör en körning (`npm run mallar:analys:dev` mot dev, `npm run mallar:analys` mot `DATABASE_URL`), eller med `--schema` varje dag kl. `MALLANALYS_TID` (standard 03:00) i tidszonen `TZ`. Dockerfilen bundlar skriptet med esbuild till en fristående fil i en egen stage, `mallanalys`, som tjänsten `mallanalys` i `docker-compose.yml` kör. Appens tjänst bygger nu uttryckligen stagen `runner`.
- Mallsidan visar en panel överst (`MallanalysPanel`) med senaste körningen, dess sammanfattning och ändringar med länkar till `#mall-{id}` (borttagna mallar visas överstrukna utan länk), felet om den misslyckades tillsammans med senaste lyckade körning, och de 30 senaste körningarna med sina ändringar. Data kommer från server action `getMallanalysKorningar`.
- Drift och felsökning: [docs/runbooks/mallanalys.md](../runbooks/mallanalys.md).

## Blocked by

- 17-harledning-av-konteringsmallar
- 20-mallsidan
