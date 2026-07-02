# Single-user, lokal drift, ingen autentisering

Appen är designad för att köras lokalt av en enda användare för privat ekonomihantering. Vi har därför medvetet ingen autentisering, inga `user_id`-kolumner och ingen radnivå-säkerhet — "alla är samma användare".

Multi-user och molndrift är uttryckligen **out of scope** och ska inte designas för (strö inte in `user_id` eller behörighetslager). Om behovet någonsin uppstår omprövas detta via en ny ADR som ersätter denna.
