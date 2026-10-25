CREATE TABLE "notebook_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"term" text NOT NULL,
	"term_key" text NOT NULL,
	"meaning_ko" text NOT NULL,
	"example" text NOT NULL,
	"interval_days" integer NOT NULL,
	"due_on" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_entries" ADD CONSTRAINT "notebook_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "notebook_entries_user_term_uidx" ON "notebook_entries" USING btree ("user_id","term_key");
--> statement-breakpoint
CREATE INDEX "notebook_entries_user_due_idx" ON "notebook_entries" USING btree ("user_id","due_on");
