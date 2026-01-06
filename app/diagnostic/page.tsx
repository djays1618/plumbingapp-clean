"use client";

import { useEffect, useMemo, useState } from "react";
import { computeDiagnosticResult } from "@/lib/diagnostics";
import { diagnosticTree } from "./diagnosticTree";
import { resultCatalog } from "./resultCatalog";
import type { JobPayload } from "./jobPayload";

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
  reported: string; // e.g., "Kitchen → Sink → Clogged/slow drain"
  emergency: boolean; // user's emergency flag for THIS issue (toggleable)
  serviceCode: string; // e.g., DRAIN_CLEANING_FIXTURE
};

type Mode = "wizard" | "summary";

function uid() {
  return `issue_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Robustly find the "best" answer value for a group of keys.
 */
function firstAnswer(answers: Answers, keys: string[]) {
  for (const k of keys) {
    const v = answers[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Normalize answers from your wizard into the format diagnostics expects.
 * This also builds a "reported" string that is human-readable.
 */
function normalizeFromWizardAnswers(answers: Answers) {
  // Emergency flag can come from either "emergency_check" or "urgency"
  const emergencyRaw = firstAnswer(answers, ["emergency_check", "urgency"]);
  const emergency = emergencyRaw.toLowerCase() === "yes";

  // Room can be "room" or "location" depending on earlier steps
  const room = firstAnswer(answers, ["room", "location"]);

  // Fixture can vary by room
  const fixture = firstAnswer(answers, [
    "fixture",
    "fixture_kitchen",
    "fixture_bathroom",
    "fixture_basement",
    "fixture_laundry",
    "fixture_outside",
  ]);

  // Symptom can vary by fixture/room
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

  // computeDiagnosticResult has previously been called with these keys:
  // { room, fixture, symptom, urgency }
  // Keep urgency as "Yes"/"No" for compatibility.
  const urgency = emergency ? "Yes" : "No";

  return { emergency, room, fixture, symptom, urgency, reported };
}

export default function DiagnosticPage() {
  // ─────────────────────────────────────────────
  // STATE (ALL HOOKS AT TOP — DO NOT MOVE)
  // ─────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("wizard");
  const [stepId, setStepId] = useState("location");
  const [answers, setAnswers] = useState<Answers>({});

  const [issues, setIssues] = useState<Issue[]>([]);

  const [matchedPlumbers, setMatchedPlumbers] = useState<RankedPlumber[]>([]);
  const [plumbersLoading, setPlumbersLoading] = useState(false);
  const [plumbersError, setPlumbersError] = useState<string | null>(null);

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: "",
    phone: "",
    email: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = diagnosticTree[stepId];
  if (mode === "wizard" && !step) {
    return (
      <main className="px-6 py-10">
        <h1 className="text-3xl font-bold mb-4">Plumbing Diagnostic</h1>
        <p className="text-red-600">
          Invalid diagnostic step. Restarting…
        </p>
        <button
          className="mt-4 border px-4 py-2 rounded"
          onClick={() => {
            setStepId("location");
            setAnswers({});
          }}
        >
          Restart Diagnostic
        </button>
      </main>
    );
  }
  
  // ─────────────────────────────────────────────
  // WIZARD OPTION HANDLER
  // ─────────────────────────────────────────────
  function handleOption(option: any) {
    const updated = { ...answers, [step.id]: option.label };
    setAnswers(updated);

    if (option.nextStep) {
      setStepId(option.nextStep);
      return;
    }

    // End of one issue path
    if (option.result) {
      const norm = normalizeFromWizardAnswers(updated);

      const diagnostic = computeDiagnosticResult({
        room: norm.room,
        fixture: norm.fixture,
        symptom: norm.symptom,
        urgency: norm.urgency,
      });

      // Save the issue
      setIssues((prev) => [
        ...prev,
        {
          id: uid(),
          reported: norm.reported,
          emergency: norm.emergency,
          serviceCode: diagnostic.primaryServiceCode,
        },
      ]);

      // Go summary, reset wizard state (ready for next issue)
      setMode("summary");
      setAnswers({});
      setStepId("location");
    }
  }

  // ─────────────────────────────────────────────
  // OVERALL SEVERITY
  // ─────────────────────────────────────────────
  const overallSeverity: "EMERGENCY" | "NON_EMERGENCY" = useMemo(() => {
    return issues.some((i) => i.emergency) ? "EMERGENCY" : "NON_EMERGENCY";
  }, [issues]);

  // ─────────────────────────────────────────────
  // REQUIRED SERVICES ACROSS ALL ISSUES (ALL must match)
  // ─────────────────────────────────────────────
  const requiredServices = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.serviceCode)));
  }, [issues]);
// Debug safety: requiredServices must be non-empty
// If empty, no plumber can ever match

  // ─────────────────────────────────────────────
  // FETCH MATCHED PLUMBERS (ALL services + emergency hard-gate)
  // ─────────────────────────────────────────────
  useEffect(() => {
    // Only fetch while in summary
    if (mode !== "summary") return;
// Invariant: overallSeverity is derived from issues
// If ANY issue.emergency === true → overallSeverity === "EMERGENCY"
// Do NOT override severity manually here

    // If no issues, show none and bounce back to wizard
    if (issues.length === 0) {
      setMatchedPlumbers([]);
      setPlumbersLoading(false);
      setPlumbersError(null);
      setMode("wizard");
      setStepId("emergency_check");
      return;
    }

    // Required services must exist
    if (requiredServices.length === 0) {
      setMatchedPlumbers([]);
      setPlumbersLoading(false);
      setPlumbersError("No required services found.");
      return;
    }

    const controller = new AbortController();

    async function run() {
        setPlumbersLoading(true);
        setPlumbersError(null);
      
        // ✅ Map UI severity → API severity (THIS IS THE FIX)
        const apiSeverity: "routine" | "urgent" | "emergency" =
          issues.some((i) => i.emergency) ? "emergency" : "routine";
      
        try {
          const res = await fetch("/api/match-plumbers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceCodes: requiredServices,
              severity: apiSeverity,
            }),
            signal: controller.signal,
          });
      
          const data = await res.json();
      
          if (!res.ok || !data?.ok) {
            setMatchedPlumbers([]);
            setPlumbersError(data?.error ?? "Failed to match plumbers.");
            return;
          }
      
          setMatchedPlumbers(Array.isArray(data.plumbers) ? data.plumbers : []);
        } catch (e: any) {
          if (e?.name === "AbortError") return;
          setMatchedPlumbers([]);
          setPlumbersError("Network/server error while matching plumbers.");
        } finally {
          setPlumbersLoading(false);
        }
      }
      
        const data = await res.json();

        if (!res.ok || !data?.ok) {
          setMatchedPlumbers([]);
          setPlumbersError(data?.error ?? "Failed to match plumbers.");
          return;
        }

        // Expect data.plumbers as ranked list
        setMatchedPlumbers(Array.isArray(data.plumbers) ? data.plumbers : []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setMatchedPlumbers([]);
        setPlumbersError("Network/server error while matching plumbers.");
      } finally {
        setPlumbersLoading(false);
      }
    }

    run();

    return () => controller.abort();
  }, [mode, issues.length, requiredServices, overallSeverity]);

  // ─────────────────────────────────────────────
  // ISSUE ACTIONS
  // ─────────────────────────────────────────────
  function addAnotherIssue() {
    setAnswers({});
    setStepId("location");
    setMode("wizard");
  }

  function deleteIssue(issueId: string) {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
  }

  function toggleIssueEmergency(issueId: string) {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, emergency: !i.emergency } : i
      )
    );
  }

  function startOver() {
    setMode("wizard");
    setStepId("emergency_check");
    setAnswers({});
    setIssues([]);
    setMatchedPlumbers([]);
    setPlumbersError(null);
    setPlumbersLoading(false);
    setContactInfo({ name: "", phone: "", email: "" });
    setIsSubmitting(false);
  }

  // ─────────────────────────────────────────────
  // SUBMIT BID (uses all issues + selected plumbers later if you add selection)
  // For now it submits a single payload with combined services.
  // ─────────────────────────────────────────────
  async function submitBid() {
    if (!contactInfo.name.trim() || !contactInfo.phone.trim()) {
      alert("Please enter your name and phone number.");
      return;
    }
    if (issues.length === 0) {
      alert("Please add at least one issue.");
      return;
    }
    if (isSubmitting) return;

    // Build a combined payload (simple MVP)
    const primary = issues[0];
    const meta = resultCatalog[primary.serviceCode];

    const jobPayload: JobPayload = {
      issueCode: primary.serviceCode,
      issueLabel: meta?.label ?? primary.serviceCode,
      severity: overallSeverity,
      estimatedPriceRange: meta?.estimatedPrice,
      duration: meta?.typicalDuration,
      answers: {
        // store human readable issues so backend has them
        issues: issues.map((i) => i.reported).join(" | "),
        requiredServices: requiredServices.join(", "),
      } as any,
      contactInfo,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/request-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(`Request failed: ${data.error ?? "Unknown error"}`);
        return;
      }

      alert(`Bid request submitted!\nJob ID: ${data.jobId}`);
    } catch {
      alert("Network error submitting bid request");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────
  // SUMMARY SCREEN
  // ─────────────────────────────────────────────
  if (mode === "summary") {
    return (
      <main className="min-h-screen bg-white px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Diagnostic Summary</h1>

        <p className="mb-6">
          Overall severity: <strong>{overallSeverity}</strong>
        </p>

        {/* Issues */}
        {issues.map((issue, idx) => {
          const meta = resultCatalog[issue.serviceCode];

          return (
            <div
              key={issue.id}
              className="border rounded-lg p-4 mb-4 relative bg-white"
            >
              {/* Delete */}
              <button
                aria-label="Delete issue"
                title="Delete issue"
                onClick={() => deleteIssue(issue.id)}
                className="absolute top-2 right-2 border rounded px-2 py-1 hover:bg-gray-50"
              >
                ✕
              </button>

              <div className="font-semibold mb-2">Issue {idx + 1}</div>

              <div className="text-sm text-gray-700 mb-2">
                <strong>Reported:</strong> {issue.reported}
              </div>

              <div className="text-sm text-gray-700">
                <strong>Diagnosed:</strong>{" "}
                {meta?.label ?? issue.serviceCode}
              </div>

              <div className="text-sm text-gray-700">
                <strong>Service Code:</strong> {issue.serviceCode}
              </div>

              <div className="text-sm text-gray-700 mb-3">
                <strong>Emergency:</strong> {issue.emergency ? "Yes" : "No"}
              </div>

              {/* Make Emergency toggle (per issue) */}
              <button
                onClick={() => toggleIssueEmergency(issue.id)}
                className="border rounded px-3 py-2 hover:bg-gray-50 text-sm"
              >
                {issue.emergency ? "Make Non-Emergency" : "Make Emergency"}
              </button>
            </div>
          );
        })}

        <button
          onClick={addAnotherIssue}
          className="border rounded px-4 py-2 mb-6 hover:bg-gray-50"
        >
          ➕ Add another issue
        </button>

        {/* Contact Info */}
        <div className="mb-6 max-w-md">
          <input
            className="border rounded px-3 py-2 w-full mb-3"
            placeholder="Full name"
            value={contactInfo.name}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, name: e.target.value })
            }
          />

          <input
            className="border rounded px-3 py-2 w-full mb-3"
            placeholder="Phone number"
            value={contactInfo.phone}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, phone: e.target.value })
            }
          />

          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Email (optional)"
            value={contactInfo.email ?? ""}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, email: e.target.value })
            }
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={submitBid}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded font-semibold ${
              isSubmitting
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Submitting…" : "Request a Bid"}
          </button>

          <button
            onClick={startOver}
            className="border rounded px-4 py-3 hover:bg-gray-50"
          >
            🔄 Start Over
          </button>
        </div>

        {/* Plumbers */}
        <h3 className="font-semibold mb-2">Select Plumbers</h3>

        <p className="text-sm text-gray-600 mb-3">
          Plumbers must match <strong>ALL</strong> required services
          {overallSeverity === "EMERGENCY" && (
            <>
              {" "}
              and be <strong>emergency-capable</strong>.
            </>
          )}
        </p>

        {plumbersLoading && <p>Loading plumbers…</p>}

        {!plumbersLoading && plumbersError && (
          <p className="text-red-600">{plumbersError}</p>
        )}

        {!plumbersLoading &&
          !plumbersError &&
          matchedPlumbers.length === 0 && (
            <p>No plumbers match ALL required services for this job.</p>
          )}

        {matchedPlumbers.map((p, i) => (
          <label
            key={`${p.id ?? p.name}_${i}`}
            className="block border rounded p-3 mb-2 hover:bg-gray-50"
          >
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-gray-700">📞 {p.phone}</div>
            {p.email && <div className="text-sm text-gray-700">✉️ {p.email}</div>}
            {p.ranking && (
              <div className="text-xs text-gray-500 mt-1">
                score={p.ranking.score} matches={p.ranking.exactMatches} emergencyCapable=
                {String(p.ranking.emergencyCapable)}
              </div>
            )}
          </label>
        ))}

        {/* ─────────────────────────────────────────────
            DEBUG PANEL (TEMPORARY)
           ───────────────────────────────────────────── */}
        <details className="mt-8 border rounded p-4 bg-gray-50 text-sm">
          <summary className="cursor-pointer font-semibold">
            🧪 Debug: Matching Inputs / Outputs
          </summary>

          <div className="mt-3 space-y-3">
            <div>
              <strong>requiredServices</strong>
              <pre className="overflow-x-auto">
                {JSON.stringify(requiredServices, null, 2)}
              </pre>
            </div>

            <div>
              <strong>overallSeverity</strong>: {overallSeverity}
            </div>

            <div>
              <strong>issues</strong>
              <pre className="overflow-x-auto">
                {JSON.stringify(issues, null, 2)}
              </pre>
            </div>

            <div>
              <strong>matchedPlumbers ({matchedPlumbers.length})</strong>
              <pre className="overflow-x-auto">
                {JSON.stringify(matchedPlumbers, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // WIZARD SCREEN
  // ─────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Plumbing Diagnostic</h1>

      <p className="text-lg mb-8">{step.question}</p>

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

      {/* Quick escape hatch */}
      {issues.length > 0 && (
        <button
          onClick={() => setMode("summary")}
          className="mt-8 border rounded px-4 py-2 hover:bg-gray-50"
        >
          ← Back to Summary ({issues.length} issue{issues.length === 1 ? "" : "s"})
        </button>
      )}
    </main>
  );
}
