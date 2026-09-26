# 18 — Sannolikhets- och scenariomodell med kalibrering

Status: Ej påbörjad

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

- [ ] Ren funktion: bankhändelse + mallar → alternativ med sannolikhet + scenario
- [ ] Utjämning, nyhetsviktning och speglingsregler enligt ovan
- [ ] Flera matchande mallar vägs samman
- [ ] Parametrarna samlade och namngivna
- [ ] Test som täcker varje scenario, spegling med och utan historik, och en outlier som inte påverkar
- [ ] Kalibreringsskript med backtest och rapport enligt ovan
- [ ] Parametrar valda utifrån rapporten och motiverade i issuen när den stängs

## Blocked by

- 17-harledning-av-konteringsmallar
