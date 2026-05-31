// ============================================================================
// FORGE STUDIO — DEPENDENCY TREE DATA
// Accurate Architecture Map based on github.com/Jahanzaib211/forge-studio
// 50+ nodes · 106+ edges · 9 layers · 12 build phases · 19 DB tables
// ============================================================================

export type Language = 'typescript' | 'rust' | 'go' | 'sql' | 'yaml' | 'external' | 'binary' | 'python';
export type EdgeType = 'data' | 'api' | 'file' | 'process' | 'depends' | 'network' | 'event' | 'config';
export type NodeStatus = 'planned' | 'building' | 'ready' | 'external' | 'concept';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ForgeNode {
  id: string;
  name: string;
  shortName?: string;
  layer: number;
  description: string;
  tech: string[];
  language: Language;
  status: NodeStatus;
  risk: RiskLevel;
  spof: boolean;
  license?: string;
  port?: string | number;
  dependsOn: string[];
  providesTo: string[];
}

export interface ForgeEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
  critical: boolean;
  bidirectional?: boolean;
}

export interface ForgeLayer {
  id: number;
  name: string;
  subtitle: string;
  color: string;
  bgColor: string;
}

export interface BuildPhase {
  phase: number;
  name: string;
  weeks: number;
  components: string[];
  deliverables: string[];
  dependencies: string[];
  parallel?: string[];
}

export interface DBTable {
  name: string;
  store: string;
  purpose: string;
  critical: boolean;
  columns: { name: string; type: string; note?: string }[];
}

// ============================================================================
// LAYERS (top to bottom: user-facing → infrastructure)
// ============================================================================
export const LAYERS: ForgeLayer[] = [
  { id: 0, name: 'External Integrations', subtitle: 'Stripe · GitHub API · MCP Registries · LLM Providers · Cloud Users', color: '#A78BFA', bgColor: 'rgba(167,139,250,0.06)' },
  { id: 1, name: 'User Interfaces', subtitle: 'Web UI React 19 · TUI Go · CLI · Browser Extension', color: '#F472B6', bgColor: 'rgba(244,114,182,0.06)' },
  { id: 2, name: 'Application Logic', subtitle: 'Forge Builder · Tasks/Rewards · Launch Rewards · P2P · Flywheel · Mirror Test', color: '#34D399', bgColor: 'rgba(52,211,153,0.06)' },
  { id: 3, name: 'Platform Services', subtitle: 'AI Lab Hub · MCP Explorer · Vault · GitHub Explorer · Resource Mgr · Telemetry · Security · Billing', color: '#38BDF8', bgColor: 'rgba(56,189,248,0.06)' },
  { id: 4, name: 'MCP Fabric', subtitle: 'MCP Host · MCP Server/Forge · /mcp/sse · External Clients', color: '#C084FC', bgColor: 'rgba(192,132,252,0.06)' },
  { id: 5, name: 'Core Engine', subtitle: 'Express · tRPC · WebSocket · REST · LLM Proxy · Circuit Breaker · Fallback Router · JWT · Discoverer · System Monitor · HuggingFace · Load Balancer · Process Mgr · Error Logger · Analytics · Guardrails', color: '#00FFB2', bgColor: 'rgba(0,255,178,0.06)' },
  { id: 6, name: 'Rust Runtime', subtitle: 'forge-resource binary: eBPF · VRAM defrag · GPU stats · process control', color: '#DEA584', bgColor: 'rgba(222,165,132,0.06)' },
  { id: 7, name: 'Data Plane', subtitle: 'PostgreSQL 17 · Redis 7 · Qdrant · SQLite · File System', color: '#FBBF24', bgColor: 'rgba(251,191,36,0.06)' },
  { id: 8, name: 'Infrastructure', subtitle: 'Ubuntu · Docker · NVIDIA GPU · nginx · PM2 · dcgm-exporter · Prometheus · Grafana', color: '#6B7280', bgColor: 'rgba(107,114,128,0.06)' },
];

// ============================================================================
// NODES (54 components)
// Status mapping:
//   ready    = currently in the repo (21 features + infrastructure)
//   planned  = next natural progression (15 items)
//   building = actively being worked on
//   external = third-party services
//   concept  = theoretical/paper stage
// ============================================================================
export const NODES: ForgeNode[] = [
  // ─── LAYER 0: EXTERNAL INTEGRATIONS ────────────────────────────────────
  {
    id: 'stripe', name: 'Stripe', shortName: 'Stripe',
    layer: 0, description: 'Payment processing, subscriptions, billing webhooks',
    tech: ['Stripe API', 'Webhooks', 'Checkout'], language: 'external', status: 'external',
    risk: 'medium', spof: true, port: 'external',
    dependsOn: [], providesTo: ['tasks-rewards', 'launch-rewards', 'buyback-flywheel', 'billing']
  },
  {
    id: 'github-api', name: 'GitHub API', shortName: 'GitHub',
    layer: 0, description: 'Repository access, Actions, Issues, PRs, Webhooks',
    tech: ['GitHub REST', 'GraphQL API', 'Webhooks'], language: 'external', status: 'external',
    risk: 'low', spof: false, port: 'api.github.com',
    dependsOn: [], providesTo: ['github-explorer']
  },
  {
    id: 'mcp-registries', name: 'MCP Registries', shortName: 'Registries',
    layer: 0, description: 'Glama (6k+ servers), Smithery (21.5k+), Official registry',
    tech: ['Glama API', 'Smithery API', 'MCP Registry'], language: 'external', status: 'external',
    risk: 'low', spof: false,
    dependsOn: [], providesTo: ['mcp-explorer']
  },
  {
    id: 'llm-providers', name: 'LLM Providers', shortName: 'LLMs',
    layer: 0, description: 'OpenAI, DeepSeek, Groq, Together, OpenRouter, Mistral, Gemini, Ollama',
    tech: ['OpenAI API', 'Anthropic API', 'DeepSeek', 'Groq', 'Together', 'OpenRouter', 'Mistral', 'Gemini'],
    language: 'external', status: 'external', risk: 'medium', spof: false,
    dependsOn: [], providesTo: ['inference-proxy', 'ai-lab-hub', 'custom-providers']
  },
  {
    id: 'cloud-users', name: 'Cloud Users', shortName: 'Users',
    layer: 0, description: 'End users accessing app.forge.studio (planned) or localhost:5051',
    tech: ['Browser', 'HTTPS', 'CDN'], language: 'external', status: 'external',
    risk: 'low', spof: false,
    dependsOn: [], providesTo: ['web-ui', 'tui', 'cli']
  },

  // ─── LAYER 1: USER INTERFACES ──────────────────────────────────────────
  {
    id: 'web-ui', name: 'Web UI', shortName: 'React UI',
    layer: 1, description: 'Full web dashboard: React 19, Tailwind CSS 4, shadcn/ui, wouter routing, Recharts',
    tech: ['React 19', 'Tailwind CSS 4', 'shadcn/ui', 'wouter', 'Recharts'],
    language: 'typescript', status: 'ready', risk: 'low', spof: false, port: '5051',
    dependsOn: ['express-server', 'trpc', 'ws-server'], providesTo: ['cloud-users']
  },
  {
    id: 'tui', name: 'Terminal UI (forge-tui)', shortName: 'TUI',
    layer: 1, description: 'Go + BubbleTea single binary: GPU graphs, chat, MCP, workflows',
    tech: ['Go', 'BubbleTea', 'Glamour', 'Tview'], language: 'go', status: 'planned',
    risk: 'medium', spof: false,
    dependsOn: ['ws-server', 'rest-api'], providesTo: ['cloud-users']
  },
  {
    id: 'cli', name: 'CLI (forge)', shortName: 'CLI',
    layer: 1, description: 'Command-line interface: forge start, status, ask, mcp call',
    tech: ['Commander.js'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false,
    dependsOn: ['express-server'], providesTo: ['cloud-users']
  },
  {
    id: 'browser-ext', name: 'Browser Extension', shortName: 'Ext',
    layer: 1, description: 'Chrome/Edge extension for quick Forge access (Feature #21)',
    tech: ['Chrome API', 'Manifest V3', 'WebExtension'], language: 'typescript', status: 'ready',
    risk: 'low', spof: false,
    dependsOn: ['express-server'], providesTo: ['cloud-users']
  },

  // ─── LAYER 2: APPLICATION LOGIC ────────────────────────────────────────
  {
    id: 'forge-builder', name: 'Forge Builder', shortName: 'Builder',
    layer: 2, description: 'Visual workflow builder with MCP tools, DAG execution, ranking (Feature #11)',
    tech: ['React DnD', 'DAG Engine', 'Qdrant Client', 'CodeMirror 6'],
    language: 'typescript', status: 'ready', risk: 'high', spof: false,
    license: 'MIT',
    dependsOn: ['express-server', 'qdrant', 'mcp-host', 'inference-proxy'],
    providesTo: ['web-ui', 'tui']
  },
  {
    id: 'tasks-rewards', name: 'Tasks & Rewards', shortName: 'Rewards',
    layer: 2, description: 'Gamification: credits, badges, streaks, referral system',
    tech: ['PostgreSQL', 'Event Hooks', 'Stripe Credits'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'stripe', 'postgres'], providesTo: ['web-ui', 'tui']
  },
  {
    id: 'launch-rewards', name: 'Launch Rewards', shortName: 'Launch',
    layer: 2, description: '30-day tiered reward system: Bronze/Silver/Gold/Platinum',
    tech: ['PostgreSQL', 'Cron Jobs', 'Stripe Metadata'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'stripe', 'postgres'], providesTo: ['web-ui', 'tui']
  },
  {
    id: 'forge-p2p', name: 'Forge-to-Forge Network', shortName: 'P2P',
    layer: 2, description: 'Peer-to-peer compute marketplace: sell/buy GPU capacity',
    tech: ['Peer Discovery', 'TLS', 'Reputation', 'Health Checks'], language: 'typescript',
    status: 'planned', risk: 'high', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'circuit-breaker', 'redis', 'security-layer'],
    providesTo: ['inference-proxy']
  },
  {
    id: 'buyback-flywheel', name: 'Buyback/Burn Flywheel', shortName: 'Flywheel',
    layer: 2, description: '50% revenue → 80% burn, 20% POL. Economic engine.',
    tech: ['Stripe Revenue', 'Token Ledger', 'PostgreSQL'], language: 'typescript',
    status: 'planned', risk: 'medium', spof: false, license: 'BSL 1.1',
    dependsOn: ['stripe', 'postgres'], providesTo: ['tasks-rewards', 'launch-rewards']
  },
  {
    id: 'mirror-test', name: 'Mirror Test', shortName: 'Mirror',
    layer: 2, description: 'Forge hosts itself: reads own code, modifies workflows, self-deploys',
    tech: ['GitHub Explorer', 'Vault', 'Builder', 'Telemetry'], language: 'typescript',
    status: 'concept', risk: 'low', spof: false,
    dependsOn: ['github-explorer', 'native-vault', 'forge-builder', 'telemetry'],
    providesTo: []
  },

  // ─── LAYER 3: PLATFORM SERVICES ────────────────────────────────────────
  {
    id: 'ai-lab-hub', name: 'AI Lab Hub', shortName: 'Hub',
    layer: 3, description: 'Unified model catalog with pools: paid/free/local (Feature #0)',
    tech: ['React Grid', 'Provider Detection', 'Model Discovery', 'Drizzle ORM'],
    language: 'typescript', status: 'ready', risk: 'low', spof: false, license: 'MIT',
    dependsOn: ['express-server', 'postgres', 'llm-providers'], providesTo: ['web-ui']
  },
  {
    id: 'mcp-explorer', name: 'MCP Explorer', shortName: 'MCP Exp',
    layer: 3, description: 'Discover, rank, one-click connect MCP servers from Glama/Smithery',
    tech: ['Registry Aggregator', 'Ranking Engine', 'Health Checks'], language: 'typescript',
    status: 'planned', risk: 'medium', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'mcp-registries', 'mcp-host', 'postgres', 'redis'],
    providesTo: ['web-ui', 'tui']
  },
  {
    id: 'native-vault', name: 'Native Vault', shortName: 'Vault',
    layer: 3, description: 'Built-in Obsidian: Markdown files, backlinks, D3 graph, CodeMirror 6',
    tech: ['Chokidar', 'Markdown-it', 'D3 Force Graph', 'SQLite-vec', 'CodeMirror 6'],
    language: 'typescript', status: 'planned', risk: 'medium', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'filesystem', 'postgres', 'qdrant'],
    providesTo: ['forge-builder', 'mcp-server', 'web-ui', 'tui']
  },
  {
    id: 'github-explorer', name: 'GitHub Repo Explorer', shortName: 'GitHub',
    layer: 3, description: 'Browse, search, clone repos, view issues/PRs, trigger Actions',
    tech: ['Octokit', 'Git CLI', 'File Watcher'], language: 'typescript',
    status: 'planned', risk: 'low', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'github-api', 'filesystem'], providesTo: ['forge-builder', 'mirror-test']
  },
  {
    id: 'resource-mgr-ui', name: 'Resource Manager UI', shortName: 'ResMgr',
    layer: 3, description: 'Web UI for CPU/RAM/GPU monitoring, alerts, process control',
    tech: ['WebSocket Client', 'Recharts', 'Process API'], language: 'typescript',
    status: 'planned', risk: 'medium', spof: false, license: 'BSL 1.1',
    dependsOn: ['express-server', 'forge-resource', 'telemetry'], providesTo: ['web-ui']
  },
  {
    id: 'telemetry', name: 'Telemetry Streaming', shortName: 'Telemetry',
    layer: 3, description: 'Prometheus native :5051/metrics, WS push, SQLite 30-day retention',
    tech: ['Prometheus Client', 'WebSocket Push', 'nvidia-dcgm'],
    language: 'typescript', status: 'planned', risk: 'medium', spof: false, license: 'BSL 1.1',
    port: '5051',
    dependsOn: ['express-server', 'sqlite', 'prometheus', 'dcgm-exporter', 'forge-resource'],
    providesTo: ['resource-mgr-ui', 'grafana', 'security-layer', 'mirror-test']
  },
  {
    id: 'security-layer', name: 'Security Layer', shortName: 'Security',
    layer: 3, description: 'HMAC signing, anomaly detection, MAC, audit trail hash chain, eBPF monitor',
    tech: ['HMAC-SHA256', 'AES-256-GCM', 'Rate Limits', 'Audit Chain'],
    language: 'typescript', status: 'planned', risk: 'critical', spof: true, license: 'BSL 1.1',
    dependsOn: ['express-server', 'postgres', 'redis', 'forge-resource', 'telemetry'],
    providesTo: ['forge-p2p', 'ai-lab-hub', 'mcp-explorer']
  },
  {
    id: 'billing', name: 'Billing & Subscriptions', shortName: 'Billing',
    layer: 3, description: 'Stripe integration: Free/Pro/Team/Enterprise tiers',
    tech: ['Stripe Subscriptions', 'Webhook Handler', 'Usage Tracking'],
    language: 'typescript', status: 'planned', risk: 'high', spof: true, license: 'BSL 1.1',
    dependsOn: ['express-server', 'stripe', 'postgres', 'redis'], providesTo: ['web-ui']
  },

  // ─── LAYER 4: MCP FABRIC ──────────────────────────────────────────────
  {
    id: 'mcp-host', name: 'MCP Host', shortName: 'Host',
    layer: 4, description: 'Connect external MCP servers as tool providers (Feature #12)',
    tech: ['MCP SDK', 'stdio/SSE Transport', 'Tool Registry'],
    language: 'typescript', status: 'ready', risk: 'medium', spof: true,
    dependsOn: ['express-server', 'redis', 'filesystem'], providesTo: ['mcp-explorer', 'forge-builder', 'mcp-sse']
  },
  {
    id: 'mcp-server', name: 'MCP Server (Forge)', shortName: 'Server',
    layer: 4, description: 'Expose Forge tools as MCP server at /mcp/sse: read_note, search_vault, etc.',
    tech: ['MCP Server SDK', 'SSE Transport'], language: 'typescript', status: 'ready',
    risk: 'low', spof: false, license: 'MIT',
    dependsOn: ['express-server', 'mcp-host'], providesTo: ['mcp-sse', 'forge-builder']
  },
  {
    id: 'mcp-sse', name: '/mcp/sse Endpoint', shortName: 'SSE',
    layer: 4, description: 'SSE transport for external MCP client connections',
    tech: ['SSE', 'MCP Transport'], language: 'typescript', status: 'ready',
    risk: 'low', spof: false,
    dependsOn: ['mcp-host', 'mcp-server'], providesTo: ['external-clients']
  },
  {
    id: 'external-clients', name: 'External MCP Clients', shortName: 'Clients',
    layer: 4, description: 'Third-party apps (Claude Desktop, Cursor, etc.) connecting via /mcp/sse',
    tech: ['Any MCP Client'], language: 'external', status: 'external',
    risk: 'low', spof: false,
    dependsOn: ['mcp-sse'], providesTo: []
  },

  // ─── LAYER 5: CORE ENGINE ─────────────────────────────────────────────
  {
    id: 'express-server', name: 'Express 4 Server', shortName: 'Express',
    layer: 5, description: 'HTTP server: routes, middleware, auth, static files, Swagger UI',
    tech: ['Express 4', 'Helmet', 'CORS', 'Swagger UI'], language: 'typescript',
    status: 'ready', risk: 'critical', spof: true, port: '5051', license: 'MIT',
    dependsOn: ['postgres', 'redis', 'jwt'], providesTo: ['web-ui', 'tui', 'cli', 'browser-ext', 'rest-api', 'trpc']
  },
  {
    id: 'trpc', name: 'tRPC v11', shortName: 'tRPC',
    layer: 5, description: 'Type-safe RPC between React frontend and Express backend',
    tech: ['tRPC v11', 'Zod'], language: 'typescript', status: 'ready',
    risk: 'medium', spof: false,
    dependsOn: ['express-server'], providesTo: ['web-ui']
  },
  {
    id: 'ws-server', name: 'WebSocket Server', shortName: 'WebSocket',
    layer: 5, description: 'Real-time: GPU stats (2s updates), chat streaming, workflow progress',
    tech: ['ws', 'Redis Pub/Sub Adapter'], language: 'typescript', status: 'ready',
    risk: 'medium', spof: false, port: '5051',
    dependsOn: ['express-server', 'redis'], providesTo: ['web-ui', 'tui']
  },
  {
    id: 'rest-api', name: 'REST API', shortName: 'REST',
    layer: 5, description: 'Public REST endpoints: /v1/chat/completions, /api/*, Swagger documented',
    tech: ['Express Routes', 'OpenAPI', 'Swagger UI'], language: 'typescript', status: 'ready',
    risk: 'low', spof: false,
    dependsOn: ['express-server'], providesTo: ['tui', 'cli']
  },
  {
    id: 'inference-proxy', name: 'LLM Proxy (MIT)', shortName: 'Proxy',
    layer: 5, description: 'Core proxy: route to any OpenAI-compatible provider, SSE streaming, fallback',
    tech: ['SSE', 'Token Counting', 'Usage Reporting'], language: 'typescript',
    status: 'ready', risk: 'critical', spof: true, port: '5051', license: 'MIT',
    dependsOn: ['express-server', 'circuit-breaker', 'fallback-router', 'llm-providers', 'forge-p2p'],
    providesTo: ['forge-builder', 'web-ui', 'tui']
  },
  {
    id: 'circuit-breaker', name: 'Circuit Breaker', shortName: 'CB',
    layer: 5, description: 'Redis-backed circuit breaker: auto-retry, fallback triggers',
    tech: ['Redis State', 'Threshold Config', 'Retry Logic'], language: 'typescript',
    status: 'ready', risk: 'critical', spof: true,
    dependsOn: ['redis'], providesTo: ['inference-proxy', 'fallback-router', 'forge-p2p']
  },
  {
    id: 'fallback-router', name: 'Fallback Router', shortName: 'Router',
    layer: 5, description: 'Multi-provider routing: cost-based, latency-based, geo-aware',
    tech: ['Routing Rules', 'Health Checks', 'Cost Engine'], language: 'typescript',
    status: 'ready', risk: 'high', spof: true,
    dependsOn: ['circuit-breaker', 'redis'], providesTo: ['inference-proxy']
  },
  {
    id: 'jwt', name: 'JWT Auth', shortName: 'JWT',
    layer: 5, description: 'Token signing, session management, device fingerprinting',
    tech: ['JWT', 'bcrypt', 'Device FP'], language: 'typescript', status: 'ready',
    risk: 'high', spof: true,
    dependsOn: ['postgres', 'redis'], providesTo: ['express-server', 'security-layer']
  },
  {
    id: 'llm-discoverer', name: 'LLM Discoverer', shortName: 'Discoverer',
    layer: 5, description: 'Auto-detect Ollama, llama.cpp, GGUF models on local system (Feature #10)',
    tech: ['File Watcher', 'Process Scanner', 'Model Parser'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'filesystem'], providesTo: ['ai-lab-hub']
  },
  {
    id: 'system-monitor', name: 'System Monitor', shortName: 'SysMon',
    layer: 5, description: 'WebSocket-based real-time system monitoring, 2s update interval (Feature #8)',
    tech: ['WebSocket', 'os module', 'GPU detection'], language: 'typescript',
    status: 'ready', risk: 'medium', spof: false,
    dependsOn: ['ws-server', 'filesystem'], providesTo: ['web-ui']
  },
  {
    id: 'huggingface-hub', name: 'HuggingFace Hub', shortName: 'HF',
    layer: 5, description: 'Search models, hardware compatibility check, download GGUF (Feature #5)',
    tech: ['HuggingFace API', 'GGUF Parser', 'Download Queue'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'filesystem'], providesTo: ['ai-lab-hub', 'model-mgr']
  },
  {
    id: 'model-mgr', name: 'Model Manager', shortName: 'ModelMgr',
    layer: 5, description: 'Download, manage, delete local models (Feature #7)',
    tech: ['File System', 'Process Control', 'Queue'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'filesystem'], providesTo: ['web-ui']
  },
  {
    id: 'local-load-balancer', name: 'Local Model Load Balancer', shortName: 'LB',
    layer: 5, description: 'GPU-aware load balancing, one active model at a time (Feature #2)',
    tech: ['GPU Monitor', 'Model Switching', 'Queue'], language: 'typescript',
    status: 'ready', risk: 'high', spof: true,
    dependsOn: ['express-server', 'filesystem'], providesTo: ['inference-proxy']
  },
  {
    id: 'process-mgr', name: 'Process Manager', shortName: 'PM2 GUI',
    layer: 5, description: 'PM2 process management GUI: start/stop/restart services (Feature #9)',
    tech: ['PM2 API', 'WebSocket', 'Process List'], language: 'typescript',
    status: 'ready', risk: 'medium', spof: false,
    dependsOn: ['express-server'], providesTo: ['web-ui']
  },
  {
    id: 'error-logger', name: 'Error Logger', shortName: 'Errors',
    layer: 5, description: 'Filter, expand, CSV export for error logs (Feature #18)',
    tech: ['File Watcher', 'PostgreSQL', 'CSV Export'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'postgres'], providesTo: ['web-ui']
  },
  {
    id: 'analytics', name: 'Analytics', shortName: 'Analytics',
    layer: 5, description: 'Request volume, top models, latency tracking (Feature #17)',
    tech: ['PostgreSQL Aggregation', 'Recharts', 'Time Series'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'postgres'], providesTo: ['web-ui']
  },
  {
    id: 'guardrails', name: 'Guardrails', shortName: 'Guard',
    layer: 5, description: 'PII detection, injection prevention, toxicity filtering (Feature #15)',
    tech: ['PII Detection', 'Regex Rules', 'Toxicity Model'], language: 'typescript',
    status: 'ready', risk: 'medium', spof: false,
    dependsOn: ['express-server', 'inference-proxy'], providesTo: ['web-ui']
  },
  {
    id: 'custom-providers', name: 'Custom Providers', shortName: 'Custom',
    layer: 5, description: 'Paste-any-API custom provider configuration (Feature #3)',
    tech: ['Provider Config', 'API Testing', 'Validation'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'postgres'], providesTo: ['ai-lab-hub', 'inference-proxy']
  },
  {
    id: 'access-control', name: 'Access Control', shortName: 'RBAC',
    layer: 5, description: 'Teams, roles, orgs, access groups (Feature #19)',
    tech: ['Role Engine', 'Group Policies', 'Org Hierarchy'], language: 'typescript',
    status: 'ready', risk: 'high', spof: true,
    dependsOn: ['express-server', 'postgres'], providesTo: ['web-ui']
  },
  {
    id: 'inference-lab', name: 'Inference Lab', shortName: 'Lab',
    layer: 5, description: 'Chat interface, GPU layer control, real-time stats (Feature #6)',
    tech: ['WebSocket', 'SSE Streaming', 'GPU Stats'], language: 'typescript',
    status: 'ready', risk: 'low', spof: false,
    dependsOn: ['express-server', 'ws-server', 'inference-proxy'], providesTo: ['web-ui']
  },

  // ─── LAYER 6: RUST RUNTIME ─────────────────────────────────────────────
  {
    id: 'forge-resource', name: 'forge-resource', shortName: 'Rust',
    layer: 6, description: 'Rust binary: eBPF, VRAM defrag, GPU stats, process control, intrusion detection',
    tech: ['Rust', 'aya (eBPF)', 'nvml', 'libc/nix', 'Unix Socket'],
    language: 'rust', status: 'planned', risk: 'high', spof: true,
    license: 'MIT',
    dependsOn: ['ubuntu', 'nvidia-gpu', 'filesystem'],
    providesTo: ['resource-mgr-ui', 'telemetry', 'security-layer']
  },

  // ─── LAYER 7: DATA PLANE ──────────────────────────────────────────────
  {
    id: 'postgres', name: 'PostgreSQL 17', shortName: 'PG',
    layer: 7, description: '14+ tables: users, teams, apiKeys, providers, requestHistory, etc.',
    tech: ['PostgreSQL 17', 'Drizzle ORM', 'Full-text Search', 'JSONB'],
    language: 'sql', status: 'ready', risk: 'critical', spof: true, port: '5434',
    dependsOn: ['docker'], providesTo: ['express-server', 'jwt', 'ai-lab-hub', 'forge-builder', 'tasks-rewards', 'launch-rewards', 'billing', 'security-layer', 'access-control']
  },
  {
    id: 'redis', name: 'Redis 7 Alpine', shortName: 'Redis',
    layer: 7, description: 'Circuit breaker state, rate limits, session cache, WS adapter, pub/sub',
    tech: ['Redis 7', 'ioredis', 'Pub/Sub', 'Sorted Sets', 'Key Expiry'],
    language: 'sql', status: 'ready', risk: 'critical', spof: true, port: '6379',
    dependsOn: ['docker'], providesTo: ['circuit-breaker', 'fallback-router', 'ws-server', 'security-layer', 'mcp-host', 'express-server', 'billing', 'forge-p2p']
  },
  {
    id: 'qdrant', name: 'Qdrant', shortName: 'Qdrant',
    layer: 7, description: 'Vector embeddings: Forge Builder memory, vault search',
    tech: ['Qdrant', 'Embeddings', 'Cosine Similarity'], language: 'sql',
    status: 'ready', risk: 'medium', spof: false, port: '6333',
    dependsOn: ['docker'], providesTo: ['forge-builder', 'native-vault']
  },
  {
    id: 'sqlite', name: 'SQLite (Telemetry)', shortName: 'SQLite',
    layer: 7, description: '30-day telemetry retention, historical graphs',
    tech: ['SQLite', 'better-sqlite3', 'Time-series'],
    language: 'sql', status: 'planned', risk: 'low', spof: false,
    dependsOn: ['filesystem'], providesTo: ['telemetry']
  },
  {
    id: 'filesystem', name: 'File System', shortName: 'FS',
    layer: 7, description: '~/.forge/vault/, ~/.forge/github/, config.yaml, persona.md, tools.json, skills/',
    tech: ['Node.js fs', 'Chokidar', 'YAML'], language: 'typescript',
    status: 'ready', risk: 'medium', spof: false,
    dependsOn: ['ubuntu'], providesTo: ['native-vault', 'github-explorer', 'mcp-host', 'forge-resource', 'sqlite']
  },

  // ─── LAYER 8: INFRASTRUCTURE ──────────────────────────────────────────
  {
    id: 'ubuntu', name: 'Ubuntu Linux', shortName: 'Ubuntu',
    layer: 8, description: 'Host OS: x86_64 or ARM64, kernel 5.15+ for eBPF, systemd',
    tech: ['Ubuntu 22.04/24.04', 'Kernel 5.15+', 'systemd'], language: 'yaml',
    status: 'ready', risk: 'low', spof: true,
    dependsOn: [], providesTo: ['docker', 'nvidia-gpu', 'filesystem', 'forge-resource']
  },
  {
    id: 'docker', name: 'Docker Compose', shortName: 'Docker',
    layer: 8, description: 'Container orchestration: app, PG17, Redis7, nginx, Ollama (optional)',
    tech: ['Docker', 'Compose', 'Health Checks', 'Volumes'],
    language: 'yaml', status: 'ready', risk: 'low', spof: true,
    dependsOn: ['ubuntu'], providesTo: ['postgres', 'redis', 'qdrant', 'nginx', 'ollama']
  },
  {
    id: 'nginx', name: 'nginx (alpine)', shortName: 'nginx',
    layer: 8, description: 'Reverse proxy: rate limiting, WebSocket upgrade, security headers, port 80',
    tech: ['nginx', 'Rate Limiting', 'WS Upgrade', 'SSL Termination'],
    language: 'yaml', status: 'ready', risk: 'medium', spof: true, port: '80',
    dependsOn: ['docker'], providesTo: ['express-server']
  },
  {
    id: 'ollama', name: 'Ollama (optional)', shortName: 'Ollama',
    layer: 8, description: 'Local LLM inference server, optional Docker profile',
    tech: ['Ollama', 'GGUF', 'CUDA/ROCm'], language: 'binary',
    status: 'ready', risk: 'low', spof: false, port: '11434',
    dependsOn: ['docker', 'nvidia-gpu'], providesTo: ['inference-proxy', 'llm-discoverer']
  },
  {
    id: 'nvidia-gpu', name: 'NVIDIA GPU + CUDA', shortName: 'GPU',
    layer: 8, description: 'RTX 3060+ with CUDA, VRAM, compute for local inference',
    tech: ['CUDA 12+', 'nvidia-driver', 'nvidia-container-toolkit'],
    language: 'binary', status: 'ready', risk: 'critical', spof: true,
    dependsOn: ['ubuntu'], providesTo: ['dcgm-exporter', 'forge-resource', 'ollama']
  },
  {
    id: 'pm2', name: 'PM2 + systemd', shortName: 'PM2',
    layer: 8, description: 'Process manager: qdrant, mcp-sse, mcp-gateway, ai-lab-dashboard, forge-studio',
    tech: ['PM2', 'ecosystem.services.cjs', 'systemd'],
    language: 'yaml', status: 'ready', risk: 'low', spof: false,
    dependsOn: ['ubuntu'], providesTo: ['express-server', 'qdrant']
  },
  {
    id: 'dcgm-exporter', name: 'nvidia-dcgm-exporter', shortName: 'DCGM',
    layer: 8, description: 'GPU metrics exporter for Prometheus: VRAM, temp, utilization',
    tech: ['DCGM', 'Prometheus Exporter'], language: 'binary',
    status: 'ready', risk: 'low', spof: false, port: '9400',
    dependsOn: ['docker', 'nvidia-gpu'], providesTo: ['prometheus']
  },
  {
    id: 'prometheus', name: 'Prometheus', shortName: 'Prom',
    layer: 8, description: 'Metrics collection planned for Phase 4 (Telemetry)',
    tech: ['Prometheus', 'Alertmanager', 'Scrape Config'],
    language: 'yaml', status: 'planned', risk: 'medium', spof: false, port: '9090',
    dependsOn: ['docker', 'dcgm-exporter'], providesTo: ['grafana', 'telemetry']
  },
  {
    id: 'grafana', name: 'Grafana', shortName: 'Grafana',
    layer: 8, description: 'Pre-configured dashboards for GPU, system, and inference metrics',
    tech: ['Grafana', 'Dashboard JSON', 'Prometheus DS'],
    language: 'yaml', status: 'planned', risk: 'low', spof: false, port: '3001',
    dependsOn: ['docker', 'prometheus', 'telemetry'], providesTo: ['web-ui']
  },
];

// ============================================================================
// EDGES (106 connections)
// ============================================================================
export const EDGES: ForgeEdge[] = [
  // ─── EXTERNAL → APPLICATION ──────────────────────────────────────────
  { id: 'e01', from: 'llm-providers', to: 'inference-proxy', type: 'network', label: 'OpenAI-compatible API', critical: true },
  { id: 'e02', from: 'llm-providers', to: 'ai-lab-hub', type: 'network', label: 'Model discovery', critical: true },
  { id: 'e03', from: 'llm-providers', to: 'custom-providers', type: 'network', label: 'Provider templates', critical: false },
  { id: 'e04', from: 'stripe', to: 'billing', type: 'api', label: 'Subscriptions', critical: true },
  { id: 'e05', from: 'stripe', to: 'tasks-rewards', type: 'api', label: 'Credits', critical: false },
  { id: 'e06', from: 'stripe', to: 'launch-rewards', type: 'api', label: 'Tier perks', critical: false },
  { id: 'e07', from: 'stripe', to: 'buyback-flywheel', type: 'data', label: 'Revenue data', critical: false },
  { id: 'e08', from: 'github-api', to: 'github-explorer', type: 'api', label: 'REST/GraphQL', critical: true },
  { id: 'e09', from: 'mcp-registries', to: 'mcp-explorer', type: 'api', label: 'Server catalog', critical: false },
  { id: 'e10', from: 'cloud-users', to: 'web-ui', type: 'network', label: 'HTTPS', critical: true },
  { id: 'e11', from: 'cloud-users', to: 'tui', type: 'network', label: 'SSH/Local', critical: false },
  { id: 'e12', from: 'cloud-users', to: 'cli', type: 'process', label: 'CLI commands', critical: false },

  // ─── UI → CORE ───────────────────────────────────────────────────────
  { id: 'e13', from: 'web-ui', to: 'express-server', type: 'api', label: 'tRPC/REST', critical: true },
  { id: 'e14', from: 'web-ui', to: 'trpc', type: 'api', label: 'Type-safe RPC', critical: true },
  { id: 'e15', from: 'web-ui', to: 'ws-server', type: 'event', label: 'Real-time', critical: true },
  { id: 'e16', from: 'tui', to: 'ws-server', type: 'event', label: 'WebSocket', critical: true },
  { id: 'e17', from: 'tui', to: 'rest-api', type: 'api', label: 'REST', critical: true },
  { id: 'e18', from: 'cli', to: 'express-server', type: 'api', label: 'HTTP', critical: true },
  { id: 'e19', from: 'browser-ext', to: 'express-server', type: 'api', label: 'Background API', critical: false },

  // ─── APPLICATION → SERVICES ──────────────────────────────────────────
  { id: 'e20', from: 'forge-builder', to: 'express-server', type: 'api', label: 'Workflow API', critical: true },
  { id: 'e21', from: 'forge-builder', to: 'qdrant', type: 'data', label: 'Vector memory', critical: true },
  { id: 'e22', from: 'forge-builder', to: 'mcp-host', type: 'api', label: 'Use MCP tools', critical: true },
  { id: 'e23', from: 'forge-builder', to: 'inference-proxy', type: 'api', label: 'LLM calls via proxy', critical: true },
  { id: 'e24', from: 'tasks-rewards', to: 'express-server', type: 'api', label: 'Task API', critical: false },
  { id: 'e25', from: 'tasks-rewards', to: 'postgres', type: 'data', label: 'tasks table', critical: false },
  { id: 'e26', from: 'launch-rewards', to: 'express-server', type: 'api', label: 'Engagement API', critical: false },
  { id: 'e27', from: 'launch-rewards', to: 'postgres', type: 'data', label: 'user_engagement', critical: false },
  { id: 'e28', from: 'forge-p2p', to: 'express-server', type: 'api', label: 'Peer discovery', critical: false },
  { id: 'e29', from: 'forge-p2p', to: 'circuit-breaker', type: 'api', label: 'Fallback to peers', critical: true },
  { id: 'e30', from: 'forge-p2p', to: 'redis', type: 'data', label: 'Peer state', critical: false },
  { id: 'e31', from: 'forge-p2p', to: 'security-layer', type: 'api', label: 'TLS/mutual auth', critical: true },
  { id: 'e32', from: 'forge-p2p', to: 'inference-proxy', type: 'network', label: 'P2P routing', critical: false, bidirectional: true },
  { id: 'e33', from: 'buyback-flywheel', to: 'stripe', type: 'data', label: 'Revenue', critical: false },
  { id: 'e34', from: 'buyback-flywheel', to: 'postgres', type: 'data', label: 'Token ledger', critical: false },
  { id: 'e35', from: 'mirror-test', to: 'github-explorer', type: 'api', label: 'Read own code', critical: false },
  { id: 'e36', from: 'mirror-test', to: 'native-vault', type: 'file', label: 'Store docs', critical: false },
  { id: 'e37', from: 'mirror-test', to: 'forge-builder', type: 'api', label: 'Modify workflows', critical: false },
  { id: 'e38', from: 'mirror-test', to: 'telemetry', type: 'data', label: 'Monitor self', critical: false },

  // ─── SERVICES → CORE/MCP ────────────────────────────────────────────
  { id: 'e39', from: 'ai-lab-hub', to: 'express-server', type: 'api', label: 'Hub API', critical: true },
  { id: 'e40', from: 'ai-lab-hub', to: 'postgres', type: 'data', label: 'Saved providers', critical: true },
  { id: 'e41', from: 'mcp-explorer', to: 'express-server', type: 'api', label: 'Explorer API', critical: true },
  { id: 'e42', from: 'mcp-explorer', to: 'mcp-host', type: 'api', label: 'Connect server', critical: true },
  { id: 'e43', from: 'mcp-explorer', to: 'postgres', type: 'data', label: 'Rankings', critical: false },
  { id: 'e44', from: 'mcp-explorer', to: 'redis', type: 'data', label: 'Health cache', critical: false },
  { id: 'e45', from: 'native-vault', to: 'express-server', type: 'api', label: 'Vault API', critical: true },
  { id: 'e46', from: 'native-vault', to: 'filesystem', type: 'file', label: 'Markdown files', critical: true },
  { id: 'e47', from: 'native-vault', to: 'postgres', type: 'data', label: 'Full-text search', critical: false },
  { id: 'e48', from: 'native-vault', to: 'qdrant', type: 'data', label: 'Vector search', critical: false },
  { id: 'e49', from: 'github-explorer', to: 'express-server', type: 'api', label: 'Explorer API', critical: true },
  { id: 'e50', from: 'github-explorer', to: 'filesystem', type: 'file', label: 'Clone to ~/.forge/github/', critical: true },
  { id: 'e51', from: 'resource-mgr-ui', to: 'express-server', type: 'api', label: 'Manager API', critical: true },
  { id: 'e52', from: 'resource-mgr-ui', to: 'forge-resource', type: 'process', label: 'spawn Unix socket', critical: true },
  { id: 'e53', from: 'resource-mgr-ui', to: 'telemetry', type: 'data', label: 'Metrics display', critical: true },
  { id: 'e54', from: 'telemetry', to: 'express-server', type: 'api', label: 'Telemetry API', critical: false },
  { id: 'e55', from: 'telemetry', to: 'sqlite', type: 'data', label: '30-day store', critical: false },
  { id: 'e56', from: 'telemetry', to: 'prometheus', type: 'data', label: 'Scrape :5051/metrics', critical: true },
  { id: 'e57', from: 'telemetry', to: 'dcgm-exporter', type: 'data', label: 'GPU metrics', critical: true },
  { id: 'e58', from: 'telemetry', to: 'forge-resource', type: 'process', label: 'System stats', critical: true },
  { id: 'e59', from: 'security-layer', to: 'express-server', type: 'api', label: 'Security middleware', critical: true },
  { id: 'e60', from: 'security-layer', to: 'postgres', type: 'data', label: 'Audit trail (hash chain)', critical: true },
  { id: 'e61', from: 'security-layer', to: 'redis', type: 'data', label: 'Rate limits, anomaly', critical: true },
  { id: 'e62', from: 'security-layer', to: 'forge-resource', type: 'process', label: 'eBPF events', critical: true },
  { id: 'e63', from: 'security-layer', to: 'telemetry', type: 'data', label: 'Baseline profiling', critical: false },
  { id: 'e64', from: 'billing', to: 'express-server', type: 'api', label: 'Billing API', critical: true },
  { id: 'e65', from: 'billing', to: 'postgres', type: 'data', label: 'Subscriptions', critical: true },
  { id: 'e66', from: 'billing', to: 'redis', type: 'data', label: 'Usage cache', critical: false },

  // ─── MCP → CORE ─────────────────────────────────────────────────────
  { id: 'e67', from: 'mcp-host', to: 'express-server', type: 'api', label: 'Host API', critical: true },
  { id: 'e68', from: 'mcp-host', to: 'redis', type: 'data', label: 'Connection state', critical: false },
  { id: 'e69', from: 'mcp-host', to: 'filesystem', type: 'file', label: 'Server configs', critical: false },
  { id: 'e70', from: 'mcp-server', to: 'express-server', type: 'api', label: 'Server transport', critical: true },
  { id: 'e71', from: 'mcp-server', to: 'mcp-host', type: 'api', label: 'MCP tools registry', critical: true },
  { id: 'e72', from: 'mcp-sse', to: 'mcp-host', type: 'api', label: 'Forward to host', critical: true },
  { id: 'e73', from: 'mcp-sse', to: 'mcp-server', type: 'api', label: 'Forward to server', critical: true },
  { id: 'e74', from: 'external-clients', to: 'mcp-sse', type: 'network', label: 'SSE connect', critical: false },

  // ─── CORE INTERNAL ──────────────────────────────────────────────────
  { id: 'e75', from: 'express-server', to: 'postgres', type: 'data', label: 'All persistent data', critical: true },
  { id: 'e76', from: 'express-server', to: 'redis', type: 'data', label: 'Cache, sessions', critical: true },
  { id: 'e77', from: 'trpc', to: 'express-server', type: 'api', label: 'Mounted on Express', critical: true },
  { id: 'e78', from: 'ws-server', to: 'express-server', type: 'api', label: 'Mounted on Express', critical: true },
  { id: 'e79', from: 'ws-server', to: 'redis', type: 'data', label: 'Pub/Sub adapter', critical: true },
  { id: 'e80', from: 'rest-api', to: 'express-server', type: 'api', label: 'REST routes', critical: true },
  { id: 'e81', from: 'inference-proxy', to: 'express-server', type: 'api', label: 'Mounted route', critical: true },
  { id: 'e82', from: 'inference-proxy', to: 'circuit-breaker', type: 'api', label: 'Health check', critical: true },
  { id: 'e83', from: 'inference-proxy', to: 'fallback-router', type: 'api', label: 'Route to provider', critical: true },
  { id: 'e84', from: 'circuit-breaker', to: 'redis', type: 'data', label: 'State storage', critical: true },
  { id: 'e85', from: 'fallback-router', to: 'circuit-breaker', type: 'api', label: 'Fallback trigger', critical: true },
  { id: 'e86', from: 'fallback-router', to: 'redis', type: 'data', label: 'Routing rules', critical: true },
  { id: 'e87', from: 'jwt', to: 'postgres', type: 'data', label: 'User lookup', critical: true },
  { id: 'e88', from: 'jwt', to: 'redis', type: 'data', label: 'Session cache', critical: true },
  { id: 'e89', from: 'llm-discoverer', to: 'filesystem', type: 'file', label: 'Scan models', critical: false },
  { id: 'e90', from: 'llm-discoverer', to: 'ai-lab-hub', type: 'data', label: 'Found models', critical: true },
  { id: 'e91', from: 'system-monitor', to: 'ws-server', type: 'event', label: 'Push stats', critical: true },
  { id: 'e92', from: 'system-monitor', to: 'filesystem', type: 'process', label: 'OS stats', critical: true },
  { id: 'e93', from: 'huggingface-hub', to: 'express-server', type: 'api', label: 'HF API proxy', critical: false },
  { id: 'e94', from: 'huggingface-hub', to: 'model-mgr', type: 'data', label: 'Download queue', critical: false },
  { id: 'e95', from: 'model-mgr', to: 'filesystem', type: 'file', label: 'Model files', critical: true },
  { id: 'e96', from: 'local-load-balancer', to: 'inference-proxy', type: 'api', label: 'GPU allocation', critical: true },
  { id: 'e97', from: 'local-load-balancer', to: 'filesystem', type: 'process', label: 'Model switching', critical: true },
  { id: 'e98', from: 'process-mgr', to: 'express-server', type: 'api', label: 'PM2 API', critical: false },
  { id: 'e99', from: 'error-logger', to: 'postgres', type: 'data', label: 'Error logs', critical: false },
  { id: 'e100', from: 'analytics', to: 'postgres', type: 'data', label: 'Aggregations', critical: false },
  { id: 'e101', from: 'guardrails', to: 'inference-proxy', type: 'api', label: 'Filter requests', critical: true },
  { id: 'e102', from: 'custom-providers', to: 'inference-proxy', type: 'api', label: 'Custom routes', critical: false },
  { id: 'e103', from: 'access-control', to: 'postgres', type: 'data', label: 'RBAC policies', critical: true },
  { id: 'e104', from: 'inference-lab', to: 'ws-server', type: 'event', label: 'Stream tokens', critical: true },
  { id: 'e105', from: 'inference-lab', to: 'inference-proxy', type: 'api', label: 'Chat completions', critical: true },

  // ─── RUST → DATA/INFRA ──────────────────────────────────────────────
  { id: 'e106', from: 'forge-resource', to: 'ubuntu', type: 'depends', label: 'syscalls', critical: true },
  { id: 'e107', from: 'forge-resource', to: 'nvidia-gpu', type: 'depends', label: 'nvml', critical: true },
  { id: 'e108', from: 'forge-resource', to: 'filesystem', type: 'file', label: 'Config/logs', critical: false },

  // ─── DATA → INFRA ───────────────────────────────────────────────────
  { id: 'e109', from: 'postgres', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e110', from: 'redis', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e111', from: 'qdrant', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e112', from: 'sqlite', to: 'filesystem', type: 'file', label: 'DB file', critical: false },
  { id: 'e113', from: 'filesystem', to: 'ubuntu', type: 'depends', label: 'OS fs', critical: true },

  // ─── INFRA INTERNAL ─────────────────────────────────────────────────
  { id: 'e114', from: 'docker', to: 'ubuntu', type: 'depends', label: 'Host OS', critical: true },
  { id: 'e115', from: 'nginx', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e116', from: 'nginx', to: 'express-server', type: 'network', label: 'Reverse proxy :5051', critical: true },
  { id: 'e117', from: 'ollama', to: 'docker', type: 'depends', label: 'Container (optional)', critical: false },
  { id: 'e118', from: 'nvidia-gpu', to: 'ubuntu', type: 'depends', label: 'Driver + CUDA', critical: true },
  { id: 'e119', from: 'pm2', to: 'ubuntu', type: 'depends', label: 'systemd', critical: true },
  { id: 'e120', from: 'pm2', to: 'express-server', type: 'process', label: 'Manage process', critical: true },
  { id: 'e121', from: 'dcgm-exporter', to: 'docker', type: 'depends', label: 'Container', critical: false },
  { id: 'e122', from: 'dcgm-exporter', to: 'nvidia-gpu', type: 'depends', label: 'GPU access', critical: true },
  { id: 'e123', from: 'prometheus', to: 'docker', type: 'depends', label: 'Container', critical: false },
  { id: 'e124', from: 'prometheus', to: 'dcgm-exporter', type: 'data', label: 'Scrape :9400', critical: false },
  { id: 'e125', from: 'grafana', to: 'docker', type: 'depends', label: 'Container', critical: false },
  { id: 'e126', from: 'grafana', to: 'prometheus', type: 'data', label: 'Data source', critical: false },
  { id: 'e127', from: 'grafana', to: 'telemetry', type: 'data', label: 'Forge metrics', critical: false },
];

// ============================================================================
// BUILD PHASES (16-week roadmap, 10 phases)
// ============================================================================
export const BUILD_PHASES: BuildPhase[] = [
  {
    phase: 1, name: 'Native Routing (Remove LiteLLM)', weeks: 2,
    components: ['inference-proxy', 'circuit-breaker', 'fallback-router', 'guardrails', 'custom-providers'],
    deliverables: ['Native circuit breaker', 'Multi-provider fallback', 'No LiteLLM dependency', 'Enhanced guardrails'],
    dependencies: ['express-server', 'redis'],
  },
  {
    phase: 2, name: 'Rust Resource Manager', weeks: 2,
    components: ['forge-resource'],
    deliverables: ['forge-resource binary', 'eBPF monitoring', 'GPU stats', 'VRAM defrag', 'Process control'],
    dependencies: ['ubuntu', 'nvidia-gpu'],
  },
  {
    phase: 3, name: 'MCP Explorer + Native Vault', weeks: 2,
    components: ['mcp-explorer', 'native-vault', 'mcp-server'],
    deliverables: ['Registry aggregation', 'One-click MCP connect', 'Markdown vault + backlinks', '/mcp/sse enhancement'],
    dependencies: ['express-server', 'redis', 'mcp-registries', 'filesystem'],
    parallel: ['ai-lab-hub'],
  },
  {
    phase: 4, name: 'Security + Telemetry', weeks: 2,
    components: ['security-layer', 'telemetry', 'sqlite', 'prometheus', 'dcgm-exporter', 'grafana'],
    deliverables: ['HMAC signing', 'Audit trail hash chain', ':5051/metrics endpoint', 'Grafana dashboards'],
    dependencies: ['forge-resource', 'postgres', 'redis'],
  },
  {
    phase: 5, name: 'Billing + Rewards', weeks: 2,
    components: ['billing', 'tasks-rewards', 'launch-rewards', 'buyback-flywheel'],
    deliverables: ['Stripe integration', 'Free/Pro/Team/Enterprise tiers', 'Task gamification', 'Launch rewards tiers'],
    dependencies: ['stripe', 'express-server', 'postgres', 'redis'],
  },
  {
    phase: 6, name: 'GitHub Repo Explorer', weeks: 1,
    components: ['github-explorer'],
    deliverables: ['Browse/clone repos', 'Issues/PRs view', 'Trigger Actions', 'File explorer'],
    dependencies: ['express-server', 'github-api', 'filesystem'],
  },
  {
    phase: 7, name: 'TUI (Go + BubbleTea)', weeks: 2,
    components: ['tui', 'cli'],
    deliverables: ['forge-tui binary', 'GPU graphs', 'Chat panel', 'Workflow runner', 'CLI commands'],
    dependencies: ['ws-server', 'rest-api'],
    parallel: ['browser-ext'],
  },
  {
    phase: 8, name: 'Forge-to-Forge P2P', weeks: 1,
    components: ['forge-p2p'],
    deliverables: ['Peer discovery', 'Compute marketplace', 'Reputation scores', 'P2P routing'],
    dependencies: ['circuit-breaker', 'redis', 'security-layer'],
  },
  {
    phase: 9, name: 'Launch Rewards + Cloud', weeks: 1,
    components: ['launch-rewards'],
    deliverables: ['30-day tier system', 'Cloud hosted app.forge.studio', 'CDN deployment'],
    dependencies: ['stripe', 'billing', 'nginx'],
  },
  {
    phase: 10, name: 'Mirror Test', weeks: 1,
    components: ['mirror-test', 'resource-mgr-ui'],
    deliverables: ['Self-hosting proof', 'Forge manages itself', 'End-to-end test', 'Performance benchmarks'],
    dependencies: ['github-explorer', 'native-vault', 'forge-builder', 'telemetry'],
  },
];

// ============================================================================
// DATABASE SCHEMAS (14 current + 5 planned = 19 tables)
// ============================================================================
export const DB_TABLES: DBTable[] = [
  // ─── CURRENT TABLES (from drizzle/schema.ts) ──────────────────────────
  {
    name: 'users', store: 'PostgreSQL', purpose: 'User accounts, roles, org membership',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'email', type: 'VARCHAR UNIQUE' },
      { name: 'password_hash', type: 'VARCHAR', note: 'bcrypt' },
      { name: 'role', type: 'ENUM(user,admin)' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'teams', store: 'PostgreSQL', purpose: 'Team membership, team-scoped access',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'org_id', type: 'UUID FK → organizations' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'organizations', store: 'PostgreSQL', purpose: 'Organization hierarchy',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'owner_id', type: 'UUID FK → users' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'apiKeys', store: 'PostgreSQL', purpose: 'API key management, virtual keys',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'key_hash', type: 'VARCHAR', note: 'SHA-256' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'revoked', type: 'BOOLEAN' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'virtualKeys', store: 'PostgreSQL', purpose: 'Virtual API keys with budget, rate limits, model restrictions, expiry (Feature #14)',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'key_hash', type: 'VARCHAR', note: 'SHA-256' },
      { name: 'device_fp', type: 'VARCHAR', note: 'fingerprint' },
      { name: 'spending_limit', type: 'INTEGER' },
      { name: 'model_restrictions', type: 'JSONB' },
      { name: 'rate_limit', type: 'INTEGER' },
      { name: 'expires_at', type: 'TIMESTAMP', note: 'nullable' },
      { name: 'revoked', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'providers', store: 'PostgreSQL', purpose: 'LLM provider configurations (Feature #3)',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'base_url', type: 'VARCHAR' },
      { name: 'api_key_encrypted', type: 'TEXT' },
      { name: 'models', type: 'JSONB' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'requestHistory', store: 'PostgreSQL', purpose: 'LLM request logging, tokens, latency (Feature #17)',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'model', type: 'VARCHAR' },
      { name: 'provider', type: 'VARCHAR' },
      { name: 'prompt_tokens', type: 'INTEGER' },
      { name: 'completion_tokens', type: 'INTEGER' },
      { name: 'latency_ms', type: 'INTEGER' },
      { name: 'status', type: 'ENUM(success,error)' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'budgetLimits', store: 'PostgreSQL', purpose: 'Per-team budget tracking (Feature #16)',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'team_id', type: 'UUID FK → teams' },
      { name: 'monthly_limit', type: 'INTEGER' },
      { name: 'current_spend', type: 'INTEGER' },
      { name: 'reset_date', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'auditLogs', store: 'PostgreSQL', purpose: 'Immutable audit trail',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'action', type: 'VARCHAR' },
      { name: 'resource', type: 'VARCHAR' },
      { name: 'ip_address', type: 'VARCHAR' },
      { name: 'hash', type: 'VARCHAR', note: 'chain hash' },
      { name: 'prev_hash', type: 'VARCHAR', note: 'previous log hash' },
      { name: 'created_at', type: 'TIMESTAMP', note: 'write-only' },
    ],
  },
  {
    name: 'accessGroups', store: 'PostgreSQL', purpose: 'Access group policies (Feature #19)',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'permissions', type: 'JSONB' },
      { name: 'team_id', type: 'UUID FK → teams' },
    ],
  },
  {
    name: 'mcpServers', store: 'PostgreSQL', purpose: 'Connected MCP server configurations (Feature #12)',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'transport', type: 'ENUM(stdio,sse)' },
      { name: 'config', type: 'JSONB' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'skills', store: 'PostgreSQL', purpose: 'Filesystem-based skill definitions (Feature #13)',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'file_path', type: 'VARCHAR' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'guardrails', store: 'PostgreSQL', purpose: 'Guardrail rule definitions (Feature #15)',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'type', type: 'ENUM(pii,injection,toxicity)' },
      { name: 'rules', type: 'JSONB' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'policies', store: 'PostgreSQL', purpose: 'Access control policies (Feature #19)',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'effect', type: 'ENUM(allow,deny)' },
      { name: 'conditions', type: 'JSONB' },
      { name: 'priority', type: 'INTEGER' },
    ],
  },

  // ─── PLANNED TABLES ──────────────────────────────────────────────────
  {
    name: 'tasks', store: 'PostgreSQL', purpose: 'Task definitions for gamification',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'title', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'points', type: 'INTEGER' },
      { name: 'category', type: 'VARCHAR' },
      { name: 'is_recurring', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'user_tasks', store: 'PostgreSQL', purpose: 'User task completion tracking',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'task_id', type: 'UUID FK → tasks' },
      { name: 'completed_at', type: 'TIMESTAMP' },
      { name: 'points_earned', type: 'INTEGER' },
    ],
  },
  {
    name: 'user_engagement', store: 'PostgreSQL', purpose: 'Launch rewards engagement tracking',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'tier', type: 'ENUM(bronze,silver,gold,platinum)' },
      { name: 'points', type: 'INTEGER' },
      { name: 'referrals', type: 'INTEGER' },
      { name: 'current_streak', type: 'INTEGER' },
      { name: 'started_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'vault_entries', store: 'PostgreSQL', purpose: 'Vault document metadata and backlinks',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'title', type: 'VARCHAR' },
      { name: 'file_path', type: 'VARCHAR' },
      { name: 'tags', type: 'JSONB' },
      { name: 'backlinks', type: 'JSONB' },
      { name: 'embedding_id', type: 'VARCHAR', note: 'Qdrant reference' },
      { name: 'updated_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'telemetry_points', store: 'SQLite', purpose: 'Time-series telemetry data (30-day retention)',
    critical: false,
    columns: [
      { name: 'id', type: 'INTEGER PK', note: 'autoincrement' },
      { name: 'metric_name', type: 'VARCHAR' },
      { name: 'value', type: 'REAL' },
      { name: 'labels', type: 'TEXT', note: 'JSON' },
      { name: 'recorded_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'workflows', store: 'PostgreSQL', purpose: 'Forge Builder workflow definitions',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'dag', type: 'JSONB', note: 'DAG definition' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'is_active', type: 'BOOLEAN' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
];

// ============================================================================
// DERIVED DATA + HELPERS
// ============================================================================
export const SPOF_NODES = NODES.filter(n => n.spof);
export const CRITICAL_EDGES = EDGES.filter(e => e.critical);
export const RISK_CRITICAL = NODES.filter(n => n.risk === 'critical');

export function getNodeById(id: string): ForgeNode | undefined {
  return NODES.find(n => n.id === id);
}

export function getNodesByLayer(layerId: number): ForgeNode[] {
  return NODES.filter(n => n.layer === layerId);
}

export function getEdgesForNode(nodeId: string): ForgeEdge[] {
  return EDGES.filter(e => e.from === nodeId || e.to === nodeId);
}

export function getUpstreamDeps(nodeId: string): ForgeNode[] {
  const node = getNodeById(nodeId);
  if (!node) return [];
  return node.dependsOn.map(id => getNodeById(id)).filter((n): n is ForgeNode => !!n);
}

export function getDownstreamDeps(nodeId: string): ForgeNode[] {
  const node = getNodeById(nodeId);
  if (!node) return [];
  return node.providesTo.map(id => getNodeById(id)).filter((n): n is ForgeNode => !!n);
}

// ============================================================================
// STYLE CONSTANTS
// ============================================================================
export const EDGE_COLORS: Record<EdgeType, string> = {
  data: '#FBBF24',
  api: '#38BDF8',
  file: '#A78BFA',
  process: '#F472B6',
  depends: '#6B7280',
  network: '#00FFB2',
  event: '#FB923C',
  config: '#94A3B8',
};

export const LANGUAGE_COLORS: Record<Language, string> = {
  typescript: '#3178C6',
  rust: '#DEA584',
  go: '#00ADD8',
  sql: '#F59E0B',
  yaml: '#6B7280',
  external: '#A78BFA',
  binary: '#EF4444',
  python: '#3572A5',
};

export const STATUS_STYLES: Record<NodeStatus, { label: string; color: string; dot: string }> = {
  ready: { label: 'Ready', color: '#00FFB2', dot: 'bg-[#00FFB2]' },
  building: { label: 'Building', color: '#FBBF24', dot: 'bg-[#FBBF24]' },
  planned: { label: 'Planned', color: '#38BDF8', dot: 'bg-[#38BDF8]' },
  external: { label: 'External', color: '#A78BFA', dot: 'bg-[#A78BFA]' },
  concept: { label: 'Concept', color: '#F472B6', dot: 'bg-[#F472B6]' },
};

export const RISK_STYLES: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#EF4444', bg: 'bg-red-500/10' },
  high: { label: 'High', color: '#FB923C', bg: 'bg-orange-500/10' },
  medium: { label: 'Medium', color: '#FBBF24', bg: 'bg-yellow-500/10' },
  low: { label: 'Low', color: '#00FFB2', bg: 'bg-[#00FFB2]/10' },
};

export const TREE_STATS = {
  totalNodes: NODES.length,
  totalEdges: EDGES.length,
  totalLayers: LAYERS.length,
  dbTables: DB_TABLES.length,
  totalBuildWeeks: BUILD_PHASES.reduce((s, p) => s + p.weeks, 0),
  buildPhases: BUILD_PHASES.length,
  spofCount: SPOF_NODES.length,
  criticalEdges: CRITICAL_EDGES.length,
  criticalNodes: RISK_CRITICAL.length,
  readyComponents: NODES.filter(n => n.status === 'ready').length,
  plannedComponents: NODES.filter(n => n.status === 'planned').length,
  buildingComponents: NODES.filter(n => n.status === 'building').length,
  mitComponents: NODES.filter(n => n.license === 'MIT').length,
  bslComponents: NODES.filter(n => n.license === 'BSL 1.1').length,
};
