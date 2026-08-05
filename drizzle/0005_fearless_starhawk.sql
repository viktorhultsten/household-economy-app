ALTER TABLE "bank_events" ADD COLUMN "is_irrelevant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "imports" ADD COLUMN "is_external" boolean DEFAULT false NOT NULL;