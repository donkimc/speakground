CREATE TABLE "item_feedback" (
	"user_id" text NOT NULL,
	"daily_set_id" text NOT NULL,
	"item_index" integer NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_feedback_user_id_daily_set_id_item_index_pk" PRIMARY KEY("user_id","daily_set_id","item_index")
);
--> statement-breakpoint
ALTER TABLE "item_feedback" ADD CONSTRAINT "item_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "item_feedback" ADD CONSTRAINT "item_feedback_daily_set_id_daily_sets_id_fk" FOREIGN KEY ("daily_set_id") REFERENCES "public"."daily_sets"("id") ON DELETE cascade ON UPDATE no action;
