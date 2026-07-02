# 05 — Hindra grupp-/typbyte på konto med konteringsrader

## What to build

Inför validering som hindrar att ett konto flyttas till en annan grupp (och därmed byter kontotyp) när kontot redan har konteringsrader. Kontotyp ärvs alltid från gruppen; att byta typ på ett använt konto skulle retroaktivt flytta historik mellan resultat- och balansräkning.

Gäller end-to-end: server action för att uppdatera konto avvisar typ-/gruppbyte när konteringsrader finns, och kontogränssnittet visar detta tydligt (t.ex. inaktiverat grupp-val med förklaring) i stället för att tillåta ett val som sedan avvisas.

## Acceptance criteria

- [ ] Server action för konto-uppdatering avvisar grupp-/typbyte när kontot har konteringsrader
- [ ] Konto utan konteringsrader kan fortfarande byta grupp fritt
- [ ] Kontogränssnittet kommunicerar begränsningen innan användaren försöker spara
- [ ] Test som täcker både tillåtet och avvisat fall

## Blocked by

- 03-migrera-server-actions-till-drizzle
