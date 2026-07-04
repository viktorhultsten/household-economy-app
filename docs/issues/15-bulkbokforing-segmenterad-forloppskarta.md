# 15 — Bulkbokföring: segmenterad förloppskarta

Status: Att göra

## What to build

Komplettera bulkbokföringsvyn med en **segmenterad förloppskarta** — en horisontell rad med ett segment per händelse i kön. Varje segment färgas efter status:

- **Grön** — bokförd och sparad
- **Gul** — ej påbörjad
- **Vit** — flaggad

Det **aktuella segmentet** markeras tydligt (t.ex. ring/markör) ovanpå sin statusfärg så att man alltid ser var man är. Segmenten är **klickbara** — klick hoppar direkt till motsvarande händelse, utöver ‹ ›-pilarna.

En händelse som redigerats men lämnats utan att sparas förblir gul (ingen egen "påbörjad"-färg). Kartans vita status bygger på flaggfunktionen från issue 13.

## Acceptance criteria

- [ ] Segmenterad rad med ett segment per händelse i kön
- [ ] Färger: grön = bokförd, gul = ej påbörjad, vit = flaggad
- [ ] Aktuellt segment markeras tydligt ovanpå statusfärgen
- [ ] Klick på ett segment hoppar till den händelsen
- [ ] Ej sparade ändringar håller segmentet gult (ingen separat påbörjad-status)

## Blocked by

- 14-bulkbokforing-navigeringsskal
- 13-flagga-bankhandelse-med-kommentar
