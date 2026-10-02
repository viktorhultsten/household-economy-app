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

**Godkänna**:
Att bokföra en bankhändelse enligt dess säkra konteringsförslag i den förenklade vyn, utan att ändra konteringen. Görs från en kö med högst 25 säkra, oflaggade bankhändelser. Den som vill ändra något växlar till den vanliga bokföringsvyn.
_Avoid_: Autobokföra, Snabbokföra

**Konteringsmall**:
Ett gemensamt, levande regelverk för hur en typ av bankhändelse konteras. Består av en **matchning** (nyckelord i beskrivningen, ankarkonto, beloppsintervall, dag i månaden, riktning — var och en bara när den särskiljer) och ett eller flera **konteringsalternativ**. Enda källan till konteringsförslag. Härleds av appen ur historiken eller skapas av användaren. Kan även ge en återkommande händelse när den tillämpas. Se [ADR-0010](docs/adr/0010-konteringsmallar-som-enda-forslagskalla.md).
_Avoid_: Mall (ensamt), Bokföringsmall, Bokningsmall, Template, Konteringsmönster

**Konteringsalternativ**:
Ett sätt att kontera det en konteringsmall matchar: motkonton, deras sida **relativt ankarraden** (samma/motsatt) och fördelning vid split, samt hur stor andel av historiken som använt det. Identifieras av sin struktur, aldrig av ett belopp.

**Spegling**:
En bankhändelse med omvänd riktning mot mallens normala (t.ex. en kreditering på en utgiftsmall) som konteras enligt samma konteringsalternativ med debet och kredit omvända. Samma alternativ, inte en avvikelse. Utan historiska speglingar är den en kvalificerad gissning och aldrig säker.

**Konteringsförslag**:
Ett konteringsalternativ ur en matchande konteringsmall, föreslaget för en obokförd bankhändelse med en sannolikhet. Antalet förslag avgörs av scenariot: **säker** (ett förslag), **val** (ett fåtal likvärdiga), **splittrad** (inga förslag, bara en notis) eller **okänd** (ingen mall matchar). Förslaget tillämpas aldrig utan att användaren väljer det.
_Avoid_: Förslag (ensamt, tvetydigt)

**Låst konteringsmall**:
En konteringsmall som appen inte får ändra. Appen utvärderar den och skapar inga konkurrerande mallar för det den matchar. En **olåst** mall får appen justera, slå ihop eller ta bort.

**Inaktiverad konteringsmall**:
En konteringsmall som användaren stängt av. Föreslås inte, men hindrar appen från att härleda en mall som matchar samma bankhändelser. Kan återaktiveras eller raderas.
_Avoid_: Avvisad

**Borttagen konteringsmall**:
En konteringsmall som appen tagit bort. Permanent — finns kvar enbart för spårbarhet och används inte av någon affärslogik eller något UI.

**Mallanalys**:
Den nattliga, automatiska körningen som härleder och justerar konteringsmallar ur historiken och uppdaterar deras statistik. Varje körning loggas.
_Avoid_: Indexering, Träning

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

### Analys

**Analys**:
Samlingsplatsen för analysverktyg — vyer som läser bokföringen ur en annan vinkel än rapporterna. Varje verktyg är en flik under Analys. Även uppföljningen av återkommande händelser bor här.

**Bundet sparande**:
Pengar som varje månad ska gå till ett balanskonto du valt att inte räkna som tillgängliga — t.ex. amortering på bolånet eller pensionsspar. Ingen utgift: förmögenheten växer, men pengarna lämnar ändå det fria flödet. Markeras per konto och bara på tillgångs- eller skuldkonton; användaren väljer själv vilka (en semesterfond som byggs upp för att tas ut är det t.ex. inte, och inte heller ett kreditkort, vars köp redan är utgifter). Räknas som inbetalningar (debet) som kommer utifrån: flyttar mellan två konton med bundet sparande, uttag och nya lån räknas inte. Budgeteras som planerad förändring på kontot (amortering 6 000 som −6 000 på skuldkontot, pensionsspar 2 000 som +2 000 på tillgångskontot).
_Avoid_: Amorteringskonto, Avsättning, Åtagande

**Överskott**:
Ett analysverktyg och dess nyckeltal: resultatet (intäkter − utgifter) minus det bundna sparandet, per månad och ackumulerat, mot budget. Svarar på om pengarna räcker, medan resultatet svarar på om förmögenheten växer. Avvikelser visas som effekt på överskottet — positivt är alltid bättre än budget.
_Avoid_: Kassaflöde, Fritt kassaflöde

**Kontohistorik**:
Ett analysverktyg: en matris av valda konton × månader som visar varje verifikat som bokats på kontot den månaden, med datum, belopp (kontots normala sida som positiv) och bankhändelsens text. Månaden avgörs av verifikatets datum, så periodiserade poster syns i sina målmånader. Urvalet (konton och period) bor i URL:en och sparas inte. Används för att se att något kommit in regelbundet och hitta luckor utan att gå in på ett konto i taget.
_Avoid_: Kontomatris, Månadsöversikt

### Import och rapporter

**Import**:
En uppladdad CSV-fil (Icabanken) som gav upphov till en uppsättning bankhändelser. Bär filnamn, datumintervall och vilket tillgångskonto (bankkonto) händelserna hör till.

**Extern import**:
En import som avser ett privat konto som inte bokförs. Bankhändelserna bokförs mot ett valt **skuldkonto** i stället för ett bankkonto (tillgångskonto) — t.ex. privata köp som hushållsekonomin ska täcka. Verifikaten märks som externa i verifikatlistan.
_Avoid_: Privatimport

**Irrelevant bankhändelse**:
En bankhändelse i en extern import som markerats som att den inte ska bokföras. Faller ur att göra-listan utan att ge upphov till ett verifikat. Reversibelt — ångras från importens händelselista.
_Avoid_: Struntpost, Ignorerad

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
