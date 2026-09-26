# Runbook: drift och automatisk uppdatering

Appen körs på Ubuntu-maskinen med `docker-compose.yml`. Ingenting byggs på servern.

## Så kommer en ny version ut

1. En push till `main` får GitHub Actions ([docker-publish.yml](../../.github/workflows/docker-publish.yml)) att bygga och publicera två images på ghcr:
   - `ghcr.io/viktorhultsten/household-economy-app:main`: webbappen;
   - `ghcr.io/viktorhultsten/household-economy-app-mallanalys:main`: den nattliga mallanalysen.
2. Tjänsten `watchtower` kollar var femte minut om taggen `main` pekar på en ny image. Gör den det hämtas imagen, containern startas om med samma inställningar och den gamla imagen tas bort.

Från push till ny version tar det alltså bygget (några minuter) plus högst fem minuter.

Bara containrar med etiketten `com.centurylinklabs.watchtower.enable=true` uppdateras. Watchtower rör alltså inte databasen eller andra containrar på maskinen.

## Databasmigreringar körs före push

Watchtower rullar ut koden direkt och vet inget om databasen. Kräver en commit en ny migrering måste den köras mot prod **innan** commiten pushas till `main`. Annars går appen sönder tills migreringen körts.

1. Följ [prod-migration](prod-migration.md) steg 1–3 (repetition, backup, migrering).
2. Pusha till `main`.

Migreringar ska därför vara bakåtkompatibla med den kod som redan kör: lägg till kolumner och tabeller före koden som använder dem, och ta bort dem först i en senare migrering.

## Förstagångsinstallation på servern

```bash
docker login ghcr.io                      # token med read:packages
docker compose pull
docker compose up -d
```

Inloggningen hamnar i `~/.docker/config.json`, som watchtower läser för att hämta de privata imagesen. Ligger filen någon annanstans sätts `DOCKER_CONFIG_FIL` i `.env`.

## Konfiguration

Miljövariabler i `.env` bredvid `docker-compose.yml`:

| Variabel | Standard | Betydelse |
| --- | --- | --- |
| `DATABASE_URL` | — | Anslutning till prod-databasen. |
| `IMAGE` | `ghcr.io/viktorhultsten/household-economy-app` | Imagenamn utan tagg. Mallanalysen använder `<IMAGE>-mallanalys`. |
| `WATCHTOWER_POLL_INTERVAL` | `300` | Sekunder mellan kontrollerna. |
| `DOCKER_CONFIG_FIL` | `~/.docker/config.json` | Docker-konfigurationen med inloggningen mot ghcr. |
| `TZ` | `Europe/Stockholm` | Tidszon för mallanalysen och watchtowers loggar. |

## Felsökning

```bash
docker compose ps                          # körs alla tre tjänsterna?
docker compose logs --tail 100 watchtower  # hittade den en ny image?
docker compose pull && docker compose up -d   # uppdatera för hand
```

| Symptom | Trolig orsak |
| --- | --- |
| `unauthorized` eller `denied` i watchtowers logg | Inloggningen mot ghcr saknas eller har gått ut. Kör `docker login ghcr.io` igen. |
| Ingen uppdatering efter en push | Bygget i GitHub Actions har inte gått klart eller misslyckades. Se fliken Actions. |
| Appen ger fel efter en uppdatering | Koden kräver en migrering som inte körts. Kör [prod-migration](prod-migration.md). |
