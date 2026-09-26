# Runbook: mallanalysen

Mallanalysen härleder och justerar konteringsmallar ur historiken och uppdaterar
statistiken för alla mallar (se [ADR-0010](../adr/0010-konteringsmallar-som-enda-forslagskalla.md)).
Den körs varje natt av tjänsten `mallanalys` i `docker-compose.yml`, bredvid appen,
mot samma `DATABASE_URL`.

## Så fungerar en körning

1. Tar ett advisory lock i Postgres. Pågår redan en körning avbryts den nya och
   loggas som misslyckad ("en annan mallanalys pågår redan").
2. Markerar körningar som fortfarande står som *pågår* som avbrutna. De dog utan
   att hinna logga, t.ex. för att containern stoppades mitt i en körning.
3. Skriver en post i körningsloggen (`mallanalys_korningar`) med status *pågår*.
4. I **en transaktion**: låser `konteringsmallar` för skrivning, läser historik och
   mallar, kör härledningen, sparar ändringarna med en rad per ändring i
   mallarnas ändringslogg (`konteringsmall_andringar`, `av = 'app'`, med
   `korning_id`), uppdaterar statistiken för alla mallar som inte är borttagna
   (även låsta och inaktiverade) och markerar körningen som *klar*.
5. Vid fel rullas transaktionen tillbaka, så att inga mallar ändras, och
   körningen markeras *fel* med felmeddelandet.

Användare som sparar en mall medan analysen pågår väntar tills den är klar. En
körning tar normalt under en sekund.

Mallsidan (`/konteringsmallar`) visar senaste körningen, vad den ändrade (med
länkar till mallarna), felet om den misslyckades och tidigare körningar.

## Driftsättning

```bash
docker compose up -d --build mallanalys
```

Tjänsten kräver att migrationen `0009_mallanalys_antal` är applicerad, så kör
[prod-migration](prod-migration.md) först när den är ny.

Konfiguration (miljövariabler i `docker-compose.yml`, kan sättas i `.env`):

| Variabel | Standard | Betydelse |
| --- | --- | --- |
| `DATABASE_URL` | — | Databasen som analyseras. Samma som appen. |
| `MALLANALYS_TID` | `03:00` | Klockslag (HH:MM) för den dagliga körningen. |
| `TZ` | `Europe/Stockholm` | Tidszonen klockslaget och statistikens datum tolkas i. |

Tjänsten kör inte vid start, bara vid klockslaget. Missas en natt (t.ex. för att
maskinen var avstängd) körs nästa natt som vanligt, eller kör manuellt.

## Manuell körning

```bash
npm run mallar:analys:dev    # mot dev-databasen economy_dev
npm run mallar:analys        # mot DATABASE_URL, dvs. prod från laptopen
docker compose exec mallanalys node mallanalys.js   # från servern, i containern
```

En manuell körning är en vanlig körning: den sparar ändringar och syns i
körningsloggen. Skriptet avslutas med felkod om körningen misslyckades.

Utan att spara något: `npm run mallar:harled:dev` (härledningen) och
`npm run mallar:kalibrera:dev` (backtest av sannolikhetsmodellen).

## Felsökning

**Loggar.** Varje körning skrivs med tidsstämpel till tjänstens logg, och vid fel
även hela stacken:

```bash
docker compose logs --tail 100 mallanalys
```

Vid start skriver tjänsten tidszonen och när nästa körning sker. Stämmer inte
klockslaget, kontrollera `TZ`.

**Körningsloggen i databasen.**

```sql
SELECT id, startad, avslutad, status, antal_verifikat, antal_skapade,
       antal_justerade, antal_borttagna, sammanfattning, fel
  FROM mallanalys_korningar ORDER BY id DESC LIMIT 10;

-- Vad en körning ändrade
SELECT a.mall_id, m.namn, a.andring
  FROM konteringsmall_andringar a JOIN konteringsmallar m ON m.id = a.mall_id
 WHERE a.korning_id = <id>;
```

**Vanliga fel.**

| Symptom | Orsak och åtgärd |
| --- | --- |
| Ingen körning på mallsidan efter en natt | Tjänsten körs inte eller når inte databasen. Se `docker compose ps` och loggen. |
| "en annan mallanalys pågår redan" | Två körningar samtidigt, t.ex. en manuell under den nattliga. Ofarligt; den första körningen fortsätter. |
| "körningen avslutades innan den blev klar" | Processen dog mitt i en körning (omstart, `docker compose down`). Inget ändrades; nästa körning gör om arbetet. |
| `column "antal_skapade" ... does not exist` | Migrationen är inte applicerad. Kör prod-migrationen. |
| Fel i härledningen | Återskapa mot dev: `npm run db:refresh` och sedan `npm run mallar:analys:dev`. |

**Ångra en körning.** En körning kan inte ångras automatiskt. Ändringsloggen per
mall visar vad appen gjort. En mall som appen justerat fel kan justeras och låsas
på mallsidan. Vid större skador, återställ från backup enligt
[prod-migration](prod-migration.md#om-något-går-fel-återställ-från-backup).
