import assert from "node:assert/strict";
import test from "node:test";

import { postVerifikat } from "../app/actions";

test("postVerifikat avvisar obalanserat skapande", async () => {
  let didPersistCreate = false;

  await assert.rejects(
    postVerifikat(
      {
        mode: "create",
        date: "2026-01-15",
        description: "Obalanserat skapande",
        posts: [
          { accountId: 1, debet: 100, kredit: 0 },
          { accountId: 2, debet: 0, kredit: 99 },
        ],
      },
      {
        checkPeriodLockForDate: async () => undefined,
        getTransactionDateById: async () => null,
        persistCreate: async () => {
          didPersistCreate = true;
          return 1;
        },
        persistUpdate: async () => undefined,
      }
    ),
    /Debet och kredit måste vara lika/
  );

  assert.equal(didPersistCreate, false);
});

test("postVerifikat avvisar obalanserad ändring", async () => {
  let didPersistUpdate = false;

  await assert.rejects(
    postVerifikat(
      {
        mode: "update",
        id: 42,
        date: "2026-01-15",
        description: "Obalanserad ändring",
        posts: [
          { accountId: 1, debet: 250, kredit: 0 },
          { accountId: 2, debet: 0, kredit: 200 },
        ],
      },
      {
        checkPeriodLockForDate: async () => undefined,
        getTransactionDateById: async () => "2026-01-15",
        persistCreate: async () => 1,
        persistUpdate: async () => {
          didPersistUpdate = true;
        },
      }
    ),
    /Debet och kredit måste vara lika/
  );

  assert.equal(didPersistUpdate, false);
});
