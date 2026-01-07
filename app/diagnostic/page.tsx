"use client";

import { useEffect, useMemo, useState } from "react";
import { computeDiagnosticResult } from "@/lib/diagnostics";
import { mapDiagnosticCodeToServiceCode } from "@/lib/serviceCodeMapping";
import { diagnosticTree } from "./diagnosticTree";
import { resultCatalog } from "./resultCatalog";
import type { JobPayload } from "./jobPayload";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type Answers = Record<string, string>;

type ContactInfo = {
  name: string;
  phone: string;
  email?: string;
};

type RankedPlumber = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  location?: string;
  matchedServices?: string[];
  ranking?: {
    score: number;
    exactMatches: number;
    emergencyCapable: boolean;
  };
};

type Issue = {
  id: string;
  reported: string;
  emergency: boolean;
  serviceCode: string;
};

type Mode = "wizard" | "summary";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function uid() {
  return `issue_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function firstAnswer(answers: Answers, keys: string[]) {
  for (const k of keys) {
    const v = answers[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeFromWizardAnswers(answers: Answers) {
  const emergencyRaw = firstAnswer(answers, ["emergency_check", "urgency"]);
  const emergency = emergencyRaw.toLowerCase() === "yes";

  const room = firstAnswer(answers, ["room", "location"]);
  const fixture = firstAnswer(answers, [
    "fixture",
    "fixture_kitchen",
    "fixture_bathroom",
    "fixture_basement",
    "fixture_laundry",
    "fixture_outside",
  ]);

  const symptom = firstAnswer(answers, [
    "symptom",
    "symptom_sink",
    "symptom_toilet",
    "symptom_shower",
    "symptom_tub",
    "symptom_floor_drain",
    "symptom_water_heater",
    "symptom_sump_pump",
    "symptom_gas_line",
    "symptom_main_line",
    "symptom_pipe",
  ]);

  const reported =
    [room, fixture, symptom].filter(Boolean).join(" → ") || "(not specified)";

  return {
    emergency,
    room,
    fixture,
    symptom,
    urgency: emergency ? "Yes" : "No",
    reported,
  };
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DiagnosticPage() {
  const [mode, setMode] = useState<Mode>("wizard");
  const [stepId, setStepId] = useState("location");
  const [answers, setAnswers] = useState<Answers>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [matchedPlumbers, setMatchedPlumbers] = useState<RankedPlumber[]>([]);
  const [plumbersLoading, setPlumbersLoading] = useState(false);
  const [plumbersError, setPlumbersError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [pendingServiceCode, setPendingServiceCode] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = diagnosticTree[stepId];

  /* ─────────────────────────────────────────────
     Wizard handler
  ───────────────────────────────────────────── */

  function handleOption(option: any) {
    if (!step) return;
    const updated = { ...answers, [step.id]: option.label };
    setAnswers(updated);

    // If there's a nextStep, go to it (but save service code if result exists)
    if (option.nextStep) {
      // If this step has a result (service code), save it for after emergency check
      if (option.result && typeof option.result === "string" && option.result !== "EMERGENCY" && option.result !== "NON_EMERGENCY") {
        setPendingServiceCode(option.result);
      }
      setStepId(option.nextStep);
      return;
    }

    if (option.result) {
      // Handle emergency check step - create issue with pending service code
      if (step.id === "emergency_check") {
        // Emergency check is complete, now create the issue
        if (pendingServiceCode) {
          const norm = normalizeFromWizardAnswers(updated);
          
          // Map diagnostic code to actual service code used in plumbers.json
          const serviceCode = mapDiagnosticCodeToServiceCode(pendingServiceCode);

          console.log("Adding issue after emergency check:", { reported: norm.reported, diagnosticCode: pendingServiceCode, serviceCode, emergency: norm.emergency });

          setIssues((prev) => [
            ...prev,
            {
              id: uid(),
              reported: norm.reported,
              emergency: norm.emergency,
              serviceCode,
            },
          ]);

          setPendingServiceCode(null);
        }
        
        // Go to summary
        setMode("summary");
        setAnswers({});
        setStepId("location");
        return;
      }

      // For other steps with results (shouldn't happen with current tree structure, but handle it)
      const norm = normalizeFromWizardAnswers(updated);

      const diagnostic = computeDiagnosticResult({
        room: norm.room,
        fixture: norm.fixture,
        symptom: norm.symptom,
        urgency: norm.urgency,
      });

      // Use option.result if it's a string (service code from diagnostic tree),
      // otherwise fall back to diagnostic.primaryServiceCode
      const diagnosticCode = typeof option.result === "string" && option.result.trim().length > 0
        ? option.result
        : diagnostic.primaryServiceCode;

      // Skip if diagnosticCode is "EMERGENCY" or "NON_EMERGENCY" - these aren't service codes
      if (diagnosticCode === "EMERGENCY" || diagnosticCode === "NON_EMERGENCY") {
        setMode("summary");
        setAnswers({});
        setStepId("location");
        return;
      }

      // Map diagnostic code to actual service code used in plumbers.json
      const serviceCode = mapDiagnosticCodeToServiceCode(diagnosticCode);

      console.log("Adding issue:", { reported: norm.reported, diagnosticCode, serviceCode, emergency: norm.emergency });

      setIssues((prev) => [
        ...prev,
        {
          id: uid(),
          reported: norm.reported,
          emergency: norm.emergency,
          serviceCode,
        },
      ]);

      setMode("summary");
      setAnswers({});
      setStepId("location");
    }
  }

  /* ─────────────────────────────────────────────
     Derived values
  ───────────────────────────────────────────── */

  const requiredServices = useMemo(
    () => {
      const services = issues
        .map((i) => i.serviceCode)
        .filter((code): code is string => typeof code === "string" && code.trim().length > 0);
      return Array.from(new Set(services));
    },
    [issues]
  );

  /* ─────────────────────────────────────────────
     Fetch plumbers (FIXED)
  ───────────────────────────────────────────── */

  useEffect(() => {
    console.log("useEffect triggered:", { mode, issuesCount: issues.length, requiredServices });
    if (mode !== "summary") {
      console.log("Not in summary mode, skipping");
      return;
    }
    if (issues.length === 0 || requiredServices.length === 0) {
      console.log("No issues or services, skipping");
      return;
    }

    const controller = new AbortController();

    async function run() {
      setPlumbersLoading(true);
      setPlumbersError(null);

      const apiSeverity: "routine" | "urgent" | "emergency" =
        issues.some((i) => i.emergency) ? "emergency" : "routine";

      try {
        // Ensure we have valid service codes
        if (!requiredServices || requiredServices.length === 0) {
          console.error("No valid service codes found", { issues, requiredServices });
          setPlumbersError("No valid service codes found. Please try again.");
          setPlumbersLoading(false);
          return;
        }

        const requestBody = {
          serviceCodes: requiredServices,
          severity: apiSeverity,
        };

        console.log("Fetching plumbers with:", requestBody);

        const res = await fetch("/api/match-plumbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const data = await res.json();
        console.log("API response:", { ok: data?.ok, plumbersCount: data?.plumbers?.length, error: data?.error, debug: data?.debug });

        // Store debug info for display
        if (data?.debug) {
          setDebugInfo(data.debug);
        }

        if (!res.ok || !data?.ok) {
          setMatchedPlumbers([]);
          const errorMsg = data?.error ?? "Failed to match plumbers.";
          console.error("API error:", errorMsg, data);
          setPlumbersError(errorMsg);
          return;
        }

        const plumbers = Array.isArray(data.plumbers) ? data.plumbers : [];
        console.log("Setting matched plumbers:", plumbers.length, plumbers);
        setMatchedPlumbers(plumbers);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Fetch error:", e);
          setPlumbersError("Network/server error.");
          setMatchedPlumbers([]);
        }
      } finally {
        setPlumbersLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [mode, issues, requiredServices]);

  /* ─────────────────────────────────────────────
     Summary UI
  ───────────────────────────────────────────── */

  if (mode === "summary") {
    return (
      <main className="min-h-screen bg-white px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">Diagnostic Summary</h1>

        {issues.map((i) => (
          <div key={i.id} className="border p-4 rounded mb-3">
            <div><strong>Issue:</strong> {i.reported}</div>
            <div><strong>Service:</strong> {resultCatalog[i.serviceCode]?.label ?? i.serviceCode}</div>
            <div><strong>Emergency:</strong> {i.emergency ? "Yes" : "No"}</div>
          </div>
        ))}

        {/* MATCHING PLUMBERS */}
        <section className="mt-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Available Plumbers
          </h2>

          {plumbersLoading && (
            <p className="text-gray-600 mb-4">Loading plumbers…</p>
          )}
          
          {plumbersError && (
            <p className="text-red-600 mb-4">{plumbersError}</p>
          )}

          {!plumbersLoading && !plumbersError && matchedPlumbers.length === 0 && (
            <div className="text-gray-600 mb-4">
              <p className="mb-2">
                No plumbers found matching your service needs.
              </p>
              {debugInfo && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-blue-600">Debug Info</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {!plumbersLoading && matchedPlumbers.length > 0 && (
            <div className="space-y-4">
              {matchedPlumbers.map((plumber) => (
                <div
                  key={plumber.id || plumber.name}
                  className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <div className="font-semibold text-gray-900 mb-2 text-lg">
                    {plumber.name}
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>
                      <strong>Phone:</strong> {plumber.phone}
                    </div>
                    {plumber.email && (
                      <div>
                        <strong>Email:</strong> {plumber.email}
                      </div>
                    )}
                    {plumber.location && (
                      <div>
                        <strong>Location:</strong> {plumber.location}
                      </div>
                    )}
                    {plumber.matchedServices && plumber.matchedServices.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <strong>Services Offered:</strong>{" "}
                        <span className="text-gray-600">
                          {plumber.matchedServices.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          onClick={() => setMode("wizard")}
          className="mt-6 border px-4 py-2 rounded hover:bg-gray-50"
        >
          Add another issue
        </button>
      </main>
    );
  }

  /* ─────────────────────────────────────────────
     Wizard UI
  ───────────────────────────────────────────── */

  if (!step) return null;

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Plumbing Diagnostic</h1>
      <p className="text-lg mb-6">{step.question}</p>

      <div className="grid gap-3 max-w-lg">
        {step.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleOption(option)}
            className="border rounded px-4 py-3 text-left hover:bg-gray-50"
          >
            {option.label}
          </button>
        ))}
      </div>
    </main>
  );
}
