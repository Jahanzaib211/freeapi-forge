CREATE TABLE "accessGroups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accessGroups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"models" text[],
	"mcpServers" text[],
	"agents" text[],
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"systemPrompt" text,
	"model" varchar(255),
	"tools" text[],
	"mcpServerIds" text[],
	"budgetUsd" integer DEFAULT 10 NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cacheEntries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cacheEntries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" varchar(64) NOT NULL,
	"response" text NOT NULL,
	"model" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "cacheEntries_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "customProviders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customProviders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"apiUrl" varchar(1024) NOT NULL,
	"apiKey" varchar(1024) NOT NULL,
	"models" text NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardrails" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guardrails_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"type" varchar(32) DEFAULT 'pre_call' NOT NULL,
	"config" text,
	"enabled" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcpServers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcpServers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"transport" varchar(32) DEFAULT 'sse' NOT NULL,
	"url" varchar(1024) NOT NULL,
	"authConfig" text,
	"status" varchar(32) DEFAULT 'disconnected' NOT NULL,
	"toolCount" integer DEFAULT 0 NOT NULL,
	"lastSeen" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"ownerId" integer NOT NULL,
	"budgetLimitUsd" integer DEFAULT 100 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "policies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"guardrailIds" text[],
	"teamIds" text[],
	"keyIds" text[],
	"modelPatterns" text[],
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promptLibrary" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "promptLibrary_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"tags" text[],
	"version" integer DEFAULT 1 NOT NULL,
	"forkedFrom" integer,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "skills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"path" varchar(1024) NOT NULL,
	"category" varchar(64) DEFAULT 'general' NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"lastExecuted" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "systemEvents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "systemEvents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"level" varchar(16) DEFAULT 'info' NOT NULL,
	"source" varchar(128) NOT NULL,
	"message" text NOT NULL,
	"stackTrace" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usageLogs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "usageLogs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"virtualKeyId" integer,
	"teamId" integer DEFAULT 1,
	"model" varchar(255),
	"provider" varchar(128),
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"costUsd" integer DEFAULT 0 NOT NULL,
	"latencyMs" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'success' NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtualKeys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "virtualKeys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"keyHash" varchar(255) NOT NULL,
	"keyPrefix" varchar(12) NOT NULL,
	"teamId" integer DEFAULT 1 NOT NULL,
	"budgetLimitUsd" integer DEFAULT 10 NOT NULL,
	"rateLimitTPM" integer DEFAULT 100000 NOT NULL,
	"rateLimitRPM" integer DEFAULT 1000 NOT NULL,
	"models" text[],
	"metadata" text,
	"enabled" integer DEFAULT 1 NOT NULL,
	"spendUsd" integer DEFAULT 0 NOT NULL,
	"lastUsedAt" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "virtualKeys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhooks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"url" varchar(1024) NOT NULL,
	"secret" varchar(255),
	"events" text[],
	"enabled" integer DEFAULT 1 NOT NULL,
	"lastTriggered" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
