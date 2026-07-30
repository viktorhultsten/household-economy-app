# Periodisering som fördelning över flera månader (huvud + N länkade)

Den funktion som [ADR-0008](0008-periodisering-via-interimskonto.md) kallade "periodisering" — hela beloppet flyttat till **en** vald period — döps om till **periodförskjutning**. Namnet **periodisering** återanvänds för att **fördela en kostnad eller intäkt jämnt över X på varandra följande månader** med start i betalningsmånaden (bankhändelsens månad). Detta generaliserar ADR-0008:s "alltid exakt två verifikat" till **ett huvudverifikat + N länkade verifikat**, ett per månad, alla bryggade av samma periodiseringskonto som nettar till noll.

Notera återanvändningen av namnet: en tidigare riven funktion hette också "periodförskjutning" ([issue 01](../issues/01-ta-bort-periodforskjutning.md)) men dubbelräknade belopp genom att kopiera konteringsrader utan brygga. Den omdöpta funktionen är den koherenta interimskonto-modellen från ADR-0008 — bara namnbytt — och dubbelräknar inte.

## Struktur

För 10 000 kr betalt i juni, fördelat på 5 månader:

- **Huvudverifikat** (juni, bankhändelsens datum) — identiskt med ADR-0008: ankarrad bank **kredit 10 000** + periodiseringskonto **debet 10 000**. Bär bankhändelsen.
- **5 länkade verifikat**, ett per månad juni–oktober, vart och ett: kostnadskonto **debet 2 000** + periodiseringskonto **kredit 2 000**.

Periodiseringskontot nettar till noll (10 000 debet − 5×2 000 kredit = 0), bankrörelsen ligger kvar i juni, och kostnaden kostnadsförs 2 000/månad. Första slicen ligger alltid i betalningsmånaden; endast antalet månader (X) väljs.

## Considered Options

- **Diskriminatorkolumn vs härledning ur data** — vald: en nullbar `periodisering_kind` (`forskjutning | periodisering`) på huvudverifikatet. Att skilja de två funktionerna genom att räkna barn (1 = förskjutning, ≥2 = periodisering) är skört och faller för en tänkt 1-månaders periodisering. Kolumnen gör "kvar"-vyns fråga trivial (`WHERE periodisering_kind = 'periodisering'`).
- **Ett verifikat med konteringsrader på flera datum** — förkastad av samma skäl som i ADR-0008: kan inte representeras som balanserade verifikat per period och läcker in fel i resultat/balans. Varje månad måste vara ett eget balanserat verifikat på sitt eget datum.
- **Lagra schemat (X, per-månadsbelopp, startmånad)** — förkastad som onödigt: allt härleds ur de länkade verifikatens datum och belopp. `avdraget t.o.m. period P` = summan av kostnadsraderna med datum ≤ P; `kvar` = total − avdraget. Det ger invarianten att **kvar == den del av periodiseringskontots saldo som hör till periodiseringen** vid P:s slut.
- **Öre-rest** — vald: de första X−1 slicerna golvas till öret och sista månaden absorberar resten, så summan blir exakt totalen och periodiseringskontot nettar till exakt noll (annars fastnar ett saldo på interimskontot, i strid med [ADR-0003](0003-balance-invariant-choke-point.md)).

## Consequences

- ADR-0008:s omvända uppslagningar på `periodisering_parent_id` går från `LIMIT 1` (paret är alltid två) till att hämta **alla** barn. Skapande, justering och borttagning skriver om alla N atomiskt genom choke-pointen ([ADR-0003](0003-balance-invariant-choke-point.md)).
- **Periodlås** gäller **alla** månader i spannet (huvud + varje slice); är endera låst fryses hela periodiseringen.
- **Konteringsförslag** oförändrat: huvudverifikatet utesluts (bank ↔ periodiseringskonto är ingen riktig kontering) och de länkade saknar bankhändelse så de är redan osynliga för förslagen — ingen ny förorening trots att kostnadskontot upprepas N gånger.
- **Budget** ser den per-månads-splittade kostnaden (2 000/månad), vilket är rätt budgetutfall för en periodisering.
- **Återkommande händelse-koppling utelämnas** för periodisering: en återkommande händelse handlar om *att* något sker regelbundet; en periodisering är en betalning utsmetad över månader, inte N separata händelser. Att koppla till alla N skulle falskt uppfylla händelsen N gånger.
- **Skapande är bankhändelse-bundet** (som periodförskjutningen) — ingen rent manuell periodisering.
- En ny vy (`/periodiseringar`) listar aktiva periodiseringar för en vald period med totalbelopp, avdraget kumulativt t.o.m. vald månad (inklusive startmånaden), och kvar.
