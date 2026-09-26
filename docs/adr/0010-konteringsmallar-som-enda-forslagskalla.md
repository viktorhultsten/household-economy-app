# Konteringsmallar som enda källa till konteringsförslag

Mallar och konteringsförslag slås ihop till ett begrepp: **konteringsmallen**. Konteringsförslag i bokföringsvyn skapas **enbart** ur konteringsmallar, aldrig direkt ur historiken. Mallarna är ett gemensamt, levande regelverk som appen och användaren underhåller tillsammans. Appen härleder och justerar mallar ur historiska verifikat med bankhändelser i en nattlig körning, och användaren kan skapa, justera, låsa och inaktivera mallar. Målet är att återkommande bankhändelser ska bokföras så enkelt som möjligt, utan att appen föreslår fel och utan att den blir osäker på uppenbara konteringar.

Detta ersätter både de tidigare statiska bokföringsmallarna (en radstruktur som valdes manuellt) och de live-beräknade konteringsförslagen (issues [08](../issues/08-rankade-konteringsmonster-forslagskort.md)–[11](../issues/11-hardad-tokenisering-beskrivningar.md)), som grupperade historiken vid varje bokning men aldrig sparade eller visade vad de kommit fram till. Heuristiken är fortfarande lokal och deterministisk enligt [ADR-0006](0006-konteringsforslag-lokal-heuristik.md).

## Modell

En konteringsmall består av två delar:

- **Matchning** (*vad*): nyckelord i bankhändelsens beskrivning, ankarkonto (bankkonto/skuldkonto), beloppsintervall, dag i månaden och riktning (in/ut). Varje attribut är valfritt och används bara när det faktiskt särskiljer. Riktning ingår alltså inte i matchningen per automatik.
- **Konteringsalternativ** (*hur*): ett eller flera sätt att kontera det som matchar, vart och ett med en historisk andel. Ett alternativ beskrivs **relativt ankarraden**: vilka motkonton som används, om de står på samma eller motsatt sida som ankaret, och hur beloppet fördelas vid split.

Mallen kan också **ge** en återkommande händelse (och i framtiden en periodisering) när den tillämpas. Detta är utdata, inte något mallen matchar på.

### Spegling

Eftersom alternativen är relativa ankarraden är en **spegling** (en kreditering på en mall som normalt är en utgift, med debet och kredit omvända) **samma** konteringsalternativ, inte en avvikelse och inte en egen mall. Historiska speglingar räknas som stöd för mallen. Bokförs inbetalningar däremot på ett eget sätt (t.ex. en bonus mot ett intäktskonto) och det finns tillräckligt underlag, härleds en egen mall med riktningen som matchningsattribut, och den vinner för den riktningen.

### Dag i månaden

Avstånd i tid mäts i **kalenderdagar över månadsskiften**, inte som skillnad mellan dagnummer. Den 30 juni och den 1 juli ligger nära varandra, och det gör även den 28 februari och den 1 mars. Förväntad dag uttrycks antingen från månadens början ("dag 25") eller från månadens slut ("3 dagar före månadsslut"). Härledningen väljer den form som ger tätast mönster, så att dragningar som ibland hamnar sista dagarna och ibland första dagarna ändå bildar ett tätt mönster. Saknas mönster används dagen inte.

### Sannolikhet och scenarier

För en bankhändelse beräknas en sannolikhet per konteringsalternativ i de matchande mallarna:

- **Utjämnad frekvens**: lite underlag ger låg säkerhet (2 av 2 är inte 100 %), mycket underlag ger hög säkerhet.
- **Nyare bokföringar väger tyngre**, så att ett ändrat sätt att bokföra slår igenom.
- **Outliers** (alternativ med få förekomster och låg andel) tas inte med som alternativ. Växer de över tid blir de riktiga alternativ.
- **Spegling utan historik i den riktningen** är en kvalificerad gissning och kan föreslås men aldrig bli *säker*. Finns historiska speglingar väger de mycket tungt: 100 utgifter och en speglad kreditering gör nästa kreditering säker.

Fördelningen avgör ett av fyra **scenarier**. Antalet förslag följer av fördelningen och är inte hårdkodat:

| Scenario | Villkor (gränserna är parametrar) | Användaren ser |
|---|---|---|
| **Säker** | Ett alternativ över säkerhetsgränsen med tillräckligt underlag | Ett förslag, markerat som säkert |
| **Val** | Ett fåtal alternativ täcker tillsammans det mesta, vart och ett med rimlig andel | Alla alternativ, presenterade som ett val |
| **Splittrad** | Det krävs för många alternativ för att täcka fördelningen | Inga förslag, en kort notis |
| **Okänd** | Ingen mall matchar | Ingenting |

Gränserna kalibreras mot verklig data innan de sätts. *Säker* är den nivå som en framtida automatisk kontering kan bygga på, med en strängare gräns.

### Livscykel

- **Ursprung**: skapad av användaren eller härledd av appen. Ursprunget är information och styr ingen regel.
- **Låst**: appen ändrar ingenting i mallen, men utvärderar och visar dess statistik. Appen skapar inga konkurrerande mallar för de bankhändelser en låst mall matchar. Användaren får frågan om att låsa när en mall skapas eller ändras.
- **Olåst**: appen får göra vad den vill med mallen: justera, slå ihop eller ta bort. Användaren accepterar att appen kan ändra tillbaka.
- **Inaktiverad** (av användaren): mallen föreslås inte, men den blockerar att appen härleder en mall som i huvudsak matchar samma bankhändelser. Den syns på mallsidan och som en diskret notis i bokföringsvyn när en bankhändelse matchar den, så att användaren förstår varför inget föreslås. Den kan återaktiveras, eller raderas helt, och då får appen hitta mönstret igen.
- **Borttagen** (av appen): permanent. Mallen kan finnas kvar för spårbarhet men används inte av någon affärslogik eller något UI.

Två mallar **konkurrerar** när de i huvudsak matchar samma historiska bankhändelser. Identiteten bestäms alltså av vilka händelser mallarna matchar, inte av exakta nyckelord eller beloppsgränser, eftersom mönster driver över tid.

### Automatik och spårbarhet

Härledningen körs **automatiskt varje natt** som en egen tjänst, utan att användaren är inblandad. Varje körning loggas med tidpunkt, varaktighet, analyserad historik, vad som ändrades och eventuella fel, och loggen visas på mallsidan. Varje mall har en **ändringslogg** som visar vad appen och användaren gjort med den över tid.

## Considered Options

- **Förslag från både mallar och historik** – förkastad. Två källor gör det svårt att förstå varför något föreslås. Med enbart mallar är det som syns på mallsidan det som styr, och appen och användaren arbetar mot samma bild. Kostnaden är att ett helt nytt mönster syns först efter nästa nattliga körning.
- **Riktning som fast del av mallen, spegling som egen mall** – förkastad. En kreditering på en utgiftsmall följer mallen och ska stärka den, inte splittra den i två mallar.
- **Fast antal förslag (max 3)** – förkastad till förmån för scenarier. Tio rimliga alternativ är inte ett förslag. Då är det bättre att användaren konterar själv.
- **Konkurrerande mallar som separata poster i stället för alternativ i en mall** – förkastad. När samma typ av bankhändelse har två vanliga konteringar är det en egenskap hos *en* mall, och valet mellan dem ska presenteras som ett val.
- **Migrera befintliga bokföringsmallar** – förkastad. De är förenklade och saknar matchningsregler. De tas bort, och användaren skapar nya mallar vid behov.
- **Hårdkodade undantag (t.ex. Swish)** – förkastad. Svårtolkade bankhändelser ska landa i *okänd* eller *splittrad* för att historiken inte bär ett mönster, inte för att de är undantagna. Hittar appen ett mönster som användaren inte vill ha, inaktiverar användaren mallen.

## Consequences

- Tabellerna för bokföringsmallar ersätts av en ny modell för konteringsmallar och konteringsalternativ, med ändringslogg och körningslogg. Befintliga mallar raderas.
- `getKonteringsforslag` skrivs om till att enbart utvärdera mallar. Den live-beräknade grupperingen av historiken och den oanvända `getBookingSuggestion` tas bort. Tokeniseringen från issue 11 återanvänds i matchningen.
- Den nattliga körningen blir en ny tjänst i `docker-compose` som kör ett skript mot databasen.
- Automatisk kontering av säkra bankhändelser och periodisering som utdata från en mall ligger utanför detta beslut.
