import { ucpRules, type SeverityLevel } from "./ucpRules";

export interface SeverityResult {
  level: SeverityLevel;
  score: number;
}

const SEVERITY_SCORES: Record<SeverityLevel, number> = {
  HIGH: 30,
  MEDIUM: 15,
  LOW: 5,
};

const SEVERITY_ORDER: SeverityLevel[] = ["LOW", "MEDIUM", "HIGH"];

function escalate(level: SeverityLevel): SeverityLevel {
  const idx = SEVERITY_ORDER.indexOf(level);
  return idx < SEVERITY_ORDER.length - 1
    ? SEVERITY_ORDER[idx + 1]!
    : SEVERITY_ORDER[SEVERITY_ORDER.length - 1]!;
}

/**
 * Determines severity level and score for a given field + verdict pair.
 * If rules and AI conflict (one passed, one failed), escalates one level.
 */
export function getSeverity(
  field: string,
  rulesPassed: boolean,
  aiPassed: boolean,
): SeverityResult {
  const rule = ucpRules.find((r) => r.field === field);
  let level: SeverityLevel = rule?.severity ?? "MEDIUM";

  const conflict = rulesPassed !== aiPassed;
  if (conflict) {
    level = escalate(level);
  }

  return { level, score: SEVERITY_SCORES[level] };
}
