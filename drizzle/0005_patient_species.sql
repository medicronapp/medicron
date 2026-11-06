CREATE TYPE "public"."patient_species" AS ENUM('cat', 'dog', 'human', 'other');--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "species" "patient_species" DEFAULT 'cat' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "species" DROP DEFAULT;
