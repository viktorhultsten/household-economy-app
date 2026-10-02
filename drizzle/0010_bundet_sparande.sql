ALTER TABLE "accounts" ADD COLUMN "is_bundet_sparande" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "exclude_from_budget";