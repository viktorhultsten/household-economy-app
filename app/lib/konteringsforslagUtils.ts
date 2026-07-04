// Pure logic for konteringsförslag — extracted here so tests can import directly.

/**
 * Noise words that are never treated as brand/name tokens.
 * Kept small and explicit; do NOT add real brand abbreviations like "sl" or "dn".
 */
const ALPHA_NOISE = new Set([
  "", "se", "ab", "i", "och", "the", "på", "av", "in", "at",
]);

/**
 * Extract alphabetic brand/name tokens from a description.
 * Keeps short tokens like "sl" and "ica" (length ≥ 2) — previously these
 * were lost due to the old length > 2 guard.
 */
export function tokeniseAlpha(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-zåäö\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !ALPHA_NOISE.has(w));
}

/**
 * Extract pure digit tokens (e.g. OCR numbers, card suffixes) from a description.
 * These are kept separate from alpha tokens so they can boost — but never split —
 * a description match.
 */
export function tokeniseDigits(s: string): string[] {
  return s.split(/\s+/).filter((w) => /^\d+$/.test(w));
}

/**
 * Score how well two descriptions match using hardened tokenisation:
 *
 * - Alpha tokens drive Jaccard-style matching; short brands like "sl" and "ica" count.
 * - Pure digit tokens are neutral — "SL 123" and "SL 324" score the same.
 * - Shared identical digit tokens (e.g. a recurring OCR number) boost the score.
 *
 * Returns 0 (no meaningful overlap) to 100 (exact string match).
 */
export function scoreBeskrivning(query: string, candidate: string): number {
  if (query.trim().toLowerCase() === candidate.trim().toLowerCase()) return 100;

  const qAlpha = tokeniseAlpha(query);
  const cAlpha = tokeniseAlpha(candidate);

  if (qAlpha.length === 0 || cAlpha.length === 0) return 0;

  // Jaccard-style alpha token scoring
  let hits = 0;
  for (const qt of qAlpha) {
    if (cAlpha.some((ct) => ct === qt)) {
      hits += 2;
    } else if (cAlpha.some((ct) => ct.includes(qt) || qt.includes(ct))) {
      hits += 1;
    }
  }

  // Require at least one exact alpha token hit
  const exactAlphaHits = qAlpha.filter((qt) => cAlpha.includes(qt)).length;
  if (exactAlphaHits === 0) return 0;

  const union = qAlpha.length + cAlpha.length - hits / 2;
  const base = Math.round((hits / (union * 2)) * 70);

  // Digit boost: shared identical digit tokens strengthen the match (OCR / card suffix)
  const qDigits = tokeniseDigits(query);
  const cDigits = tokeniseDigits(candidate);
  const sharedDigits = qDigits.filter((d) => cDigits.includes(d));
  const digitBoost = sharedDigits.length > 0 ? 15 : 0;

  return Math.min(100, base + digitBoost);
}

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

/**
 * Score how well targetAmount matches a set of historical bank event amounts.
 * Returns 0–100; 100 = exact match. Picks the best (closest) historical amount.
 * Uses a relative distance formula: fit = (1 − |target − hist| / max(target, hist, 1)) × 100.
 */
export function beloppsScore(
  targetAmount: number,
  historicalAmounts: number[]
): number {
  if (historicalAmounts.length === 0) return 0;
  const target = Math.abs(targetAmount);
  if (target === 0) return 50; // neutral — no amount to distinguish on

  let best = 0;
  for (const hist of historicalAmounts) {
    const h = Math.abs(hist);
    const maxVal = Math.max(target, h, 1);
    const fit = Math.max(0, (1 - Math.abs(target - h) / maxVal) * 100);
    if (fit > best) best = fit;
  }
  return Math.round(best);
}

/** Minimum belopp-score gap between rank-1 and rank-2 to collapse to a single forslag. */
export const BELOPP_GAP_THRESHOLD = 20;

export interface RankInput {
  historicalAmounts: number[];
  antal: number;
  senasteDatum: string; // ISO date string
}

/**
 * Rank konteringsmönster candidates by belopp-fit (primary),
 * frequency (secondary), and recency (tertiary).
 *
 * Score-gap: if the top candidate's belopp score exceeds the second's by
 * more than BELOPP_GAP_THRESHOLD, only the winner is returned.
 * Otherwise returns up to 3.
 */
export function rankMonster<T extends RankInput>(
  candidates: T[],
  targetAmount: number
): T[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map((c) => ({
    c,
    s: beloppsScore(targetAmount, c.historicalAmounts),
  }));

  scored.sort(
    (a, b) =>
      b.s - a.s ||
      b.c.antal - a.c.antal ||
      new Date(b.c.senasteDatum).getTime() -
        new Date(a.c.senasteDatum).getTime()
  );

  const hasGap =
    scored.length >= 2 &&
    scored[0].s - scored[1].s > BELOPP_GAP_THRESHOLD;

  return (hasGap ? scored.slice(0, 1) : scored.slice(0, 3)).map((x) => x.c);
}
