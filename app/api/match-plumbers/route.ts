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

    // Detailed validation with specific error messages
    if (!Array.isArray(serviceCodes)) {
      console.error("Validation failed: serviceCodes is not an array", { serviceCodes, type: typeof serviceCodes });
      return NextResponse.json(
        { ok: false, error: "Invalid request payload: serviceCodes must be an array" },
        { status: 400 }
      );
    }

    if (serviceCodes.length === 0) {
      console.error("Validation failed: serviceCodes array is empty", { serviceCodes });
      return NextResponse.json(
        { ok: false, error: "Invalid request payload: serviceCodes array cannot be empty" },
        { status: 400 }
      );
    }

    if (!serviceCodes.every((x) => typeof x === "string")) {
      console.error("Validation failed: serviceCodes contains non-string values", { serviceCodes });
      return NextResponse.json(
        { ok: false, error: "Invalid request payload: all serviceCodes must be strings" },
        { status: 400 }
      );
    }

    if (!validSeverity) {
      console.error("Validation failed: invalid severity", { severity, type: typeof severity });
      return NextResponse.json(
        { ok: false, error: `Invalid request payload: severity must be "routine", "urgent", or "emergency", got: ${severity}` },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // RANK PLUMBERS
    // ─────────────────────────────────────────────
    // Map API severity to internal format (preserves all three levels)
    const internalSeverity =
      severity === "emergency"
        ? "EMERGENCY"
        : severity === "urgent"
        ? "URGENT"
        : "ROUTINE";
    
    const rankedPlumbers = rankPlumbersForJob({
      serviceCodes,
      severity: internalSeverity,
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
        (internalSeverity === "EMERGENCY" || internalSeverity === "URGENT") &&
        !emergencyCapable;

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
          ? `Excluded: not emergency-capable (required for ${internalSeverity.toLowerCase()} jobs)`
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
