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
