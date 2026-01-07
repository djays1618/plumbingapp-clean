# Cursor AI Guide - Plumbing Diagnostic App

This document helps Cursor AI and developers understand the project structure, recent improvements, and key concepts.

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Recent Improvements](#recent-improvements)
3. [Project Structure](#project-structure)
4. [Key Concepts](#key-concepts)
5. [Data Flow](#data-flow)
6. [Important Files](#important-files)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**Purpose**: A Next.js web application that helps homeowners diagnose plumbing issues and matches them with qualified plumbers in Gaithersburg, MD.

**Key Features**:
- Interactive diagnostic wizard to identify plumbing issues
- Automatic plumber matching based on required services
- Emergency vs. routine job filtering
- Multi-issue support (users can add multiple issues)
- Real-time plumber availability display

**Tech Stack**:
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (auto-deploys from GitHub main branch)
- **Data**: JSON files (plumbers.json generated from Excel)

---

## 🚀 Recent Improvements

### 1. Service Code Mapping System (Latest)
**Problem**: Diagnostic tree used service codes that didn't match plumbers.json (e.g., `PIPE_REPAIR`, `FAUCET_REPAIR` vs actual codes like `LEAK_DETECTION`, `FAUCET_FIXTURE_REPAIR`)

**Solution**: Created `lib/serviceCodeMapping.ts` to translate diagnostic codes to actual service codes
- Maps codes like `"PIPE_REPAIR"` → `"LEAK_DETECTION"`
- Maps codes like `"FAUCET_REPAIR"` → `"FAUCET_FIXTURE_REPAIR"`
- Ensures all diagnostic results match plumber capabilities

**Files Changed**:
- `lib/serviceCodeMapping.ts` (new)
- `app/diagnostic/page.tsx` (uses mapping)

### 2. Issue Creation Flow Fix
**Problem**: Issues weren't being created because symptom steps had both `nextStep` and `result`, causing the emergency check to skip issue creation.

**Solution**: Added `pendingServiceCode` state to store service code when symptom is selected, then create issue after emergency check completes.

**Files Changed**:
- `app/diagnostic/page.tsx` (added pendingServiceCode state)

### 3. Plumber Display on Summary Page
**Problem**: Summary page didn't show matching plumbers.

**Solution**: Added plumber fetching and display section with:
- Loading states
- Error handling
- Debug info display
- Plumber cards with contact info and matched services

**Files Changed**:
- `app/diagnostic/page.tsx` (added plumber display UI)

### 4. Severity Level Handling
**Problem**: API accepted `"routine" | "urgent" | "emergency"` but internal functions only handled `"EMERGENCY" | "NON_EMERGENCY"`.

**Solution**: Updated to support three severity levels:
- `"EMERGENCY"` - requires emergency-capable plumbers
- `"URGENT"` - also requires emergency-capable plumbers
- `"ROUTINE"` - standard plumbers

**Files Changed**:
- `lib/plumbers.ts` (updated severity types)
- `app/api/match-plumbers/route.ts` (added severity mapping)

### 5. Enhanced Error Messages
**Problem**: Generic "Invalid request payload" errors made debugging difficult.

**Solution**: Added detailed validation error messages:
- Specific errors for each validation failure
- Console logging for debugging
- Debug info in API responses

**Files Changed**:
- `app/api/match-plumbers/route.ts` (enhanced validation)

---

## 📁 Project Structure

```
plumbingapp-clean/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── match-plumbers/       # Plumber matching endpoint
│   │   │   └── route.ts          # POST /api/match-plumbers
│   │   └── request-bid/          # Bid request endpoint
│   │       └── route.ts          # POST /api/request-bid
│   ├── diagnostic/               # Diagnostic wizard
│   │   ├── page.tsx              # Main diagnostic component
│   │   ├── diagnosticTree.ts    # Question flow definition
│   │   ├── resultCatalog.ts     # Service code metadata
│   │   └── jobPayload.ts        # Job payload type
│   ├── health/                   # Health check endpoint
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── lib/                          # Shared utilities
│   ├── diagnostics.ts            # Diagnostic result computation
│   ├── plumbers.ts               # Plumber matching & ranking
│   └── serviceCodeMapping.ts     # Service code translation
├── data/                         # Static data
│   └── plumbers.json             # Plumber database (generated)
├── scripts/                      # Data generation scripts
│   ├── generate_plumbers_json.py # Generates plumbers.json from Excel
│   └── match_report.py          # Matching analysis tool
└── public/                       # Static assets
```

---

## 🔑 Key Concepts

### 1. Diagnostic Flow
```
User selects location → fixture → symptom → emergency check → issue created → summary page
```

**Important**: Issues are ONLY created after the emergency check completes. The symptom step stores the service code temporarily.

### 2. Service Codes
- **Diagnostic Codes**: Used in `diagnosticTree.ts` (e.g., `"PIPE_REPAIR"`, `"FAUCET_REPAIR"`)
- **Actual Service Codes**: Used in `plumbers.json` (e.g., `"LEAK_DETECTION"`, `"FAUCET_FIXTURE_REPAIR"`)
- **Mapping**: `lib/serviceCodeMapping.ts` translates between them

### 3. Plumber Matching Rules
1. **ALL Services Required**: Plumber must support ALL required service codes
2. **Emergency Gate**: If severity is `"EMERGENCY"` or `"URGENT"`, plumber must have `"EMERGENCY_PLUMBING"` service
3. **Ranking**: Plumbers ranked by:
   - Number of exact service matches (×100 points)
   - Emergency capability bonus (+50 for emergency/urgent jobs)
   - Routine job bonus (+10 for routine jobs)

### 4. Issue Model
Each issue has:
```typescript
{
  id: string;              // Unique identifier
  reported: string;        // Human-readable description (e.g., "Kitchen → Sink → Clogged")
  emergency: boolean;      // Is this an emergency?
  serviceCode: string;     // Actual service code (after mapping)
}
```

### 5. Severity Levels
- **API Format**: `"routine" | "urgent" | "emergency"` (lowercase)
- **Internal Format**: `"ROUTINE" | "URGENT" | "EMERGENCY"` (uppercase)
- **Mapping**: Done in `app/api/match-plumbers/route.ts`

---

## 🔄 Data Flow

### Diagnostic → Plumber Matching Flow

1. **User completes wizard**:
   ```
   Location → Fixture → Symptom → Emergency Check
   ```

2. **Issue created** (`app/diagnostic/page.tsx`):
   ```typescript
   // Service code stored when symptom selected
   setPendingServiceCode("DRAIN_CLEANING_FIXTURE")
   
   // After emergency check, issue created
   const serviceCode = mapDiagnosticCodeToServiceCode(pendingServiceCode)
   setIssues([...prev, { id, reported, emergency, serviceCode }])
   ```

3. **Plumbers fetched** (`useEffect` in `page.tsx`):
   ```typescript
   // When summary mode active and issues exist
   fetch("/api/match-plumbers", {
     body: JSON.stringify({
       serviceCodes: requiredServices,  // Array of unique service codes
       severity: "emergency" | "routine"  // Based on any issue.emergency
     })
   })
   ```

4. **API processes** (`app/api/match-plumbers/route.ts`):
   ```typescript
   // Maps severity
   const internalSeverity = severity === "emergency" ? "EMERGENCY" : "ROUTINE"
   
   // Matches plumbers
   const rankedPlumbers = rankPlumbersForJob({
     serviceCodes,
     severity: internalSeverity
   })
   ```

5. **Plumbers displayed** (`app/diagnostic/page.tsx`):
   - Shows loading state
   - Displays matched plumbers with contact info
   - Shows debug info if no matches found

---

## 📄 Important Files

### `app/diagnostic/page.tsx`
**Purpose**: Main diagnostic wizard and summary page component

**Key State**:
- `mode`: `"wizard"` or `"summary"`
- `issues`: Array of user-reported issues
- `matchedPlumbers`: Plumbers matching all required services
- `pendingServiceCode`: Temporary storage for service code before emergency check

**Key Functions**:
- `handleOption()`: Handles user selections, creates issues after emergency check
- `useEffect()`: Fetches plumbers when summary mode active

**Important**: Issues are created AFTER emergency check, not when symptom is selected.

### `lib/serviceCodeMapping.ts`
**Purpose**: Maps diagnostic tree service codes to actual plumber service codes

**Usage**:
```typescript
mapDiagnosticCodeToServiceCode("PIPE_REPAIR") // Returns "LEAK_DETECTION"
mapDiagnosticCodeToServiceCode("FAUCET_REPAIR") // Returns "FAUCET_FIXTURE_REPAIR"
```

**Why needed**: Diagnostic tree uses user-friendly codes, but plumbers.json uses standardized codes.

### `lib/plumbers.ts`
**Purpose**: Plumber matching and ranking logic

**Key Functions**:
- `matchPlumbersByAllServices()`: Filters plumbers who support ALL required services
- `rankPlumbersForJob()`: Ranks matched plumbers by relevance

**Severity Handling**: Supports `"EMERGENCY" | "URGENT" | "ROUTINE"`

### `app/api/match-plumbers/route.ts`
**Purpose**: API endpoint for plumber matching

**Request**:
```typescript
{
  serviceCodes: string[];           // Required service codes
  severity: "routine" | "urgent" | "emergency"
}
```

**Response**:
```typescript
{
  ok: boolean;
  plumbers: RankedPlumber[];
  debug?: { ... }  // Debug info for troubleshooting
}
```

**Validation**: Detailed error messages for each validation failure

### `app/diagnostic/diagnosticTree.ts`
**Purpose**: Defines the question flow

**Structure**:
- Each step has `id`, `question`, and `options`
- Options can have `nextStep` (go to another step) or `result` (service code)
- Emergency check is always the last step before creating issue

**Important**: Symptom steps have BOTH `nextStep: "emergency_check"` AND `result: "SERVICE_CODE"`

### `data/plumbers.json`
**Purpose**: Database of plumbers and their services

**Structure**:
```typescript
[
  {
    id: string;
    name: string;
    phone: string;
    email: string;
    location: string;
    services: string[];  // Array of service codes
  }
]
```

**Generation**: Created by `scripts/generate_plumbers_json.py` from Excel files

---

## 🎨 Common Patterns

### Adding a New Service Code

1. **Add to diagnostic tree** (`app/diagnostic/diagnosticTree.ts`):
   ```typescript
   { label: "New symptom", nextStep: "emergency_check", result: "NEW_SERVICE_CODE" }
   ```

2. **Add mapping** (`lib/serviceCodeMapping.ts`):
   ```typescript
   "NEW_SERVICE_CODE": "ACTUAL_PLUMBER_SERVICE_CODE"
   ```

3. **Add metadata** (`app/diagnostic/resultCatalog.ts`):
   ```typescript
   ACTUAL_PLUMBER_SERVICE_CODE: {
     label: "Display Name",
     severity: "routine" | "urgent" | "emergency",
     // ...
   }
   ```

### Debugging Plumber Matching

1. **Check browser console** for:
   - `"Adding issue:"` - Shows service code mapping
   - `"Fetching plumbers with:"` - Shows request payload
   - `"API response:"` - Shows matched plumbers count

2. **Check API response debug info**:
   - Expand "Debug Info" on summary page if no plumbers found
   - Shows why each plumber was included/excluded

3. **Verify service codes**:
   - Ensure diagnostic code exists in `serviceCodeMapping.ts`
   - Ensure mapped code exists in `plumbers.json`

---

## 🐛 Troubleshooting

### Issue: "No plumbers found"
**Possible causes**:
1. Service code not mapped correctly → Check `serviceCodeMapping.ts`
2. No plumbers have all required services → Check `plumbers.json`
3. Emergency job but no emergency-capable plumbers → Check for `EMERGENCY_PLUMBING` service

**Solution**: Check browser console and debug info on summary page

### Issue: "Invalid request payload"
**Possible causes**:
1. Empty `serviceCodes` array → Check if issues are being created
2. Invalid severity value → Should be `"routine" | "urgent" | "emergency"`
3. Non-string service codes → Check `requiredServices` computation

**Solution**: Check API route validation error messages in console

### Issue: Issues not showing on summary page
**Possible causes**:
1. Issue not created after emergency check → Check `handleOption()` logic
2. `pendingServiceCode` not set → Check symptom step handling
3. Emergency check skipping issue creation → Verify emergency check handling

**Solution**: Check browser console for `"Adding issue:"` logs

### Issue: Wrong plumbers matched
**Possible causes**:
1. Service code mapping incorrect → Verify mapping in `serviceCodeMapping.ts`
2. Severity mapping incorrect → Check API route severity conversion
3. Emergency gate not working → Verify plumber has `EMERGENCY_PLUMBING` service

**Solution**: Check debug info and verify service codes match

---

## 🔧 Development Workflow

### Making Changes

1. **Local Development**:
   ```bash
   npm run dev          # Start dev server (http://localhost:3000)
   npm run build        # Test production build
   ```

2. **Testing**:
   - Test diagnostic flow end-to-end
   - Verify issues are created correctly
   - Check plumber matching works
   - Test emergency vs routine jobs

3. **Deployment**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main  # Vercel auto-deploys
   ```

### Updating Plumber Data

1. Update Excel files (`0-G-burg Plumbers Services.xlsx`, `0-GburgPlumbers.xlsx`)
2. Run generation script:
   ```bash
   python3 scripts/generate_plumbers_json.py
   ```
3. Commit updated `data/plumbers.json`

---

## 📝 Notes for Cursor AI

When making changes:

1. **Always check** `lib/serviceCodeMapping.ts` when adding new diagnostic codes
2. **Remember** issues are created AFTER emergency check, not when symptom is selected
3. **Verify** service codes exist in `plumbers.json` before using them
4. **Test** emergency vs routine flows separately
5. **Check** browser console logs for debugging info
6. **Preserve** the issue creation flow (symptom → emergency check → issue created)

**Key Files to Read First**:
1. `app/diagnostic/page.tsx` - Main component logic
2. `lib/serviceCodeMapping.ts` - Service code translation
3. `app/api/match-plumbers/route.ts` - API endpoint
4. `lib/plumbers.ts` - Matching logic

---

## 🎯 Current Status

✅ **Working**:
- Diagnostic wizard flow
- Issue creation after emergency check
- Service code mapping
- Plumber matching with all services required
- Emergency gate filtering
- Plumber display on summary page
- Error handling and debugging

⚠️ **Known Limitations**:
- Plumber data is static (from JSON file)
- No real-time availability checking
- No bid submission backend (just logs to console)

---

**Last Updated**: January 2025
**Maintained By**: Development Team

