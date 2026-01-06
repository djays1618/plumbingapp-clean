"use client";

import { useEffect, useMemo, useState } from "react";
import { computeDiagnosticResult } from "@/lib/diagnostics";
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
    const updated = { ...answers, [step.id]: option.label };
    setAnswers(updated);

    if (option.nextStep) {
      setStepId(option.nextStep);
      return;
    }

    if (option.result) {
      const norm = normalizeFromWizardAnswers(updated);

      const diagnostic = computeDiagnosticResult({
        room: norm.room,
        fixture: norm.fixture,
        symptom: norm.symptom,
        urgency: norm.urgency,
      });

      setIssues((prev) => [
        ...prev,
        {
          id: uid(),
          reported: norm.reported,
          emergency: norm.emergency,
          serviceCode: diagnostic.primaryServiceCode,
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

  const overallSeverity: "EMERGENCY" | "NON_EMERGENCY" = useMemo(
    () => (issues.some((i) => i.emergency) ? "EMERGENCY" : "NON_EMERGENCY"),
    [issues]
  );

  const requiredServices = useMemo(
    () => Array.from(new Set(issues.map((i) => i.serviceCode))),
    [issues]
  );

  /* ─────────────────────────────────────────────
     Fetch plumbers (FIXED)
  ───────────────────────────────────────────── */

  useEffect(() => {
    if (mode !== "summary") return;
    if (issues.length === 0 || requiredServices.length === 0) return;

    const controller = new AbortController();

    async function run() {
      setPlumbersLoading(true);
      setPlumbersError(null);

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
        if (e?.name !== "AbortError") {
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
            <div><strong>Service:</strong> {resultCatalog[i.serviceCode]?.label}</div>
            <div><strong>Emergency:</strong> {i.emergency ? "Yes" : "No"}</div>
          </div>
        ))}

        {plumbersLoading && <p>Loading plumbers…</p>}
        {plumbersError && <p className="text-red-600">{plumbersError}</p>}

        <button
          onClick={() => setMode("wizard")}
          className="mt-6 border px-4 py-2 rounded"
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
