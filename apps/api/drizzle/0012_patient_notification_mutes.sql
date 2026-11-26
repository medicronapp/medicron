CREATE TABLE "patient_notification_mutes" (
	"user_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_notification_mutes_user_id_patient_id_pk" PRIMARY KEY("user_id","patient_id")
);
--> statement-breakpoint
ALTER TABLE "patient_notification_mutes" ADD CONSTRAINT "patient_notification_mutes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_notification_mutes" ADD CONSTRAINT "patient_notification_mutes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;