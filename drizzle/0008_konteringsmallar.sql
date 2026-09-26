CREATE TABLE "konteringsalternativ" (
	"id" serial PRIMARY KEY NOT NULL,
	"mall_id" integer NOT NULL,
	"antal" integer DEFAULT 0 NOT NULL,
	"viktad_andel" numeric(7, 6),
	"senast_anvand" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "konteringsalternativ_rader" (
	"id" serial PRIMARY KEY NOT NULL,
	"alternativ_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"sida" text NOT NULL,
	"andel" numeric(9, 6) NOT NULL,
	CONSTRAINT "konteringsalternativ_rader_sida_check" CHECK ("konteringsalternativ_rader"."sida" IN ('samma', 'motsatt')),
	CONSTRAINT "konteringsalternativ_rader_andel_check" CHECK ("konteringsalternativ_rader"."andel" > 0)
);
--> statement-breakpoint
CREATE TABLE "konteringsmall_andringar" (
	"id" serial PRIMARY KEY NOT NULL,
	"mall_id" integer NOT NULL,
	"tidpunkt" timestamp DEFAULT now() NOT NULL,
	"av" text NOT NULL,
	"andring" text NOT NULL,
	"korning_id" integer,
	CONSTRAINT "konteringsmall_andringar_av_check" CHECK ("konteringsmall_andringar"."av" IN ('app', 'anvandare'))
);
--> statement-breakpoint
CREATE TABLE "konteringsmallar" (
	"id" serial PRIMARY KEY NOT NULL,
	"namn" text NOT NULL,
	"ursprung" text NOT NULL,
	"last" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'aktiv' NOT NULL,
	"nyckelord" text[],
	"ankar_account_id" integer,
	"belopp_min" numeric(15, 2),
	"belopp_max" numeric(15, 2),
	"dag_forankring" text,
	"dag" integer,
	"dag_fonster" integer,
	"riktning" text,
	"recurring_item_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "konteringsmallar_ursprung_check" CHECK ("konteringsmallar"."ursprung" IN ('anvandare', 'app')),
	CONSTRAINT "konteringsmallar_status_check" CHECK ("konteringsmallar"."status" IN ('aktiv', 'inaktiverad', 'borttagen')),
	CONSTRAINT "konteringsmallar_riktning_check" CHECK ("konteringsmallar"."riktning" IN ('in', 'ut')),
	CONSTRAINT "konteringsmallar_dag_check" CHECK (("konteringsmallar"."dag_forankring" IS NULL AND "konteringsmallar"."dag" IS NULL AND "konteringsmallar"."dag_fonster" IS NULL) OR ("konteringsmallar"."dag_forankring" IN ('borjan', 'slut') AND "konteringsmallar"."dag" BETWEEN 0 AND 31 AND "konteringsmallar"."dag_fonster" >= 0)),
	CONSTRAINT "konteringsmallar_belopp_check" CHECK ("konteringsmallar"."belopp_min" IS NULL OR "konteringsmallar"."belopp_max" IS NULL OR "konteringsmallar"."belopp_min" <= "konteringsmallar"."belopp_max")
);
--> statement-breakpoint
CREATE TABLE "mallanalys_korningar" (
	"id" serial PRIMARY KEY NOT NULL,
	"startad" timestamp DEFAULT now() NOT NULL,
	"avslutad" timestamp,
	"status" text DEFAULT 'pagar' NOT NULL,
	"historik_fran" date,
	"historik_till" date,
	"antal_verifikat" integer,
	"sammanfattning" text,
	"fel" text,
	CONSTRAINT "mallanalys_korningar_status_check" CHECK ("mallanalys_korningar"."status" IN ('pagar', 'klar', 'fel'))
);
--> statement-breakpoint
ALTER TABLE "konteringsalternativ" ADD CONSTRAINT "konteringsalternativ_mall_id_konteringsmallar_id_fk" FOREIGN KEY ("mall_id") REFERENCES "public"."konteringsmallar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konteringsalternativ_rader" ADD CONSTRAINT "konteringsalternativ_rader_alternativ_id_konteringsalternativ_id_fk" FOREIGN KEY ("alternativ_id") REFERENCES "public"."konteringsalternativ"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konteringsalternativ_rader" ADD CONSTRAINT "konteringsalternativ_rader_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konteringsmall_andringar" ADD CONSTRAINT "konteringsmall_andringar_mall_id_konteringsmallar_id_fk" FOREIGN KEY ("mall_id") REFERENCES "public"."konteringsmallar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konteringsmall_andringar" ADD CONSTRAINT "konteringsmall_andringar_korning_id_mallanalys_korningar_id_fk" FOREIGN KEY ("korning_id") REFERENCES "public"."mallanalys_korningar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konteringsmallar" ADD CONSTRAINT "konteringsmallar_ankar_account_id_accounts_id_fk" FOREIGN KEY ("ankar_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konteringsmallar" ADD CONSTRAINT "konteringsmallar_recurring_item_id_recurring_items_id_fk" FOREIGN KEY ("recurring_item_id") REFERENCES "public"."recurring_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_konteringsalternativ_mall_id" ON "konteringsalternativ" USING btree ("mall_id");--> statement-breakpoint
CREATE INDEX "idx_konteringsalternativ_rader_alternativ_id" ON "konteringsalternativ_rader" USING btree ("alternativ_id");--> statement-breakpoint
CREATE INDEX "idx_konteringsmall_andringar_mall_id" ON "konteringsmall_andringar" USING btree ("mall_id");--> statement-breakpoint
CREATE INDEX "idx_konteringsmallar_status" ON "konteringsmallar" USING btree ("status");--> statement-breakpoint
-- Befintliga bokföringsmallar raderas (ADR-0010: migreras inte).
DROP TABLE IF EXISTS "template_rows" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "booking_templates" CASCADE;
