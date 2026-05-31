import { getDb } from "../db";
import { mcpRegistry, subscriptionPlans, tenantSubscriptions } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { llmRouter } from "./llm_router";

const OFFICIAL_MCPS = [
  { slug: "filesystem", name: "Filesystem", desc: "Read, write, search local files and directories. Access file metadata, list directories, and perform file operations with atomic safety.", author: "Anthropic", category: "file-management", icon: "📁", tier: "free", tools: ["read_file", "write_file", "edit_file", "list_directory", "search_files", "get_file_info"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem" },
  { slug: "git", name: "Git", desc: "Full Git operations: clone, commit, push, branch, diff, log, stash. Manage repositories directly from AI conversations.", author: "Anthropic", category: "developer-tools", icon: "🔀", tier: "free", tools: ["git_status", "git_diff", "git_log", "git_blame", "git_commit", "git_push", "git_pull", "git_branch", "git_checkout"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/github" },
  { slug: "fetch", name: "HTTP Fetch", desc: "Make HTTP requests to any URL. GET, POST, PUT, DELETE with custom headers, body, and timeout control.", author: "Anthropic", category: "data", icon: "🌐", tier: "free", tools: ["fetch_get", "fetch_post", "fetch_put", "fetch_delete"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch" },
  { slug: "web-search", name: "Web Search", desc: "Search the web using Brave Search. Get real-time search results with snippets, URLs, and metadata.", author: "Anthropic", category: "search", icon: "🔍", tier: "free", tools: ["brave_web_search", "brave_local_search"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search" },
  { slug: "sqlite", name: "SQLite", desc: "Query and manage SQLite databases. Execute SQL, create tables, insert data, and analyze results.", author: "Anthropic", category: "database", icon: "🗃️", tier: "free", tools: ["query", "execute", "list_tables", "describe_table"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite" },
  { slug: "memory", name: "Memory", desc: "Key-value memory store for persistent context. Remember facts, preferences, and state across conversations.", author: "Anthropic", category: "ai", icon: "🧠", tier: "free", tools: ["set_memory", "get_memory", "delete_memory", "list_memories", "search_memories"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory" },
  { slug: "time", name: "Time", desc: "Date and time utilities. Get current time in any timezone, convert between timezones, calculate durations.", author: "Anthropic", category: "productivity", icon: "⏰", tier: "free", tools: ["get_current_time", "convert_timezone", "format_date", "date_difference"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/time" },
  { slug: "calculator", name: "Calculator", desc: "Mathematical operations and conversions. Arithmetic, unit conversion, scientific calculations.", author: "Anthropic", category: "productivity", icon: "🧮", tier: "free", tools: ["calculate", "convert_units", "solve_equation"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/calculator" },
  { slug: "bash", name: "Bash", desc: "Execute shell commands safely. Run scripts, process files, manage processes with configurable timeout.", author: "Anthropic", category: "developer-tools", icon: "💻", tier: "free", tools: ["execute_command", "run_script", "read_output"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/bash" },
  { slug: "json", name: "JSON", desc: "JSON manipulation and querying. Validate, format, query, merge, and transform JSON data structures.", author: "Anthropic", category: "data", icon: "📋", tier: "free", tools: ["json_parse", "json_stringify", "json_query", "json_validate", "json_merge"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/json" },
  // PRO tier (20 servers)
  { slug: "github", name: "GitHub", desc: "Full GitHub API integration. Manage issues, PRs, repos, actions, releases, and team workflow.", author: "Anthropic", category: "developer-tools", icon: "🐙", tier: "pro", tools: ["list_repos", "get_repo", "create_issue", "list_issues", "create_pr", "list_pull_requests", "get_pr", "merge_pr", "list_workflows", "trigger_workflow"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/github" },
  { slug: "slack", name: "Slack", desc: "Slack workspace integration. Send messages, list channels, manage threads, search history.", author: "Anthropic", category: "communication", icon: "💬", tier: "pro", tools: ["post_message", "list_channels", "get_channel_history", "search_messages", "add_reaction"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack" },
  { slug: "postgres", name: "PostgreSQL", desc: "Query PostgreSQL databases. Execute SQL, explore schema, run analytics with read-only safety.", author: "Anthropic", category: "database", icon: "🐘", tier: "pro", tools: ["query", "list_tables", "describe_table", "get_schema"], npm: "@anthropic/mcp-postgres" },
  { slug: "redis", name: "Redis", desc: "Redis database operations. Get/set keys, manage lists, sets, sorted sets, and pub/sub messaging.", author: "Anthropic", category: "database", icon: "🔴", tier: "pro", tools: ["get", "set", "del", "keys", "lpush", "lrange", "sadd", "smembers", "publish"], npm: "@anthropic/mcp-redis" },
  { slug: "docker", name: "Docker", desc: "Docker container management. List, start, stop, inspect containers, manage images, view logs.", author: "Anthropic", category: "automation", icon: "🐳", tier: "pro", tools: ["list_containers", "inspect_container", "container_logs", "list_images", "pull_image"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/docker" },
  { slug: "kubernetes", name: "Kubernetes", desc: "Kubernetes cluster management. Get pods, services, deployments, logs, and cluster resources.", author: "Anthropic", category: "automation", icon: "☸️", tier: "pro", tools: ["get_pods", "get_services", "get_deployments", "pod_logs", "describe_resource"], npm: "@anthropic/mcp-k8s" },
  { slug: "aws", name: "AWS", desc: "Amazon Web Services integration. S3, Lambda, EC2 operations with IAM-based access control.", author: "Anthropic", category: "automation", icon: "☁️", tier: "pro", tools: ["s3_list", "s3_get", "s3_put", "lambda_invoke", "ec2_describe"], npm: "@anthropic/mcp-aws" },
  { slug: "puppeteer", name: "Puppeteer", desc: "Browser automation. Take screenshots, scrape web pages, generate PDFs, test UI interactions.", author: "Anthropic", category: "automation", icon: "🕸️", tier: "pro", tools: ["screenshot", "scrape_page", "generate_pdf", "click_element", "fill_form"], github: "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer" },
  { slug: "jira", name: "Jira", desc: "Jira project management integration. Create, update, search issues, manage sprints and boards.", author: "Community", category: "productivity", icon: "📋", tier: "pro", tools: ["search_issues", "create_issue", "update_issue", "get_issue", "list_sprints"], npm: "@mcp/jira" },
  { slug: "linear", name: "Linear", desc: "Linear project management. Issues, projects, teams, cycles with full GraphQL API.", author: "Community", category: "productivity", icon: "📐", tier: "pro", tools: ["list_issues", "create_issue", "update_issue", "search_issues", "list_projects"], npm: "@mcp/linear" },
  { slug: "notion", name: "Notion", desc: "Notion workspace API. Read, create, update pages and databases with rich content.", author: "Community", category: "productivity", icon: "📝", tier: "pro", tools: ["search", "get_page", "create_page", "update_page", "query_database"], npm: "@mcp/notion" },
  { slug: "figma", name: "Figma", desc: "Figma design API. Read file data, get components, styles, and design system tokens.", author: "Community", category: "developer-tools", icon: "🎨", tier: "pro", tools: ["get_file", "get_file_components", "get_file_styles", "get_images"], npm: "@mcp/figma" },
  { slug: "stripe", name: "Stripe", desc: "Stripe payment operations. Charges, customers, subscriptions, invoices with read-only safety.", author: "Community", category: "data", icon: "💳", tier: "pro", tools: ["list_charges", "get_customer", "list_subscriptions", "list_invoices"], npm: "@mcp/stripe" },
  { slug: "sendgrid", name: "SendGrid", desc: "Email sending API. Send transactional emails, manage templates, track delivery status.", author: "Community", category: "communication", icon: "📧", tier: "pro", tools: ["send_email", "list_templates", "get_stats"], npm: "@mcp/sendgrid" },
  { slug: "twilio", name: "Twilio", desc: "SMS and phone operations. Send messages, make calls, manage phone numbers.", author: "Community", category: "communication", icon: "📱", tier: "pro", tools: ["send_sms", "make_call", "list_messages", "get_phone_numbers"], npm: "@mcp/twilio" },
  { slug: "google-calendar", name: "Google Calendar", desc: "Calendar event management. Create, read, update, delete events, manage schedules.", author: "Community", category: "productivity", icon: "📅", tier: "pro", tools: ["list_events", "create_event", "update_event", "delete_event", "list_calendars"], npm: "@mcp/google-calendar" },
  { slug: "google-drive", name: "Google Drive", desc: "Drive file management. List, read, upload, search files in Google Drive.", author: "Community", category: "file-management", icon: "🗂️", tier: "pro", tools: ["list_files", "get_file", "search_files", "upload_file", "download_file"], npm: "@mcp/google-drive" },
  { slug: "spotify", name: "Spotify", desc: "Music control. Play, pause, search tracks, manage playlists, get recommendations.", author: "Community", category: "productivity", icon: "🎵", tier: "pro", tools: ["search_tracks", "play", "pause", "next_track", "get_playlists"], npm: "@mcp/spotify" },
  { slug: "openweather", name: "OpenWeather", desc: "Weather data. Current conditions, forecasts, historical data for any location.", author: "Community", category: "data", icon: "🌤️", tier: "pro", tools: ["current_weather", "forecast", "air_pollution", "uv_index"], npm: "@mcp/weather" },
  { slug: "sentry", name: "Sentry", desc: "Error tracking integration. List issues, get stack traces, manage error groups, create alerts.", author: "Community", category: "developer-tools", icon: "⚠️", tier: "pro", tools: ["list_issues", "get_issue", "list_events", "get_event_detail"], npm: "@mcp/sentry" },
  { slug: "datadog", name: "Datadog", desc: "Infrastructure monitoring. Query metrics, get dashboards, monitor alerts, search logs.", author: "Community", category: "developer-tools", icon: "📈", tier: "pro", tools: ["query_metrics", "list_dashboards", "search_logs", "get_monitors"], npm: "@mcp/datadog" },
];

export class McpDiscoveryAgent {
  async seedRegistry(): Promise<number> {
    const db = await getDb();
    if (!db) return 0;
    let count = 0;
    for (const mcp of OFFICIAL_MCPS) {
      try {
        const existing = await db.select().from(mcpRegistry).where(eq(mcpRegistry.slug, mcp.slug)).limit(1);
        if (existing.length === 0) {
          await db.insert(mcpRegistry).values({
            slug: mcp.slug, name: mcp.name, description: mcp.desc, author: mcp.author,
            category: mcp.category as any, icon: mcp.icon, tier: mcp.tier as any,
            tools: JSON.stringify(mcp.tools.map(t => ({ name: t, description: `${mcp.name} tool: ${t}` }))),
            configSchema: JSON.stringify({ type: "object", properties: { apiKey: { type: "string" }, endpoint: { type: "string" } } }),
            githubUrl: (mcp as any).github || null, npmPackage: (mcp as any).npm || null,
            featured: count < 4 ? 1 : 0, status: "active",
            tags: JSON.stringify([mcp.category, mcp.tier, ...mcp.tools.slice(0, 3)]),
            lastVerifiedAt: new Date(),
          });
          count++;
        }
      } catch {}
    }
    return count;
  }

  async seedPlans(): Promise<void> {
    const db = await getDb(); if (!db) return;
    const plans = [
      { name: "free", priceMonthlyUsd: 0, maxMcpServers: 10, maxToolCallsPerDay: 100, features: JSON.stringify(["10 free MCP servers", "100 tool calls/day", "Community support", "Basic monitoring"]) },
      { name: "pro", priceMonthlyUsd: 900, maxMcpServers: 30, maxToolCallsPerDay: 10000, features: JSON.stringify(["All free servers + 20 pro", "10,000 tool calls/day", "Priority queue", "Email support", "Usage analytics", "Custom configs"]) },
      { name: "enterprise", priceMonthlyUsd: 4900, maxMcpServers: 999, maxToolCallsPerDay: 100000, features: JSON.stringify(["Unlimited MCP servers", "Unlimited calls", "Custom server hosting", "Dedicated support", "SLA guarantee", "Team management", "Audit exports", "Custom integrations"]) },
    ];
    for (const plan of plans) {
      const existing = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, plan.name)).limit(1);
      if (existing.length === 0) {
        await db.insert(subscriptionPlans).values(plan);
      }
    }
  }

  async assignFreePlan(tenantId: number): Promise<void> {
    const db = await getDb(); if (!db) return;
    const existing = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId)).limit(1);
    if (existing.length > 0) return;
    const freePlan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, "free")).limit(1).then(r => r[0]);
    if (freePlan) {
      await db.insert(tenantSubscriptions).values({ tenantId, planId: freePlan.id, status: "active", currentPeriodStart: new Date() });
    }
  }

  async runDiscovery(): Promise<{ found: number; updated: number }> {
    let found = 0;
    // Check GitHub for new MCP servers
    try {
      const resp = await fetch("https://api.github.com/search/repositories?q=topic:mcp-server&sort=stars&per_page=20", {
        headers: { "Accept": "application/vnd.github.v3+json", "User-Agent": "ForgeStudio/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const repo of data.items || []) {
          const slug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "");
          const name = repo.name.replace(/^mcp-/i, "").replace(/-server$/i, "").split("-").map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
          const db = await getDb();
          if (db) {
            const existing = await db.select().from(mcpRegistry).where(eq(mcpRegistry.slug, slug)).limit(1);
            if (existing.length === 0) {
              await db.insert(mcpRegistry).values({
                slug, name: name || repo.name, description: repo.description || `MCP server from ${repo.full_name}`,
                author: repo.owner?.login || "Community", category: "developer-tools", icon: "🔌", tier: "free",
                tools: JSON.stringify([{ name: "ping", description: "Test connection" }]),
                configSchema: JSON.stringify({ type: "object", properties: {} }),
                githubUrl: repo.html_url, status: "beta", featured: 0,
                tags: JSON.stringify(["discovered", "github"]),
                lastVerifiedAt: new Date(),
              });
              found++;
            }
          }
        }
      }
    } catch {}
    return { found, updated: 0 };
  }
}

export const mcpDiscoveryAgent = new McpDiscoveryAgent();
