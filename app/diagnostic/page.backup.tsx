"use client";

import { useEffect, useMemo, useState } from "react";
import { computeDiagnosticResult } from "@/lib/diagnostics";
import { diagnosticTree } from "./diagnosticTree";
import { resultCatalog } from "./resultCatalog";
import { JobPayload } from "./jobPayload";

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
  emergency: boolean; // user selection
  primaryServiceCode: string;
  severity: "EMERGENCY" | "NON_EMERGENCY";
};

function uid() {
  return `issue_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Your wizard currently stores answers with different keys (emergency_check, location, fixture_bathroom, symptom_toilet, etc).
 * This normalizes them into what computeDiagnosticResult expects.
 */
function normalizeFromWizardAnswers(answers: Answers) {
  const urgency =
    answers.urgency ??
    answers.emergency_check ?? // your wizard uses this label often
    "";

  const room =
    answers.room ??
    answers.location ?? // your wizard often uses "location"
    "";

  // Find a fixture value from known patterns
  const fixture =
    answers.fixture ??
    answers.fixture_kitchen ??
    answers.fixture_bathroom ??
    answers.fixture_basement ??
    answers.fixture_laundry ??
    "";

  // Find symptom from known patterns
  const symptom =
    answers.symptom ??
    answers.symptom_sink ??
    answers.symptom_toilet ??
    answers.symptom_shower ??
    answers.symptom_bathtub ??
    answers.symptom_drain ??
    answers.symptom_water_heater ??
    "";

  // Build a human “reported” string
  const parts = [room, fixture, symptom].filter(Boolean);
  const reported = parts.length ? parts.join(" → ") : "(not specified)";

  const emergency = urgency === "Yes";

  return { room, fixture, symptom, urgency, emergency, reported };
}

export default function DiagnosticPage() {
  // ─────────────────────────────────────────────
  // STATE (ALL HOOKS AT TOP — REQUIRED)
  // ─────────────────────────────────────────────
  const [stepId, setStepId] = useState("emergency_check");
  const [answers, setAnswers] = useState<Answers>({});
  const [showSummary, setShowSummary] = useState(false);

  const [issues, setIssues] = useState<Issue[]>([]);

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: "",
    phone: "",
    email: "",
  });

  const [matchedPlumbers, setMatchedPlumbers] = useState<RankedPlumber[]>([]);
  const [plumbersLoading, setPlumbersLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = diagnosticTree[stepId];

  // ─────────────────────────────────────────────
  // OPTION HANDLER
  // ─────────────────────────────────────────────
  function handleOption(option: any) {
    const updatedAnswers = {
      ...answers,
      [step.id]: option.label,
    };

    setAnswers(updatedAnswers);

    if (option.nextStep) {
      setStepId(option.nextStep);
    }

    if (option.result) {
      // Finish current issue
      setShowSummary(true);

      const norm = normalizeFromWizardAnswers(updatedAnswers);

      const diagnostic = computeDiagnosticResult({
        room: norm.room,
        fixture: norm.fixture,
        symptom: norm.symptom,
        urgency: norm.urgency,
      });

      const newIssue: Issue = {
        id: uid(),
        reported: norm.reported,
        emergency: norm.emergency,
        primaryServiceCode: diagnostic.primaryServiceCode,
        severity: diagnostic.severity,
      };

      setIssues((prev) => [...prev, newIssue]);
    }
  }

  // ─────────────────────────────────────────────
  // OVERALL SEVERITY (ANY EMERGENCY => EMERGENCY)
  // ─────────────────────────────────────────────
  const overallSeverity: "EMERGENCY" | "NON_EMERGENCY" = useMemo(() => {
    return issues.some((i) => i.severity === "EMERGENCY")
      ? "EMERGENCY"
      : "NON_EMERGENCY";
  }, [issues]);

  // ─────────────────────────────────────────────
  // REQUIRED SERVICES (ALL ISSUES)
  // - ignore GENERAL_PLUMBING as a hard requirement
  // ─────────────────────────────────────────────
  const requiredServices = useMemo(() => {
    const codes = issues.map((i) => i.primaryServiceCode);
    const unique = Array.from(new Set(codes));
    // Keep GENERAL_PLUMBING in the array for visibility, but server will ignore it for hard filtering.
    return unique;
  }, [issues]);

  // ─────────────────────────────────────────────
  // FETCH + RANK PLUMBERS (re-run when issues change)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!showSummary) return;

    setPlumbersLoading(true);

    fetch("/api/match-plumbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requiredServices,
        severity: overallSeverity,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setMatchedPlumbers(data.plumbers);
        else setMatchedPlumbers([]);
      })
      .catch(() => setMatchedPlumbers([]))
      .finally(() => setPlumbersLoading(false));
  }, [showSummary, requiredServices, overallSeverity]);

  // ─────────────────────────────────────────────
  // DELETE ISSUE (X) + RECALC PLUMBERS
  // ─────────────────────────────────────────────
  function deleteIssue(issueId: string) {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
  }

  // ─────────────────────────────────────────────
  // ADD ANOTHER ISSUE
  // ─────────────────────────────────────────────
  function addAnotherIssue() {
    setStepId("emergency_check");
    setAnswers({});
    // keep showSummary true (we stay on summary page)
  }

  // ─────────────────────────────────────────────
  // RESTART ENTIRE DIAGNOSTIC
  // ─────────────────────────────────────────────
  function restartAll() {
    setStepId("emergency_check");
    setAnswers({});
    setShowSummary(false);
    setIssues([]);
    setMatchedPlumbers([]);
    setContactInfo({ name: "", phone: "", email: "" });
  }

  // ─────────────────────────────────────────────
  // SUBMIT BID (unchanged shape)
  // ─────────────────────────────────────────────
  async function submitBid() {
    if (!contactInfo.name.trim() || !contactInfo.phone.trim()) {
      alert("Please enter your name and phone number.");
      return;
    }

    if (issues.length === 0 || isSubmitting) return;

    const jobPayload: JobPayload = {
      issueCode: requiredServices.join(","), // multi-issue summary
      issueLabel: "Multiple issues",
      severity: overallSeverity,
      estimatedPriceRange: undefined,
      duration: undefined,
      answers: {
        ...answers,
        issues: JSON.stringify(issues),
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
  if (showSummary) {
    return (
      <main className="min-h-screen bg-white px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Diagnostic Summary</h1>
        <p className="text-sm mb-6">
          Overall severity: <strong>{overallSeverity}</strong>
        </p>

        {/* ISSUES LIST */}
        <div className="space-y-4 mb-6">
          {issues.map((issue, idx) => {
            const meta = resultCatalog[issue.primaryServiceCode];
            return (
              <div key={issue.id} className="border rounded-lg p-4 relative">
                {/* DELETE (X) */}
                <button
                  onClick={() => deleteIssue(issue.id)}
                  className="absolute top-2 right-2 border rounded px-2 py-1 text-sm hover:bg-gray-50"
                  aria-label={`Delete issue ${idx + 1}`}
                  title="Delete issue"
                >
                  ✕
                </button>

                <div className="font-semibold mb-2">Issue {idx + 1}</div>

                <div className="text-sm text-gray-700 mb-1">
                  <strong>Reported:</strong> {issue.reported}
                </div>

                <div className="text-sm text-gray-700 mb-1">
                  <strong>Emergency:</strong> {issue.emergency ? "Yes" : "No"}
                </div>

                <div className="text-sm text-gray-700 mb-1">
                  <strong>Diagnosed:</strong>{" "}
                  {meta?.label ?? issue.primaryServiceCode}
                </div>

                <div className="text-sm text-gray-700 mb-1">
                  <strong>Service Code:</strong> {issue.primaryServiceCode}
                </div>

                <div className="text-sm text-gray-700">
                  <strong>Severity:</strong> {issue.severity}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={addAnotherIssue}
          className="border rounded px-4 py-2 mb-6 hover:bg-gray-50"
        >
          ➕ Add another issue
        </button>

        {/* CONTACT INFO */}
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
            value={contactInfo.email}
            onChange={(e) =>
              setContactInfo({ ...contactInfo, email: e.target.value })
            }
          />
        </div>

        {/* PLUMBERS */}
        <h3 className="font-semibold mb-2">Select Plumbers</h3>

        {plumbersLoading && <p>Loading plumbers…</p>}

        {!plumbersLoading && matchedPlumbers.length === 0 && (
          <p>No plumbers match ALL required services for this job.</p>
        )}

        <div className="space-y-2 mb-6">
          {matchedPlumbers.map((p, i) => (
            <div key={i} className="border rounded p-3">
              <strong>{p.name}</strong> — {p.phone}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={submitBid}
            disabled={isSubmitting || issues.length === 0}
            className={`px-6 py-3 rounded ${
              isSubmitting || issues.length === 0
                ? "bg-gray-300 text-gray-700"
                : "bg-blue-600 text-white"
            }`}
          >
            {isSubmitting ? "Submitting…" : "Request a Bid"}
          </button>

          <button
            onClick={restartAll}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            🔁 Restart Diagnostic
          </button>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // QUESTION SCREEN
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
    </main>
  );
}
