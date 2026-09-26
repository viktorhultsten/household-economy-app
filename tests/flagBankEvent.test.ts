import assert from "node:assert/strict";
import test from "node:test";

import { flagBankEvent, unflagBankEvent, adjustBankEventAmount, postVerifikat } from "../app/actions";

test("flagBankEvent lagrar flagga och kommentar", async () => {
  let capturedId: number | undefined;
  let capturedComment: string | null | undefined;

  await flagBankEvent(7, "saknar underlag", {
    persistFlag: async (id, comment) => {
      capturedId = id;
      capturedComment = comment;
    },
  });

  assert.equal(capturedId, 7);
  assert.equal(capturedComment, "saknar underlag");
});

test("flagBankEvent normaliserar tom kommentar till null", async () => {
  let capturedComment: string | null | undefined;

  await flagBankEvent(7, "   ", {
    persistFlag: async (_id, comment) => {
      capturedComment = comment;
    },
  });

  assert.equal(capturedComment, null);
});

test("unflagBankEvent rensar flagga", async () => {
  let capturedId: number | undefined;

  await unflagBankEvent(7, {
    persistUnflag: async (id) => {
      capturedId = id;
    },
  });

  assert.equal(capturedId, 7);
});

test("adjustBankEventAmount skriver över beloppet permanent", async () => {
  let capturedId: number | undefined;
  let capturedAmount: number | undefined;

  await adjustBankEventAmount(7, 123.45, {
    persistAdjust: async (id, amount) => {
      capturedId = id;
      capturedAmount = amount;
    },
  });

  assert.equal(capturedId, 7);
  assert.equal(capturedAmount, 123.45);
});

test("adjustBankEventAmount avvisar ogiltiga belopp", async () => {
  await assert.rejects(() => adjustBankEventAmount(7, NaN, { persistAdjust: async () => {} }));
});

test("postVerifikat rensar flagga vid bokföring av bankhändelse", async () => {
  let bankEventUpdateArgs: unknown[] = [];

  await postVerifikat(
    {
      mode: "create",
      date: "2026-03-15",
      description: "Flaggad händelse bokförd",
      bankEventId: 42,
      posts: [
        { accountId: 1, debet: 500, kredit: 0 },
        { accountId: 2, debet: 0, kredit: 500 },
      ],
    },
    {
      checkPeriodLockForDate: async () => undefined,
      getTransactionDateById: async () => null,
      persistCreate: async (command) => {
        bankEventUpdateArgs = [command.bankEventId];
        return 1;
      },
      persistUpdate: async () => undefined,
    }
  );

  // persistCreate received the bankEventId so the DB update (which clears the flag) is called
  assert.equal(bankEventUpdateArgs[0], 42);
});
