import * as fuzz from "fuzzball";

export type Verdict = "PASS" | "FAIL";

export interface FuzzyResult {
  verdict: Verdict;
  score: number;
}

/**
 * Computes token_set_ratio between two strings (0–100).
 * Score ≥ 85 → PASS, score < 85 → FAIL.
 */
export function tokenSetRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  return fuzz.token_set_ratio(a, b);
}

export function getVerdict(score: number): FuzzyResult {
  return {
    verdict: score >= 85 ? "PASS" : "FAIL",
    score,
  };
}
