CREATE TABLE "tenantSettings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenantSettings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"category" text NOT NULL,
	"settingKey" text NOT NULL,
	"settingValue" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userOverrides" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "userOverrides_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"settingKey" text NOT NULL,
	"settingValue" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tenantSettings_tenantId_key_unique" ON "tenantSettings" USING btree ("tenantId","settingKey");--> statement-breakpoint
CREATE UNIQUE INDEX "userOverrides_tenant_user_key_unique" ON "userOverrides" USING btree ("tenantId","userId","settingKey");