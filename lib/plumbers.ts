import plumbers from "@/data/plumbers.json";

/**
 * Match plumbers that support ALL required services
 */
export function matchPlumbersByAllServices(
  requiredServices: string[]
) {
  return plumbers.filter((plumber: any) =>
    requiredServices.every((code) =>
      plumber.services.includes(code)
    )
  );
}

/**
 * Rank plumbers for a job with HARD emergency gate
 */
export function rankPlumbersForJob(params: {
  serviceCodes: string[];
  severity: "EMERGENCY" | "URGENT" | "ROUTINE";
}) {
  const { serviceCodes, severity } = params;

  // 1️⃣ Require ALL services
  let matched = matchPlumbersByAllServices(serviceCodes);

  // 2️⃣ HARD emergency gate - both EMERGENCY and URGENT require emergency-capable plumbers
  if (severity === "EMERGENCY" || severity === "URGENT") {
    matched = matched.filter((plumber: any) =>
      plumber.services.includes("EMERGENCY_PLUMBING")
    );
  }

  // 3️⃣ Rank
  const ranked = matched.map((plumber: any) => {
    const exactMatches = serviceCodes.filter(code =>
      plumber.services.includes(code)
    ).length;

    const emergencyCapable =
      plumber.services.includes("EMERGENCY_PLUMBING");

    // Scoring: prioritize emergency-capable plumbers for urgent/emergency jobs
    const score =
      exactMatches * 100 +
      (severity === "ROUTINE" ? 10 : 0) +
      ((severity === "EMERGENCY" || severity === "URGENT") && emergencyCapable ? 50 : 0);

    return {
      ...plumber,
      _ranking: {
        score,
        exactMatches,
        supportedServices: serviceCodes,
        emergencyCapable,
      },
    };
  });

  ranked.sort((a, b) => b._ranking.score - a._ranking.score);

  return ranked;
}
