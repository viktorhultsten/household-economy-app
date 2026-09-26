# 18 — Sannolikhets- och scenariomodell med kalibrering

Status: Klar

## What to build

En ren funktion som, givet en bankhändelse och de aktiva konteringsmallarna, räknar ut en sannolikhet per konteringsalternativ och avgör **scenario**: *säker*, *val*, *splittrad* eller *okänd* (se [ADR-0010](../adr/0010-konteringsmallar-som-enda-forslagskalla.md)).

**Sannolikheten per alternativ:**
- **Utjämnad frekvens:** lite underlag ger låg säkerhet.
- **Viktning mot nyare bokföringar:** nyare väger tyngre än äldre.
- **Spegling utan historik i den riktningen:** kvalificerad gissning, kan aldrig ge *säker*.
- **Historiska speglingar på samma mall:** väger mycket tungt, så att 100 utgifter och en speglad kreditering gör nästa kreditering säker.

**Flera matchande mallar.** Om flera mallar matchar samma bankhändelse vägs de samman, så att en konflikt mellan mallarna blir ett *val* och inte ett dolt beslut.

**Parametrar.** Gränserna (säkerhetsgräns, minsta underlag, täckning och minsta andel för *val*, max antal alternativ innan *splittrad*, halveringstid för nyhetsviktning) samlas som namngivna parametrar på ett ställe.

**Kalibrering.** Ett skript kör modellen över den historiska datan i dev-databasen, som ett backtest där varje händelse bedöms bara utifrån mallar härledda ur händelser *före* den. Skriptet rapporterar:
- fördelningen över scenarier;
- hur ofta *säker* hade rätt;
- hur ofta rätt kontering fanns bland alternativen i *val*.

Parametrarna sätts utifrån rapporten, i samråd med användaren.

## Acceptance criteria

- [x] Ren funktion: bankhändelse + mallar → alternativ med sannolikhet + scenario
- [x] Utjämning, nyhetsviktning och speglingsregler enligt ovan
- [x] Flera matchande mallar vägs samman
- [x] Parametrarna samlade och namngivna
- [x] Test som täcker varje scenario, spegling med och utan historik, och en outlier som inte påverkar
- [x] Kalibreringsskript med backtest och rapport enligt ovan
- [x] Parametrar valda utifrån rapporten och motiverade i issuen när den stängs

## Implementation

- Modellen ligger i `app/lib/konteringsmallSannolikhet.ts` (`bedomBankhandelse`), med gränserna samlade i `SANNOLIKHET_PARAMETRAR`. Tester i `tests/konteringsmallSannolikhet.test.ts`.
- **Indata:** bankhändelsen, mallarna och *underlaget* per mall, dvs. de historiska bankhändelser mallen matchar (`underlagForMallar`, byggt på härledningens observationer). Underlaget behövs för nyhetsviktning och speglingar, som inte går att räkna ut ur den lagrade statistiken.
- **Andel per mall:** nyhetsviktad (halveringstid) fördelning i händelsens riktning, med fördelningen över båda riktningarna som prior värd `riktningsprior` observationer. Utan historik i riktningen blir andelen fördelningen över båda riktningarna, men förslaget markeras som `gissning` och kan inte bli *säker*. En enda historisk spegling på samma alternativ räcker för *säker* (100 utgifter + 1 speglad kreditering), medan en spegling på ett annat alternativ ger ett *val*.
- **Utjämning:** sannolikheten är andelen × n / (n + `utjamning`), där n är antalet bankhändelser i underlaget. Underlagsbankhändelser som inte följer något av mallens alternativ (outliers) finns kvar i nämnaren men visas aldrig.
- **Flera mallar:** en strikt specifikare mall (fler nyckelord, snävare belopp, satt riktning, dag eller ankare) vinner över en allmännare. Kvarvarande mallar vägs samman med lika vikt, så att en liten mall som är oense med en stor ger ett *val*. Underlag som flera mallar delar räknas en gång.
- **Scenario:** *säker* om bästa alternativet har sannolikhet ≥ `sakerhetsgrans`, underlaget ≥ `minUnderlag` och det inte är en gissning. Annars *val* om högst `maxValAlternativ` alternativ med andel ≥ `valMinAndel` tillsammans täcker ≥ `valTackning`. Annars *splittrad*. Ingen aktiv mall ger *okänd*; matchande inaktiverade mallar returneras för notisen i issue 19.
- **Mall utan underlag** (t.ex. nyskapad av användaren) ger lika andel per alternativ och sannolikhet 0, alltså ett *val*.
- `npm run mallar:kalibrera:dev` kör backtestet. Varje bokföringsdag härleds mallarna på nytt ur bankhändelserna före den dagen (som den nattliga körningen), och dagens bankhändelser bedöms mot dem. Rapporten visar scenarier, träffsäkerhet, fel säkra förslag, utfall per månad och känslighet när en parameter i taget varieras.

## Kalibrering

Backtest mot dev-databasen 2026-09-26: 995 bankhändelser, 2025-10-03 – 2026-09-05 (knappt ett år).

| Scenario | Andel | Träffsäkerhet |
|---|---|---|
| Säker | 24,1 % | 233 av 240 rätt (97,1 %) |
| Val | 27,7 % | rätt bland alternativen 256 av 276 (92,8 %), 1,21 alternativ i snitt |
| Splittrad | 2,2 % | |
| Okänd | 45,9 % | |

- **Okänd** domineras av kort historik: 82 % i oktober, 30–40 % från februari. Det är härledningens täckning, inte den här modellen.
- **De sju fel säkra** är begripliga: en `Ica Försäkr` innan försäkringsmallen fanns, ett apotek med "Ica" i namnet, en Coop-lunch, tre Maxi-köp som delades mot fordringar och en Avanza-insättning där sättet att bokföra hade ändrats.
- **Känslighet:** `sakerhetsgrans` och `utjamning` styr nästan allt. De samverkar: med utjämning 1 och gräns 0,9 krävs minst 9 bankhändelser för *säker*, så `minUnderlag` under 8 påverkar inget. Gränsen 0,85 ger 34 % säker med 96,4 % rätt, och 0,95 ger bara 2 %. `halveringstidDagar` och `riktningsprior` påverkar knappt, eftersom historiken är ett år lång och speglingarna få. `valTackning`, `valMinAndel` och `maxValAlternativ` flyttar bara någon procent mellan *val* och *splittrad*.

**Beslut (2026-09-26, med användaren):** behåll `sakerhetsgrans` 0,9 och `utjamning` 1. De ger drygt 97 % rätt bland säkra, och de fel som blir kvar kommer från mallarna, inte från gränsen. Behåll övriga parametrar tills historiken är längre. Kör om kalibreringen när det finns ett andra år.

## Blocked by

- 17-harledning-av-konteringsmallar
