// Pure helpers for periodisering (see docs/adr/0008). Kept out of the
// "use server" module so they can be unit-tested and reused synchronously.

export type PeriodiseringPostInput = {
  accountId: number;
  debet: number;
  kredit: number;
  description?: string;
};

function periodiseringError(message: string): Error {
  return new Error(`[VALIDATION] ${message}`);
}

// Derive the two verifikats' posts from the logical (balanced) kontering.
// The anchor row stays on the bank date in the huvudverifikat; every other
// row moves to the länkat verifikat, bridged by the periodiseringskonto.
export function derivePeriodiseringPosts(
  posts: PeriodiseringPostInput[],
  anchorAccountId: number,
  periodiseringskontoId: number
): {
  anchorAmount: number;
  huvudPosts: PeriodiseringPostInput[];
  lankatPosts: PeriodiseringPostInput[];
} {
  const totalDebet = posts.reduce((acc, post) => acc + post.debet, 0);
  const totalKredit = posts.reduce((acc, post) => acc + post.kredit, 0);
  if (Math.abs(totalDebet - totalKredit) > 0.001) {
    throw periodiseringError("Debet och kredit måste vara lika");
  }

  if (posts.some((p) => p.accountId === periodiseringskontoId)) {
    throw periodiseringError(
      "Periodiseringskontot får inte användas som en konteringsrad i en periodisering."
    );
  }

  const anchorPosts = posts.filter((p) => p.accountId === anchorAccountId);
  if (anchorPosts.length !== 1) {
    throw periodiseringError("Exakt en ankarrad måste väljas.");
  }
  const anchor = anchorPosts[0];
  const anchorIsDebet = anchor.debet > 0;
  const anchorAmount = anchorIsDebet ? anchor.debet : anchor.kredit;
  if (anchorAmount <= 0) {
    throw periodiseringError("Ankarraden måste ha ett belopp.");
  }

  const others = posts.filter((p) => p.accountId !== anchorAccountId);

  // Huvud: anchor + periodiseringskonto on the opposite side, same amount.
  const huvudPosts: PeriodiseringPostInput[] = [
    { ...anchor },
    {
      accountId: periodiseringskontoId,
      debet: anchorIsDebet ? 0 : anchorAmount,
      kredit: anchorIsDebet ? anchorAmount : 0,
    },
  ];

  // Länkat: the other rows + periodiseringskonto on the same side as the anchor.
  const lankatPosts: PeriodiseringPostInput[] = [
    ...others.map((p) => ({ ...p })),
    {
      accountId: periodiseringskontoId,
      debet: anchorIsDebet ? anchorAmount : 0,
      kredit: anchorIsDebet ? 0 : anchorAmount,
    },
  ];

  return { anchorAmount, huvudPosts, lankatPosts };
}
