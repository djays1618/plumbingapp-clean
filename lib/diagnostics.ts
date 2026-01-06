// lib/diagnostics.ts

export type DiagnosticInput = {
  room?: string;
  fixture?: string;
  symptom?: string;
  urgency?: string; // "Yes" | "No"
};

export type DiagnosticResult = {
  primaryServiceCode: string;
  severity: "EMERGENCY" | "NON_EMERGENCY";
  confidence: number;
  explanation: string[];
};

/**
 * SINGLE SOURCE OF TRUTH
 * - Determines WHAT the issue is (service code)
 * - Determines HOW URGENT it is (severity)
 * - NEVER mixes emergency with issue type
 */
export function computeDiagnosticResult(
  input: DiagnosticInput
): DiagnosticResult {
  const explanation: string[] = [];

  // ─────────────────────────────────────────────
  // 1️⃣ DETERMINE SEVERITY (URGENCY)
  // ─────────────────────────────────────────────
  const severity =
    input.urgency === "Yes" ? "EMERGENCY" : "NON_EMERGENCY";

  explanation.push(
    severity === "EMERGENCY"
      ? "You indicated this is an emergency situation."
      : "You indicated this is not an emergency."
  );

  // ─────────────────────────────────────────────
  // 2️⃣ DETERMINE ISSUE / SERVICE CODE
  // ─────────────────────────────────────────────
  let primaryServiceCode = "GENERAL_PLUMBING";

  // Bathroom
  if (input.room === "Bathroom") {
    if (input.fixture === "Toilet") {
      primaryServiceCode = "TOILET_REPAIR";
      explanation.push("Issue involves a bathroom toilet.");
    }

    if (input.fixture === "Sink") {
      primaryServiceCode = "DRAIN_CLEANING_FIXTURE";
      explanation.push("Issue involves a bathroom sink drain.");
    }
  }

  // Kitchen
  if (input.room === "Kitchen") {
    if (input.fixture === "Sink") {
      primaryServiceCode = "DRAIN_CLEANING_FIXTURE";
      explanation.push("Issue involves a kitchen sink drain.");
    }
  }

  // Drain symptom refinement
  if (input.symptom?.includes("slow") || input.symptom?.includes("clog")) {
    explanation.push("Symptoms indicate a clogged or slow drain.");
  }

  // Fallback safety
  explanation.push(
    `Mapped to service code: ${primaryServiceCode}`
  );

  // ─────────────────────────────────────────────
  // 3️⃣ CONFIDENCE SCORE (SIMPLE, HONEST)
  // ─────────────────────────────────────────────
  let confidence = 0.6;

  if (input.room && input.fixture && input.symptom) {
    confidence = 0.75;
  }

  if (severity === "EMERGENCY") {
    confidence += 0.05;
  }

  return {
    primaryServiceCode,
    severity,
    confidence,
    explanation,
  };
}
