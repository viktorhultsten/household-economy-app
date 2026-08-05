CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
