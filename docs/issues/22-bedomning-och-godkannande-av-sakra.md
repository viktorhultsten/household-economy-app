# 22 — Bedömning i bankhändelsevyn och godkännande av säkra bankhändelser

Status: Klar

## What to build

Appen bedömer varje obokförd bankhändelse direkt i bankhändelsevyn, så att det alltid syns att den har tittat på händelsen och vad den kom fram till. Bankhändelser med ett säkert konteringsförslag kan godkännas i en förenklad vy.

**Status per rad.** En liten färgad prick, utan text:

- **Grön:** *säker*, ett förslag som kan godkännas som det är.
- **Blå:** användaren behöver avgöra själv (*val*, *splittrad* eller *gissning*).
- **Grå:** inget förslag (*okänd*, även när en inaktiverad mall matchar).

Samma färger gäller i bokföringsvyn: det säkra kortet är grönt, korten vid *val* och notisen vid *splittrad* blå, och notisen när inget föreslås grå.

**Godkänn säkra.** När minst en händelse är grön visas knappen **"Godkänn N säkra"**. Den öppnar en kö med de gröna, oflaggade händelserna, högst 25, i att göra-listans ordning. Kön visas i en **förenklad vy** med:

- bankhändelsen och mallens namn;
- konteringsraderna, skrivskyddade;
- mallens återkommande händelse, som går att ta bort;
- beskrivningen, förifylld och redigerbar;
- knappen **Godkänn**.

Godkänn skapar verifikatet och går vidare till nästa obokförda händelse i kön. När alla är bokförda stängs vyn.

**Växlare.** I kön för säkra händelser kan man växla mellan den förenklade och den vanliga vyn. Den vanliga vyn fylls med förslaget. Valet gäller hela kön, och ändringar i den vanliga vyn följer inte med tillbaka. En redan godkänd händelse öppnas i den vanliga vyn. Utanför kön, till exempel vid klick på en rad, finns bara den vanliga vyn.

## Acceptance criteria

- [x] Varje obokförd bankhändelse visar grön, blå eller grå prick; en pulserande prick medan bedömningen pågår
- [x] Bedömningen körs om efter bokföring, flaggning, irrelevant-markering och när bulkvyerna stängs
- [x] "Godkänn N säkra" visas vid minst en grön, oflaggad händelse och öppnar högst 25
- [x] Förenklad vy med kontering, återkommande händelse, beskrivning och Godkänn
- [x] Växlare mellan förenklad och vanlig vy, bara i kön för säkra händelser
- [x] Färgerna i bokföringsvyn följer samma status

## Implementation

- `forslagStatus` i `app/lib/konteringsforslag.ts` gör om ett konteringsförslag till `saker`, `val` eller `okand` och används av både listan och bokföringsvyn. Ett säkert förslag vars ankarrad saknar konto kan inte godkännas och blir blått.
- `byggKonteringsforslagForAlla` bedömer flera bankhändelser och räknar mallarnas underlag en gång.
- Server actions `getBankhandelseStatusar` (status per händelse och antal säkra, oflaggade) och `getSakraBankhandelser` (kön med förslag) läser historik och mallar en gång per anrop. Statusen sparas inte, så den stämmer alltid med aktuella mallar och historik.
- `BulkBokforingVy` tar emot `sakraForslag` och visar då `ForenkladBokforing` eller `VerifikatForm` med `initialForslag`. Förloppskartan, pilarna och växlaren ligger i `BulkNavigering.tsx` och delas av båda vyerna.

## Blocked by

- 19-konteringsforslag-fran-mallar
