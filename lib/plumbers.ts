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
  severity: "EMERGENCY" | "NON_EMERGENCY";
}) {
  const { serviceCodes, severity } = params;

  // 1️⃣ Require ALL services
  let matched = matchPlumbersByAllServices(serviceCodes);

  // 2️⃣ HARD emergency gate
  if (severity === "EMERGENCY") {
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

    const score =
      exactMatches * 100 +
      (severity === "NON_EMERGENCY" ? 10 : 0) +
      (severity === "EMERGENCY" && emergencyCapable ? 50 : 0);

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
