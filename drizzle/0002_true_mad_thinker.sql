CREATE TABLE "care_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"care_plan_id" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"outcome" "dose_outcome",
	"resolved_by_user_id" text,
	"resolved_at" timestamp with time zone,
	"value" text,
	"note" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_slots_plan_slot_unique" UNIQUE("care_plan_id","scheduled_for")
);
--> statement-breakpoint
ALTER TABLE "care_plans" ADD COLUMN "starts_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "care_plans" ADD COLUMN "slots_through" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "care_slots" ADD CONSTRAINT "care_slots_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_slots_org_scheduled_idx" ON "care_slots" USING btree ("organization_id","scheduled_for");--> statement-breakpoint
UPDATE "care_plans" SET "starts_at" = GREATEST("next_due_at", (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo');
