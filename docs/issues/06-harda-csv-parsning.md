# 06 — Härda CSV-parsning med rapport om skippade rader

## What to build

Gör CSV-importen av Icabanken-filer robust och transparent. Idag skippar `app/utils/csvParser.ts` rader med ogiltigt datum eller belopp **tyst**, och `new Date()` är för tillåtande. Användaren får ingen återkoppling om att rader föll bort.

Parsern ska i stället returnera både lyckat tolkade bankhändelser och en lista över skippade rader med orsak (radnummer + varför den föll bort), och importflödet (ImportModal) ska visa detta för användaren innan bekräftelse. Datum- och beloppstolkning ska vara strikt mot förväntat Icabanken-format (svensk decimalkomma, förväntade kolumner).

## Acceptance criteria

- [x] Parsern returnerar tolkade bankhändelser plus en strukturerad lista över skippade rader med orsak
- [x] Importflödet visar antal och orsak för skippade rader innan användaren bekräftar importen
- [x] Datum tolkas strikt (endast förväntat format), inte via lenient `new Date()`
- [x] Belopp tolkas korrekt för svenskt talformat (decimalkomma, ev. tusentalsavgränsare)
- [x] Test med en fil som innehåller både giltiga och ogiltiga rader

## Blocked by

- None - can start immediately
