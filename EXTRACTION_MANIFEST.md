# NEXUS → on-estimating Extraction Package
# Generated: April 2026 | Bill Asmar · O'Neill Contractors, Inc.

## What this package contains

5 modules extracted from NEXUS_EST_APP and adapted for drop-in into on-estimating.
All files are production-ready TypeScript. No further modification required before use.

---

## Drop-in file map

Copy each file to the exact target path shown below, relative to your
`on-estimating/apps/web/` root.

| File in this package                              | Target path in on-estimating/apps/web/          |
|---------------------------------------------------|-------------------------------------------------|
| types/takeoff.types.ts                            | src/types/takeoff.types.ts                      |
| lib/supabase/takeoff-queries.ts                   | src/lib/supabase/takeoff-queries.ts             |
| lib/takeoff/scale-calibrator.ts                   | src/lib/takeoff/scale-calibrator.ts             |
| lib/takeoff/dimension-parser.ts                   | src/lib/takeoff/dimension-parser.ts             |
| lib/takeoff/formula-engine.ts                     | src/lib/takeoff/formula-engine.ts               |
| lib/takeoff/dynamic-linker.ts                     | src/lib/takeoff/dynamic-linker.ts               |
| lib/takeoff/validation-engine.ts                  | src/lib/takeoff/validation-engine.ts            |
| lib/takeoff/ai-vision-extraction.ts               | src/lib/takeoff/ai-vision-extraction.ts         |
| lib/takeoff/plan-upload.ts                        | src/lib/takeoff/plan-upload.ts                  |
| components/takeoff/confidence-indicator.tsx       | src/components/takeoff/confidence-indicator.tsx |
| components/takeoff/interactive-plan-viewer.tsx    | src/components/takeoff/interactive-plan-viewer.tsx |
| app/api/plan-sets/route.ts                        | src/app/api/plan-sets/route.ts                  |
| app/api/takeoffs/route.ts                         | src/app/api/takeoffs/route.ts                   |
| app/api/takeoffs/[id]/items/route.ts              | src/app/api/takeoffs/[id]/items/route.ts        |
| app/api/takeoffs/[id]/qa-summary/route.ts         | src/app/api/takeoffs/[id]/qa-summary/route.ts   |
| prisma/takeoff-schema-addition.prisma             | → APPEND to your existing prisma/schema.prisma  |

---

## Post-drop-in steps (run from on-estimating/apps/web/)

```bash
# 1. Install the one new dependency (Fabric.js canvas)
pnpm add fabric@5.3.0
pnpm add -D @types/fabric

# 2. Push the new Prisma models to Supabase
cd ../../  # go to monorepo root
pnpm db:push
# or: npx prisma db push --schema=packages/database/prisma/schema.prisma

# 3. Verify TypeScript compiles clean
pnpm typecheck

# 4. Run dev server and navigate to /takeoff to confirm the plan viewer loads
pnpm dev
```

---

## What each module does

### types/takeoff.types.ts
Full TypeScript type system for all takeoff entities. Import from here throughout.

### lib/supabase/takeoff-queries.ts
All Supabase DB read/write functions for plan sets, takeoffs, and takeoff items.
Replaces the scattered inline supabase calls in NEXUS.

### lib/takeoff/scale-calibrator.ts
Converts a reference dimension (e.g. "1/4 inch = 1 foot") + pixel measurement
into a pixels-per-unit ratio used by all measurement calculations.

### lib/takeoff/dimension-parser.ts
Parses architectural notation strings: "3'-6\"", "1/4\"=1'-0\"", "12mm", etc.
Returns decimal feet or metres with unit label.

### lib/takeoff/formula-engine.ts
Area, linear, count, and volume calculations. Accepts shape geometry + scale
ratio → returns quantity with unit. Also handles waste-factor application.

### lib/takeoff/dynamic-linker.ts
Maps AI-detected symbol descriptions to CSI MasterFormat codes.
Uses a lookup table + fuzzy fallback. Returns csi_code + confidence.

### lib/takeoff/validation-engine.ts
Scores each takeoff item 0–1 for confidence. Flags items below threshold.
Aggregates per-takeoff QA summary stats.

### lib/takeoff/ai-vision-extraction.ts
Calls Claude Vision + GPT-4o Vision in parallel (dual-model cross-validation).
Reconciles results and returns a merged detection list with consensus confidence.

### lib/takeoff/plan-upload.ts
Handles PDF file → Supabase Storage upload → creates plan_set + plan_sheet DB records.
Returns signed URLs for the canvas viewer.

### components/takeoff/confidence-indicator.tsx
Small badge component: green ≥0.85, amber 0.65–0.84, red <0.65.
Used in both the canvas overlay and the QA review sidebar.

### components/takeoff/interactive-plan-viewer.tsx
The full Fabric.js canvas plan viewer. Includes:
- PDF page rendering via pdfjs-dist
- Polygon, polyline, rectangle, count annotation tools
- Auto-save on object:modified / object:added events
- QA sidebar (approve / flag / override per item)
- Scale calibration UI
- Layer visibility toggles
- Integration with all lib/takeoff/* utilities

### app/api/plan-sets/route.ts
GET (list plan sets for project) + POST (create plan set record).

### app/api/takeoffs/route.ts
GET (list takeoffs for project) + POST (create takeoff record).

### app/api/takeoffs/[id]/items/route.ts
Full CRUD for takeoff items: GET list, POST create, PATCH update, DELETE remove.

### app/api/takeoffs/[id]/qa-summary/route.ts
GET aggregated QA stats: total items, approved, flagged, avg confidence.

### prisma/takeoff-schema-addition.prisma
4 new Prisma models to append to your existing schema.prisma:
PlanSet, PlanSheet, Takeoff, TakeoffItem.
