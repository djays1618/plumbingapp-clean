import pandas as pd
import re

# ---------- normalization ----------

def normalize_company_name(name: str) -> str:
    if not isinstance(name, str):
        return ""

    name = name.lower()

    # unify ampersand
    name = name.replace("&", " and ")

    # remove punctuation
    name = re.sub(r"[^\w\s]", "", name)

    # remove common business suffixes (whole words only)
    name = re.sub(
        r"\b(llc|inc|co|corp|ltd|pllc)\b",
        "",
        name
    )

    # remove "the"
    name = re.sub(r"\bthe\b", "", name)

    # collapse whitespace
    name = re.sub(r"\s+", " ", name)

    return name.strip()

# ---------- load files ----------

services_df = pd.read_excel("0-G-burg Plumbers Services.xlsx")
contacts_df = pd.read_excel("0-GburgPlumbers.xlsx")


# ---------- extract company names ----------

services_company_col = services_df.columns[0]  # first column is company
services_names = services_df[services_company_col].dropna().unique()

contacts_names = contacts_df["Company"].dropna().unique()

# ---------- normalize ----------

services_map = {
    normalize_company_name(name): name
    for name in services_names
    if isinstance(name, str)
}

contacts_map = {
    normalize_company_name(name): name
    for name in contacts_names
    if isinstance(name, str)
}

# ---------- matching ----------

matched = []
services_only = []
contacts_only = []

for key, original in services_map.items():
    if key in contacts_map:
        matched.append((original, contacts_map[key]))
    else:
        services_only.append(original)

for key, original in contacts_map.items():
    if key not in services_map:
        contacts_only.append(original)

# ---------- report ----------

print("\n=== MATCHED COMPANIES ===\n")
for s, c in matched:
    print(f'SERVICES: "{s}"')
    print(f'CONTACTS: "{c}"\n')

print("\n=== SERVICES FILE ONLY (NO CONTACT MATCH) ===\n")
for name in services_only:
    print(f'- {name}')

print("\n=== CONTACTS FILE ONLY (NO SERVICES MATCH) ===\n")
for name in contacts_only:
    print(f'- {name}')
