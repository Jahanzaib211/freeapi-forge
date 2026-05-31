CREATE TABLE IF NOT EXISTS "cacheEntries" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "key" varchar(64) NOT NULL UNIQUE,
  "response" text NOT NULL,
  "model" varchar(255) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "expiresAt" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "cache_key_idx" ON "cacheEntries" ("key");
CREATE INDEX IF NOT EXISTS "cache_expires_idx" ON "cacheEntries" ("expiresAt");
