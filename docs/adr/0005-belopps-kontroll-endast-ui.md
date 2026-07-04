# Belopps-kontroll mot bankhändelse enforceras endast i UI

När ett verifikat bokförs från en bankhändelse kräver `TransactionForm` att verifikatets balanserade totalsumma (`total debet`) är lika med `|bankhändelsens belopp|` innan sparande tillåts. Detta hindrar t.ex. att ett köp på 500 kr bokförs som 120 kr. Kontrollen ligger **enbart i UI:t** — inte i server-choke-pointen `postVerifikat`.

Detta är en medveten avvikelse från [ADR-0003](0003-balance-invariant-choke-point.md), där balanskravet gjordes till en okränkbar invariant vid en enda skrivväg. Skälet är att belopps-matchningen är en väsentligt mjukare regel än dubbel-bokföringens balanslag: den gäller bara bankhändelse-baserade verifikat, och det finns tänkbara legitima undantag (öres-differenser, udda fall). Att göra den till en hård server-invariant vore att låsa in en regel som är mjukare än den ser ut.

En framtida utvecklare som vill "härda" kontrollen genom att flytta in den i `postVerifikat` bör först väga in att regeln medvetet lämnats mjuk. Balanskravet hör hemma i choke-pointen; belopps-matchningen gör det inte.
