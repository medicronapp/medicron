ALTER TABLE "user_onboarding" ADD COLUMN "welcome_offer_seen_at" timestamp with time zone;
--> statement-breakpoint
-- Quem já tinha conta quando a oferta nasceu não deve vê-la (ela é só para contas novas): marca todos como "já viu".
INSERT INTO "user_onboarding" ("user_id", "welcome_offer_seen_at")
SELECT "id", now() FROM "user"
ON CONFLICT ("user_id") DO UPDATE SET "welcome_offer_seen_at" = coalesce("user_onboarding"."welcome_offer_seen_at", now());
