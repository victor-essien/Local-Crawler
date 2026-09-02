import {pgTable, uuid, text, jsonb, timestamp} from "drizzle-orm/pg-core";
import {vector} from "drizzle-orm/pg-core";

export const chunks = pgTable("chunks", {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    contentHash: text("content_hash").notNull().unique(),
    embedding: vector("embedding", {
        dimensions: 384,
    }).notNull(),
    createdAt: timestamp("created_at", {
        withTimezone: true,
    }).notNull().defaultNow(),
   
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    }).notNull().defaultNow(),
})