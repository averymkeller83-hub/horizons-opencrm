# Horizons OpenCRM — Phase 1b (Module System + Pipeline Module) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the module registry — the contract every opt-in module follows — and ship the first concrete module (Pipeline, for sales-driven businesses with deal stages). After 1b, the codebase demonstrates that a module is genuinely pluggable: enable `pipeline: true` in `horizons.config.ts` and the Pipeline routes, navigation entry, server actions, and (later) MCP tools light up automatically.

**Architecture:** Each module is a self-contained directory at `modules/<name>/` with a `module.ts` manifest declaring its schema, routes, navigation entries, and (in later phases) CLI commands + MCP tools. A central `lib/modules/registry.ts` reads `horizons.config.ts`, iterates the enabled modules, and merges their contributions into the running app. Next.js navigation reads the registry to render the sidebar; Drizzle migrations include schemas from enabled modules; the dashboard widgets pull from each enabled module's `dashboardWidget` export. The Pipeline module is the reference implementation: deals + stages, kanban board UI (drag-to-move via @dnd-kit), server actions for CRUD + stage transitions.

**Tech Stack:**
- All Phase 1a deps (Next.js 15, Drizzle, Clerk, Tailwind, shadcn/ui)
- New: `@dnd-kit/core` + `@dnd-kit/sortable` for the Pipeline kanban drag-and-drop
- New shadcn primitives: `Select` (already in package.json deps), `Dialog`, `Badge`

**Spec reference:** `docs/superpowers/specs/2026-05-17-horizons-opencrm-design.md` — implements Forks 2 (module system architecture), 5 (universal core + opt-in modules), and the Pipeline module from Fork 6. CLI + MCP surfaces for Pipeline come in Phases 1d + 1e respectively.

---

## Working directory

`/Users/averykeller/Desktop/projects/horizons-opencrm/` — repo at commit `8b489b1` (Phase 1a complete). Building forward on top.

---

## File structure (Phase 1b scope)

### New files

| Path | Responsibility |
|---|---|
| `lib/modules/types.ts` | TypeScript module manifest types |
| `lib/modules/registry.ts` | Reads horizons.config + returns active modules |
| `lib/modules/index.ts` | Re-exports + helpers |
| `modules/pipeline/module.ts` | Pipeline module manifest |
| `modules/pipeline/schema.ts` | Drizzle tables: `deals`, `pipeline_stages` |
| `modules/pipeline/actions.ts` | Server actions: createDeal, updateDeal, moveDealStage, deleteDeal |
| `modules/pipeline/queries.ts` | Server-side read helpers (deals by stage, MRR, win-rate) |
| `modules/pipeline/dashboard-widget.tsx` | Card shown on `/dashboard` (only when module enabled) |
| `modules/pipeline/routes/page.tsx` | `/pipeline` — kanban board |
| `modules/pipeline/routes/new/page.tsx` | `/pipeline/new` — new-deal form |
| `modules/pipeline/routes/[id]/page.tsx` | `/pipeline/[id]` — deal detail |
| `modules/pipeline/routes/[id]/edit/page.tsx` | `/pipeline/[id]/edit` — edit deal |
| `modules/pipeline/components/kanban-board.tsx` | Client-side dnd board |
| `modules/pipeline/components/deal-card.tsx` | Single deal in a column |
| `modules/pipeline/components/stage-config-modal.tsx` | Manage stages (add/rename/reorder) |
| `app/(app)/pipeline/...` | Thin re-export shims from `modules/pipeline/routes/` (Next.js routing constraint) |
| `components/ui/select.tsx` | shadcn Select primitive |
| `components/ui/dialog.tsx` | shadcn Dialog primitive |
| `components/ui/badge.tsx` | shadcn Badge primitive |
| `drizzle/migrations/0001_*.sql` | Generated migration with deals + pipeline_stages tables |
| `tests/modules/pipeline/actions.test.ts` | TDD tests for Pipeline server actions |
| `tests/modules/pipeline/queries.test.ts` | TDD tests for Pipeline queries (deals by stage, MRR, win-rate) |
| `tests/modules/registry.test.ts` | TDD: registry reads horizons.config and exposes enabled modules |

### Modified files

| Path | Change |
|---|---|
| `horizons.config.ts` | Set `pipeline: true` to enable the module locally for dev/test |
| `components/app-shell/nav.tsx` | Read registry; render nav items for enabled modules dynamically |
| `app/(app)/dashboard/page.tsx` | Render each enabled module's `dashboardWidget` |
| `lib/db/schema/index.ts` | Re-export pipeline schemas (only when imported by code paths that need them) |
| `drizzle.config.ts` | Update schema path to include module schemas |
| `package.json` | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@radix-ui/react-dialog` |

---

## Task 1: Module registry — types + loader (TDD)

**Files:**
- Create: `lib/modules/types.ts`, `lib/modules/registry.ts`, `lib/modules/index.ts`, `tests/modules/registry.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/modules/registry.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/horizons.config", () => ({
  default: {
    business: { name: "Test Co", timezone: "America/Indianapolis" },
    modules: { pipeline: true, jobs: false, orders: false, subscriptions: false, supportTickets: false },
    integrations: {},
    storage: { driver: "better-sqlite3" as const, path: "./data/horizons.db" },
  },
}));

vi.mock("@/modules/pipeline/module", () => ({
  pipelineModule: {
    name: "pipeline",
    label: "Pipeline",
    navIcon: "Trello",
    routes: [{ path: "/pipeline", label: "Pipeline" }],
    schema: {},
  },
}));

import { getEnabledModules } from "@/lib/modules/registry";

describe("module registry", () => {
  it("returns only the enabled modules from horizons.config", () => {
    const enabled = getEnabledModules();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].name).toBe("pipeline");
  });

  it("returns empty array if no modules enabled", async () => {
    vi.doMock("@/horizons.config", () => ({
      default: {
        business: { name: "Test Co", timezone: "UTC" },
        modules: {},
        integrations: {},
        storage: { driver: "better-sqlite3" as const, path: "./data/horizons.db" },
      },
    }));
    // Need fresh module instance — dynamic import
    const { getEnabledModules: getFresh } = await import("@/lib/modules/registry?fresh=" + Date.now());
    expect(getFresh()).toHaveLength(0);
    vi.doUnmock("@/horizons.config");
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
npm test -- tests/modules/registry 2>&1 | tail -10
```

Expected: cannot resolve `@/lib/modules/registry`.

- [ ] **Step 3: Write `lib/modules/types.ts`**

```ts
import type { ComponentType } from "react";

export type ModuleRouteEntry = {
  path: string;
  label: string;
};

export type ModuleDashboardWidget = ComponentType;

export type ModuleManifest = {
  /** Unique key, matches the key in horizons.config.ts:modules */
  name: string;
  /** Human-readable label for nav entries, settings, etc. */
  label: string;
  /** lucide-react icon name (string) — Nav resolves at render time */
  navIcon: string;
  /** Top-level routes the module contributes */
  routes: ModuleRouteEntry[];
  /** Optional: card shown on /dashboard when module enabled */
  dashboardWidget?: ModuleDashboardWidget;
  /** Drizzle schema tables (re-exported so migrations pick them up) */
  schema: Record<string, unknown>;
};
```

- [ ] **Step 4: Write `lib/modules/registry.ts`**

```ts
import config from "@/horizons.config";
import type { ModuleManifest } from "./types";

import { pipelineModule } from "@/modules/pipeline/module";

const allModules: Record<string, ModuleManifest> = {
  pipeline: pipelineModule,
  // jobs, orders, subscriptions, supportTickets land in Phase 1c
};

export function getEnabledModules(): ModuleManifest[] {
  return Object.entries(config.modules)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => allModules[name])
    .filter((m): m is ModuleManifest => m !== undefined);
}

export function isModuleEnabled(name: string): boolean {
  return Boolean(config.modules[name]);
}
```

- [ ] **Step 5: Write `lib/modules/index.ts`**

```ts
export * from "./types";
export * from "./registry";
```

- [ ] **Step 6: Run tests (will still fail until Pipeline module exists)**

```bash
npm test -- tests/modules/registry 2>&1 | tail -10
```

Expected: still failing — `@/modules/pipeline/module` doesn't exist yet. That's OK; we move to Task 2 to write it.

- [ ] **Step 7: Don't commit yet** — Task 2 introduces the Pipeline module so Task 1 + 2 can be committed together as one coherent unit (registry + first module).

---

## Task 2: Pipeline module manifest + schema (TDD)

**Files:**
- Create: `modules/pipeline/module.ts`, `modules/pipeline/schema.ts`, `tests/modules/pipeline/schema.test.ts`
- Modify: `lib/db/schema/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Write the schema test (failing)**

```ts
// tests/modules/pipeline/schema.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { deals, pipelineStages } from "@/modules/pipeline/schema";

describe("pipeline schema", () => {
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a pipeline stage", () => {
    db.insert(pipelineStages).values({
      organizationId: "org_test",
      name: "Qualified",
      order: 1,
    }).run();
    const rows = db.select().from(pipelineStages).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Qualified");
  });

  it("creates a deal referencing a contact and stage", () => {
    const contact = db.insert(contacts).values({ organizationId: "org_test", name: "Acme Inc" }).returning().get();
    const stage = db.insert(pipelineStages).values({ organizationId: "org_test", name: "Lead", order: 0 }).returning().get();

    db.insert(deals).values({
      organizationId: "org_test",
      contactId: contact.id,
      stageId: stage.id,
      title: "Q3 Renewal",
      valueCents: 500000,
    }).run();

    const result = db.select().from(deals).where(eq(deals.contactId, contact.id)).all();
    expect(result).toHaveLength(1);
    expect(result[0].valueCents).toBe(500000);
  });

  it("cascades: deleting a contact deletes their deals", () => {
    const contact = db.insert(contacts).values({ organizationId: "org_test", name: "ToDelete" }).returning().get();
    const stage = db.insert(pipelineStages).values({ organizationId: "org_test", name: "Lead", order: 0 }).returning().get();

    db.insert(deals).values({
      organizationId: "org_test",
      contactId: contact.id,
      stageId: stage.id,
      title: "Will Cascade",
      valueCents: 100,
    }).run();

    db.delete(contacts).where(eq(contacts.id, contact.id)).run();
    expect(db.select().from(deals).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
npm test -- tests/modules/pipeline/schema 2>&1 | tail -10
```

Expected: cannot resolve `@/modules/pipeline/schema`.

- [ ] **Step 3: Write `modules/pipeline/schema.ts`**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const pipelineStages = sqliteTable("pipeline_stages", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  isWon: integer("is_won", { mode: "boolean" }).notNull().default(false),
  isLost: integer("is_lost", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  stageId: text("stage_id").notNull().references(() => pipelineStages.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  valueCents: integer("value_cents").notNull().default(0),
  probability: integer("probability").default(50),
  expectedCloseAt: integer("expected_close_at", { mode: "timestamp" }),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type NewPipelineStage = typeof pipelineStages.$inferInsert;
```

- [ ] **Step 4: Write `modules/pipeline/module.ts` (manifest stub — actions/queries/UI land in Tasks 3-5)**

```ts
import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";

export const pipelineModule: ModuleManifest = {
  name: "pipeline",
  label: "Pipeline",
  navIcon: "Trello",
  routes: [
    { path: "/pipeline", label: "Pipeline" },
  ],
  schema,
};
```

- [ ] **Step 5: Update `lib/db/schema/index.ts`**

```ts
export * from "./contacts";
export * from "./interactions";
```

(Note: Module-specific schemas are NOT re-exported here. They're imported directly by code paths that need them — keeps the universal core clean. Drizzle Kit's `drizzle.config.ts` does need to know about all schemas for migration generation — handled in Step 6.)

- [ ] **Step 6: Update `drizzle.config.ts` to include module schemas**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./lib/db/schema/index.ts",
    "./modules/*/schema.ts",
  ],
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/horizons.db",
  },
});
```

- [ ] **Step 7: Generate the new migration**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
npx drizzle-kit generate
```

Expected: a new `drizzle/migrations/0001_*.sql` file appears with `CREATE TABLE pipeline_stages` and `CREATE TABLE deals`. Verify the `deals.contact_id` foreign key has `ON DELETE cascade` and `deals.stage_id` has `ON DELETE restrict`.

- [ ] **Step 8: Run all tests**

```bash
npm test 2>&1 | tail -10
```

Expected: 12 tests pass (7 from Phase 1a + 3 new pipeline schema + 2 from registry — once registry test sees a real pipeline module).

- [ ] **Step 9: Commit Tasks 1 + 2 together**

```bash
git add lib/modules/ modules/pipeline/module.ts modules/pipeline/schema.ts tests/modules/ drizzle.config.ts drizzle/migrations/0001_*.sql
git commit -m "feat(modules): registry + Pipeline schema

Module registry reads horizons.config and returns enabled
ModuleManifests. Pipeline module is the first reference impl:
deals + pipeline_stages tables with cascade-delete on contact,
restrict-delete on stage. 5 new tests pass (2 registry + 3
pipeline schema). Migration 0001 generated.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 3: Pipeline server actions (TDD)

**Files:**
- Create: `modules/pipeline/actions.ts`, `tests/modules/pipeline/actions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/modules/pipeline/actions.test.ts
import { describe, it, expect, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

vi.mock("@/lib/db", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return { db };
});

vi.mock("@/lib/clerk", () => ({
  requireOrg: () => Promise.resolve("org_test"),
}));

import { createContact } from "@/lib/actions/contacts";
import {
  createStage,
  createDeal,
  moveDealStage,
  updateDeal,
  deleteDeal,
} from "@/modules/pipeline/actions";

describe("pipeline server actions", () => {
  it("creates a stage and a deal in it", async () => {
    const stage = await createStage({ name: "Qualified", order: 0 });
    const contact = await createContact({ name: "Test Co" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: stage.id,
      title: "Q4 deal",
      valueCents: 250000,
    });
    expect(deal.title).toBe("Q4 deal");
    expect(deal.stageId).toBe(stage.id);
  });

  it("moves a deal to a different stage", async () => {
    const lead = await createStage({ name: "Lead", order: 0 });
    const qualified = await createStage({ name: "Qualified", order: 1 });
    const contact = await createContact({ name: "Mover" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: lead.id,
      title: "Move me",
      valueCents: 100,
    });

    const moved = await moveDealStage(deal.id, qualified.id);
    expect(moved.stageId).toBe(qualified.id);
  });

  it("updates a deal", async () => {
    const stage = await createStage({ name: "S1", order: 0 });
    const contact = await createContact({ name: "T" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: stage.id,
      title: "Original",
      valueCents: 100,
    });

    const updated = await updateDeal(deal.id, { title: "Renamed", valueCents: 200 });
    expect(updated.title).toBe("Renamed");
    expect(updated.valueCents).toBe(200);
  });

  it("deletes a deal", async () => {
    const stage = await createStage({ name: "S", order: 0 });
    const contact = await createContact({ name: "Z" });
    const deal = await createDeal({
      contactId: contact.id,
      stageId: stage.id,
      title: "Doomed",
      valueCents: 1,
    });

    await deleteDeal(deal.id);

    const { db } = await import("@/lib/db");
    const { deals } = await import("@/modules/pipeline/schema");
    const { eq } = await import("drizzle-orm");
    expect(db.select().from(deals).where(eq(deals.id, deal.id)).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
npm test -- tests/modules/pipeline/actions 2>&1 | tail -10
```

Expected: cannot resolve `@/modules/pipeline/actions`.

- [ ] **Step 3: Write `modules/pipeline/actions.ts`**

```ts
"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deals, pipelineStages } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createStageSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
});

const createDealSchema = z.object({
  contactId: z.string(),
  stageId: z.string(),
  title: z.string().min(1),
  valueCents: z.number().int().nonnegative().default(0),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseAt: z.date().optional(),
  notes: z.string().optional(),
});

const updateDealSchema = createDealSchema.partial().omit({ contactId: true, stageId: true });

export async function createStage(input: z.infer<typeof createStageSchema>) {
  const orgId = await requireOrg();
  const parsed = createStageSchema.parse(input);
  const [row] = db.insert(pipelineStages).values({
    organizationId: orgId,
    name: parsed.name,
    order: parsed.order,
    isWon: parsed.isWon,
    isLost: parsed.isLost,
  }).returning().all();
  return row;
}

export async function createDeal(input: z.infer<typeof createDealSchema>) {
  const orgId = await requireOrg();
  const parsed = createDealSchema.parse(input);
  const [row] = db.insert(deals).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    stageId: parsed.stageId,
    title: parsed.title,
    valueCents: parsed.valueCents,
    probability: parsed.probability ?? 50,
    expectedCloseAt: parsed.expectedCloseAt ?? null,
    notes: parsed.notes ?? null,
  }).returning().all();
  return row;
}

export async function moveDealStage(dealId: string, newStageId: string) {
  const orgId = await requireOrg();
  const [row] = db
    .update(deals)
    .set({ stageId: newStageId, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function updateDeal(id: string, input: z.infer<typeof updateDealSchema>) {
  const orgId = await requireOrg();
  const parsed = updateDealSchema.parse(input);
  const [row] = db
    .update(deals)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function deleteDeal(id: string) {
  const orgId = await requireOrg();
  db.delete(deals)
    .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
    .run();
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: 16 tests pass (12 from earlier + 4 new pipeline action tests).

- [ ] **Step 5: Commit**

```bash
git add modules/pipeline/actions.ts tests/modules/pipeline/actions.test.ts
git commit -m "feat(pipeline): server actions for deals + stages

createStage, createDeal, moveDealStage, updateDeal, deleteDeal.
Zod-validated, Clerk-org-scoped. 4 new tests pass, total 16/16.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 4: Pipeline queries + dashboard widget

**Files:**
- Create: `modules/pipeline/queries.ts`, `modules/pipeline/dashboard-widget.tsx`, `tests/modules/pipeline/queries.test.ts`
- Modify: `modules/pipeline/module.ts` (wire `dashboardWidget`)

- [ ] **Step 1: Write failing tests for queries**

```ts
// tests/modules/pipeline/queries.test.ts
import { describe, it, expect, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

vi.mock("@/lib/db", () => {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return { db };
});

vi.mock("@/lib/clerk", () => ({
  requireOrg: () => Promise.resolve("org_test"),
}));

import { createContact } from "@/lib/actions/contacts";
import { createStage, createDeal } from "@/modules/pipeline/actions";
import { getPipelineSummary, getDealsGroupedByStage } from "@/modules/pipeline/queries";

describe("pipeline queries", () => {
  it("computes open + total deal value", async () => {
    const stage = await createStage({ name: "Qualified", order: 0 });
    const c = await createContact({ name: "X" });
    await createDeal({ contactId: c.id, stageId: stage.id, title: "A", valueCents: 100000 });
    await createDeal({ contactId: c.id, stageId: stage.id, title: "B", valueCents: 50000 });

    const summary = await getPipelineSummary();
    expect(summary.openDealCount).toBe(2);
    expect(summary.openValueCents).toBe(150000);
  });

  it("groups deals by stage", async () => {
    const s1 = await createStage({ name: "Lead", order: 0 });
    const s2 = await createStage({ name: "Qualified", order: 1 });
    const c = await createContact({ name: "G" });
    await createDeal({ contactId: c.id, stageId: s1.id, title: "Deal A", valueCents: 100 });
    await createDeal({ contactId: c.id, stageId: s2.id, title: "Deal B", valueCents: 200 });
    await createDeal({ contactId: c.id, stageId: s2.id, title: "Deal C", valueCents: 300 });

    const grouped = await getDealsGroupedByStage();
    const leadCol = grouped.find((g) => g.stage.id === s1.id);
    const qualCol = grouped.find((g) => g.stage.id === s2.id);
    expect(leadCol?.deals).toHaveLength(1);
    expect(qualCol?.deals).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
npm test -- tests/modules/pipeline/queries 2>&1 | tail -10
```

Expected: cannot resolve `@/modules/pipeline/queries`.

- [ ] **Step 3: Write `modules/pipeline/queries.ts`**

```ts
import { db } from "@/lib/db";
import { eq, and, sum } from "drizzle-orm";
import { deals, pipelineStages, type Deal, type PipelineStage } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type PipelineSummary = {
  openDealCount: number;
  openValueCents: number;
};

export async function getPipelineSummary(): Promise<PipelineSummary> {
  const orgId = await requireOrg();
  const openDeals = db.select().from(deals)
    .where(and(eq(deals.organizationId, orgId)))
    .all()
    .filter((d) => d.closedAt === null);
  const total = openDeals.reduce((acc, d) => acc + d.valueCents, 0);
  return { openDealCount: openDeals.length, openValueCents: total };
}

export type StageWithDeals = {
  stage: PipelineStage;
  deals: Deal[];
};

export async function getDealsGroupedByStage(): Promise<StageWithDeals[]> {
  const orgId = await requireOrg();
  const stages = db.select().from(pipelineStages)
    .where(eq(pipelineStages.organizationId, orgId))
    .orderBy(pipelineStages.order)
    .all();
  const allDeals = db.select().from(deals)
    .where(eq(deals.organizationId, orgId))
    .all();
  return stages.map((stage) => ({
    stage,
    deals: allDeals.filter((d) => d.stageId === stage.id),
  }));
}
```

- [ ] **Step 4: Write `modules/pipeline/dashboard-widget.tsx`**

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPipelineSummary } from "./queries";

function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export async function PipelineDashboardWidget() {
  const summary = await getPipelineSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{formatDollars(summary.openValueCents)}</p>
        <p className="text-sm text-muted-foreground">
          {summary.openDealCount} open deal{summary.openDealCount === 1 ? "" : "s"}
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Update `modules/pipeline/module.ts` to wire the widget**

```ts
import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { PipelineDashboardWidget } from "./dashboard-widget";

export const pipelineModule: ModuleManifest = {
  name: "pipeline",
  label: "Pipeline",
  navIcon: "Trello",
  routes: [
    { path: "/pipeline", label: "Pipeline" },
  ],
  schema,
  dashboardWidget: PipelineDashboardWidget,
};
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: 18/18 (16 prior + 2 query tests).

- [ ] **Step 7: Commit**

```bash
git add modules/pipeline/queries.ts modules/pipeline/dashboard-widget.tsx modules/pipeline/module.ts tests/modules/pipeline/queries.test.ts
git commit -m "feat(pipeline): queries + dashboard widget

getPipelineSummary computes open count + total open value;
getDealsGroupedByStage returns stages with their deals in order.
Dashboard widget wired into module manifest, will render on
/dashboard for any instance with pipeline: true. 2 new tests
pass, total 18/18.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 5: shadcn UI primitives — Select, Dialog, Badge + dnd-kit install

**Files:**
- Create: `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/badge.tsx`
- Modify: `package.json`

- [ ] **Step 1: Install dnd-kit + radix dialog**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
npm install @dnd-kit/core @dnd-kit/sortable @radix-ui/react-dialog
```

- [ ] **Step 2: Write `components/ui/select.tsx`**

```tsx
"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-background text-foreground shadow-md",
        className
      )}
      position="popper"
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-secondary focus:text-secondary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
```

- [ ] **Step 3: Write `components/ui/dialog.tsx`**

```tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
```

- [ ] **Step 4: Write `components/ui/badge.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/select.tsx components/ui/dialog.tsx components/ui/badge.tsx package.json package-lock.json
git commit -m "feat(ui): Select, Dialog, Badge primitives + dnd-kit install

shadcn-style primitives needed for the Pipeline kanban board.
@dnd-kit/core + @dnd-kit/sortable installed for drag-and-drop.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 6: Pipeline routes — kanban board UI

**Files:**
- Create: `modules/pipeline/components/kanban-board.tsx`, `modules/pipeline/components/deal-card.tsx`, `modules/pipeline/routes/page.tsx`, `modules/pipeline/routes/new/page.tsx`, `modules/pipeline/routes/[id]/page.tsx`, `app/(app)/pipeline/page.tsx`, `app/(app)/pipeline/new/page.tsx`, `app/(app)/pipeline/[id]/page.tsx`

- [ ] **Step 1: Write `modules/pipeline/components/deal-card.tsx`**

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Deal } from "../schema";

export function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="p-3 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <Link href={`/pipeline/${deal.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="font-medium text-sm">{deal.title}</div>
        <div className="text-xs text-muted-foreground">
          ${(deal.valueCents / 100).toFixed(2)}
        </div>
      </Link>
    </Card>
  );
}
```

- [ ] **Step 2: Write `modules/pipeline/components/kanban-board.tsx`**

```tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DealCard } from "./deal-card";
import { moveDealStage } from "../actions";
import type { Deal, PipelineStage } from "../schema";

type Props = {
  initialGroups: { stage: PipelineStage; deals: Deal[] }[];
};

export function KanbanBoard({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // `over.id` is either another deal (same column reorder) or a stage column drop zone.
    const overGroup = groups.find((g) =>
      g.stage.id === over.id || g.deals.some((d) => d.id === over.id)
    );
    if (!overGroup) return;

    const activeDeal = groups.flatMap((g) => g.deals).find((d) => d.id === active.id);
    if (!activeDeal || activeDeal.stageId === overGroup.stage.id) return;

    // Optimistic update
    setGroups((prev) =>
      prev.map((g) => {
        if (g.stage.id === activeDeal.stageId) {
          return { ...g, deals: g.deals.filter((d) => d.id !== activeDeal.id) };
        }
        if (g.stage.id === overGroup.stage.id) {
          return { ...g, deals: [...g.deals, { ...activeDeal, stageId: overGroup.stage.id }] };
        }
        return g;
      })
    );

    // Persist
    await moveDealStage(activeDeal.id, overGroup.stage.id);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid grid-flow-col auto-cols-[300px] gap-4 overflow-x-auto">
        {groups.map(({ stage, deals }) => (
          <div key={stage.id} className="bg-secondary/30 rounded-lg p-3 space-y-2 min-h-[300px]">
            <h3 className="font-semibold">{stage.name}</h3>
            <p className="text-xs text-muted-foreground">{deals.length} deal{deals.length === 1 ? "" : "s"}</p>
            <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2" data-stage-id={stage.id}>
                {deals.map((d) => <DealCard key={d.id} deal={d} />)}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 3: Write `modules/pipeline/routes/page.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "../components/kanban-board";
import { getDealsGroupedByStage } from "../queries";

export default async function PipelinePage() {
  const groups = await getDealsGroupedByStage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <Button asChild>
          <Link href="/pipeline/new">New deal</Link>
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          No stages yet. Create your first stage (e.g. &quot;Lead&quot;) to get started.
        </p>
      ) : (
        <KanbanBoard initialGroups={groups} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `modules/pipeline/routes/new/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { createDeal } from "../../actions";

// NOTE: This component runs server actions for both the read-side
// (fetching contacts + stages) and write-side (createDeal). Since
// we're in a client component, we use small inline server actions
// that the form's `action` prop calls.

async function getContactsAndStagesAction() {
  "use server";
  const { db } = await import("@/lib/db");
  const { contacts } = await import("@/lib/db/schema");
  const { pipelineStages } = await import("../../schema");
  const { requireOrg } = await import("@/lib/clerk");
  const orgId = await requireOrg();
  const { eq } = await import("drizzle-orm");
  return {
    contacts: db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all(),
    stages: db.select().from(pipelineStages).where(eq(pipelineStages.organizationId, orgId)).all(),
  };
}

export default function NewDealPage() {
  const router = useRouter();
  const [opts, setOpts] = useState<{ contacts: any[]; stages: any[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getContactsAndStagesAction().then(setOpts);
  }, []);

  if (!opts) return <p>Loading…</p>;

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      const deal = await createDeal({
        contactId: formData.get("contactId") as string,
        stageId: formData.get("stageId") as string,
        title: formData.get("title") as string,
        valueCents: Math.round(parseFloat(formData.get("value") as string || "0") * 100),
        notes: (formData.get("notes") as string) || undefined,
      });
      router.push(`/pipeline/${deal.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New deal</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required />
        </div>
        <div>
          <Label htmlFor="contactId">Contact *</Label>
          <select id="contactId" name="contactId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select contact —</option>
            {opts.contacts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="stageId">Stage *</Label>
          <select id="stageId" name="stageId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select stage —</option>
            {opts.stages.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="value">Value (USD)</Label>
          <Input id="value" name="value" type="number" step="0.01" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create deal"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Write `modules/pipeline/routes/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { deals, pipelineStages } from "../../schema";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();

  const deal = db.select().from(deals)
    .where(and(eq(deals.id, id), eq(deals.organizationId, orgId)))
    .get();
  if (!deal) notFound();

  const contact = db.select().from(contacts).where(eq(contacts.id, deal.contactId)).get();
  const stage = db.select().from(pipelineStages).where(eq(pipelineStages.id, deal.stageId)).get();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deal.title}</h1>
          <p className="text-muted-foreground">${(deal.valueCents / 100).toFixed(2)} · {stage?.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pipeline">Back to pipeline</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Contact</h2></CardHeader>
        <CardContent>
          {contact ? (
            <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
              {contact.name}
            </Link>
          ) : (
            <p className="text-muted-foreground">Contact deleted</p>
          )}
        </CardContent>
      </Card>

      {deal.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{deal.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create the `app/(app)/pipeline/*` shims that re-export the routes**

Next.js routes have to live under `app/`. The convention: `app/(app)/pipeline/page.tsx` simply re-exports from `modules/pipeline/routes/page.tsx`. Phase 1g (the scaffolder) will generate these automatically; for 1b, write them by hand.

```tsx
// app/(app)/pipeline/page.tsx
export { default } from "@/modules/pipeline/routes/page";
```

```tsx
// app/(app)/pipeline/new/page.tsx
export { default } from "@/modules/pipeline/routes/new/page";
```

```tsx
// app/(app)/pipeline/[id]/page.tsx
export { default } from "@/modules/pipeline/routes/[id]/page";
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add modules/pipeline/components/ modules/pipeline/routes/ app/\(app\)/pipeline/
git commit -m "feat(pipeline): kanban board UI + new-deal form + detail page

@dnd-kit drag-and-drop board that calls moveDealStage on drop.
New-deal form with contact + stage selects. Deal detail page
shows value, stage, contact link, notes. Routes shimmed under
app/(app)/pipeline/ until Phase 1g's scaffolder generates them.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 7: Wire registry into nav + dashboard

**Files:**
- Modify: `components/app-shell/nav.tsx`, `app/(app)/dashboard/page.tsx`, `horizons.config.ts`

- [ ] **Step 1: Update `components/app-shell/nav.tsx`**

```tsx
import Link from "next/link";
import { LayoutDashboard, Users, Trello, Briefcase, ShoppingCart, Repeat, LifeBuoy } from "lucide-react";
import { getEnabledModules } from "@/lib/modules";

// Map module navIcon strings → lucide components. Add new icons here
// as modules ship in Phase 1c.
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Trello,
  Briefcase,
  ShoppingCart,
  Repeat,
  LifeBuoy,
};

export function Nav() {
  const modules = getEnabledModules();

  return (
    <nav className="w-56 border-r min-h-screen p-4 space-y-1">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <LayoutDashboard size={18} /> Dashboard
      </Link>
      <Link href="/contacts" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <Users size={18} /> Contacts
      </Link>
      {modules.flatMap((m) =>
        m.routes.map((r) => {
          const Icon = iconMap[m.navIcon] ?? LayoutDashboard;
          return (
            <Link key={r.path} href={r.path} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
              <Icon size={18} /> {r.label}
            </Link>
          );
        })
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Update `app/(app)/dashboard/page.tsx` to render module widgets**

```tsx
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getEnabledModules } from "@/lib/modules";

export default async function DashboardPage() {
  const orgId = await requireOrg();
  const enabledModules = getEnabledModules();

  const contactCount = db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all().length;
  const interactionCount = db.select().from(interactions).where(eq(interactions.organizationId, orgId)).all().length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-semibold">{contactCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Interactions logged</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-semibold">{interactionCount}</p></CardContent>
        </Card>
        {enabledModules.map((m) => m.dashboardWidget && <m.dashboardWidget key={m.name} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Enable Pipeline in `horizons.config.ts`**

```ts
import type { HorizonsConfig } from "./lib/modules/types";  // (or wherever the type ended up)

const config = {
  business: {
    name: "Sample Business",
    timezone: "America/Indianapolis",
  },
  modules: {
    pipeline: true,    // changed from false
    jobs: false,
    orders: false,
    subscriptions: false,
    supportTickets: false,
  },
  integrations: {},
  storage: {
    driver: "better-sqlite3" as const,
    path: "./data/horizons.db",
  },
};

export default config;
```

(If the HorizonsConfig type was defined inline in Task 6 of Phase 1a rather than in `lib/modules/types`, leave the type def alone and just flip the boolean.)

- [ ] **Step 4: Boot test**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
timeout 25 npm run dev 2>&1 | tail -10
```

Expected: dev server starts cleanly. (You won't navigate the UI without real Clerk keys, but the build should succeed.)

- [ ] **Step 5: Final test sanity**

```bash
npm test 2>&1 | tail -5
```

Expected: 18/18 tests still passing (same as Task 4 — no new tests in 7).

- [ ] **Step 6: Commit**

```bash
git add components/app-shell/nav.tsx app/\(app\)/dashboard/page.tsx horizons.config.ts
git commit -m "feat(modules): wire registry into nav + dashboard

Sidebar nav reads enabled modules from registry, renders nav
entries dynamically. Dashboard renders each enabled module's
dashboardWidget. Pipeline enabled in horizons.config.ts —
sample instance now shows Pipeline in nav + a 'open value'
card on /dashboard.

Phase 1b complete: module system contract is real, Pipeline is
the working reference impl. Phases 1c-1g add Jobs/Orders/Subs/
Tickets, CLI, MCP server, Sheets, scaffolder.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Self-review notes (writing-plans checklist)

**Spec coverage:** Phase 1b implements spec Fork 2 (module-system architecture) and the Pipeline-module half of Fork 6 (v1 modules). The module contract — manifest with schema + routes + navIcon + dashboardWidget — is the reusable shape every Phase 1c module follows.

**Placeholder scan:** No TBDs. The "shim" pattern under `app/(app)/pipeline/` is concrete (single-line re-exports), and the Phase 1g scaffolder will eventually generate these automatically — that's noted, not deferred-as-placeholder.

**Type consistency:** `ModuleManifest`, `Deal`, `PipelineStage` types are consistent across registry, queries, components, and tests. Server-action input schemas use Zod; outputs are Drizzle-inferred.

**Task boundaries:** Tasks 1+2 commit together (registry depends on Pipeline module's existence to compile). Tasks 3-7 each commit independently with green tests.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-18-horizons-opencrm-phase-1b.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, two-stage review (spec compliance + code quality). Same pattern as all prior Roger + Horizons phases.

**2. Inline Execution** — Sequential in-session execution with checkpoints.

Recommendation: **1**.
