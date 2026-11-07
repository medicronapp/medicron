ALTER TABLE "cats" RENAME TO "patients";--> statement-breakpoint
ALTER TABLE "care_plans" RENAME COLUMN "cat_id" TO "patient_id";--> statement-breakpoint
ALTER TABLE "care_plans" RENAME CONSTRAINT "care_plans_cat_id_cats_id_fk" TO "care_plans_patient_id_patients_id_fk";
