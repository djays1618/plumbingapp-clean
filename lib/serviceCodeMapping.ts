/**
 * Maps diagnostic tree service codes to actual service codes used in plumbers.json
 * This ensures diagnostic results match what plumbers actually offer
 */
export function mapDiagnosticCodeToServiceCode(diagnosticCode: string): string {
  const mapping: Record<string, string> = {
    // Direct matches (already correct)
    "DRAIN_CLEANING_FIXTURE": "DRAIN_CLEANING_FIXTURE",
    "DRAIN_CLEANING_MAIN": "DRAIN_CLEANING_MAIN",
    "TOILET_REPAIR": "TOILET_REPAIR",
    "TOILET_INSTALL": "TOILET_INSTALL",
    "FAUCET_FIXTURE_REPAIR": "FAUCET_FIXTURE_REPAIR",
    "FAUCET_FIXTURE_INSTALL": "FAUCET_FIXTURE_INSTALL",
    "WATER_HEATER_TANK_REPAIR": "WATER_HEATER_TANK_REPAIR",
    "WATER_HEATER_TANK_INSTALL": "WATER_HEATER_TANK_INSTALL",
    "WATER_HEATER_TANKLESS_REPAIR": "WATER_HEATER_TANKLESS_REPAIR",
    "WATER_HEATER_TANKLESS_INSTALL": "WATER_HEATER_TANKLESS_INSTALL",
    "SUMP_PUMP_REPAIR": "SUMP_PUMP_REPAIR",
    "SUMP_PUMP_INSTALL": "SUMP_PUMP_INSTALL",
    "GAS_LINE_REPAIR": "GAS_LINE_REPAIR",
    "GAS_LINE_INSTALL": "GAS_LINE_INSTALL",
    "SEWER_LINE_REPAIR": "SEWER_LINE_REPAIR",
    "SEWER_LINE_TRENCHLESS_REPAIR": "SEWER_LINE_TRENCHLESS_REPAIR",
    "EMERGENCY_PLUMBING": "EMERGENCY_PLUMBING",
    "LEAK_DETECTION": "LEAK_DETECTION",
    "REPIPING_PARTIAL": "REPIPING_PARTIAL",
    "REPIPING_WHOLE_HOME": "REPIPING_WHOLE_HOME",
    "SEWER_CAMERA_INSPECTION": "SEWER_CAMERA_INSPECTION",
    "BACKFLOW_PREVENTION": "BACKFLOW_PREVENTION",
    "WATER_TREATMENT": "WATER_TREATMENT",
    "WELL_PUMP_REPAIR": "WELL_PUMP_REPAIR",
    "WELL_PUMP_REPLACEMENT": "WELL_PUMP_REPLACEMENT",

    // Mappings from diagnostic codes to actual service codes
    "PIPE_REPAIR": "LEAK_DETECTION", // Pipe repair → leak detection
    "WATER_PRESSURE_DIAGNOSIS": "LEAK_DETECTION", // Water pressure issues → leak detection
    "DRAIN_BLOCKAGE": "DRAIN_CLEANING_FIXTURE", // Drain blockage → drain cleaning
    "DISHWASHER_DRAIN_REPAIR": "DRAIN_CLEANING_FIXTURE", // Dishwasher drain → drain cleaning fixture
    "APPLIANCE_LEAK_REPAIR": "LEAK_DETECTION", // Appliance leaks → leak detection
    "WATER_SUPPLY_REPAIR": "LEAK_DETECTION", // Water supply issues → leak detection
    "DISPOSAL_REPAIR": "DRAIN_CLEANING_FIXTURE", // Disposal repair → drain cleaning
    "DISPOSAL_REPLACEMENT": "DRAIN_CLEANING_FIXTURE", // Disposal replacement → drain cleaning
    "TOILET_CLOG_REMOVAL": "TOILET_REPAIR", // Toilet clog → toilet repair
    "WAX_RING_REPLACEMENT": "TOILET_REPAIR", // Wax ring → toilet repair
    "EMERGENCY_TOILET_OVERFLOW": "TOILET_REPAIR", // Emergency toilet → toilet repair
    "FAUCET_REPAIR": "FAUCET_FIXTURE_REPAIR", // Faucet repair → faucet fixture repair
    "MAIN_LINE_DRAIN_CLEANING": "DRAIN_CLEANING_MAIN", // Main line drain → drain cleaning main
    "WATER_HEATER_DIAGNOSIS": "WATER_HEATER_TANK_REPAIR", // Water heater diagnosis → water heater repair
    "WATER_HEATER_REPAIR": "WATER_HEATER_TANK_REPAIR", // Water heater repair → tank repair
    "WATER_HEATER_REPLACEMENT": "WATER_HEATER_TANK_INSTALL", // Water heater replacement → tank install
    "WATER_HEATER_FLUSH": "WATER_HEATER_TANK_REPAIR", // Water heater flush → tank repair
    "HOSE_BIB_REPAIR": "FAUCET_FIXTURE_REPAIR", // Hose bib → faucet fixture repair
    "MAIN_WATER_LINE_REPAIR": "LEAK_DETECTION", // Main water line → leak detection
    "SEWER_LINE_INSPECTION": "SEWER_CAMERA_INSPECTION", // Sewer inspection → camera inspection
  };

  // Return mapped code if exists, otherwise return the original code
  // This allows new codes to work if they're added to plumbers.json
  return mapping[diagnosticCode] || diagnosticCode;
}

