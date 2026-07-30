# Privatekonomi — Bokföring

En lokal app för privat ekonomihantering: importera bankhändelser från CSV (Icabanken), bokför dem med dubbel bokföring, och läs ut resultat- och balansräkning. En användare, ingen autentisering.

## Language

**Verifikat**:
En balanserad bokföringsenhet (dubbel bokföring) bestående av konteringsrader vars debet och kredit går jämnt ut.
_Avoid_: Transaktion, Transaction

**Bankhändelse**:
En rå bankrörelse importerad från CSV. Ligger på "att göra-listan" tills den bokförts till ett verifikat.
_Avoid_: Transaktion, Bank transaction

**Flaggad bankhändelse**:
En bankhändelse markerad som ännu inte redo att bokföras (t.ex. saknar underlag eller behöver utredas), med en fritextkommentar som förklarar varför. Oberoende av bokföring — att bokföra händelsen löser upp flaggan.
_Avoid_: Markerad, Pausad

**Konteringsrad**:
En enskild debet- eller kredit-rad i ett verifikat, knuten till ett konto.
_Avoid_: Post (tvetydigt)

### Kontoplan

**Konto**:
Den enhet pengar bokförs mot. Tillhör exakt en grupp och ärver sin kontotyp därifrån.

**Grupp**:
En kategori av konton som bär kontotypen. Kontotyp definieras på gruppnivå, aldrig per konto.

**Kontotyp**:
En av fyra: Intäkt, Utgift, Tillgång, Skuld. Styr om kontot har debet- eller kreditsaldo och om det hör till resultat- eller balansräkningen.
_Avoid_: Kontoklass

### Bokföringsflöde

**Att göra-listan**:
Mängden obokförda bankhändelser (`is_posted = 0`) som väntar på att bokföras. En bankhändelse kopplas till exakt ett verifikat (1:1); manuella verifikat utan bankhändelse tillåts.

**Bokföra**:
Att skapa ett verifikat från en bankhändelse (eller manuellt) och markera bankhändelsen som bokförd. Uppdelning på flera kategorier görs med flera konteringsrader i samma verifikat, inte flera verifikat.
_Avoid_: Kontera (används synonymt men "bokföra" är kanoniskt)

**Bulkbokföring**:
Att bokföra en följd bankhändelser (upp till 25 åt gången, i att göra-listans ordning) utan att lämna bokföringsvyn. Händelserna bläddras fram och tillbaka; varje kan bokföras, hoppas över eller flaggas.

**Konteringsmönster**:
En återkommande konteringsstruktur — vilka motkonton som används och på vilken sida (debet/kredit) — härledd ur tidigare verifikat. Identifieras av sin struktur, inte av något belopp; samma mönster gäller oavsett om beloppet är nytt eller varierar.

**Konteringsförslag**:
Ett föreslaget konteringsmönster för en obokförd bankhändelse, rankat efter hur sannolikt det är. Rankningen väger in bankhändelsens belopp mot varje mönsters historiska belopp, så att t.ex. ett splittat mönster kan föreslås framför ett enklare när beloppet talar för det. Presenteras med de historiska verifikat som stödjer mönstret. Flera förslag kan visas samtidigt när underlaget är tvetydigt.
_Avoid_: Förslag (ensamt, tvetydigt)

### Periodförskjutning och periodisering

**Periodförskjutning**:
Att dela upp en bankhändelses bokföring i två länkade verifikat så att hela kostnaden eller intäkten hamnar i **en** vald period medan bankrörelsen ligger kvar på sitt faktiska datum. Nettar till noll över de två verifikaten via ett periodiseringskonto. En slice, en målperiod — till skillnad från periodisering som fördelar över flera månader.
_Note_: Återanvänt namn. En tidigare riven funktion hette också "periodförskjutning" men dubbelräknade belopp (kopierade konteringsrader utan brygga); den här gör inte det.
_Avoid_: Körning

**Periodisering**:
Att fördela en kostnad eller intäkt jämnt över **X på varandra följande månader** medan bankrörelsen ligger kvar på sitt faktiska datum. Nettar till noll via ett periodiseringskonto. Flera slices — till skillnad från periodförskjutning som flyttar hela beloppet till en enda målperiod.
_Avoid_: Körning

**Periodiseringskonto**:
Det interimskonto som bryggar verifikaten i en periodförskjutning eller periodisering och nettar till noll över dem. Exakt ett konto kan markeras som förvalt periodiseringskonto.
_Avoid_: Mellankonto, Interimskonto, Bryggkonto

**Ankarrad**:
Konteringsraden som representerar bankrörelsen och ligger kvar på bankhändelsens datum. Bryggas mot periodiseringskontot; exakt en per periodförskjutning/periodisering, förvald till importens förvalda konto.

**Huvudverifikat**:
Det verifikat som bär bankhändelsen och ankarraden, samt vyn där periodförskjutningen/periodiseringen justeras eller tas bort. De övriga verifikaten pekar tillbaka på det.
_Avoid_: Ursprungsverifikat

**Länkat verifikat**:
Ett verifikat som hänvisar tillbaka till huvudverifikatet och inte kan justeras fristående. En periodförskjutning har exakt ett; en periodisering har ett per månad i spridningen.

### Planering och uppföljning

**Återkommande händelse**:
En förväntad, regelbunden bokföring vars fullföljande bevakas (antal per månad, aktiva månader). Fristående — inte bunden till ett konto. Kopplas till de verifikat som uppfyller den. Handlar om *att* något sker, inte om belopp.
_Avoid_: Återkommande transaktion, Fast post

**Budget**:
Ett planerat belopp per konto och månad, jämförs mot faktiskt utfall. Handlar om *hur mycket*, till skillnad från återkommande händelse som handlar om *att* något sker.

### Import och rapporter

**Import**:
En uppladdad CSV-fil (Icabanken) som gav upphov till en uppsättning bankhändelser. Bär filnamn, datumintervall och vilket tillgångskonto (bankkonto) händelserna hör till.

**Mall**:
En återanvändbar verifikatstruktur (förvalda konteringsrader med debet/kredit-sidor) för att snabba upp repetitiv bokföring.
_Avoid_: Template

**Periodlås**:
En låsning av en viss månad (år + månad) som förhindrar att verifikat skapas, ändras eller tas bort i den perioden.
_Avoid_: Stängd period

**Anpassad resultatvy**:
En sparad filtrering av vilka konton/grupper/kontotyper som visas i resultaträkningen. Gäller enbart resultaträkningen.
_Avoid_: Vy, Rapport

**Resultaträkning**:
Sammanställning av Intäkts- och Utgiftskonton för en period.

**Balansräkning**:
Sammanställning av Tillgångs- och Skuldkonton vid en tidpunkt.
