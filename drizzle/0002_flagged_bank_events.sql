ALTER TABLE "bank_events" ADD COLUMN "flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_events" ADD COLUMN "flag_comment" text;