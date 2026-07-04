# 13 — Flagga bankhändelse med kommentar

Status: Att göra

## What to build

Inför möjligheten att **flagga** en bankhändelse som ännu inte redo att bokföras, med en fritextkommentar som förklarar varför (se "Flaggad bankhändelse" i [CONTEXT.md](../../CONTEXT.md)). Flaggan och kommentaren är persistenta.

Additiv migration lägger till `flagged` (boolean) och `flag_comment` (nullable text) på `bank_events`, med server-actions för att sätta och rensa flaggan. I bokföringsvyn finns en **"Flagga"**-knapp intill "Skapa verifikat" som öppnar ett **inline-kommentarfält**; när händelsen redan är flaggad blir knappen **"Avflagga"** och låter kommentaren redigeras eller tas bort.

En flaggad bankhändelse visar en **flaggikon på sin rad** i bankhändelselistan, med kommentaren som tooltip vid hover. Flaggan är oberoende av bokföring, men **att bokföra händelsen löser upp flaggan** (rensar `flagged` och `flag_comment`).

## Acceptance criteria

- [ ] Migration lägger till `flagged` och `flag_comment` på `bank_events` (körs via prod-runbooken)
- [ ] Server-actions kan sätta flagga + kommentar och avflagga
- [ ] "Flagga"-knapp med inline-kommentarfält i bokföringsvyn; växlar till "Avflagga" när flaggad
- [ ] Flaggikon visas på bankhändelsens rad, med kommentaren som tooltip
- [ ] Att skapa ett verifikat för en flaggad händelse rensar flaggan
- [ ] Test som täcker flagga, avflagga och att bokföring rensar flaggan

## Blocked by

- 12-namnbyte-transaktion-till-verifikat
