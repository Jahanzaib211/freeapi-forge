import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Seeding database...");

  await sql`
    INSERT INTO users ("openId", name, email, "loginMethod", role)
    VALUES ('local-dev-user', 'Local Developer', 'dev@forge-studio.local', 'mock', 'admin')
    ON CONFLICT ("openId") DO NOTHING
  `;
  console.log("✓ Default admin user created");

  const providers = [
    { name: "groq", endpoint: "http://localhost:5050", quality: 85, latency: 200, cost: 50 },
    { name: "gemini", endpoint: "http://localhost:5050", quality: 80, latency: 300, cost: 40 },
    { name: "mistral", endpoint: "http://localhost:5050", quality: 75, latency: 250, cost: 60 },
    { name: "cerebras", endpoint: "http://localhost:5050", quality: 70, latency: 150, cost: 45 },
    { name: "sambanova", endpoint: "http://localhost:5050", quality: 72, latency: 280, cost: 55 },
    { name: "cohere", endpoint: "http://localhost:5050", quality: 68, latency: 320, cost: 50 },
    { name: "openrouter", endpoint: "http://localhost:5050", quality: 78, latency: 350, cost: 65 },
    { name: "cloudflare", endpoint: "http://localhost:5050", quality: 65, latency: 180, cost: 35 },
    { name: "local-qwen-moe", endpoint: "http://127.0.0.1:8081/v1", quality: 90, latency: 100, cost: 0 },
    { name: "local-qwopus", endpoint: "http://127.0.0.1:11434/v1", quality: 85, latency: 200, cost: 0 },
    { name: "local-hermes", endpoint: "http://127.0.0.1:11434/v1", quality: 82, latency: 200, cost: 0 },
  ];

  for (const p of providers) {
    await sql`
      INSERT INTO providers (name, "litellmEndpoint", enabled, "qualityScore", "latencyMs", "costPerMToken")
      VALUES (${p.name}, ${p.endpoint}, 1, ${p.quality}, ${p.latency}, ${p.cost})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log(`✓ ${providers.length} providers seeded`);

  await sql`
    INSERT INTO teams (name, "ownerId", "monthlyBudgetUsd")
    VALUES ('Default Team', 1, 10)
    ON CONFLICT DO NOTHING
  `;
  console.log("✓ Default team created");

  await sql`
    INSERT INTO "budgetLimits" ("teamId", "monthlyLimitUsd", "currentSpendUsd", "monthYear")
    VALUES (1, 10, 0, ${new Date().toISOString().slice(0, 7)})
    ON CONFLICT DO NOTHING
  `;
  console.log("✓ Budget limit created");

  console.log("✅ Seeding complete!");
  await sql.end();
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
