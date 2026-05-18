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
