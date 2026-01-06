// app/api/match-plumbers/route.ts
import { NextResponse } from "next/server";
import plumbers from "@/data/plumbers.json";
import { rankPlumbersForJob } from "@/lib/plumbers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceCodes, severity } = body;

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────
    if (
      !Array.isArray(serviceCodes) ||
      !serviceCodes.every((x: any) => typeof x === "string") ||
      (severity !== "EMERGENCY" && severity !== "NON_EMERGENCY")
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // RANK (your existing logic)
    // ─────────────────────────────────────────────
    const rankedPlumbers = rankPlumbersForJob({
      serviceCodes,
      severity,
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
    // DEBUG: explain include/exclude for ALL plumbers
    // ─────────────────────────────────────────────
    const debugAll = (plumbers as any[]).map((p) => {
      const missing = serviceCodes.filter(
        (code: string) => !p.services?.includes(code)
      );

      const emergencyCapable = p.services?.includes("EMERGENCY_PLUMBING") ?? false;

      const excludedBecauseEmergency =
        severity === "EMERGENCY" && !emergencyCapable;

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
