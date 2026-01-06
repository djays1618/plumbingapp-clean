import pandas as pd
import re
import json
from pathlib import Path

# -----------------------------
# Helpers
# -----------------------------

def normalize_company_name(name: str) -> str:
    if not isinstance(name, str):
        return ""
    name = name.lower()
    name = name.replace("&", " and ")
    name = re.sub(r"[^\w\s]", "", name)
    name = re.sub(r"\b(llc|inc|co|corp|ltd|pllc)\b", "", name)
    name = re.sub(r"\bthe\b", "", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()

def slugify(name: str) -> str:
    return re.sub(r"[^\w]+", "-", name.lower()).strip("-")

def cell_is_truthy(val) -> bool:
    if pd.isna(val):
        return False
    return str(val).strip().lower() in ("✓", "yes", "true", "1", "y")

# -----------------------------
# Load files (NO HEADERS)
# -----------------------------

services_raw = pd.read_excel(
    "0-G-burg Plumbers Services.xlsx",
    header=None
)

contacts_df = pd.read_excel("0-GburgPlumbers.xlsx")

# -----------------------------
# Extract service header row
# -----------------------------

# Row 1 contains real service names
service_header_row = services_raw.iloc[2]

SERVICE_NAME_TO_CODE = {
    "Emergency Plumbing": "EMERGENCY_PLUMBING",

    "Drain Cleaning (Fixture)": "DRAIN_CLEANING_FIXTURE",
    "Drain Cleaning (Main Line)": "DRAIN_CLEANING_MAIN",

    "Sewer Line -Repair": "SEWER_LINE_REPAIR",
    "Trenchless Sewer- Repair": "SEWER_LINE_TRENCHLESS_REPAIR",
    "Sewer Camera Inspection": "SEWER_CAMERA_INSPECTION",

    "Water Heater (Tank) – Repair": "WATER_HEATER_TANK_REPAIR",
    "Water Heater (Tank) – Install": "WATER_HEATER_TANK_INSTALL",
    "Tankless Water Heater – Repair": "WATER_HEATER_TANKLESS_REPAIR",
    "Tankless Water Heater – Install": "WATER_HEATER_TANKLESS_INSTALL",

    "Leak Detection": "LEAK_DETECTION",

    "Gas Line -Repair": "GAS_LINE_REPAIR",
    "Gas Line -Installation": "GAS_LINE_INSTALL",

    "Sump Pump – Repair": "SUMP_PUMP_REPAIR",
    "Sump Pump – Install": "SUMP_PUMP_INSTALL",

    "Toilet - Repair": "TOILET_REPAIR",
    "Toilet-Installation": "TOILET_INSTALL",

    "Faucet / Fixture -Repair": "FAUCET_FIXTURE_REPAIR",
    "Faucet / Fixture -Installation": "FAUCET_FIXTURE_INSTALL",

    "Repiping (Partial)": "REPIPING_PARTIAL",
    "Repiping (Whole House)": "REPIPING_WHOLE_HOME",

    "Backflow Prevention": "BACKFLOW_PREVENTION",
    "Water Treatment": "WATER_TREATMENT",

    "Well Pump Repair": "WELL_PUMP_REPAIR",
    "Well Pump Replacement": "WELL_PUMP_REPLACEMENT",
}

# Map column index → result code
service_columns = {}

for col_idx, cell in service_header_row.items():
    if isinstance(cell, str):
        cell_clean = cell.strip()
        if cell_clean in SERVICE_NAME_TO_CODE:
            service_columns[col_idx] = SERVICE_NAME_TO_CODE[cell_clean]

print("Detected service columns:")
for idx, code in service_columns.items():
    print(f"  col {idx} → {code}")

# -----------------------------
# Build contact index
# -----------------------------

contacts = {}

for _, row in contacts_df.iterrows():
    company = row.get("Company")
    if not isinstance(company, str):
        continue

    key = normalize_company_name(company)

    contacts[key] = {
        "id": slugify(company),
        "name": company,
        "phone": row.get("Phone"),
        "email": row.get("Email / contact"),
        "location": row.get("Location / office"),
        "ratingNote": row.get("Google rating info (proxy)"),
        "services": [],
    }

# -----------------------------
# Merge services
# -----------------------------

matched_rows = 0
service_hits = 0

# Data rows start at row index 2
for _, row in services_raw.iloc[3:].iterrows():
    company = row.iloc[0]
    if not isinstance(company, str):
        continue

    key = normalize_company_name(company)
    if key not in contacts:
        continue

    matched_rows += 1

    for col_idx, code in service_columns.items():
        if cell_is_truthy(row.iloc[col_idx]):
            contacts[key]["services"].append(code)
            service_hits += 1

print(f"\nMatched plumbers with contacts: {matched_rows}")
print(f"Total service assignments: {service_hits}")

# -----------------------------
# Finalize plumbers
# -----------------------------

plumbers = []

for plumber in contacts.values():
    services = sorted(set(plumber["services"]))
    if not services:
        continue

    plumber["services"] = services
    plumbers.append(plumber)

Path("data").mkdir(exist_ok=True)

with open("data/plumbers.json", "w") as f:
    json.dump(plumbers, f, indent=2)

print(f"\n✅ Generated data/plumbers.json with {len(plumbers)} plumbers")
