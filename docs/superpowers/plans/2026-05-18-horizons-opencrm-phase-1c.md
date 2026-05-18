# Horizons OpenCRM — Phase 1c (Remaining 4 Modules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four remaining v1 modules — **Jobs**, **Orders**, **Subscriptions**, **Support Tickets** — each following the established module contract from Phase 1b. After 1c, all five v1 modules are real: Pipeline (sales), Jobs (service), Orders (e-commerce), Subscriptions (SaaS billing tracking), Support Tickets (universally applicable customer issues). Each instance enables only the modules its business needs.

**Architecture:** Each module follows the Pipeline template:
- `modules/<name>/schema.ts` — Drizzle tables, FK references to `contacts` with cascade-delete
- `modules/<name>/actions.ts` — Zod-validated server actions, Clerk-org-scoped via `requireOrg`
- `modules/<name>/queries.ts` — server-side helpers + a summary fn for the dashboard widget
- `modules/<name>/dashboard-widget.tsx` — Card that renders on `/dashboard` when enabled
- `modules/<name>/routes/page.tsx` + `new/page.tsx` + `[id]/page.tsx` — list / create / detail pages
- `modules/<name>/loaders.ts` — `"use server"` data-loaders for client components (per Phase 1b lesson)
- `modules/<name>/module.ts` — ModuleManifest registering the module
- `app/(app)/<name>/page.tsx` etc. — thin re-export shims (Phase 1g scaffolder will eventually generate)

**Tech Stack (no changes):** TypeScript 5.6+ / Next.js 15 App Router / React 19 / Drizzle ORM 0.36 / better-sqlite3 / shadcn/ui / Tailwind v3.4.17 / Clerk / vitest / Zod / nanoid.

**Spec reference:** `docs/superpowers/specs/2026-05-17-horizons-opencrm-design.md` Fork 6 (v1 modules) — completes the kitchen-sink module set Avery locked.

**Lessons folded in from Phase 1b verification:** No inline `"use server"` in client components (use `<module>/loaders.ts`). Tailwind v3 is the locked CSS layer (no v4 imports). `requireOrg` returns `user:<userId>` for solo users (already in place).

---

## Working directory

`/Users/averykeller/Desktop/projects/horizons-opencrm/` — repo at commit `0c1684c` on `main` branch, pushed to `https://github.com/averymkeller83-hub/horizons-opencrm`. Phase 1a + 1b verified end-to-end.

---

## Per-module entity scope (concise reference for implementer subagents)

### Jobs module — service businesses (Clawwork pet-sitting, freelance gigs)

Entity `jobs`:
- id, organizationId, contactId (FK cascade), title, status, scheduledAt, completedAt, priceCents, notes, createdAt, updatedAt
- Status enum: `requested | scheduled | in_progress | completed | invoiced | paid | cancelled`

### Orders module — e-commerce (Magic Puffs Etsy, Tree Truffles wholesale)

Two entities:
- `orders` — id, organizationId, contactId (FK cascade), status, totalCents, placedAt, fulfilledAt, notes
  - Status enum: `placed | paid | fulfilling | shipped | delivered | refunded`
- `order_items` — id, orderId (FK cascade), productName, quantity, unitPriceCents

### Subscriptions module — SaaS billing tracking (Roger SaaS)

Entity `subscriptions`:
- id, organizationId, contactId (FK cascade), planName, status, monthlyValueCents, startedAt, currentPeriodEnd, canceledAt, notes
- Status enum: `active | past_due | canceled | expired`

### Support Tickets module — universal customer issue tracking

Entity `support_tickets`:
- id, organizationId, contactId (FK cascade), subject, body, status, priority, slaDueAt, resolvedAt, createdAt
- Status enum: `new | in_progress | waiting_on_customer | resolved | closed`
- Priority enum: `low | medium | high | urgent`

---

## Task 1: Jobs module (schema + actions + queries + widget + routes)

**Files (Jobs):**
- Create: `modules/jobs/schema.ts`, `modules/jobs/actions.ts`, `modules/jobs/queries.ts`, `modules/jobs/dashboard-widget.tsx`, `modules/jobs/loaders.ts`, `modules/jobs/module.ts`
- Create: `modules/jobs/routes/page.tsx`, `modules/jobs/routes/new/page.tsx`, `modules/jobs/routes/[id]/page.tsx`
- Create: `app/(app)/jobs/page.tsx`, `app/(app)/jobs/new/page.tsx`, `app/(app)/jobs/[id]/page.tsx` (shims)
- Create: `tests/modules/jobs/schema.test.ts`, `tests/modules/jobs/actions.test.ts`

- [ ] **Step 1: Write failing schema test**

```ts
// tests/modules/jobs/schema.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import { jobs } from "@/modules/jobs/schema";

describe("jobs schema", () => {
  let db: ReturnType<typeof drizzle>;
  beforeEach(() => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a job referencing a contact", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Cindy" }).returning().get();
    db.insert(jobs).values({
      organizationId: "org_test",
      contactId: c.id,
      title: "Pet sit, May 25-30",
      status: "scheduled",
      scheduledAt: new Date("2026-05-25T08:00:00"),
      priceCents: 15000,
    }).run();
    const all = db.select().from(jobs).where(eq(jobs.contactId, c.id)).all();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("scheduled");
  });

  it("cascades: deleting contact deletes jobs", () => {
    const c = db.insert(contacts).values({ organizationId: "org_test", name: "Doomed" }).returning().get();
    db.insert(jobs).values({
      organizationId: "org_test",
      contactId: c.id,
      title: "x",
      status: "requested",
      priceCents: 0,
    }).run();
    db.delete(contacts).where(eq(contacts.id, c.id)).run();
    expect(db.select().from(jobs).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
npm test -- tests/modules/jobs/schema 2>&1 | tail -10
```

- [ ] **Step 3: Write `modules/jobs/schema.ts`**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status", { enum: ["requested", "scheduled", "in_progress", "completed", "invoiced", "paid", "cancelled"] }).notNull().default("requested"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  priceCents: integer("price_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
```

- [ ] **Step 4: Write actions + actions test**

```ts
// modules/jobs/actions.ts
"use server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "./schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1),
  status: z.enum(["requested", "scheduled", "in_progress", "completed", "invoiced", "paid", "cancelled"]).default("requested"),
  scheduledAt: z.date().optional(),
  priceCents: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ contactId: true });

export async function createJob(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db.insert(jobs).values({
    organizationId: orgId,
    contactId: parsed.contactId,
    title: parsed.title,
    status: parsed.status,
    scheduledAt: parsed.scheduledAt ?? null,
    priceCents: parsed.priceCents,
    notes: parsed.notes ?? null,
  }).returning().all();
  return row;
}

export async function updateJob(id: string, input: z.infer<typeof updateSchema>) {
  const orgId = await requireOrg();
  const parsed = updateSchema.parse(input);
  const [row] = db.update(jobs).set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId)))
    .returning().all();
  return row;
}

export async function markJobComplete(id: string) {
  return updateJob(id, { status: "completed" } as any);
}

export async function deleteJob(id: string) {
  const orgId = await requireOrg();
  db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).run();
}
```

Tests: 3 — create, update status, delete. Follow the Pipeline actions.test.ts pattern.

- [ ] **Step 5: Write queries + dashboard widget**

```ts
// modules/jobs/queries.ts
import { db } from "@/lib/db";
import { eq, and, ne } from "drizzle-orm";
import { jobs, type Job } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type JobsSummary = { openCount: number; upcomingCount: number; outstandingCents: number };

export async function getJobsSummary(): Promise<JobsSummary> {
  const orgId = await requireOrg();
  const all = db.select().from(jobs).where(eq(jobs.organizationId, orgId)).all();
  const open = all.filter((j) => j.status !== "completed" && j.status !== "cancelled" && j.status !== "paid");
  const upcoming = open.filter((j) => j.scheduledAt && j.scheduledAt > new Date());
  const outstanding = all.filter((j) => j.status === "invoiced").reduce((acc, j) => acc + j.priceCents, 0);
  return { openCount: open.length, upcomingCount: upcoming.length, outstandingCents: outstanding };
}

export async function listJobs(): Promise<Job[]> {
  const orgId = await requireOrg();
  return db.select().from(jobs).where(eq(jobs.organizationId, orgId)).all();
}
```

```tsx
// modules/jobs/dashboard-widget.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getJobsSummary } from "./queries";

export async function JobsDashboardWidget() {
  const s = await getJobsSummary();
  return (
    <Card>
      <CardHeader><CardTitle>Jobs</CardTitle></CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold">{s.openCount}</p>
        <p className="text-sm text-muted-foreground">{s.upcomingCount} upcoming</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Write loaders.ts + module manifest**

```ts
// modules/jobs/loaders.ts
"use server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireOrg } from "@/lib/clerk";

export async function getContactsForJob() {
  const orgId = await requireOrg();
  return db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all();
}
```

```ts
// modules/jobs/module.ts
import type { ModuleManifest } from "@/lib/modules/types";
import * as schema from "./schema";
import { JobsDashboardWidget } from "./dashboard-widget";

export const jobsModule: ModuleManifest = {
  name: "jobs",
  label: "Jobs",
  navIcon: "Briefcase",
  routes: [{ path: "/jobs", label: "Jobs" }],
  schema,
  dashboardWidget: JobsDashboardWidget,
};
```

- [ ] **Step 7: Write routes pages**

```tsx
// modules/jobs/routes/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listJobs } from "../queries";

export default async function JobsPage() {
  const all = await listJobs();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <Button asChild><Link href="/jobs/new">New job</Link></Button>
      </div>
      {all.length === 0 ? (
        <p className="text-muted-foreground">No jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">{j.title}</div>
                <div className="text-sm text-muted-foreground">
                  {j.status} {j.scheduledAt && `· ${j.scheduledAt.toLocaleDateString()}`} · ${(j.priceCents / 100).toFixed(2)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// modules/jobs/routes/new/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJob } from "../../actions";
import { getContactsForJob } from "../../loaders";

export default function NewJobPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { getContactsForJob().then(setContacts); }, []);
  if (!contacts) return <p>Loading…</p>;
  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      const j = await createJob({
        contactId: formData.get("contactId") as string,
        title: formData.get("title") as string,
        status: (formData.get("status") as any) || "requested",
        priceCents: Math.round(parseFloat(formData.get("price") as string || "0") * 100),
        notes: (formData.get("notes") as string) || undefined,
      });
      router.push(`/jobs/${j.id}`);
    } finally { setSubmitting(false); }
  }
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New job</h1>
      <form action={onSubmit} className="space-y-4">
        <div><Label htmlFor="title">Title *</Label><Input id="title" name="title" required /></div>
        <div>
          <Label htmlFor="contactId">Contact *</Label>
          <select id="contactId" name="contactId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue="requested" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div><Label htmlFor="price">Price (USD)</Label><Input id="price" name="price" type="number" step="0.01" /></div>
        <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
        <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create job"}</Button>
      </form>
    </div>
  );
}
```

```tsx
// modules/jobs/routes/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { jobs } from "../../schema";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();
  const j = db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.organizationId, orgId))).get();
  if (!j) notFound();
  const c = db.select().from(contacts).where(eq(contacts.id, j.contactId)).get();
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{j.title}</h1>
          <p className="text-muted-foreground">
            {j.status} · ${(j.priceCents / 100).toFixed(2)}
            {j.scheduledAt && ` · ${j.scheduledAt.toLocaleString()}`}
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/jobs">Back</Link></Button>
      </div>
      <Card>
        <CardHeader><h2 className="font-semibold">Contact</h2></CardHeader>
        <CardContent>{c ? <Link className="text-primary hover:underline" href={`/contacts/${c.id}`}>{c.name}</Link> : "—"}</CardContent>
      </Card>
      {j.notes && (
        <Card>
          <CardHeader><h2 className="font-semibold">Notes</h2></CardHeader>
          <CardContent><p className="whitespace-pre-wrap">{j.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
```

```tsx
// app/(app)/jobs/page.tsx
export { default } from "@/modules/jobs/routes/page";
```

```tsx
// app/(app)/jobs/new/page.tsx
export { default } from "@/modules/jobs/routes/new/page";
```

```tsx
// app/(app)/jobs/[id]/page.tsx
export { default } from "@/modules/jobs/routes/[id]/page";
```

- [ ] **Step 8: Generate migration + run all tests + commit**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
npx drizzle-kit generate
npm test
```

Expected: new migration `0002_*.sql` with `CREATE TABLE jobs`. 5 new tests pass (2 schema + 3 actions). Total 22/22.

Commit:

```bash
git add modules/jobs/ tests/modules/jobs/ 'app/(app)/jobs/' drizzle/migrations/0002_*.sql
git commit -m "feat(jobs): module shipped — schema, actions, queries, widget, routes

Jobs entity for service businesses (Clawwork, freelance). Status
enum covers full lifecycle (requested → scheduled → in_progress
→ completed → invoiced → paid + cancelled). Dashboard widget
shows open count + upcoming count.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 2: Orders module

Same structure as Task 1 (Jobs) but with TWO tables — `orders` + `order_items`. Order has a list of items; deleting an order cascades to its items.

**Files:** Same shape as Jobs — `modules/orders/{schema,actions,queries,dashboard-widget,loaders,module}.ts` + 3 route pages + 3 app shims + 2 test files.

Key differences vs Jobs:
1. `schema.ts` defines BOTH tables and a relations export. Order has totalCents auto-computed by the application on item changes (or read from DB on detail view).
2. `actions.ts` exposes `createOrder(contactId, items[])`, `updateOrderStatus(id, status)`, `addLineItem(orderId, {name, qty, unitPriceCents})`, `removeLineItem(itemId)`, `deleteOrder(id)`. createOrder transactionally inserts the order + initial items.
3. `queries.ts` returns `OrdersSummary { openCount, fulfilling, paidThisMonthCents }`.
4. Dashboard widget shows monthly paid value + open-count.

Full schema:

```ts
// modules/orders/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["placed", "paid", "fulfilling", "shipped", "delivered", "refunded"] }).notNull().default("placed"),
  totalCents: integer("total_cents").notNull().default(0),
  placedAt: integer("placed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  fulfilledAt: integer("fulfilled_at", { mode: "timestamp" }),
  notes: text("notes"),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
```

The rest (actions / queries / widget / routes / loaders / module / app shims) follow the Jobs pattern with adaptations for the items sub-entity. Implementer subagent: use the Jobs files as a reference template, swap in orders' fields, add line-items handling.

Module manifest navIcon: `"ShoppingCart"`.

Tests (3 schema + 3 actions): insert order with items, cascade delete, update status, add item, remove item, computeTotal-after-item-changes.

Migration: `0003_*.sql` with `CREATE TABLE orders` + `CREATE TABLE order_items`.

Commit: `feat(orders): module shipped — orders + order_items, status lifecycle`.

---

## Task 3: Subscriptions module

Same structure as Jobs. Single entity, billing-tracking shape.

```ts
// modules/subscriptions/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  planName: text("plan_name").notNull(),
  status: text("status", { enum: ["active", "past_due", "canceled", "expired"] }).notNull().default("active"),
  monthlyValueCents: integer("monthly_value_cents").notNull().default(0),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  canceledAt: integer("canceled_at", { mode: "timestamp" }),
  notes: text("notes"),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
```

Actions: `createSubscription`, `markPaymentReceived` (advances `currentPeriodEnd` by 30 days), `cancelSubscription`, `updateSubscription`, `deleteSubscription`.

Queries: `getSubscriptionsSummary()` → `{ activeCount, mrrCents, churnedThisMonth }`. `listSubscriptions()`.

Widget: shows MRR + active count.

Module manifest navIcon: `"Repeat"`.

Tests (2 schema + 3 actions): create + cancel + mark-paid-period-extended.

Migration: `0004_*.sql`.

Commit: `feat(subscriptions): module shipped — MRR tracking + lifecycle states`.

---

## Task 4: Support Tickets module

Same structure as Jobs.

```ts
// modules/support-tickets/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["new", "in_progress", "waiting_on_customer", "resolved", "closed"] }).notNull().default("new"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  slaDueAt: integer("sla_due_at", { mode: "timestamp" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
```

Actions: `createTicket`, `updateTicketStatus`, `setTicketPriority`, `resolveTicket` (sets resolvedAt + status=resolved), `deleteTicket`.

Queries: `getTicketsSummary()` → `{ openCount, urgentCount, overdueCount }`. `listOpenTickets()`.

Widget: shows open count + urgent count badge.

Module manifest navIcon: `"LifeBuoy"`.

Tests (2 schema + 3 actions).

Migration: `0005_*.sql`.

Commit: `feat(support-tickets): module shipped — priority + SLA tracking`.

---

## Task 5: Wire all 4 modules into the registry + flip flags + verify

**Files modified:**
- `lib/modules/registry.ts` — import + register jobs, orders, subscriptions, supportTickets
- `horizons.config.ts` — flip all 4 booleans to true for the dev instance
- (No nav.tsx change needed — already iterates dynamically from registry)

**Step 1: Update `lib/modules/registry.ts`**

```ts
import config from "@/horizons.config";
import type { ModuleManifest } from "./types";
import { pipelineModule } from "@/modules/pipeline/module";
import { jobsModule } from "@/modules/jobs/module";
import { ordersModule } from "@/modules/orders/module";
import { subscriptionsModule } from "@/modules/subscriptions/module";
import { supportTicketsModule } from "@/modules/support-tickets/module";

const allModules: Record<string, ModuleManifest> = {
  pipeline: pipelineModule,
  jobs: jobsModule,
  orders: ordersModule,
  subscriptions: subscriptionsModule,
  supportTickets: supportTicketsModule,
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

**Step 2: Update `horizons.config.ts`** — flip all 4 booleans:

```ts
modules: {
  pipeline: true,
  jobs: true,
  orders: true,
  subscriptions: true,
  supportTickets: true,
},
```

**Step 3: Boot test + full test suite**

```bash
cd /Users/averykeller/Desktop/projects/horizons-opencrm
pkill -f "next dev" 2>/dev/null
sleep 1
npm test 2>&1 | tail -5
# Expected: ~37 tests passing (17 from 1a+1b + ~20 new across 4 modules)
npm run dev > /tmp/horizons-1c-boot.log 2>&1 &
sleep 5
grep "Ready in" /tmp/horizons-1c-boot.log
```

Expected: "Ready in Xms", all tests green, dev server boots clean.

**Step 4: Commit + push**

```bash
git add lib/modules/registry.ts horizons.config.ts
git commit -m "feat(modules): wire all 4 Phase 1c modules into registry

Jobs + Orders + Subscriptions + Support Tickets all registered.
horizons.config.ts flips all 5 v1 modules to true so the sample
instance demonstrates the full kitchen-sink set.

Phase 1c complete — universal core + 5 modules all live. Phases
1d-1g add CLI surface, MCP server, Google Sheets, scaffolder.

Co-Authored-By: WOZCODE <contact@withwoz.com>"

git push origin main
```

---

## Self-review notes

**Spec coverage:** Phase 1c completes spec Fork 6 (v1 modules) — all 5 v1 modules shipped (Pipeline from 1b + 4 from 1c). Forks 2, 5 (module-system architecture, universal core) fully demonstrated across heterogeneous module types: Pipeline (kanban), Jobs (list/status), Orders (parent/child entities), Subscriptions (recurring), Support Tickets (priority+SLA).

**Placeholder scan:** Each module's actions/queries/widget/routes are spelled out with code. Tasks 2-4 reference Task 1 as the template — that's pattern-following, not deferral.

**Type consistency:** Each module's `<Entity>` and `New<Entity>` types are inferred from Drizzle. Server actions return `Promise<Entity>`. Status enums match across schema, actions, and route option lists.

**Tradeoffs flagged:**
- Tasks 2-4 reference Task 1 for the full route+test pattern rather than restating verbatim. Implementer subagents must read the Jobs files for context before writing the other modules. Acceptable per the writing-plans rule "don't repeat code unnecessarily" but adds a small read-step.

---

## Execution handoff

Plan complete. Five tasks total — Task 1 (Jobs) is the fullest reference; Tasks 2-4 (Orders, Subs, Tickets) follow the same pattern with module-specific spec deltas above; Task 5 wires everything into the registry + config.

**Recommended execution:** Subagent-driven, one implementer per module. Each subagent gets the Pipeline + Jobs files as reference (read first), then writes their module following the same structure with the entity-specific spec from the per-module sections above.
