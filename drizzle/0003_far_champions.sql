CREATE TABLE "memoryEvents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "memoryEvents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"nodeSlug" text NOT NULL,
	"eventType" text NOT NULL,
	"eventData" text,
	"source" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memoryNodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "memoryNodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"nodeType" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"filePath" text NOT NULL,
	"frontmatter" text,
	"backlinks" text,
	"outboundLinks" text,
	"tags" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelBenchmarks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "modelBenchmarks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"modelId" text NOT NULL,
	"provider" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text,
	"tokensUsed" integer,
	"durationMs" integer,
	"qualityScore" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboardingProfiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "onboardingProfiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"useCase" text,
	"preferredProviders" text,
	"preferredModels" text,
	"autoConfigApplied" text,
	"questionnaireVersion" integer DEFAULT 1 NOT NULL,
	"completedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providerRegistry" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "providerRegistry_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"websiteUrl" text,
	"apiDocsUrl" text,
	"authType" text NOT NULL,
	"baseUrl" text NOT NULL,
	"modelsEndpoint" text NOT NULL,
	"icon" text,
	"supportedFeatures" text,
	"pricingModel" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "providerRegistry_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "suggestionDismissals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "suggestionDismissals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"suggestionType" text NOT NULL,
	"suggestionKey" text NOT NULL,
	"dismissedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenantProviderConfigs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenantProviderConfigs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"providerRegistryId" integer NOT NULL,
	"apiKeyEncrypted" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"enabledModelIds" text,
	"customConfig" text,
	"lastHealthCheck" timestamp,
	"lastHealthStatus" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trackedRepos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trackedRepos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"githubRepoId" integer,
	"fullName" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"description" text,
	"language" text,
	"stars" integer,
	"forks" integer,
	"topics" text,
	"readmeHtml" text,
	"lastCheckedAt" timestamp,
	"lastCommitAt" timestamp,
	"lastReleaseAt" timestamp,
	"trackedBy" text,
	"notificationEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenantProviderConfigs" ADD CONSTRAINT "tenantProviderConfigs_providerRegistryId_providerRegistry_id_fk" FOREIGN KEY ("providerRegistryId") REFERENCES "public"."providerRegistry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memoryNodes_tenantId_slug_unique" ON "memoryNodes" USING btree ("tenantId","slug");