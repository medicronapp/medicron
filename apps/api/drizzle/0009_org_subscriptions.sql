CREATE TABLE "org_subscriptions" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"plus_until" timestamp with time zone,
	"source" text,
	"product_id" text,
	"will_renew" boolean DEFAULT false NOT NULL,
	"last_event_ms" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_subscriptions" ADD CONSTRAINT "org_subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;