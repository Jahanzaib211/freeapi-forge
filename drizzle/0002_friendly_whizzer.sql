CREATE TYPE "public"."agentStatus" AS ENUM('active', 'paused', 'error', 'creating');--> statement-breakpoint
CREATE TYPE "public"."agentType" AS ENUM('chat', 'workflow', 'monitor', 'data', 'orchestrator');--> statement-breakpoint
CREATE TYPE "public"."mcpCategory" AS ENUM('developer-tools', 'data', 'search', 'communication', 'ai', 'automation', 'security', 'productivity', 'database', 'file-management');--> statement-breakpoint
CREATE TYPE "public"."tenantRole" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."tenantStatus" AS ENUM('active', 'provisioning', 'terminated', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."workflowStatus" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workflowTrigger" AS ENUM('manual', 'cron', 'webhook', 'event', 'chat_command', 'agent_completion');--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'developer';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'viewer';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'api_user';--> statement-breakpoint
CREATE TABLE "agentMemories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agentMemories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"agentId" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentRuns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agentRuns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"agentId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"trigger" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"steps" integer DEFAULT 0 NOT NULL,
	"toolCalls" text,
	"totalCost" integer DEFAULT 0 NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(500) DEFAULT 'New Chat' NOT NULL,
	"systemPrompt" text,
	"model" varchar(255),
	"messageCount" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"totalCostUsd" integer DEFAULT 0 NOT NULL,
	"forkedFrom" integer,
	"deletedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deploymentAlerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deploymentAlerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"runId" integer NOT NULL,
	"alertType" varchar(32) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"message" text NOT NULL,
	"isRead" integer DEFAULT 0 NOT NULL,
	"dismissedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discordConfigs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discordConfigs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"botToken" varchar(512),
	"guildId" varchar(64),
	"channelId" varchar(64),
	"enabled" integer DEFAULT 0 NOT NULL,
	"model" varchar(255) DEFAULT 'fast-8b',
	"systemPrompt" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentChunks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documentChunks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"documentId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"chunkIndex" integer NOT NULL,
	"content" text NOT NULL,
	"tokenCount" integer DEFAULT 0 NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"name" varchar(500) NOT NULL,
	"type" varchar(32) NOT NULL,
	"chunkCount" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "githubActionsRuns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "githubActionsRuns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"repoFullName" varchar(255) NOT NULL,
	"runId" integer NOT NULL,
	"runNumber" integer,
	"workflowName" varchar(255) NOT NULL,
	"status" varchar(32) NOT NULL,
	"conclusion" varchar(32),
	"event" varchar(32),
	"branch" varchar(255),
	"commitSha" varchar(40),
	"commitMessage" text,
	"actor" varchar(128),
	"startedAt" timestamp,
	"completedAt" timestamp,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"jobsJson" text,
	"annotationsJson" text,
	"htmlUrl" varchar(1024),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "githubTokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "githubTokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"token" text NOT NULL,
	"scopes" text,
	"username" varchar(128),
	"rateLimitRemaining" integer DEFAULT 5000 NOT NULL,
	"rateLimitReset" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcpRegistry" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcpRegistry_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"version" varchar(32) DEFAULT '1.0.0' NOT NULL,
	"author" varchar(255),
	"category" "mcpCategory" DEFAULT 'developer-tools' NOT NULL,
	"icon" varchar(64) DEFAULT '🔌',
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"installCount" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"tools" text,
	"resources" text,
	"prompts" text,
	"configSchema" text,
	"officialUrl" varchar(1024),
	"githubUrl" varchar(1024),
	"npmPackage" varchar(255),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"featured" integer DEFAULT 0 NOT NULL,
	"tags" text,
	"lastVerifiedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mcpRegistry_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mcpReviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcpReviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"userId" integer,
	"mcpServerId" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"review" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcpUsageLog" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcpUsageLog_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"userId" integer,
	"mcpServerId" integer NOT NULL,
	"toolName" varchar(255) NOT NULL,
	"inputParams" text,
	"outputResult" text,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"success" integer DEFAULT 1 NOT NULL,
	"errorMessage" text,
	"tokensUsed" integer DEFAULT 0 NOT NULL,
	"costUsd" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversationId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
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
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tenantId" integer,
	"roles" text[] DEFAULT '{"user"}' NOT NULL,
	"refreshToken" varchar(512) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptionPlans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptionPlans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(64) NOT NULL,
	"priceMonthlyUsd" integer DEFAULT 0 NOT NULL,
	"maxMcpServers" integer DEFAULT 10 NOT NULL,
	"maxToolCallsPerDay" integer DEFAULT 100 NOT NULL,
	"features" text,
	"stripePriceId" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptionPlans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tenantSubscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenantSubscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"planId" integer NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"currentPeriodStart" timestamp,
	"currentPeriodEnd" timestamp,
	"trialEndsAt" timestamp,
	"cancelledAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenantSubscriptions_tenantId_unique" UNIQUE("tenantId")
);
--> statement-breakpoint
CREATE TABLE "tenantUsers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenantUsers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "tenantRole" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"ownerId" integer NOT NULL,
	"status" "tenantStatus" DEFAULT 'active' NOT NULL,
	"monthlyBudgetUsd" integer DEFAULT 100 NOT NULL,
	"maxProviders" integer DEFAULT 10 NOT NULL,
	"maxModels" integer DEFAULT 50 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "toolApprovals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "toolApprovals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"agentRunId" integer NOT NULL,
	"toolName" varchar(255) NOT NULL,
	"params" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"reviewedBy" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflowNodeRuns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflowNodeRuns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workflowRunId" integer NOT NULL,
	"nodeId" varchar(64) NOT NULL,
	"nodeType" varchar(32) NOT NULL,
	"nodeName" varchar(255),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"input" text,
	"output" text,
	"error" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "workflowRuns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflowRuns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workflowId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"triggerType" varchar(32) NOT NULL,
	"triggerData" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"currentNodeId" varchar(64),
	"totalNodes" integer DEFAULT 0 NOT NULL,
	"completedNodes" integer DEFAULT 0 NOT NULL,
	"input" text,
	"output" text,
	"error" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"durationMs" integer DEFAULT 0 NOT NULL,
	"costUsd" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflowVersions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflowVersions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workflowId" integer NOT NULL,
	"version" integer NOT NULL,
	"graph" text,
	"changelog" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflowWebhooks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflowWebhooks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workflowId" integer NOT NULL,
	"tenantId" integer NOT NULL,
	"path" varchar(255) NOT NULL,
	"secret" varchar(255),
	"lastReceivedAt" timestamp,
	"requestCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflowWebhooks_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflows_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "workflowStatus" DEFAULT 'draft' NOT NULL,
	"triggerType" "workflowTrigger" DEFAULT 'manual' NOT NULL,
	"triggerConfig" text,
	"graph" text,
	"settings" text,
	"lastRunAt" timestamp,
	"nextRunAt" timestamp,
	"totalRuns" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"errorCount" integer DEFAULT 0 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "model" SET DEFAULT 'fast-8b';--> statement-breakpoint
ALTER TABLE "accessGroups" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "tenantId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "type" "agentType" NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "config" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "status" "agentStatus" DEFAULT 'creating' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "lastRunAt" timestamp;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "nextRunAt" timestamp;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "totalRuns" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "totalCost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "createdBy" integer;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "apiKeys" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "auditLogs" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "budgetLimits" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "cacheEntries" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "customProviders" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "guardrails" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "mcpServers" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "promptLibrary" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "requestHistory" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "systemEvents" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "usageLogs" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "passwordHash" varchar(255);--> statement-breakpoint
ALTER TABLE "virtualKeys" ADD COLUMN "tenantId" integer;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "tenantId" integer;