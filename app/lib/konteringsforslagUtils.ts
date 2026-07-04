// Pure logic for konteringsförslag — extracted here so tests can import directly.

/**
 * Build a stable string key that uniquely identifies a konteringsmönster.
 * Sorted on accountId so that {A debet, B kredit} === {B kredit, A debet}.
 */
export function buildMonsterNyckel(
  motkonton: Array<{ accountId: number; isDebet: boolean }>
): string {
  return [...motkonton]
    .sort((a, b) => a.accountId - b.accountId || (a.isDebet ? -1 : 1))
    .map((r) => `${r.accountId}:${r.isDebet ? "D" : "K"}`)
    .join("|");
}

/**
 * Distribute bankEventAmount across motkonton proportionally, based on
 * the historical amounts from the latest stödverifikat.
 *
 * Returns proposed amounts (one per motkonto) that sum exactly to
 * Math.abs(bankEventAmount). Rounding remainder is allocated to the
 * largest row(s) so that the balance invariant always holds.
 */
export function distributeAmount(
  bankEventAmount: number,
  latestAmounts: number[]
): number[] {
  if (latestAmounts.length === 0) return [];

  const targetOre = Math.round(Math.abs(bankEventAmount) * 100);

  if (latestAmounts.length === 1) return [targetOre / 100];

  const amountsOre = latestAmounts.map((a) => Math.round(a * 100));
  const totalOre = amountsOre.reduce((s, a) => s + a, 0);

  if (totalOre === 0) return latestAmounts.map(() => 0);

  // Floor-based proportional split
  const proposedOre = amountsOre.map((a) =>
    Math.floor((a * targetOre) / totalOre)
  );

  // Distribute rounding remainder to the largest rows first
  const currentSum = proposedOre.reduce((s, a) => s + a, 0);
  const remainder = targetOre - currentSum;

  const sortedIdxBySize = latestAmounts
    .map((_, i) => i)
    .sort((a, b) => latestAmounts[b] - latestAmounts[a]);

  for (let i = 0; i < remainder; i++) {
    proposedOre[sortedIdxBySize[i % sortedIdxBySize.length]]++;
  }

  return proposedOre.map((ore) => ore / 100);
}
