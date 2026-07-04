# 10 — Belopp-fit-rankning och en-vs-flera via score-gap

Status: Att göra

## What to build

Gör bankhändelsens belopp till den primära särskiljaren när flera konteringsmönster matchar samma beskrivning. Varje mönster har en historisk beloppsfördelning från sina stödverifikat; den aktuella bankhändelsens belopp matchas mot dessa fördelningar och avgör rankningen. Frekvens (antal stödverifikat) och därefter aktualitet används enbart som utslagsgivare när beloppet inte kan särskilja mönstren.

Ett tydligt beloppsutslag ska kunna slå rå frekvens: t.ex. SL bokat som *Resa 50 kr* (ofta) och *Resa/Fordran split @ 100 kr* (sällan) ska, för en ny händelse på 100 kr, ranka splitten högst.

Antalet visade förslag styrs av **score-gapet** mellan de främsta mönstren: är gapet tydligt visas ett enda säkert förslag; är de främsta jämna (eller kan beloppet inte särskilja dem) visas upp till 3 rankade förslag. Hård gräns på 3.

## Acceptance criteria

- [ ] Rankning väger beloppspassning som primär särskiljare, frekvens och aktualitet som utslagsgivare
- [ ] Tydligt beloppsutslag kan ranka ett mindre frekvent mönster högst (SL-scenariot)
- [ ] Score-gap avgör om ett eller flera förslag visas; högst 3
- [ ] Test som täcker SL 50 kr / 100 kr-split-scenariot och ett tvetydigt fall med flera förslag

## Blocked by

- 08-rankade-konteringsmonster-forslagskort
