CREATE TABLE "daily_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"topic" text NOT NULL,
	"practice_date" text NOT NULL,
	"items" jsonb NOT NULL,
	"writing" jsonb NOT NULL,
	"prompt_id" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_sets_level_date_uidx" ON "daily_sets" USING btree ("level","practice_date");
--> statement-breakpoint
CREATE TABLE "practice_responses" (
	"user_id" text NOT NULL,
	"daily_set_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"writing" text,
	"writing_feedback" jsonb,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_responses_user_id_daily_set_id_pk" PRIMARY KEY("user_id","daily_set_id")
);
--> statement-breakpoint
ALTER TABLE "practice_responses" ADD CONSTRAINT "practice_responses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "practice_responses" ADD CONSTRAINT "practice_responses_daily_set_id_daily_sets_id_fk" FOREIGN KEY ("daily_set_id") REFERENCES "public"."daily_sets"("id") ON DELETE cascade ON UPDATE no action;
