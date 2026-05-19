import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";
import { campaigns } from "@/modules/campaigns/schema";

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
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
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
