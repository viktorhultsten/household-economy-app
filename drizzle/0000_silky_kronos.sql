CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"namn" text NOT NULL,
	"group_id" integer NOT NULL,
	"exclude_from_budget" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"is_posted" integer DEFAULT 0 NOT NULL,
	"transaction_id" integer,
	"import_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"namn" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "booking_templates_namn_unique" UNIQUE("namn")
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "budgets_account_id_year_month_unique" UNIQUE("account_id","year","month"),
	CONSTRAINT "budgets_month_check" CHECK ("budgets"."month" >= 1 AND "budgets"."month" <= 12)
);
--> statement-breakpoint
CREATE TABLE "custom_result_view_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"view_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_result_view_accounts_view_id_account_id_unique" UNIQUE("view_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "custom_result_view_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"view_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_result_view_groups_view_id_group_id_unique" UNIQUE("view_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "custom_result_view_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"view_id" integer NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_result_view_types_view_id_account_type_unique" UNIQUE("view_id","account_type"),
	CONSTRAINT "custom_result_view_types_account_type_check" CHECK ("custom_result_view_types"."account_type" IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld'))
);
--> statement-breakpoint
CREATE TABLE "custom_result_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"namn" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"namn" text NOT NULL,
	"typ" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "groups_namn_unique" UNIQUE("namn"),
	CONSTRAINT "groups_typ_check" CHECK ("groups"."typ" IN ('Intäkt', 'Utgift', 'Tillgång', 'Skuld'))
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"imported_at" timestamp DEFAULT now(),
	"total_events" integer NOT NULL,
	"date_range_start" date NOT NULL,
	"date_range_end" date NOT NULL,
	"account_id" integer
);
--> statement-breakpoint
CREATE TABLE "period_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"locked_at" timestamp DEFAULT now(),
	"locked_by" text,
	CONSTRAINT "period_locks_year_month_unique" UNIQUE("year","month")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debet" numeric(15, 2) DEFAULT '0' NOT NULL,
	"kredit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "posts_debet_kredit_check" CHECK ((("posts"."debet" > 0 AND "posts"."kredit" = 0) OR ("posts"."kredit" > 0 AND "posts"."debet" = 0) OR ("posts"."debet" = 0 AND "posts"."kredit" = 0)))
);
--> statement-breakpoint
CREATE TABLE "recurring_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"namn" text NOT NULL,
	"expected_per_month" integer DEFAULT 1 NOT NULL,
	"active_months" integer[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::integer[] NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "recurring_items_namn_unique" UNIQUE("namn")
);
--> statement-breakpoint
CREATE TABLE "template_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"is_debet" boolean NOT NULL,
	"description" text,
	"row_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transaction_recurring_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"recurring_item_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transaction_recurring_items_transaction_id_recurring_item_id_unique" UNIQUE("transaction_id","recurring_item_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"bank_event_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_events" ADD CONSTRAINT "bank_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_events" ADD CONSTRAINT "bank_events_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_result_view_accounts" ADD CONSTRAINT "custom_result_view_accounts_view_id_custom_result_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."custom_result_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_result_view_accounts" ADD CONSTRAINT "custom_result_view_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_result_view_groups" ADD CONSTRAINT "custom_result_view_groups_view_id_custom_result_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."custom_result_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_result_view_groups" ADD CONSTRAINT "custom_result_view_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_result_view_types" ADD CONSTRAINT "custom_result_view_types_view_id_custom_result_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."custom_result_views"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_rows" ADD CONSTRAINT "template_rows_template_id_booking_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."booking_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_rows" ADD CONSTRAINT "template_rows_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_recurring_items" ADD CONSTRAINT "transaction_recurring_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_recurring_items" ADD CONSTRAINT "transaction_recurring_items_recurring_item_id_recurring_items_id_fk" FOREIGN KEY ("recurring_item_id") REFERENCES "public"."recurring_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_event_id_bank_events_id_fk" FOREIGN KEY ("bank_event_id") REFERENCES "public"."bank_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budgets_account_year" ON "budgets" USING btree ("account_id","year");--> statement-breakpoint
CREATE INDEX "idx_budgets_year_month" ON "budgets" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "idx_custom_view_accounts_view_id" ON "custom_result_view_accounts" USING btree ("view_id");--> statement-breakpoint
CREATE INDEX "idx_custom_view_groups_view_id" ON "custom_result_view_groups" USING btree ("view_id");--> statement-breakpoint
CREATE INDEX "idx_custom_view_types_view_id" ON "custom_result_view_types" USING btree ("view_id");