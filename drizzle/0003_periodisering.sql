ALTER TABLE "accounts" ADD COLUMN "is_periodisering_default" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "periodisering_parent_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_periodisering_parent_id_transactions_id_fk" FOREIGN KEY ("periodisering_parent_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_periodisering_default_unique" ON "accounts" USING btree ("is_periodisering_default") WHERE "accounts"."is_periodisering_default" = 1;
