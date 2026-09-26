// Tokenisering av bankhändelsebeskrivningar (issue 11), som konteringsmallarnas
// nyckelord matchas mot — extracted here so tests can import directly.

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
