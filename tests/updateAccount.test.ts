import assert from "node:assert/strict";
import test from "node:test";

import { updateAccount } from "../app/actions";

test("updateAccount avvisar gruppbyte för konto med konteringsrader", async () => {
  let didPersistUpdate = false;
  let didCheckPosts = false;

  await assert.rejects(
    updateAccount(
      {
        id: 10,
        namn: "Mat",
        groupId: 2,
      },
      {
        getAccountById: async () => ({ id: 10, groupId: 1 }),
        getPostCountByAccountId: async () => {
          didCheckPosts = true;
          return 3;
        },
        persistUpdate: async () => {
          didPersistUpdate = true;
        },
      }
    ),
    /Kan inte byta grupp för konto som redan har konteringsrader/
  );

  assert.equal(didCheckPosts, true);
  assert.equal(didPersistUpdate, false);
});

test("updateAccount tillåter gruppbyte för konto utan konteringsrader", async () => {
  let didPersistUpdate = false;

  await updateAccount(
    {
      id: 10,
      namn: "Mat",
      groupId: 2,
    },
    {
      getAccountById: async () => ({ id: 10, groupId: 1 }),
      getPostCountByAccountId: async () => 0,
      persistUpdate: async () => {
        didPersistUpdate = true;
      },
    }
  );

  assert.equal(didPersistUpdate, true);
});
