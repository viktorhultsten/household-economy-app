# Balanskravet enforceras vid en enda choke-point

All skapande och ändring av verifikat går genom **en** domänfunktion (t.ex. `postVerifikat`), som alltid validerar att konteringsraderna balanserar (summa debet == summa kredit) innan något skrivs. Server actions får inte skriva till `posts`/`transactions` på annat sätt.

Tidigare var balanskontrollen utspridd: UI:t validerade, `updateTransaction` validerade, men `createTransaction` gjorde det inte — så ett obalanserat verifikat kunde sparas via skapandevägen. Genom att göra choke-pointen till enda skrivväg blir dubbel-bokföringens balans en **invariant** i stället för en check man kan glömma.

Kompletteras med en DB-nivå-garanti (constraint/trigger) som sista skyddsnät. En framtida utvecklare som lägger till en ny skrivväg för verifikat måste gå genom choke-pointen — skriv aldrig konteringsrader direkt.
