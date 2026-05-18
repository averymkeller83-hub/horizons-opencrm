# Horizons OpenCRM — Design Spec

**Date:** 2026-05-17
**Status:** Locked via 17-fork brainstorm. Ready for implementation planning.
**Owner:** Avery Keller (`averymkeller83-hub`)
**License:** MIT (locked Fork 15)
**Brand:** Horizons OpenCRM (locked Fork 14) — sits under the Horizons umbrella alongside Horizon Lead Gen.

---

## Goal

A reusable, multi-instance, AI-agent-drivable open-source CRM. Two simultaneous lenses every decision is tested against:

1. **Operational** — Avery can deploy a fresh instance per business (Roger SaaS, Clawwork pet-sitting, Magic Puffs / Tree Truffles, future freelance clients) in 60 seconds without rewriting code.
2. **Portfolio** — The public GitHub repo demonstrates fullstack TypeScript fluency, modern SaaS patterns, MCP-server-fluency, and shipped+deployed instances. Strong signal for Claude-Code-shop hiring panels.

---

## Architecture in one paragraph

Horizons OpenCRM is a TypeScript/Node.js application that combines a Next.js App Router web UI, a Node CLI (using Citty), and an MCP server — all three surfaces backed by the same Drizzle-typed data layer over SQLite (or D1 for Cloudflare deployments). Per-business deployment is scaffolded by `npx create-horizons-opencrm <business-name>`, which generates a config-isolated runnable instance targeting either Cloudflare Pages + D1 (free) or Fly.io + persistent volume (paid). Auth is outsourced to Clerk, with each business getting its own Clerk project for isolated user pools. The core data model — Contacts + Interactions — is universal; five v1 modules (Pipeline, Jobs, Orders, Subscriptions, Support Tickets) are opt-in per instance. A Google Sheets import/export module establishes Google API client plumbing that future modules (Calendar, Gmail, Drive, bidirectional Sheets sync) will reuse. The MCP server exposes typed tools (`create_contact`, `log_interaction`, `move_deal_stage`, etc.) consumable by Roger's brain, Claude Desktop, Cursor, Cline, or any other MCP-aware client — making the CRM "AI-agent-drivable" as a first-class feature rather than an afterthought.

---

## Locked decisions (17 forks)

| # | Decision | Choice |
|---|---|---|
| 1 | Form factor | Internal multi-instance pattern (Avery owns infrastructure) |
| 2 | Reusability mechanism | Hybrid: single-binary multi-config primary + on-demand fork-for-client generator |
| 3 | Deployment surfaces | CLI + web hybrid in v1 |
| 4 | Tech stack | TypeScript / Node.js end-to-end |
| 5 | Entity model | Universal core (contacts + interactions) + opt-in modules |
| 6 | v1 modules | Pipeline + Jobs + Orders + Subscriptions + Support Tickets |
| 7 | Auth | Clerk (organizations feature for team-per-instance) |
| 8 | Database | SQLite per instance + Drizzle ORM (D1 driver for Cloudflare deploys) |
| 9 | Web framework | Next.js App Router |
| 10 | Sheets integration | Import/export module (one-directional, v1) |
| 11 | Hosting | Dual-target: Cloudflare Pages + D1 (free) / Fly.io + SQLite (paid) |
| 12 | Repo visibility | Public from day 1 |
| 13 | Brain integration | MCP server in v1 (alongside web + CLI surfaces) |
| 14 | Name | Horizons OpenCRM |
| 15 | License | MIT |
| 16 | Init flow | `npx create-horizons-opencrm <business-name>` interactive scaffolder |
| 17 | UI component library | shadcn/ui + Tailwind CSS |

---

## Components

### 1. Universal core data model

Two entities every instance gets, regardless of which modules are enabled:

```ts
// drizzle/schema/contacts.ts
export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),  // Clerk org ID
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// drizzle/schema/interactions.ts
export const interactions = sqliteTable("interactions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  type: text("type", { enum: ["call", "email", "message", "meeting", "note"] }).notNull(),
  direction: text("direction", { enum: ["inbound", "outbound", "internal"] }),
  summary: text("summary").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

Every interaction belongs to a contact. Every contact and interaction belongs to an organization (matches Clerk org). Module-specific entities reference contacts via foreign key.

### 2. Module system

Each v1 module is a self-contained directory at `modules/<name>/` with this contract:

```
modules/pipeline/
├── schema.ts        # Drizzle table definitions for the module
├── routes.ts        # Next.js App Router pages + API routes
├── cli.ts           # Citty subcommand for this module
├── mcp.ts           # MCP tool definitions for this module
├── ui/              # shadcn/ui-styled React components
└── module.json      # { name, version, enabledBy, dependsOn }
```

Modules are **declared in `horizons.config.ts`** at the repo root:

```ts
// horizons.config.ts
export default {
  business: {
    name: "Clawwork",
    timezone: "America/Indianapolis",
  },
  modules: {
    pipeline: false,
    jobs: true,         // Clawwork uses jobs for pet-sit bookings
    orders: false,
    subscriptions: false,
    supportTickets: true,
  },
  integrations: {
    googleSheets: { enabled: true, syncDirection: "import-export" },
  },
  storage: {
    driver: "better-sqlite3",   // or "d1" for Cloudflare deploys
    path: "./data/horizons.db",
  },
};
```

At build time, Next.js + the CLI compile only the routes/commands/tools belonging to enabled modules. Disabled modules are tree-shaken — their UI doesn't show up in navigation, their CLI commands don't register, their MCP tools aren't exposed.

### 3. v1 modules — detailed scope

#### `modules/pipeline/` — Deal stages for sales-driven businesses
- Entity: `deals` (id, contactId, title, valueCents, stage, probability, expectedCloseAt, ownerId)
- Stages: `lead → qualified → proposal → negotiation → won/lost` (configurable per instance)
- UI: Kanban board (drag deals across columns) + list view
- CLI: `horizons deals add`, `horizons deals move <id> <stage>`, `horizons deals list --stage=qualified`
- MCP tools: `create_deal`, `move_deal_stage`, `list_deals`, `update_deal`, `close_deal_won_lost`
- Roger SaaS uses this for tracking signups + churn.

#### `modules/jobs/` — Service engagements for field-service businesses
- Entity: `jobs` (id, contactId, title, status, scheduledAt, completedAt, priceCents, notes)
- Statuses: `requested → scheduled → in_progress → completed → invoiced → paid` (configurable)
- UI: Calendar view + list view
- CLI: `horizons jobs add`, `horizons jobs schedule <id> <when>`, `horizons jobs complete <id>`
- MCP tools: `create_job`, `schedule_job`, `mark_job_complete`, `list_jobs`, `assign_job`
- Clawwork uses this for pet-sit bookings.

#### `modules/orders/` — Product orders for e-commerce
- Entity: `orders` (id, contactId, status, totalCents, fulfilledAt, items[])
- Item subentity: order line-items with product references
- Statuses: `placed → paid → fulfilling → shipped → delivered → returned/refunded`
- UI: Order list + per-order detail page
- CLI: `horizons orders add`, `horizons orders fulfill <id>`
- MCP tools: `create_order`, `update_order_status`, `list_orders`, `attach_line_items`
- Magic Puffs / Tree Truffles use this for Etsy order tracking.

#### `modules/subscriptions/` — Recurring billing for SaaS
- Entity: `subscriptions` (id, contactId, planId, status, currentPeriodEnd, monthlyValueCents, startedAt, canceledAt)
- Statuses: `active → past_due → canceled → expired`
- UI: Subscription list + MRR/churn dashboard widget
- CLI: `horizons subs list --status=active`, `horizons subs cancel <id>`
- MCP tools: `create_subscription`, `cancel_subscription`, `mark_payment_received`, `list_active_subscriptions`, `compute_mrr`
- Roger SaaS uses this for customer subscription tracking.

#### `modules/support-tickets/` — Issue tracking
- Entity: `tickets` (id, contactId, subject, body, status, priority, assigneeId, slaDueAt, resolvedAt)
- Statuses: `new → in_progress → waiting_on_customer → resolved → closed`
- Priorities: `low / medium / high / urgent`
- UI: Ticket queue + per-ticket conversation thread
- CLI: `horizons tickets create`, `horizons tickets assign <id> <user>`, `horizons tickets resolve <id>`
- MCP tools: `create_ticket`, `assign_ticket`, `update_ticket_status`, `add_ticket_reply`, `list_open_tickets`
- Universally applicable across all business types.

### 4. Surfaces

#### Web (Next.js App Router)
- Pages: `/dashboard`, `/contacts`, `/contacts/[id]`, `/<module-slug>/...` for each enabled module
- Auth: Clerk middleware gates everything except `/sign-in`, `/sign-up`, `/api/webhooks/clerk`
- Server Components for data fetching, Client Components for interactive UI
- shadcn/ui + Tailwind for styling
- Webhook endpoints at `/api/webhooks/{clerk,stripe,square,google-sheets}` for inbound events

#### CLI (Citty)
- Entry: `horizons` binary published via npm
- Top-level commands: `contacts`, `interactions`, plus one per enabled module
- Universal commands: `horizons init`, `horizons migrate`, `horizons backup`, `horizons export-sheet`
- Output format: human-readable by default, `--json` flag for machine-parsing (Claude Code uses this)

#### MCP Server (`@modelcontextprotocol/sdk`)
- Entry: `horizons-mcp` binary, runs as stdio MCP server
- Tools auto-registered from each enabled module's `mcp.ts` file
- Tool naming convention: `<verb>_<noun>` (e.g. `create_contact`, `move_deal_stage`, `mark_job_complete`)
- Tool descriptions include example usage in the schema so Claude understands intent
- Resources: `horizons://contacts`, `horizons://contacts/{id}`, `horizons://modules` for read-only browsing
- Prompts: pre-built prompt templates for common AI workflows (e.g., "summarize this week's interactions for sir")

### 5. Init flow — `npx create-horizons-opencrm`

```
$ npx create-horizons-opencrm clawwork-crm
✔ Business name? Clawwork
✔ Timezone? America/Indianapolis
✔ Which modules to enable? jobs, support-tickets
✔ Clerk publishable key? (visit dashboard.clerk.com to create one)
✔ Clerk secret key?
✔ Deploy target? Cloudflare Pages + D1 (free)
✔ Enable Google Sheets integration? Yes (configure OAuth later)

Creating clawwork-crm/ ...
  ✓ Generated horizons.config.ts
  ✓ Generated .env.local with Clerk keys
  ✓ Generated wrangler.toml for Cloudflare deployment
  ✓ Generated package.json with scoped dependencies (only enabled modules)
  ✓ Installed dependencies
  ✓ Ran migrations (1 universal table + 2 module tables created)
  ✓ Created README with deploy instructions

Done in 47s. Next steps:
  cd clawwork-crm
  npm run dev              # local dev at http://localhost:3000
  npm run deploy:cf        # deploy to Cloudflare Pages
  npm run mcp              # start MCP server for Claude Code
```

Implementation: the `create-horizons-opencrm` package is a separate published npm package that wraps `prompts` for interactive Q&A + `@horizons/template` (the actual repo skeleton stored as files in the package).

### 6. Fork-for-client generator

For clients who want full code ownership rather than a deployed instance, `horizons fork-for-client <client-name>` produces a standalone forked repo with:
- All the source code (modules they enabled)
- Pre-configured `horizons.config.ts` for their business
- Stripped Horizons branding (replaced with client's brand)
- Their own LICENSE file (MIT, attribution preserved)
- A `MAINTENANCE.md` explaining how to pull future Horizons OpenCRM updates back in

---

## File layout

```
horizons-opencrm/                            # public GitHub repo
├── README.md                                # quickstart + deployed-instances showcase
├── LICENSE                                  # MIT
├── horizons.config.ts                       # default config (sample business)
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── drizzle.config.ts
├── wrangler.toml                            # Cloudflare Pages deploy config
├── fly.toml                                 # Fly.io deploy config
├── Dockerfile                               # universal Docker target
├── app/                                     # Next.js App Router
│   ├── (auth)/sign-in/page.tsx
│   ├── (auth)/sign-up/page.tsx
│   ├── (app)/dashboard/page.tsx
│   ├── (app)/contacts/page.tsx
│   ├── (app)/contacts/[id]/page.tsx
│   ├── (app)/[module]/...                   # module-scoped routes auto-registered
│   ├── api/webhooks/clerk/route.ts
│   └── layout.tsx                           # <ClerkProvider> + Tailwind
├── components/ui/                           # shadcn/ui primitives (button, card, table, etc.)
├── lib/
│   ├── db/                                  # Drizzle setup + driver abstraction
│   │   ├── index.ts
│   │   ├── better-sqlite3-driver.ts
│   │   ├── d1-driver.ts
│   │   └── schema/                          # core schemas
│   │       ├── contacts.ts
│   │       └── interactions.ts
│   ├── modules/                             # module loader + registry
│   ├── clerk.ts                             # Clerk helpers
│   └── google/                              # Google API client + OAuth
├── modules/                                 # opt-in modules
│   ├── pipeline/
│   ├── jobs/
│   ├── orders/
│   ├── subscriptions/
│   └── support-tickets/
├── cli/
│   ├── index.ts                             # Citty entry
│   ├── commands/                            # universal commands (init, migrate, backup, etc.)
│   └── module-commands.ts                   # dynamic loader
├── mcp/
│   ├── server.ts                            # @modelcontextprotocol/sdk entry
│   ├── tools.ts                             # universal tools (contacts, interactions)
│   └── module-tools.ts                      # dynamic loader
├── packages/
│   └── create-horizons-opencrm/             # the npm scaffolder package
│       ├── package.json
│       ├── bin.ts
│       ├── prompts.ts
│       └── template/                        # files to copy into new instances
└── docs/superpowers/
    ├── specs/2026-05-17-horizons-opencrm-design.md  # this file
    └── plans/                                       # implementation plans to come
```

---

## Hosting paths

### Free path — Cloudflare Pages + D1

Per-business deploy:
1. Create a new Cloudflare Pages project (free, unlimited)
2. Create a new D1 database (free: 100K reads/day, 5M writes/month)
3. Configure `wrangler.toml` with the D1 binding
4. `wrangler pages deploy` ships the Next.js build to Cloudflare's edge
5. Drizzle uses the `d1` driver via `lib/db/d1-driver.ts`

Constraints:
- Some Next.js APIs unavailable on Cloudflare's Workers runtime (long-running background tasks, fs writes, native Node modules)
- Server Components work; some server actions need adjustment
- Cron triggers via Cloudflare Workers Cron (not setInterval)

### Paid path — Fly.io + better-sqlite3

Per-business deploy:
1. `fly launch --copy-config --name <business>-crm`
2. `fly volume create horizons-data --size 1` (1GB persistent volume, ~$0.15/mo)
3. Mount volume at `/data` in the container, SQLite file at `/data/horizons.db`
4. `fly deploy` ships the Next.js production build
5. Drizzle uses the `better-sqlite3` driver via `lib/db/better-sqlite3-driver.ts`

Pros over free path:
- Full Node.js API access (background workers, native modules, fs operations)
- Easier debugging (SSH into the VM)
- ~$3-5/mo per business

### Docker (universal)

`docker build -t horizons-opencrm .` produces an image that runs anywhere Docker runs: Render, Railway, AWS ECS, client's VPS, home server with Cloudflare Tunnel. Drizzle uses `better-sqlite3`; SQLite file mounted from host.

---

## Auth model — Clerk

- Each business deployment gets its own Clerk project (free up to 10K MAUs per project)
- Clerk's **organizations** feature provides team-per-instance: admin + member roles, invite-by-email, member-management UI for free
- Clerk webhooks notify the CRM of user/org events (signup, role changes, invitations) — CRM writes to its own `users` and `org_members` tables to keep authoritative state local
- Sign-in flow uses Clerk's prebuilt `<SignIn />` + `<SignUp />` components inside Next.js routes
- Server-side auth checks via `auth()` from `@clerk/nextjs/server` in every protected page/API route

---

## Module enable/disable mechanics

`horizons.config.ts` declares which modules are on. At three levels, the codebase reads this config:

1. **Next.js compile time** — `next.config.mjs` reads the config and dynamically generates `app/` route folders for enabled modules. Disabled modules' routes are not bundled.
2. **CLI registration** — `cli/index.ts` imports config, registers Citty subcommands only for enabled modules.
3. **MCP tool registration** — `mcp/server.ts` imports config, registers MCP tools only for enabled modules.

This guarantees that an instance running with `jobs: true, pipeline: false` doesn't expose `/pipeline` URLs, doesn't have `horizons deals` CLI commands, and doesn't expose `move_deal_stage` MCP tools. Clean isolation.

Toggling a module on later: edit `horizons.config.ts`, run `horizons migrate` (creates module's tables), redeploy. No code changes.

---

## MCP tool catalog (v1)

Universal tools (always available):
- `create_contact(name, email?, phone?, company?, notes?, tags?[])`
- `update_contact(id, fields)`
- `find_contacts(query)`
- `log_interaction(contactId, type, summary, occurredAt?)`
- `list_recent_interactions(contactId?, limit?)`
- `add_tag(contactId, tag)`
- `remove_tag(contactId, tag)`

Per-module tools (available if module enabled): see "v1 modules — detailed scope" above for each module's tool list.

MCP server registration order: universal tools first, then iterate enabled modules in `horizons.config.ts` order. Tool descriptions include example invocations so Claude can pattern-match intent without guessing parameter shapes.

---

## Google Sheets integration (v1)

One-directional import + export. Setup flow:
1. Business owner clicks "Connect Google Sheets" in `/settings/integrations`
2. OAuth consent → access + refresh tokens stored encrypted in DB
3. **Import**: paste a Google Sheets URL + column mapping (UI helps with column → CRM field) → bulk-create contacts
4. **Export**: pick an entity type (contacts, deals, jobs, orders, tickets) + a destination Sheet → CRM writes current data to that Sheet

Phase 2 expands this to bidirectional sync (CRM ↔ Sheet, conflict resolution via last-write-wins or per-row timestamps).

---

## Out of scope for v1 (deferred phases)

- Bidirectional Google Sheets sync (Phase 2)
- Google Calendar module (book a job → calendar event) — needs Phase 2 OAuth+API expansion
- Gmail integration (log interaction from inbox) — Phase 2
- Postgres deployment target — Phase 2 when a client requests it
- Mobile app (web works fine in mobile browsers for v1)
- Email sending (SendGrid / Resend integration) — Phase 2 module
- Stripe / Square billing integration — Phase 2 (Subscriptions module covers tracking; auto-billing is later)
- Custom field engine (Airtable-style) — would require rearchitecting; defer indefinitely
- Multi-currency — v1 assumes USD; i18n later
- AI summarization features (auto-summarize a contact's interaction history) — natural Phase 2 once MCP server is in production
- Audit log (who changed what when) — Phase 2 polish

---

## Risks and coordination flags

1. **Cloudflare Pages + Next.js App Router compatibility.** Some Next.js features rely on the Node runtime. `@cloudflare/next-on-pages` works but has known gaps. Build a smoke test early in Phase 1 of implementation to verify the locked module set works on CF — if a module's feature requires Node-only APIs, document the workaround OR mark that module as Fly-only.
2. **Drizzle dual-driver path.** Same schema definitions, two driver modules (`better-sqlite3` + `d1`). Drizzle supports this officially but the test surface is real — every migration must be verified on both drivers. CI must run migrations against an in-memory SQLite AND a wrangler-emulated D1.
3. **Clerk organization-per-instance economics.** Free tier is 10K MAUs *per project*, not aggregate. For most Avery businesses, well within free. For a future client with 50K end-users, they'd pay Clerk directly — document this in the README.
4. **MCP tool quality is the portfolio differentiator.** Generic CRUD tools are forgettable. Phase 2+ should add semantic tools like `summarize_recent_activity_for(contactId)`, `suggest_next_followups()`, `compute_pipeline_velocity()` — these are what hiring panels will screenshot.
5. **Open-source attention strategy.** Public repo from day 1 means EARLY commits look rough. Pre-write a strong README with screenshots + "what makes this different" section before opening to public traffic. Plan a Show HN post once v1 ships AND there are 2+ real deployed instances.

---

## Verification plan (post-implementation)

Manual smoke test for v1:
1. `npx create-horizons-opencrm test-business` — completes in under 60s, generates a runnable instance
2. Local dev: `npm run dev` boots Next.js at localhost:3000, Clerk sign-in works
3. Create a contact via the web UI — appears in Drizzle DB
4. Create a contact via the CLI — same record retrievable from web
5. Start MCP server: `npm run mcp` — Claude Code connects, invokes `create_contact` tool, contact appears
6. Move a deal through pipeline stages via UI, CLI, AND MCP — all surfaces stay in sync
7. Import 50 contacts from a Google Sheet — all 50 appear in the CRM
8. Export current contacts to a new Sheet — sheet matches CRM exactly
9. Deploy to Cloudflare Pages + D1 — production URL works, sign-in via Clerk works
10. Deploy a SECOND business instance to Cloudflare — fully isolated from the first

---

## Next step

Hand off to `superpowers:writing-plans` to produce the v1 implementation plan as `docs/superpowers/plans/2026-05-17-horizons-opencrm-v1.md`. Given v1 scope (universal core + 5 modules + 3 surfaces + 2 deploy targets + Sheets integration + scaffolder), the plan will likely split into phases:
- **Phase 1a**: Foundation (Next.js + Drizzle + Clerk + universal core)
- **Phase 1b**: Module system + Pipeline module
- **Phase 1c**: Remaining 4 modules (Jobs, Orders, Subscriptions, Support Tickets)
- **Phase 1d**: CLI surface (Citty)
- **Phase 1e**: MCP server surface
- **Phase 1f**: Google Sheets module
- **Phase 1g**: `create-horizons-opencrm` scaffolder + dual-host deploy verification

Each sub-phase produces an independently-verifiable working state, matching the Roger Phase 3a pattern.
