# 04 — postVerifikat-choke-point med balansinvariant

## What to build

Inför en enda domänfunktion (`postVerifikat`) som är den enda vägen att skapa och ändra verifikat, enligt ADR 0003. Funktionen validerar alltid att konteringsraderna balanserar (summa debet == summa kredit) innan något skrivs. Alla server actions som idag skapar/ändrar verifikat går genom denna choke-point.

Idag är balanskontrollen utspridd: UI:t validerar och `updateTransaction` validerar, men `createTransaction` gör det inte — ett obalanserat verifikat kan sparas via skapandevägen. Efter denna skiva kan ett obalanserat verifikat inte existera. Kompletteras med en DB-nivå-garanti (constraint/trigger) som sista skyddsnät.

## Acceptance criteria

- [ ] All skapande/ändring av verifikat sker via `postVerifikat`; inga server actions skriver till konteringsrader direkt
- [ ] Ett obalanserat verifikat avvisas med ett tydligt fel oavsett väg in
- [ ] En DB-nivå-garanti hindrar obalanserade verifikat som sista skyddsnät
- [ ] Test som verifierar att både skapande och ändring avvisar obalanserade verifikat

## Blocked by

- 03-migrera-server-actions-till-drizzle
