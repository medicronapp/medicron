CREATE TYPE "public"."dose_outcome" AS ENUM('done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('medication', 'procedure');--> statement-breakpoint
CREATE TABLE "care_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"cat_id" text NOT NULL,
	"item_id" text NOT NULL,
	"dose" text,
	"interval_minutes" integer NOT NULL,
	"anchor_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"next_due_at" timestamp with time zone NOT NULL,
	"notified_for_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cats" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"birth_date" date,
	"weight_kg" numeric,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dose_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"care_plan_id" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"outcome" "dose_outcome" NOT NULL,
	"done_by_user_id" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	"value" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dose_logs_plan_slot_unique" UNIQUE("care_plan_id","scheduled_for")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "item_kind" NOT NULL,
	"default_dose" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_logs" ADD CONSTRAINT "dose_logs_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE no action ON UPDATE no action;