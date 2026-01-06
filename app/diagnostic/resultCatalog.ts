export type ResultMeta = {
    label: string;
    severity: "routine" | "urgent" | "emergency";
    estimatedPrice: {
      low: number;
      high: number;
    };
    typicalDuration: string;
    description: string;
  };
  
  export const resultCatalog: Record<string, ResultMeta> = {
    DRAIN_CLEANING_FIXTURE: {
      label: "Drain Cleaning (Fixture)",
      severity: "routine",
      estimatedPrice: { low: 150, high: 350 },
      typicalDuration: "1–2 hours",
      description:
        "A localized drain clog affecting a single fixture such as a sink, tub, or laundry standpipe.",
    },
  
    PIPE_REPAIR: {
      label: "Pipe Repair",
      severity: "urgent",
      estimatedPrice: { low: 250, high: 800 },
      typicalDuration: "2–4 hours",
      description:
        "Repair of leaking or damaged supply or drain piping.",
    },
  
    TOILET_CLOG_REMOVAL: {
      label: "Toilet Clog Removal",
      severity: "routine",
      estimatedPrice: { low: 150, high: 300 },
      typicalDuration: "1 hour",
      description:
        "Clearing a clogged toilet using professional augers or jetting tools.",
    },
  
    WATER_HEATER_REPAIR: {
      label: "Water Heater Repair",
      severity: "urgent",
      estimatedPrice: { low: 300, high: 900 },
      typicalDuration: "2–3 hours",
      description:
        "Repairing heating elements, thermostats, or valves in a water heater.",
    },
  
    WATER_HEATER_REPLACEMENT: {
      label: "Water Heater Replacement",
      severity: "urgent",
      estimatedPrice: { low: 1200, high: 3500 },
      typicalDuration: "4–6 hours",
      description:
        "Full replacement of a residential water heater including removal and installation.",
    },
  
    EMERGENCY_PLUMBING: {
      label: "Emergency Plumbing Service",
      severity: "emergency",
      estimatedPrice: { low: 500, high: 2500 },
      typicalDuration: "Same-day emergency service",
      description:
        "Immediate response for flooding, burst pipes, or sewage backups.",
    },
    TOILET_REPAIR: {
      label: "Toilet Repair",
      severity: "routine",
      estimatedPrice: { low: 150, high: 350 },
      typicalDuration: "1–2 hours",
      description:
        "Repair of internal toilet components such as the flapper, fill valve, or flush mechanism causing continuous running or poor flushing.",
    },    
  };
  