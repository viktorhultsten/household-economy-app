# 08 — Rankad lista av konteringsmönster med nytt förslagskort

Status: Klar

## What to build

Bygg om konteringsförslaget från *ett enskilt tidigare verifikat* till en **rankad lista av konteringsmönster** grupperade ur historiken. Ett konteringsmönster identifieras av sin struktur — mängden av *(motkonto, sida)* exklusive tillgångsraden — så att ett splittat mönster är ett eget mönster skilt från ett enkelt. Beloppet ingår inte i mönstrets identitet.

Server-actionet som tar fram förslag returnerar en lista av mönster (i stället för ett enda verifikat), där varje mönster bär sina stödverifikat och antal. Formuläret renderar upp till **3** förslag via en ny publik komponent `KonteringsforslagCard` som visar mönstret som konteringsrader i appens vanliga **Debet/Kredit**-stil — inte de tidigare `D`/`K`-etiketterna. Varje kort visar det **föreslagna beloppet**: bankhändelsens belopp fördelat på mönstret (för split proportionellt utifrån senaste stödverifikatets proportioner, med öres-rest lagd på den största raden så att balansinvarianten alltid håller).

Inget förslag är förvalt eller ifyllt i förväg — användaren väljer alltid aktivt om ett förslag ska användas.

## Acceptance criteria

- [x] Server action returnerar en rankad lista av konteringsmönster grupperade på *(motkonto, sida)*, där split är eget mönster
- [x] Upp till 3 förslag visas; inget är förvalt eller ifyllt automatiskt
- [x] Ny publik komponent `KonteringsforslagCard` renderar mönstret i appens Debet/Kredit-stil utan `D`/`K`-etiketter
- [x] Föreslaget belopp fördelas proportionellt på split med öres-rest på största raden, så att debet = kredit
- [x] Att välja ett förslag fyller formuläret men sparar inget innan användaren bekräftar
- [x] Test som täcker gruppering till mönster och beloppsfördelning (inkl. balansinvariant)

## Blocked by

- None - can start immediately
