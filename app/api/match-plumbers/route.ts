// app/api/match-plumbers/route.ts
import { NextResponse } from "next/server";
import plumbers from "@/data/plumbers.json";
import { rankPlumbersForJob } from "@/lib/plumbers";

type ApiSeverity = "routine" | "urgent" | "emergency";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceCodes, severity } = body as {
      serviceCodes: unknown;
      severity: unknown;
    };

    // ─────────────────────────────────────────────
    // VALIDATION (API CONTRACT)
    // ─────────────────────────────────────────────
    const validSeverity =
      severity === "routine" ||
      severity === "urgent" ||
      severity === "emergency";

    if (
      !Array.isArray(serviceCodes) ||
      serviceCodes.length === 0 ||
      !serviceCodes.every((x) => typeof x === "string") ||
      !validSeverity
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // RANK PLUMBERS
    // ─────────────────────────────────────────────
    const rankedPlumbers = rankPlumbersForJob({
      serviceCodes,
      severity: severity as ApiSeverity,
    });

    const response = rankedPlumbers.map((plumber: any) => ({
      id: plumber.id,
      name: plumber.name,
      phone: plumber.phone,
      email: plumber.email,
      location: plumber.location,
      matchedServices: (plumber.services || []).filter((s: string) =>
        serviceCodes.includes(s)
      ),
      ranking: plumber._ranking,
    }));

    // ─────────────────────────────────────────────
    // DEBUG EXPLANATION (VERY GOOD FEATURE)
    // ─────────────────────────────────────────────
    const debugAll = (plumbers as any[]).map((p) => {
      const missing = serviceCodes.filter(
        (code: string) => !p.services?.includes(code)
      );

      const emergencyCapable =
        p.services?.includes("EMERGENCY_PLUMBING") ?? false;

      const excludedBecauseEmergency =
        severity === "emergency" && !emergencyCapable;

      const included =
        missing.length === 0 && !excludedBecauseEmergency;

      return {
        name: p.name,
        included,
        missingServices: missing,
        emergencyCapable,
        services: p.services || [],
        reason: included
          ? "Included: supports all required services and passes emergency gate"
          : excludedBecauseEmergency
          ? "Excluded: not emergency-capable"
          : "Excluded: missing required services",
      };
    });

    return NextResponse.json({
      ok: true,
      plumbers: response,
      debug: {
        requiredServices: serviceCodes,
        severity,
        allPlumbers: debugAll,
      },
    });
  } catch (err) {
    console.error("MATCH-PLUMBERS ERROR:", err);

    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
