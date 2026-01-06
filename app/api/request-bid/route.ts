import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ─────────────────────────────────────────────
    // BASIC VALIDATION (explicit & readable)
    // ─────────────────────────────────────────────
    if (
      !body ||
      typeof body.issueCode !== "string" ||
      typeof body.severity !== "string" ||
      !body.contactInfo ||
      typeof body.contactInfo.name !== "string" ||
      typeof body.contactInfo.phone !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Malformed request" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // CREATE JOB RECORD (in-memory for now)
    // ─────────────────────────────────────────────
    const jobId = `job_${randomUUID()}`;

    const job = {
      id: jobId,
      issueCode: body.issueCode,
      issueLabel: body.issueLabel ?? body.issueCode,
      severity: body.severity,
      estimatedPriceRange: body.estimatedPriceRange ?? null,
      duration: body.duration ?? null,
      answers: body.answers ?? {},
      contactInfo: body.contactInfo,
      createdAt: body.createdAt ?? new Date().toISOString(),
    };

    // 🔹 For now we just log it
    console.log("NEW BID REQUEST:", job);

    // ─────────────────────────────────────────────
    // SUCCESS RESPONSE
    // ─────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      jobId,
    });
  } catch (err) {
    console.error("REQUEST-BID ERROR:", err);

    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
