export type DiagnosticStep = {
  id: string;
  question: string;
  options: {
    label: string;
    nextStep?: string;
    result?: string;
    emergency?: boolean;
  }[];
};

export const diagnosticTree: Record<string, DiagnosticStep> = {
  // ─────────────────────────────────────────────
  // STEP 1 — LOCATION
  // ─────────────────────────────────────────────
  location: {
    id: "location",
    question: "Where is the plumbing issue located?",
    options: [
      { label: "Kitchen", nextStep: "fixture_kitchen" },
      { label: "Bathroom", nextStep: "fixture_bathroom" },
      { label: "Basement", nextStep: "fixture_basement" },
      { label: "Laundry Room", nextStep: "fixture_laundry" },
      { label: "Outside", nextStep: "fixture_outside" },
    ],
  },

  // ─────────────────────────────────────────────
  // KITCHEN
  // ─────────────────────────────────────────────
  fixture_kitchen: {
    id: "fixture_kitchen",
    question: "Which kitchen fixture is having the issue?",
    options: [
      { label: "Sink", nextStep: "symptom_sink" },
      { label: "Dishwasher", nextStep: "symptom_dishwasher" },
      { label: "Garbage disposal", nextStep: "symptom_disposal" },
    ],
  },

  symptom_sink: {
    id: "symptom_sink",
    question: "What is happening with the sink?",
    options: [
      { label: "Clogged or slow drain", nextStep: "emergency_check", result: "DRAIN_CLEANING_FIXTURE" },
      { label: "Leaking pipe or trap", nextStep: "emergency_check", result: "PIPE_REPAIR" },
      { label: "Low water pressure", nextStep: "emergency_check", result: "WATER_PRESSURE_DIAGNOSIS" },
      { label: "Water backing up", nextStep: "emergency_check", result: "DRAIN_BLOCKAGE" },
    ],
  },

  symptom_dishwasher: {
    id: "symptom_dishwasher",
    question: "What issue are you having with the dishwasher?",
    options: [
      { label: "Not draining", nextStep: "emergency_check", result: "DISHWASHER_DRAIN_REPAIR" },
      { label: "Leaking", nextStep: "emergency_check", result: "APPLIANCE_LEAK_REPAIR" },
      { label: "Water supply issue", nextStep: "emergency_check", result: "WATER_SUPPLY_REPAIR" },
    ],
  },

  symptom_disposal: {
    id: "symptom_disposal",
    question: "What is happening with the garbage disposal?",
    options: [
      { label: "Jammed or not spinning", nextStep: "emergency_check", result: "DISPOSAL_REPAIR" },
      { label: "Leaking", nextStep: "emergency_check", result: "DISPOSAL_REPLACEMENT" },
      { label: "Completely dead", nextStep: "emergency_check", result: "DISPOSAL_REPLACEMENT" },
    ],
  },

  // ─────────────────────────────────────────────
  // BATHROOM
  // ─────────────────────────────────────────────
  fixture_bathroom: {
    id: "fixture_bathroom",
    question: "Which bathroom fixture is having the issue?",
    options: [
      { label: "Toilet", nextStep: "symptom_toilet" },
      { label: "Sink", nextStep: "symptom_sink" },
      { label: "Shower or Tub", nextStep: "symptom_shower" },
    ],
  },

  symptom_toilet: {
    id: "symptom_toilet",
    question: "What is happening with the toilet?",
    options: [
      { label: "Clogged", nextStep: "emergency_check", result: "TOILET_CLOG_REMOVAL" },
      { label: "Running constantly", nextStep: "emergency_check", result: "TOILET_REPAIR" },
      { label: "Leaking at base", nextStep: "emergency_check", result: "WAX_RING_REPLACEMENT" },
      { label: "Overflowing", nextStep: "emergency_check", result: "EMERGENCY_TOILET_OVERFLOW" },
    ],
  },

  symptom_shower: {
    id: "symptom_shower",
    question: "What issue are you having with the shower or tub?",
    options: [
      { label: "Slow drain", nextStep: "emergency_check", result: "DRAIN_CLEANING_FIXTURE" },
      { label: "No hot water", nextStep: "emergency_check", result: "WATER_HEATER_DIAGNOSIS" },
      { label: "Leaking faucet", nextStep: "emergency_check", result: "FAUCET_REPAIR" },
    ],
  },

  // ─────────────────────────────────────────────
  // BASEMENT
  // ─────────────────────────────────────────────
  fixture_basement: {
    id: "fixture_basement",
    question: "What basement plumbing issue are you experiencing?",
    options: [
      { label: "Floor drain backup", nextStep: "emergency_check", result: "MAIN_LINE_DRAIN_CLEANING" },
      { label: "Sump pump issue", nextStep: "emergency_check", result: "SUMP_PUMP_REPAIR" },
      { label: "Water heater", nextStep: "symptom_water_heater" },
    ],
  },

  symptom_water_heater: {
    id: "symptom_water_heater",
    question: "What issue are you having with the water heater?",
    options: [
      { label: "No hot water", nextStep: "emergency_check", result: "WATER_HEATER_REPAIR" },
      { label: "Leaking tank", nextStep: "emergency_check", result: "WATER_HEATER_REPLACEMENT" },
      { label: "Strange noises", nextStep: "emergency_check", result: "WATER_HEATER_FLUSH" },
    ],
  },

  // ─────────────────────────────────────────────
  // LAUNDRY
  // ─────────────────────────────────────────────
  fixture_laundry: {
    id: "fixture_laundry",
    question: "What laundry area issue are you experiencing?",
    options: [
      { label: "Washer drain overflow", nextStep: "emergency_check", result: "DRAIN_CLEANING_FIXTURE" },
      { label: "Leaking supply lines", nextStep: "emergency_check", result: "WATER_SUPPLY_REPAIR" },
      { label: "Clogged standpipe", nextStep: "emergency_check", result: "DRAIN_CLEANING_FIXTURE" },
    ],
  },

  fixture_outside: {
    id: "fixture_outside",
    question: "What outdoor plumbing issue are you experiencing?",
    options: [
      { label: "Hose bib leaking", nextStep: "emergency_check", result: "HOSE_BIB_REPAIR" },
      { label: "Main water line issue", nextStep: "emergency_check", result: "MAIN_WATER_LINE_REPAIR" },
      { label: "Sewer smell or backup", nextStep: "emergency_check", result: "SEWER_LINE_INSPECTION" },
    ],
  },

  // ─────────────────────────────────────────────
  // FINAL STEP — EMERGENCY CHECK (LAST)
  // ─────────────────────────────────────────────
  emergency_check: {
    id: "emergency_check",
    question: "Is this an active emergency right now?",
    options: [
      { label: "Yes", result: "EMERGENCY" },
      { label: "No", result: "NON_EMERGENCY" },
    ],
  },
};
