ALTER TABLE "transactions" ADD COLUMN "periodisering_kind" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_periodisering_kind_check" CHECK ("transactions"."periodisering_kind" IN ('forskjutning', 'periodisering'));--> statement-breakpoint
-- Backfill: every existing periodisering was a periodförskjutning (whole amount → one period).
UPDATE "transactions" SET "periodisering_kind" = 'forskjutning'
WHERE "id" IN (SELECT DISTINCT "periodisering_parent_id" FROM "transactions" WHERE "periodisering_parent_id" IS NOT NULL);