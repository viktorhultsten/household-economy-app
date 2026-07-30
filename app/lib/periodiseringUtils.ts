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

// Split an integer amount (in öre) into n parts. The first n-1 parts are
// floored; the last part absorbs the remainder so the parts sum exactly to the
// input. See docs/adr/0009.
export function splitAmountOre(totalOre: number, n: number): number[] {
  const base = Math.floor(totalOre / n);
  const parts = new Array<number>(n).fill(base);
  parts[n - 1] += totalOre - base * n;
  return parts;
}

// Derive the huvudverifikat and the N per-month länkade verifikat for a
// periodisering that spreads the cost/intäkt evenly over `antalManader`
// consecutive months. The huvudverifikat is identical to a periodförskjutning
// (anchor + full periodiseringskonto); each slice carries the category rows
// scaled to that month plus its periodiseringskonto bridge, so every slice
// balances and the bridge nets to zero across all slices. See docs/adr/0009.
export function derivePeriodiseringSlices(
  posts: PeriodiseringPostInput[],
  anchorAccountId: number,
  periodiseringskontoId: number,
  antalManader: number
): {
  anchorAmount: number;
  huvudPosts: PeriodiseringPostInput[];
  slices: PeriodiseringPostInput[][];
} {
  if (!Number.isInteger(antalManader) || antalManader < 1) {
    throw periodiseringError("Antal månader måste vara ett heltal och minst 1.");
  }

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

  // Huvud: identical to a periodförskjutning — anchor + full bridge.
  const huvudPosts: PeriodiseringPostInput[] = [
    { ...anchor },
    {
      accountId: periodiseringskontoId,
      debet: anchorIsDebet ? 0 : anchorAmount,
      kredit: anchorIsDebet ? anchorAmount : 0,
    },
  ];

  // Split each category row's amount (in öre) across the months.
  const otherSplits = others.map((o) => {
    const isDebet = o.debet > 0;
    const amountOre = Math.round((isDebet ? o.debet : o.kredit) * 100);
    return { post: o, isDebet, split: splitAmountOre(amountOre, antalManader) };
  });

  const slices: PeriodiseringPostInput[][] = [];
  for (let month = 0; month < antalManader; month++) {
    let bridgeOre = 0;
    const rows: PeriodiseringPostInput[] = [];
    for (const os of otherSplits) {
      const ore = os.split[month];
      bridgeOre += ore;
      const amount = ore / 100;
      rows.push({
        accountId: os.post.accountId,
        debet: os.isDebet ? amount : 0,
        kredit: os.isDebet ? 0 : amount,
        description: os.post.description,
      });
    }
    // Bridge on the same side as the anchor, balancing this slice's category rows.
    const bridgeAmount = bridgeOre / 100;
    rows.push({
      accountId: periodiseringskontoId,
      debet: anchorIsDebet ? bridgeAmount : 0,
      kredit: anchorIsDebet ? 0 : bridgeAmount,
    });
    slices.push(rows);
  }

  return { anchorAmount, huvudPosts, slices };
}
