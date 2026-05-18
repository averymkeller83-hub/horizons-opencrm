# Horizons OpenCRM — Phase 1a (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the runnable foundation of Horizons OpenCRM — a Next.js App Router app with Tailwind + shadcn/ui, Clerk authentication, Drizzle ORM over SQLite, and the universal core data model (contacts + interactions) accessible via web UI. No modules yet — those land in Phase 1b+. After 1a ships, you can sign in, create contacts, log interactions, and view them, all backed by a real database in a real browser.

**Architecture:** TypeScript / Node.js / Next.js App Router project. `@clerk/nextjs` wraps the app for auth (each deployment gets its own Clerk project). Drizzle ORM with `better-sqlite3` driver provides type-safe access to a local SQLite file at `./data/horizons.db`. shadcn/ui components copied into `components/ui/` for primitives (Button, Card, Form, Table, Input). Tailwind v4 for styling. The `horizons.config.ts` file at the repo root declares business identity + module flags (no modules enabled yet in 1a). Universal entities (contacts + interactions) have their schemas defined in `lib/db/schema/` and are wired to the dashboard via Server Components + Server Actions.

**Tech Stack:**
- TypeScript 5.6+
- Next.js 15 (App Router) with React 19
- Tailwind CSS v4
- shadcn/ui (Radix UI primitives + Tailwind variants)
- `@clerk/nextjs` 6.x (auth + organizations)
- Drizzle ORM 0.36+ with `better-sqlite3` 11.x
- `nanoid` for IDs
- `zod` 3.x for validation
- `vitest` for tests (universal schema migration tests, server action tests)

**Spec reference:** `docs/superpowers/specs/2026-05-17-horizons-opencrm-design.md` — implements Forks 4 (TypeScript), 7 (Clerk), 8 (SQLite+Drizzle), 9 (Next.js), 15 (MIT), 17 (shadcn/ui). Defers Forks 2, 3, 5 (modules), 6 (v1 modules), 10 (Sheets), 11 (deploy), 13 (MCP), 16 (scaffolder) to later sub-phases.

---

## Working directory

`/Users/averykeller/Desktop/projects/horizons-opencrm/` — the repo scaffolding already exists at this path (created during spec authoring). Phase 1a populates it with actual code.

---

## File structure

### Created files (Phase 1a scope)

| Path | Responsibility |
|---|---|
| `package.json` | Project manifest with all v1a deps + scripts |
| `tsconfig.json` | TS config: strict, App Router-aligned paths |
| `next.config.mjs` | Next.js config (App Router, server components) |
| `tailwind.config.ts` | Tailwind v4 config |
| `postcss.config.mjs` | PostCSS for Tailwind |
| `app/globals.css` | Tailwind directives + shadcn theme variables |
| `app/layout.tsx` | Root layout with `<ClerkProvider>` |
| `app/page.tsx` | Landing page (redirects to /dashboard if signed in) |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in route |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk sign-up route |
| `app/(app)/dashboard/page.tsx` | Dashboard home — counts of contacts + interactions |
| `app/(app)/contacts/page.tsx` | List of contacts |
| `app/(app)/contacts/new/page.tsx` | New contact form |
| `app/(app)/contacts/[id]/page.tsx` | Contact detail + interactions list |
| `app/(app)/contacts/[id]/log-interaction/page.tsx` | Form to log an interaction |
| `app/(app)/layout.tsx` | Shared app shell with navigation |
| `app/api/webhooks/clerk/route.ts` | Clerk webhook handler (org events) |
| `middleware.ts` | Clerk middleware (gate /(app)/* on auth) |
| `lib/db/index.ts` | Drizzle client singleton |
| `lib/db/schema/contacts.ts` | Contacts table |
| `lib/db/schema/interactions.ts` | Interactions table |
| `lib/db/schema/index.ts` | Schema re-exports |
| `lib/actions/contacts.ts` | Server actions: create/update/delete contact |
| `lib/actions/interactions.ts` | Server actions: log interaction |
| `lib/clerk.ts` | Helpers: `getCurrentUserOrg()`, `requireOrg()` |
| `components/ui/button.tsx` | shadcn Button |
| `components/ui/card.tsx` | shadcn Card |
| `components/ui/input.tsx` | shadcn Input |
| `components/ui/form.tsx` | shadcn Form + react-hook-form integration |
| `components/ui/table.tsx` | shadcn Table |
| `components/ui/label.tsx` | shadcn Label |
| `components/ui/textarea.tsx` | shadcn Textarea |
| `components/ui/select.tsx` | shadcn Select |
| `components/app-shell/nav.tsx` | Sidebar nav |
| `components/app-shell/topbar.tsx` | Top bar with user menu |
| `horizons.config.ts` | Default config (no modules enabled in 1a) |
| `drizzle.config.ts` | Drizzle Kit config for migrations |
| `drizzle/migrations/` | Generated migration files (initial: 2 tables) |
| `data/.gitkeep` | Keep `data/` dir in git; actual `.db` file is gitignored |
| `.env.example` | Template for Clerk keys + DB path |
| `.gitignore` | node_modules, .env*, data/*.db, .next, etc. |
| `LICENSE` | MIT |
| `README.md` | Quickstart + Phase 1a verification steps |

### Test files

| Path | What it covers |
|---|---|
| `tests/db/schema.test.ts` | Migrations apply cleanly; tables have expected columns |
| `tests/actions/contacts.test.ts` | createContact, updateContact, deleteContact |
| `tests/actions/interactions.test.ts` | logInteraction |
| `vitest.config.ts` | Vitest setup with in-memory SQLite for fast tests |

---

## Task 1: Initialize Node project + dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `LICENSE`, `README.md`

- [ ] **Step 1: Initialize package.json**

Run inside `~/Desktop/projects/horizons-opencrm/`:

```bash
cd ~/Desktop/projects/horizons-opencrm
npm init -y
```

Then edit `package.json` to:

```json
{
  "name": "horizons-opencrm",
  "version": "0.0.1",
  "description": "Reusable, AI-agent-drivable open-source CRM. Multi-instance pattern.",
  "license": "MIT",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.0.0",
    "better-sqlite3": "^11.3.0",
    "drizzle-orm": "^0.36.0",
    "nanoid": "^5.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "drizzle-kit": "^0.28.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.next/
out/
build/
dist/

# env
.env
.env.local
.env*.local
!.env.example

# database
data/*.db
data/*.db-journal
data/*.db-wal
data/*.db-shm

# OS
.DS_Store

# logs
*.log
npm-debug.log*
```

- [ ] **Step 4: Create LICENSE (MIT)**

```
MIT License

Copyright (c) 2026 Avery Keller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Create README.md (minimal v1a stub)**

```markdown
# Horizons OpenCRM

Reusable, AI-agent-drivable, open-source CRM. Multi-instance pattern.

**Status:** Phase 1a — Foundation. Universal core (contacts + interactions) + auth + DB live in this build. Modules (Pipeline, Jobs, Orders, Subscriptions, Support Tickets), CLI, MCP server, and the scaffolder land in later phases.

## Quickstart (development)

```bash
git clone https://github.com/averymkeller83-hub/horizons-opencrm
cd horizons-opencrm
npm install
cp .env.example .env.local        # fill in Clerk keys
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## Stack

TypeScript / Next.js 15 App Router / Tailwind v4 / shadcn/ui / Drizzle + SQLite / Clerk auth.

## License

[MIT](./LICENSE)
```

- [ ] **Step 6: Install dependencies**

```bash
cd ~/Desktop/projects/horizons-opencrm
npm install
```

Expected: `node_modules/` populated, no peer-dep errors. If you see warnings about React 19 peer mismatches in `@hookform/resolvers` or similar, they're usually safe; document them but don't worry unless something fails to compile.

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/projects/horizons-opencrm
git init
git add package.json package-lock.json tsconfig.json .gitignore LICENSE README.md docs/
git commit -m "feat: initialize Horizons OpenCRM with Phase 1a deps

TypeScript + Next.js 15 App Router + Tailwind v4 + shadcn/ui +
Drizzle + better-sqlite3 + Clerk. Phase 1a is foundation only —
modules, CLI, MCP server, and scaffolder come in later phases.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 2: Tailwind + shadcn/ui base setup

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `lib/utils.ts`

- [ ] **Step 1: tailwind.config.ts**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: postcss.config.mjs**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 3: app/globals.css**

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

body {
  @apply bg-background text-foreground;
}
```

- [ ] **Step 4: lib/utils.ts (cn helper)**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: components/ui/button.tsx**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
```

- [ ] **Step 6: components/ui/card.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";
```

- [ ] **Step 7: components/ui/input.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

- [ ] **Step 8: components/ui/label.tsx + textarea.tsx**

```tsx
// components/ui/label.tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
));
Label.displayName = "Label";
```

```tsx
// components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
```

- [ ] **Step 9: Verify build (no errors yet — just compile check)**

```bash
cd ~/Desktop/projects/horizons-opencrm
npx tsc --noEmit
```

Expected: no errors. (Next.js itself isn't compiled yet because we have no app/ pages — that lands in Task 4.)

- [ ] **Step 10: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs app/globals.css lib/utils.ts components/ui/
git commit -m "feat(ui): tailwind v4 + shadcn primitives (button, card, input, label, textarea)

Foundation UI components copied into the repo (shadcn convention —
not a dep). Light/dark theme via CSS variables. cn() helper for
class merging.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 3: Drizzle ORM + universal core schemas (TDD)

**Files:**
- Create: `drizzle.config.ts`, `lib/db/index.ts`, `lib/db/schema/contacts.ts`, `lib/db/schema/interactions.ts`, `lib/db/schema/index.ts`, `tests/db/schema.test.ts`, `vitest.config.ts`, `data/.gitkeep`

- [ ] **Step 1: vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 2: Write the failing schema test**

```ts
// tests/db/schema.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { contacts, interactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("universal core schema", () => {
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    const sqlite = new Database(":memory:");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle/migrations" });
  });

  it("inserts a contact and reads it back", () => {
    db.insert(contacts).values({
      organizationId: "org_test",
      name: "Jane Doe",
      email: "jane@example.com",
    }).run();

    const result = db.select().from(contacts).where(eq(contacts.email, "jane@example.com")).all();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Jane Doe");
  });

  it("logs an interaction tied to a contact", () => {
    const inserted = db.insert(contacts).values({
      organizationId: "org_test",
      name: "John Smith",
    }).returning().get();

    db.insert(interactions).values({
      contactId: inserted.id,
      organizationId: "org_test",
      type: "call",
      summary: "Initial outreach",
      occurredAt: new Date(),
    }).run();

    const result = db.select().from(interactions).where(eq(interactions.contactId, inserted.id)).all();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("call");
  });

  it("cascades delete: deleting a contact removes its interactions", () => {
    const c = db.insert(contacts).values({
      organizationId: "org_test",
      name: "Cascade Test",
    }).returning().get();

    db.insert(interactions).values({
      contactId: c.id,
      organizationId: "org_test",
      type: "note",
      summary: "Test interaction",
      occurredAt: new Date(),
    }).run();

    db.delete(contacts).where(eq(contacts.id, c.id)).run();

    const remaining = db.select().from(interactions).where(eq(interactions.contactId, c.id)).all();
    expect(remaining).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run the failing test**

```bash
npm test
```

Expected: fails with "cannot find module @/lib/db/schema" or similar.

- [ ] **Step 4: Write lib/db/schema/contacts.ts**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
```

- [ ] **Step 5: Write lib/db/schema/interactions.ts**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "./contacts";

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

export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;
```

- [ ] **Step 6: Write lib/db/schema/index.ts**

```ts
export * from "./contacts";
export * from "./interactions";
```

- [ ] **Step 7: Write drizzle.config.ts**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/horizons.db",
  },
});
```

- [ ] **Step 8: Generate initial migrations**

```bash
mkdir -p drizzle/migrations data
touch data/.gitkeep
npx drizzle-kit generate
```

Expected: a `0000_*.sql` file appears in `drizzle/migrations/` with `CREATE TABLE contacts` + `CREATE TABLE interactions`.

- [ ] **Step 9: Write lib/db/index.ts**

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL ?? "./data/horizons.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
```

(Note: `foreign_keys = ON` is required for cascade delete to work — SQLite defaults it OFF.)

- [ ] **Step 10: Run tests**

```bash
npm test
```

Expected: 3/3 schema tests pass.

- [ ] **Step 11: Commit**

```bash
git add drizzle.config.ts drizzle/migrations lib/db/ tests/db/ vitest.config.ts data/.gitkeep
git commit -m "feat(db): universal core schema — contacts + interactions

Drizzle ORM over better-sqlite3 with nanoid IDs. Foreign keys
enabled (required for cascade delete). 3/3 schema tests cover
insert, select, and cascade-delete behavior. Initial migration
generated and committed.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 4: Next.js scaffolding + Clerk integration

**Files:**
- Create: `next.config.mjs`, `next-env.d.ts`, `middleware.ts`, `app/layout.tsx`, `app/page.tsx`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `lib/clerk.ts`, `.env.example`, `components/app-shell/nav.tsx`, `components/app-shell/topbar.tsx`

- [ ] **Step 1: next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
```

- [ ] **Step 2: next-env.d.ts**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 3: .env.example**

```
# Clerk auth — create a project at https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional — defaults to ./data/horizons.db
DATABASE_URL=./data/horizons.db
```

- [ ] **Step 4: middleware.ts (Clerk auth gate)**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 5: app/layout.tsx (root layout with ClerkProvider)**

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horizons OpenCRM",
  description: "Reusable, AI-agent-drivable open-source CRM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 6: app/page.tsx (landing)**

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold">Horizons OpenCRM</h1>
        <p className="text-muted-foreground">
          Reusable, AI-agent-drivable open-source CRM. One codebase, deployable per business.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: app/(auth)/sign-in + sign-up routes**

```tsx
// app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

```tsx
// app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 8: lib/clerk.ts (helpers)**

```ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireOrg(): Promise<string> {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  if (!orgId) throw new Error("No active organization — create one in Clerk dashboard");
  return orgId;
}

export async function getCurrentUserOrg(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}
```

- [ ] **Step 9: components/app-shell/nav.tsx + topbar.tsx**

```tsx
// components/app-shell/nav.tsx
import Link from "next/link";
import { LayoutDashboard, Users } from "lucide-react";

export function Nav() {
  return (
    <nav className="w-56 border-r min-h-screen p-4 space-y-1">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <LayoutDashboard size={18} /> Dashboard
      </Link>
      <Link href="/contacts" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary">
        <Users size={18} /> Contacts
      </Link>
    </nav>
  );
}
```

```tsx
// components/app-shell/topbar.tsx
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export function Topbar() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-6">
      <OrganizationSwitcher />
      <UserButton />
    </header>
  );
}
```

- [ ] **Step 10: app/(app)/layout.tsx**

```tsx
import { Nav } from "@/components/app-shell/nav";
import { Topbar } from "@/components/app-shell/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Nav />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: app/(app)/dashboard/page.tsx**

```tsx
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const orgId = await requireOrg();

  const contactCount = db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all().length;
  const interactionCount = db.select().from(interactions).where(eq(interactions.organizationId, orgId)).all().length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-semibold">{contactCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Interactions logged</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-semibold">{interactionCount}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Verify dev server boots**

```bash
cp .env.example .env.local
# (For now, leave Clerk keys as placeholder — boot test only)
npm run dev
```

Expected: server starts at localhost:3000, landing page renders. (You won't be able to sign in until you fill in real Clerk keys.)

Press Ctrl+C to stop.

- [ ] **Step 13: Commit**

```bash
git add next.config.mjs next-env.d.ts middleware.ts app/ components/app-shell/ lib/clerk.ts .env.example
git commit -m "feat(app): Next.js App Router scaffolding + Clerk auth

Root ClerkProvider, middleware-based route protection, sign-in/
sign-up pages using Clerk's prebuilt components. (app) route
group with sidebar nav + topbar shell. Dashboard page reads
contact + interaction counts for the current Clerk organization.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 5: Server actions + contact CRUD pages (TDD)

**Files:**
- Create: `lib/actions/contacts.ts`, `lib/actions/interactions.ts`, `tests/actions/contacts.test.ts`, `tests/actions/interactions.test.ts`, `app/(app)/contacts/page.tsx`, `app/(app)/contacts/new/page.tsx`, `app/(app)/contacts/[id]/page.tsx`, `app/(app)/contacts/[id]/log-interaction/page.tsx`, `components/ui/form.tsx`

- [ ] **Step 1: Write failing tests for server actions**

```ts
// tests/actions/contacts.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db", () => {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return { db };
});

vi.mock("@/lib/clerk", () => ({
  requireOrg: () => Promise.resolve("org_test"),
}));

import { createContact, updateContact, deleteContact } from "@/lib/actions/contacts";

describe("contact server actions", () => {
  it("creates a contact bound to the active org", async () => {
    const c = await createContact({ name: "Test User", email: "test@example.com" });
    expect(c.organizationId).toBe("org_test");
    expect(c.name).toBe("Test User");
  });

  it("updates a contact", async () => {
    const c = await createContact({ name: "Original" });
    const updated = await updateContact(c.id, { name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("deletes a contact", async () => {
    const c = await createContact({ name: "Doomed" });
    await deleteContact(c.id);
    const { db } = await import("@/lib/db");
    const remaining = db.select().from(contacts).where(eq(contacts.id, c.id)).all();
    expect(remaining).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
npm test -- tests/actions/contacts
```

Expected: cannot resolve `@/lib/actions/contacts`.

- [ ] **Step 3: Write lib/actions/contacts.ts**

```ts
"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireOrg } from "@/lib/clerk";

const createSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function createContact(input: z.infer<typeof createSchema>) {
  const orgId = await requireOrg();
  const parsed = createSchema.parse(input);
  const [row] = db.insert(contacts).values({
    organizationId: orgId,
    name: parsed.name,
    email: parsed.email || null,
    phone: parsed.phone || null,
    company: parsed.company || null,
    notes: parsed.notes || null,
  }).returning().all();
  return row;
}

export async function updateContact(id: string, input: z.infer<typeof updateSchema>) {
  const orgId = await requireOrg();
  const parsed = updateSchema.parse(input);
  const [row] = db
    .update(contacts)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
    .returning()
    .all();
  return row;
}

export async function deleteContact(id: string) {
  const orgId = await requireOrg();
  db.delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
    .run();
}
```

- [ ] **Step 4: Write lib/actions/interactions.ts + test**

```ts
// lib/actions/interactions.ts
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { interactions } from "@/lib/db/schema";
import { requireOrg } from "@/lib/clerk";

const schema = z.object({
  contactId: z.string(),
  type: z.enum(["call", "email", "message", "meeting", "note"]),
  direction: z.enum(["inbound", "outbound", "internal"]).optional(),
  summary: z.string().min(1, "Summary required"),
  occurredAt: z.date().optional(),
});

export async function logInteraction(input: z.infer<typeof schema>) {
  const orgId = await requireOrg();
  const parsed = schema.parse(input);
  const [row] = db.insert(interactions).values({
    contactId: parsed.contactId,
    organizationId: orgId,
    type: parsed.type,
    direction: parsed.direction ?? null,
    summary: parsed.summary,
    occurredAt: parsed.occurredAt ?? new Date(),
  }).returning().all();
  return row;
}
```

```ts
// tests/actions/interactions.test.ts
import { describe, it, expect, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

vi.mock("@/lib/db", () => {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  return { db };
});

vi.mock("@/lib/clerk", () => ({
  requireOrg: () => Promise.resolve("org_test"),
}));

import { createContact } from "@/lib/actions/contacts";
import { logInteraction } from "@/lib/actions/interactions";

describe("interaction server actions", () => {
  it("logs an interaction tied to a contact", async () => {
    const c = await createContact({ name: "Test" });
    const i = await logInteraction({
      contactId: c.id,
      type: "call",
      summary: "First call",
    });
    expect(i.contactId).toBe(c.id);
    expect(i.type).toBe("call");
  });
});
```

- [ ] **Step 5: Verify all tests pass**

```bash
npm test
```

Expected: 7 tests total (3 schema + 3 contacts + 1 interaction), all green.

- [ ] **Step 6: Build the contact list page**

```tsx
// app/(app)/contacts/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Button } from "@/components/ui/button";

export default async function ContactsPage() {
  const orgId = await requireOrg();
  const rows = db.select().from(contacts).where(eq(contacts.organizationId, orgId)).all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <Button asChild>
          <Link href="/contacts/new">New contact</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No contacts yet. Create your first one.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/contacts/${c.id}`} className="block p-4 border rounded-md hover:bg-secondary">
                <div className="font-semibold">{c.name}</div>
                {c.email && <div className="text-sm text-muted-foreground">{c.email}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Build the new contact form**

```tsx
// app/(app)/contacts/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContact } from "@/lib/actions/contacts";

export default function NewContactPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      const c = await createContact({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        company: formData.get("company") as string,
        notes: formData.get("notes") as string,
      });
      router.push(`/contacts/${c.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">New contact</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create contact"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Build the contact detail page (with interactions)**

```tsx
// app/(app)/contacts/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireOrg } from "@/lib/clerk";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrg();

  const contact = db.select().from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, orgId)))
    .get();
  if (!contact) notFound();

  const log = db.select().from(interactions)
    .where(eq(interactions.contactId, contact.id))
    .orderBy(desc(interactions.occurredAt))
    .all();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{contact.name}</h1>
          {contact.email && <p className="text-muted-foreground">{contact.email}</p>}
        </div>
        <Button asChild>
          <Link href={`/contacts/${contact.id}/log-interaction`}>Log interaction</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Interactions ({log.length})</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {log.length === 0 ? (
            <p className="text-muted-foreground">No interactions yet.</p>
          ) : (
            log.map((i) => (
              <div key={i.id} className="border-l-2 pl-3">
                <div className="text-sm font-semibold capitalize">{i.type} — {i.occurredAt.toLocaleString()}</div>
                <div className="text-sm">{i.summary}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 9: Build the log-interaction form**

```tsx
// app/(app)/contacts/[id]/log-interaction/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logInteraction } from "@/lib/actions/interactions";

export default function LogInteractionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await logInteraction({
        contactId: id,
        type: formData.get("type") as "call" | "email" | "message" | "meeting" | "note",
        summary: formData.get("summary") as string,
      });
      router.push(`/contacts/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">Log interaction</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="type">Type *</Label>
          <select id="type" name="type" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="message">Message</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
          </select>
        </div>
        <div>
          <Label htmlFor="summary">Summary *</Label>
          <Textarea id="summary" name="summary" required />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Logging…" : "Log interaction"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 10: Run full test suite**

```bash
npm test
```

Expected: 7 tests pass (same as Step 5).

- [ ] **Step 11: Commit**

```bash
git add lib/actions/ tests/actions/ app/(app)/contacts/
git commit -m "feat(contacts): server actions + CRUD pages

createContact / updateContact / deleteContact / logInteraction
server actions with Zod validation + Clerk org scoping. Contact
list, new-contact form, contact detail with interaction history,
and log-interaction form pages. 4/4 new tests pass, total 7/7.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Task 6: Clerk webhook handler + manual end-to-end verification

**Files:**
- Create: `app/api/webhooks/clerk/route.ts`, `horizons.config.ts`

- [ ] **Step 1: app/api/webhooks/clerk/route.ts**

This handles incoming Clerk events for org/user state changes. v1a just acks the events; later phases can sync to a local users/orgs table.

```ts
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("CLERK_WEBHOOK_SECRET not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);
  try {
    wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  // Phase 1a: just ack. Future phases sync user/org state to local DB.
  console.log("[clerk webhook]", body.slice(0, 200));
  return new Response("ok", { status: 200 });
}
```

You'll also need `npm install svix --save` (Clerk's standard webhook lib).

- [ ] **Step 2: horizons.config.ts (default — no modules in 1a)**

```ts
export type HorizonsConfig = {
  business: { name: string; timezone: string };
  modules: Record<string, boolean>;
  integrations: {
    googleSheets?: { enabled: boolean; syncDirection?: "import-export" | "bidirectional" };
  };
  storage: {
    driver: "better-sqlite3" | "d1";
    path?: string;
  };
};

const config: HorizonsConfig = {
  business: {
    name: "Sample Business",
    timezone: "America/Indianapolis",
  },
  modules: {
    pipeline: false,
    jobs: false,
    orders: false,
    subscriptions: false,
    supportTickets: false,
  },
  integrations: {},
  storage: {
    driver: "better-sqlite3",
    path: "./data/horizons.db",
  },
};

export default config;
```

- [ ] **Step 3: Manual end-to-end verification**

This step is hands-on. Sir does it personally.

1. Create a real Clerk project at https://dashboard.clerk.com (free tier).
2. Copy the publishable key + secret key into `.env.local`.
3. Run:
   ```bash
   npm run db:migrate
   npm run dev
   ```
4. Open http://localhost:3000 — landing page shows.
5. Click **Sign up** — Clerk's prebuilt form appears. Create an account.
6. After sign-in, redirect to /dashboard — should show contact count 0, interaction count 0.
7. Click **Contacts** in nav — empty list with "Create your first" prompt.
8. Click **New contact** — fill in name + email — submit.
9. Redirected to contact detail page. Click **Log interaction** — pick "Call" + write a summary — submit.
10. Back on contact detail — see the interaction listed.
11. Back to /dashboard — counts should now be 1 and 1.

If all 11 steps work, Phase 1a is verified.

- [ ] **Step 4: Commit final 1a state**

```bash
npm install svix
git add app/api/webhooks/ horizons.config.ts package.json package-lock.json
git commit -m "feat(webhooks): Clerk webhook receiver (ack-only for 1a)

Verifies svix signature, logs event payload. Future phases will
sync user + org state into the local DB. Also adds the default
horizons.config.ts with all modules disabled (1a is core-only).

Phase 1a complete: foundation runnable end-to-end. Sir can sign
up via Clerk, create contacts, log interactions, see them on
the dashboard.

Co-Authored-By: WOZCODE <contact@withwoz.com>"
```

---

## Self-review notes (writing-plans checklist)

**Spec coverage:** Phase 1a implements the foundation layer of the spec — Forks 4 (TS/Node), 7 (Clerk), 8 (SQLite+Drizzle), 9 (Next.js), 15 (MIT), 17 (shadcn/ui). Forks 2/3/5/6/10/11/13/16 (modules, CLI, MCP server, deploys, Sheets, scaffolder) defer to later phases. The universal core data model from spec section "1. Universal core data model" is fully implemented.

**Placeholder scan:** No TBDs. Every step has actual code or commands. The Clerk webhook handler intentionally just acks — that's a Phase 1a scope decision, not a placeholder.

**Type consistency:** `contacts` and `interactions` table definitions match the spec exactly. Server actions return inferred types from Drizzle's `$inferSelect`. The `horizons.config.ts` shape matches what the spec described (slightly trimmed for 1a since no modules are enabled).

**Task boundaries:** Each task ends with a build-green + tests-passing commit. No "land two tasks together" exceptions.

**Verification:** Task 6 Step 3's manual flow is the gate. If sir completes all 11 steps without hitting bugs, 1a ships. Otherwise we fix forward.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-horizons-opencrm-phase-1a.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task with two-stage review (spec compliance + code quality). Same pattern as Roger Phases 1, 2, 2.5, 3a.

**2. Inline Execution** — Execute tasks in this session sequentially with checkpoint reviews.

Recommendation: **1**. Proven workflow across all prior Roger phases; protects context window; produces a cleaner commit log.
