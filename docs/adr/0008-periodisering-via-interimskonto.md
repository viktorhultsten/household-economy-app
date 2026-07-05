# Periodisering som två länkade verifikat via ett interimskonto

En periodisering delar en bankhändelses bokföring i **två balanserade verifikat**: ett huvudverifikat på bankhändelsens datum (bär bankhändelsen och ankarraden mot periodiseringskontot) och ett länkat verifikat på ett valt måldatum (kategoriraderna mot periodiseringskontot). Periodiseringskontot nettar till noll över paret, så inget belopp dubbelräknas — till skillnad från den tidigare rivna periodförskjutningen ([issue 01](../issues/01-ta-bort-periodforskjutning.md)) som kopierade samma konteringsrader till ett nytt datum och saknade brygga.

Detta återinför alltså funktionen som issue 01 sköt på framtiden ("övervägas för återimplementation senare som en riktig periodisering via interimskonto"), nu med en koherent modell. Skapande, justering och borttagning går genom samma choke-point som allt annat verifikatskrivande ([ADR-0003](0003-balance-invariant-choke-point.md)); paret skrivs alltid atomiskt.

## Considered Options

- **Ett verifikat med konteringsrader på två datum** (den gamla rivna modellen) — förkastad: dubbelräknade belopp, kan inte representeras som ett balanserat verifikat, och läckte in i resultat/balans fel.
- **Lagra den logiska konteringen separat** utöver de två verifikaten — förkastad som onödig: den logiska konteringen härleds genom att ta bägge verifikatens rader och stryka periodiseringskonto-raderna, så ingen extra lagring behövs.
- **Separat kopplingstabell `periodisering_pairs`** — förkastad till förmån för en enda självrefererande kolumn `transactions.periodisering_parent_id` (länkat → huvud); paret är alltid exakt två, och FK:n ger click-through åt båda håll samt `ON DELETE CASCADE`.

## Consequences

- Huvudverifikatet identifieras inte av en egen flagga utan av att ett annat verifikat pekar på det (omvänd uppslagning på `periodisering_parent_id`).
- Periodiserade **huvudverifikat utesluts ur konteringsförslagen** — deras rader (bankkonto ↔ periodiseringskonto) är ingen riktig kategorisering och skulle förorena mönstren. Det länkade verifikatet saknar bankhändelse och är redan osynligt för förslagen.
- Periodlås gäller **båda** månaderna i paret: är endera låst fryses hela periodiseringen (ingen justering, ingen borttagning).
- Varken huvud- eller länkat verifikat får redigeras via den vanliga verifikatvägen; all ändring sker via huvudverifikatets periodiseringsvy så att paret aldrig kan brytas via sidodörren.
- Återkommande händelse och budget följer kategoriraderna, som ligger i det länkade verifikatet på måldatumet — alltså i rätt period per automatik.
