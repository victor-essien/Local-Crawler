ALTER TABLE "chunks" ADD COLUMN "content_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_content_hash_unique" UNIQUE("content_hash");