# 14 — Bulkbokföring: navigeringsskal

Status: Klar

## What to build

Inför **bulkbokföring** (se [CONTEXT.md](../../CONTEXT.md)): en **"Bokför N bankhändelser"**-knapp på bankhändelsesidan där N = antalet obokförda händelser, dock högst 25. Texten är dynamisk och knappen döljs när inget är obokfört.

Knappen öppnar samma helskärmsvy som vanlig bokföring, men över en **fast kö** bestående av de N översta händelserna i att göra-listans ordning (nyast först, `date DESC, id DESC`). Kön låses vid öppning för sessionen. Längst ner till vänster, intill spara-knappen, visas status **"x av N"** och **‹ ›-pilar** för att bläddra fram och tillbaka.

Varje händelse kan bokföras till ett verifikat inifrån vyn. **Bokförda händelser stannar kvar i kön** och går att bläddra till igen; vid återbesök visas det skapade verifikatet i redigerbart läge, tydligt markerat som redan klart (sparad-indikator) och med knappen **"Spara verifikat"**. Att bläddra bort från en händelse med **osparade ändringar** utlöser en bekräftelsedialog; ändringarna kastas om användaren fortsätter.

## Acceptance criteria

- [x] "Bokför N bankhändelser"-knapp med dynamisk N ≤ 25, dold vid 0
- [x] Öppnar helskärmsvy över en fast kö av de N översta händelserna (nyast först)
- [x] "x av N"-status och ‹ ›-pilar längst ner till vänster intill spara-knappen
- [x] Verifikat kan skapas per händelse; bokförda händelser stannar kvar i kön
- [x] Återbesök av bokförd händelse visar verifikatet redigerbart med "Spara verifikat" och sparad-indikator
- [x] Bekräftelsedialog vid bläddring bort från osparade ändringar; ändringar kastas vid fortsatt

## Blocked by

- 12-namnbyte-transaktion-till-verifikat
