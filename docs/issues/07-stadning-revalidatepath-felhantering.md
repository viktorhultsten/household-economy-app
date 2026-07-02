# 07 — Städning: revalidatePath och konsekvent felhantering

## What to build

Städa upp de tvärgående maintainability-bristerna som genomlysningen hittade, så att UI:t inte visar inaktuell data och fel rapporteras enhetligt.

- **`revalidatePath`**: server actions som muterar data (skapa/ändra/ta bort verifikat, konton, budgetar, import m.m.) ska invalidera relevanta sidor så att UI:t inte förlitar sig på manuell refetch via callbacks.
- **Konsekvent felhantering**: server actions ska kasta fel på ett enhetligt sätt (kategoriserade/tydliga meddelanden) i stället för en blandning av råa `Error` och tysta `null`-returer.

## Acceptance criteria

- [ ] Muterande server actions anropar `revalidatePath` för berörda vyer
- [ ] Felhanteringen i server actions följer ett enhetligt mönster (tydliga, kategoriserade fel)
- [ ] Ingen vy visar inaktuell data efter en mutation utan manuell refetch
- [ ] Appen bygger och lint passerar

## Blocked by

- 03-migrera-server-actions-till-drizzle
