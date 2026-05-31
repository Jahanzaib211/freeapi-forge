// ============================================================================
// FORGE STUDIO — DEPENDENCY TREE DATA
// Ultimate AI Lab Level Dependency Map (20 DevOps Engineers Style)
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
  spof: boolean;        // single point of failure
  license?: string;
  port?: string | number;
  dependsOn: string[];  // node ids this depends on
  providesTo: string[]; // node ids this provides to
}

export interface ForgeEdge {
  id: string;
  from: string;   // source node id
  to: string;     // target node id
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
  { id: 0, name: 'External Integrations', subtitle: 'Third-party APIs & registries', color: '#A78BFA', bgColor: 'rgba(167,139,250,0.06)' },
  { id: 1, name: 'User Interfaces', subtitle: 'Web · Terminal · CLI · Browser', color: '#F472B6', bgColor: 'rgba(244,114,182,0.06)' },
  { id: 2, name: 'Application Logic', subtitle: 'Builder · Rewards · P2P · Flywheel', color: '#34D399', bgColor: 'rgba(52,211,153,0.06)' },
  { id: 3, name: 'Platform Services', subtitle: 'Explorer · Vault · Security · Telemetry', color: '#38BDF8', bgColor: 'rgba(56,189,248,0.06)' },
  { id: 4, name: 'MCP Fabric', subtitle: 'Host · Server · Explorer · SSE', color: '#C084FC', bgColor: 'rgba(192,132,252,0.06)' },
  { id: 5, name: 'Core Engine', subtitle: 'Proxy · Router · Circuit Breaker · Transport', color: '#00FFB2', bgColor: 'rgba(0,255,178,0.06)' },
  { id: 6, name: 'Rust Runtime', subtitle: 'Native system-level resource manager', color: '#DEA584', bgColor: 'rgba(222,165,132,0.06)' },
  { id: 7, name: 'Data Plane', subtitle: 'PostgreSQL · Redis · Qdrant · SQLite · FS', color: '#FBBF24', bgColor: 'rgba(251,191,36,0.06)' },
  { id: 8, name: 'Infrastructure', subtitle: 'Ubuntu · Docker · GPU · Networking', color: '#6B7280', bgColor: 'rgba(107,114,128,0.06)' },
];

// ============================================================================
// NODES (50+ components)
// ============================================================================
export const NODES: ForgeNode[] = [
  // ─── LAYER 0: EXTERNAL ─────────────────────────────────────────────────
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
    layer: 0, description: 'Glama (6k+), Smithery (21.5k+), Official registry',
    tech: ['Glama API', 'Smithery API', 'MCP Registry'], language: 'external', status: 'external',
    risk: 'low', spof: false,
    dependsOn: [], providesTo: ['mcp-explorer']
  },
  {
    id: 'llm-providers', name: 'LLM Providers', shortName: 'LLMs',
    layer: 0, description: 'OpenAI, DeepSeek, Groq, Together, OpenRouter, Mistral, Gemini',
    tech: ['OpenAI API', 'Anthropic API', 'DeepSeek', 'Groq', 'Together', 'OpenRouter', 'Mistral', 'Gemini'],
    language: 'external', status: 'external', risk: 'medium', spof: false,
    dependsOn: [], providesTo: ['inference-proxy', 'api-explorer']
  },
  {
    id: 'cloud-users', name: 'Cloud Users', shortName: 'Users',
    layer: 0, description: 'End users accessing app.forge.studio',
    tech: ['Browser', 'HTTPS', 'CDN'], language: 'external', status: 'external',
    risk: 'low', spof: false,
    dependsOn: [], providesTo: ['web-ui', 'tui', 'cli']
  },

  // ─── LAYER 1: USER INTERFACES ─────────────────────────────────────────
  {
    id: 'web-ui', name: 'Web UI', shortName: 'React UI',
    layer: 1, description: 'Full web dashboard: React 19 + Tailwind + shadcn/ui',
    tech: ['React 19', 'Tailwind CSS', 'shadcn/ui', 'CodeMirror 6', 'D3.js', 'Recharts'],
    language: 'typescript', status: 'building', risk: 'low', spof: false, port: '5050',
    dependsOn: ['express-server', 'trpc', 'ws-server'], providesTo: ['cloud-users']
  },
  {
    id: 'tui', name: 'Terminal UI', shortName: 'TUI',
    layer: 1, description: 'Go + BubbleTea single binary: GPU graphs, chat, MCP, workflows',
    tech: ['Go', 'BubbleTea', 'Glamour', 'Tview'], language: 'go', status: 'planned',
    risk: 'medium', spof: false,
    dependsOn: ['ws-server', 'rest-api'], providesTo: ['cloud-users']
  },
  {
    id: 'cli', name: 'CLI (forge)', shortName: 'CLI',
    layer: 1, description: 'Command-line interface: forge start, status, ask, mcp call',
    tech: ['Commander.js', 'Ink (alt)'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false,
    dependsOn: ['express-server'], providesTo: ['cloud-users']
  },
  {
    id: 'browser-ext', name: 'Browser Extension', shortName: 'Ext',
    layer: 1, description: 'Chrome/Edge extension for quick Forge access',
    tech: ['Chrome API', 'Manifest V3', 'WebExtension'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false,
    dependsOn: ['express-server'], providesTo: ['cloud-users']
  },

  // ─── LAYER 2: APPLICATION LOGIC ────────────────────────────────────────
  {
    id: 'forge-builder', name: 'Forge Builder', shortName: 'Builder',
    layer: 2, description: 'Visual workflow builder with ranking, Qdrant memory, self-improving coder',
    tech: ['React DnD', 'DAG Engine', 'Qdrant Client', 'CodeMirror 6'],
    language: 'typescript', status: 'building', risk: 'high', spof: false,
    license: 'BSL 1.1',
    dependsOn: ['express-server', 'qdrant', 'mcp-host', 'native-vault', 'inference-proxy'],
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

  // ─── LAYER 3: PLATFORM SERVICES ───────────────────────────────────────
  {
    id: 'api-explorer', name: 'API Explorer', shortName: 'APIs',
    layer: 3, description: 'Unified model catalog: paid/free/local tags, auto-detect provider',
    tech: ['React Grid', 'Provider Detection', 'Model Discovery'], language: 'typescript',
    status: 'building', risk: 'low', spof: false, license: 'BSL 1.1',
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
    layer: 3, description: 'Prometheus native :5051/metrics, WS/HTTP/MQTT, SQLite 30-day',
    tech: ['Prometheus Client', 'WebSocket Push', 'MQTT', 'nvidia-dcgm'],
    language: 'typescript', status: 'planned', risk: 'medium', spof: false, license: 'BSL 1.1',
    port: '5051',
    dependsOn: ['express-server', 'sqlite', 'prometheus', 'dcgm-exporter', 'forge-resource'],
    providesTo: ['resource-mgr-ui', 'grafana', 'security-layer', 'mirror-test']
  },
  {
    id: 'security-layer', name: 'Security Layer', shortName: 'Security',
    layer: 3, description: 'HMAC signing, anomaly detection, MAC, audit trail, eBPF monitor',
    tech: ['HMAC-SHA256', 'AES-256-GCM', 'Rate Limits', 'Audit Chain'],
    language: 'typescript', status: 'planned', risk: 'critical', spof: true, license: 'BSL 1.1',
    dependsOn: ['express-server', 'postgres', 'redis', 'forge-resource', 'telemetry'],
    providesTo: ['forge-p2p', 'api-explorer', 'mcp-explorer']
  },
  {
    id: 'billing', name: 'Billing & Subscriptions', shortName: 'Billing',
    layer: 3, description: 'Stripe integration: Free/Pro/Team/Enterprise tiers',
    tech: ['Stripe Subscriptions', 'Webhook Handler', 'Usage Tracking'],
    language: 'typescript', status: 'planned', risk: 'high', spof: true, license: 'BSL 1.1',
    dependsOn: ['express-server', 'stripe', 'postgres', 'redis'], providesTo: ['web-ui']
  },

  // ─── LAYER 4: MCP FABRIC ─────────────────────────────────────────────
  {
    id: 'mcp-host', name: 'MCP Host', shortName: 'Host',
    layer: 4, description: 'Connect external MCP servers as tool providers',
    tech: ['MCP SDK', 'stdio/SSE Transport', 'Tool Registry'],
    language: 'typescript', status: 'building', risk: 'medium', spof: true,
    dependsOn: ['express-server', 'redis', 'filesystem'], providesTo: ['mcp-explorer', 'forge-builder', 'mcp-sse']
  },
  {
    id: 'mcp-server', name: 'MCP Server (Forge)', shortName: 'Server',
    layer: 4, description: 'Expose Forge tools as MCP server: read_note, search_vault, etc.',
    tech: ['MCP Server SDK', 'SSE Transport'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false, license: 'MIT',
    dependsOn: ['express-server', 'native-vault', 'github-explorer'],
    providesTo: ['mcp-sse', 'forge-builder']
  },
  {
    id: 'mcp-sse', name: '/mcp/sse Endpoint', shortName: 'SSE',
    layer: 4, description: 'SSE transport for external MCP client connections',
    tech: ['SSE', 'MCP Transport'], language: 'typescript', status: 'planned',
    risk: 'low', spof: false,
    dependsOn: ['mcp-host', 'mcp-server'], providesTo: ['external-clients']
  },
  {
    id: 'external-clients', name: 'External MCP Clients', shortName: 'Clients',
    layer: 4, description: 'Third-party apps connecting to Forge via /mcp/sse',
    tech: ['Any MCP Client'], language: 'external', status: 'planned',
    risk: 'low', spof: false,
    dependsOn: ['mcp-sse'], providesTo: []
  },

  // ─── LAYER 5: CORE ENGINE ────────────────────────────────────────────
  {
    id: 'express-server', name: 'Express Server', shortName: 'Express',
    layer: 5, description: 'HTTP server: routes, middleware, auth, static files',
    tech: ['Express 5', 'Helmet', 'CORS', 'Compression'], language: 'typescript',
    status: 'ready', risk: 'critical', spof: true, port: '5050', license: 'BSL 1.1',
    dependsOn: ['postgres', 'redis', 'jwt'], providesTo: ['web-ui', 'tui', 'cli', 'browser-ext', 'rest-api']
  },
  {
    id: 'trpc', name: 'tRPC', shortName: 'tRPC',
    layer: 5, description: 'Type-safe RPC between frontend and backend',
    tech: ['tRPC v11', 'Zod'], language: 'typescript', status: 'ready',
    risk: 'medium', spof: false,
    dependsOn: ['express-server'], providesTo: ['web-ui']
  },
  {
    id: 'ws-server', name: 'WebSocket Server', shortName: 'WebSocket',
    layer: 5, description: 'Real-time: GPU stats, chat streaming, workflow progress',
    tech: ['Socket.IO', 'Redis Adapter'], language: 'typescript', status: 'ready',
    risk: 'medium', spof: false, port: '5052',
    dependsOn: ['express-server', 'redis'], providesTo: ['web-ui', 'tui']
  },
  {
    id: 'rest-api', name: 'REST API', shortName: 'REST',
    layer: 5, description: 'Public REST endpoints: /v1/chat/completions, /api/*',
    tech: ['Express Routes', 'OpenAPI'], language: 'typescript', status: 'ready',
    risk: 'low', spof: false,
    dependsOn: ['express-server'], providesTo: ['tui', 'cli']
  },
  {
    id: 'inference-proxy', name: 'Inference Proxy (MIT)', shortName: 'Proxy',
    layer: 5, description: 'Core proxy: route to any OpenAI-compatible provider, SSE streaming',
    tech: ['SSE', 'Token Counting', 'Usage Reporting'], language: 'typescript',
    status: 'ready', risk: 'critical', spof: true, port: '5050', license: 'MIT',
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

  // ─── LAYER 6: RUST RUNTIME ────────────────────────────────────────────
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
    id: 'postgres', name: 'PostgreSQL 17+', shortName: 'PG',
    layer: 7, description: 'Users, keys, logs, tasks, user_tasks, user_engagement, audit trail',
    tech: ['PostgreSQL 17', 'Full-text Search', 'JSONB', ' pgcrypto'],
    language: 'sql', status: 'ready', risk: 'critical', spof: true, port: '5432',
    dependsOn: ['docker'], providesTo: ['express-server', 'jwt', 'api-explorer', 'forge-builder', 'tasks-rewards', 'launch-rewards', 'billing', 'security-layer']
  },
  {
    id: 'redis', name: 'Redis 7+', shortName: 'Redis',
    layer: 7, description: 'Circuit breaker state, rate limits, session cache, WS adapter',
    tech: ['Redis 7', 'Pub/Sub', 'Sorted Sets', 'Key Expiry'],
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

  // ─── LAYER 8: INFRASTRUCTURE ───────────────────────────────────────────
  {
    id: 'ubuntu', name: 'Ubuntu Linux', shortName: 'Ubuntu',
    layer: 8, description: 'Host OS: x86_64 or ARM64, kernel 5.15+ for eBPF',
    tech: ['Ubuntu 22.04/24.04', 'Kernel 5.15+', 'systemd'], language: 'yaml',
    status: 'ready', risk: 'low', spof: true,
    dependsOn: [], providesTo: ['docker', 'nvidia-gpu', 'filesystem', 'forge-resource']
  },
  {
    id: 'docker', name: 'Docker Compose', shortName: 'Docker',
    layer: 8, description: 'Container orchestration: app, PG, Redis, Qdrant, Prometheus, Grafana',
    tech: ['Docker', 'Compose', 'Health Checks', 'Volumes'],
    language: 'yaml', status: 'ready', risk: 'low', spof: true,
    dependsOn: ['ubuntu'], providesTo: ['postgres', 'redis', 'qdrant', 'prometheus', 'grafana', 'dcgm-exporter']
  },
  {
    id: 'nvidia-gpu', name: 'NVIDIA GPU + CUDA', shortName: 'GPU',
    layer: 8, description: 'RTX 3060+ with CUDA, VRAM, compute for inference',
    tech: ['CUDA 12+', 'nvidia-driver', 'nvidia-container-toolkit'],
    language: 'binary', status: 'ready', risk: 'critical', spof: true,
    dependsOn: ['ubuntu'], providesTo: ['dcgm-exporter', 'forge-resource']
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
    layer: 8, description: 'Native metrics collection, always present in Docker Compose',
    tech: ['Prometheus', 'Alertmanager', 'Scrape Config'],
    language: 'yaml', status: 'ready', risk: 'medium', spof: false, port: '9090',
    dependsOn: ['docker', 'dcgm-exporter'], providesTo: ['grafana', 'telemetry']
  },
  {
    id: 'grafana', name: 'Grafana', shortName: 'Grafana',
    layer: 8, description: 'Pre-configured dashboards for GPU, system, and inference metrics',
    tech: ['Grafana', 'Dashboard JSON', 'Prometheus DS'],
    language: 'yaml', status: 'ready', risk: 'low', spof: false, port: '3001',
    dependsOn: ['docker', 'prometheus', 'telemetry'], providesTo: ['web-ui']
  },
];

// ============================================================================
// EDGES (80+ connections)
// ============================================================================
export const EDGES: ForgeEdge[] = [
  // ─── EXTERNAL → APPLICATION ────────────────────────────────────────────
  { id: 'e01', from: 'llm-providers', to: 'inference-proxy', type: 'network', label: 'OpenAI-compatible API', critical: true },
  { id: 'e02', from: 'llm-providers', to: 'api-explorer', type: 'network', label: 'Model discovery', critical: false },
  { id: 'e03', from: 'stripe', to: 'billing', type: 'api', label: 'Subscriptions', critical: true },
  { id: 'e04', from: 'stripe', to: 'tasks-rewards', type: 'api', label: 'Credits', critical: false },
  { id: 'e05', from: 'stripe', to: 'launch-rewards', type: 'api', label: 'Tier perks', critical: false },
  { id: 'e06', from: 'stripe', to: 'buyback-flywheel', type: 'data', label: 'Revenue data', critical: false },
  { id: 'e07', from: 'github-api', to: 'github-explorer', type: 'api', label: 'REST/GraphQL', critical: true },
  { id: 'e08', from: 'mcp-registries', to: 'mcp-explorer', type: 'api', label: 'Server catalog', critical: false },
  { id: 'e09', from: 'cloud-users', to: 'web-ui', type: 'network', label: 'HTTPS', critical: true },
  { id: 'e10', from: 'cloud-users', to: 'tui', type: 'network', label: 'SSH/Local', critical: false },
  { id: 'e11', from: 'cloud-users', to: 'cli', type: 'process', label: 'CLI commands', critical: false },

  // ─── UI → CORE ────────────────────────────────────────────────────────
  { id: 'e12', from: 'web-ui', to: 'express-server', type: 'api', label: 'tRPC/REST', critical: true },
  { id: 'e13', from: 'web-ui', to: 'trpc', type: 'api', label: 'Type-safe RPC', critical: true },
  { id: 'e14', from: 'web-ui', to: 'ws-server', type: 'event', label: 'Real-time', critical: true },
  { id: 'e15', from: 'tui', to: 'ws-server', type: 'event', label: 'WebSocket', critical: true },
  { id: 'e16', from: 'tui', to: 'rest-api', type: 'api', label: 'REST', critical: true },
  { id: 'e17', from: 'cli', to: 'express-server', type: 'api', label: 'HTTP', critical: true },
  { id: 'e18', from: 'browser-ext', to: 'express-server', type: 'api', label: 'Background API', critical: false },

  // ─── APPLICATION → SERVICES ─────────────────────────────────────────────
  { id: 'e19', from: 'forge-builder', to: 'express-server', type: 'api', label: 'Workflow API', critical: true },
  { id: 'e20', from: 'forge-builder', to: 'qdrant', type: 'data', label: 'Vector memory', critical: true },
  { id: 'e21', from: 'forge-builder', to: 'mcp-host', type: 'api', label: 'Use MCP tools', critical: true },
  { id: 'e22', from: 'forge-builder', to: 'native-vault', type: 'file', label: 'Read/Write notes', critical: false },
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

  // ─── SERVICES → CORE/MCP ──────────────────────────────────────────────
  { id: 'e39', from: 'api-explorer', to: 'express-server', type: 'api', label: 'Provider API', critical: true },
  { id: 'e40', from: 'api-explorer', to: 'postgres', type: 'data', label: 'Saved providers', critical: true },
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

  // ─── MCP → CORE ───────────────────────────────────────────────────────
  { id: 'e67', from: 'mcp-host', to: 'express-server', type: 'api', label: 'Host API', critical: true },
  { id: 'e68', from: 'mcp-host', to: 'redis', type: 'data', label: 'Connection state', critical: false },
  { id: 'e69', from: 'mcp-host', to: 'filesystem', type: 'file', label: 'Server configs', critical: false },
  { id: 'e70', from: 'mcp-server', to: 'express-server', type: 'api', label: 'Server transport', critical: true },
  { id: 'e71', from: 'mcp-server', to: 'native-vault', type: 'api', label: 'Vault tools', critical: false },
  { id: 'e72', from: 'mcp-server', to: 'github-explorer', type: 'api', label: 'GitHub tools', critical: false },
  { id: 'e73', from: 'mcp-sse', to: 'mcp-host', type: 'api', label: 'Forward to host', critical: true },
  { id: 'e74', from: 'mcp-sse', to: 'mcp-server', type: 'api', label: 'Forward to server', critical: true },
  { id: 'e75', from: 'external-clients', to: 'mcp-sse', type: 'network', label: 'SSE connect', critical: false },

  // ─── CORE INTERNAL ───────────────────────────────────────────────────
  { id: 'e76', from: 'express-server', to: 'postgres', type: 'data', label: 'All persistent data', critical: true },
  { id: 'e77', from: 'express-server', to: 'redis', type: 'data', label: 'Cache, sessions', critical: true },
  { id: 'e78', from: 'trpc', to: 'express-server', type: 'api', label: 'Mounted on Express', critical: true },
  { id: 'e79', from: 'ws-server', to: 'express-server', type: 'api', label: 'Mounted on Express', critical: true },
  { id: 'e80', from: 'ws-server', to: 'redis', type: 'data', label: 'Pub/Sub adapter', critical: true },
  { id: 'e81', from: 'rest-api', to: 'express-server', type: 'api', label: 'REST routes', critical: true },
  { id: 'e82', from: 'inference-proxy', to: 'express-server', type: 'api', label: 'Mounted route', critical: true },
  { id: 'e83', from: 'inference-proxy', to: 'circuit-breaker', type: 'api', label: 'Health check', critical: true },
  { id: 'e84', from: 'inference-proxy', to: 'fallback-router', type: 'api', label: 'Route to provider', critical: true },
  { id: 'e85', from: 'circuit-breaker', to: 'redis', type: 'data', label: 'State storage', critical: true },
  { id: 'e86', from: 'fallback-router', to: 'circuit-breaker', type: 'api', label: 'Fallback trigger', critical: true },
  { id: 'e87', from: 'fallback-router', to: 'redis', type: 'data', label: 'Routing rules', critical: true },
  { id: 'e88', from: 'jwt', to: 'postgres', type: 'data', label: 'User lookup', critical: true },
  { id: 'e89', from: 'jwt', to: 'redis', type: 'data', label: 'Session cache', critical: true },

  // ─── RUST → DATA/INFRA ────────────────────────────────────────────────
  { id: 'e90', from: 'forge-resource', to: 'ubuntu', type: 'depends', label: 'syscalls', critical: true },
  { id: 'e91', from: 'forge-resource', to: 'nvidia-gpu', type: 'depends', label: 'nvml', critical: true },
  { id: 'e92', from: 'forge-resource', to: 'filesystem', type: 'file', label: 'Config/logs', critical: false },

  // ─── DATA → INFRA ─────────────────────────────────────────────────────
  { id: 'e93', from: 'postgres', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e94', from: 'redis', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e95', from: 'qdrant', to: 'docker', type: 'depends', label: 'Container', critical: true },
  { id: 'e96', from: 'sqlite', to: 'filesystem', type: 'file', label: 'DB file', critical: false },
  { id: 'e97', from: 'filesystem', to: 'ubuntu', type: 'depends', label: 'OS fs', critical: true },

  // ─── INFRA INTERNAL ───────────────────────────────────────────────────
  { id: 'e98', from: 'docker', to: 'ubuntu', type: 'depends', label: 'Host OS', critical: true },
  { id: 'e99', from: 'nvidia-gpu', to: 'ubuntu', type: 'depends', label: 'Driver + CUDA', critical: true },
  { id: 'e100', from: 'dcgm-exporter', to: 'docker', type: 'depends', label: 'Container', critical: false },
  { id: 'e101', from: 'dcgm-exporter', to: 'nvidia-gpu', type: 'depends', label: 'GPU access', critical: true },
  { id: 'e102', from: 'prometheus', to: 'docker', type: 'depends', label: 'Container', critical: false },
  { id: 'e103', from: 'prometheus', to: 'dcgm-exporter', type: 'data', label: 'Scrape :9400', critical: false },
  { id: 'e104', from: 'grafana', to: 'docker', type: 'depends', label: 'Container', critical: false },
  { id: 'e105', from: 'grafana', to: 'prometheus', type: 'data', label: 'Data source', critical: false },
  { id: 'e106', from: 'grafana', to: 'telemetry', type: 'data', label: 'Forge metrics', critical: false },
];

// ============================================================================
// BUILD PHASES (12-week roadmap)
// ============================================================================
export const BUILD_PHASES: BuildPhase[] = [
  {
    phase: 1, name: 'Foundation & Native Routing', weeks: 2,
    components: ['express-server', 'inference-proxy', 'circuit-breaker', 'fallback-router', 'jwt', 'postgres', 'redis'],
    deliverables: ['MIT proxy core', 'Native circuit breaker', 'Fallback routing', 'Basic auth'],
    dependencies: ['docker', 'postgres', 'redis'],
  },
  {
    phase: 2, name: 'Rust Resource Manager', weeks: 1,
    components: ['forge-resource'],
    deliverables: ['forge-resource binary', 'GPU stats', 'Process control', 'VRAM monitoring'],
    dependencies: ['ubuntu', 'nvidia-gpu'],
  },
  {
    phase: 3, name: 'MCP Fabric', weeks: 2,
    components: ['mcp-host', 'mcp-server', 'mcp-explorer', 'mcp-sse'],
    deliverables: ['MCP host/server', 'Registry aggregation', 'One-click connect', '/mcp/sse'],
    dependencies: ['express-server', 'redis', 'mcp-registries'],
    parallel: ['api-explorer', 'native-vault'],
  },
  {
    phase: 4, name: 'Explorers & Vault', weeks: 2,
    components: ['api-explorer', 'native-vault', 'github-explorer'],
    deliverables: ['Model catalog', 'Markdown vault', 'Backlinks + graph', 'GitHub integration'],
    dependencies: ['express-server', 'postgres', 'qdrant', 'filesystem'],
  },
  {
    phase: 5, name: 'Forge Builder v1', weeks: 2,
    components: ['forge-builder'],
    deliverables: ['Visual workflow builder', 'Basic ranking', 'MCP tools in workflows', 'Qdrant memory'],
    dependencies: ['mcp-host', 'native-vault', 'inference-proxy', 'qdrant'],
  },
  {
    phase: 6, name: 'Security & Telemetry', weeks: 1,
    components: ['security-layer', 'telemetry', 'prometheus', 'dcgm-exporter', 'grafana'],
    deliverables: ['HMAC signing', 'Audit trail', 'Prometheus native', 'GPU metrics dashboard'],
    dependencies: ['forge-resource', 'postgres', 'redis'],
  },
  {
    phase: 7, name: 'Billing & Rewards', weeks: 2,
    components: ['billing', 'tasks-rewards', 'launch-rewards', 'buyback-flywheel'],
    deliverables: ['Stripe integration', 'Free/Pro/Team tiers', 'Task system', 'Launch rewards'],
    dependencies: ['stripe', 'express-server', 'postgres', 'redis'],
  },
  {
    phase: 8, name: 'Terminal UI', weeks: 2,
    components: ['tui', 'cli'],
    deliverables: ['forge-tui binary (Go)', 'GPU graph', 'Chat panel', 'Workflow runner', 'CLI commands'],
    dependencies: ['ws-server', 'rest-api'],
    parallel: ['browser-ext'],
  },
  {
    phase: 9, name: 'Forge-to-Forge P2P', weeks: 1,
    components: ['forge-p2p'],
    deliverables: ['Peer discovery', 'Compute marketplace', 'Reputation scores', 'P2P routing'],
    dependencies: ['circuit-breaker', 'redis', 'security-layer'],
  },
  {
    phase: 10, name: 'Mirror Test & Polish', weeks: 1,
    components: ['mirror-test'],
    deliverables: ['Self-hosting proof', 'End-to-end test', 'Performance benchmarks'],
    dependencies: ['github-explorer', 'native-vault', 'forge-builder', 'telemetry'],
  },
];

// ============================================================================
// DATABASE SCHEMAS
// ============================================================================
export const DB_TABLES: DBTable[] = [
  {
    name: 'users', store: 'PostgreSQL', purpose: 'User accounts, roles, subscription tier',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'email', type: 'VARCHAR UNIQUE' },
      { name: 'password_hash', type: 'VARCHAR', note: 'bcrypt' },
      { name: 'role', type: 'ENUM(user,admin)' },
      { name: 'tier', type: 'ENUM(free,pro,team,enterprise)' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'stripe_customer_id', type: 'VARCHAR', note: 'nullable' },
    ],
  },
  {
    name: 'virtual_keys', store: 'PostgreSQL', purpose: 'API keys with device fingerprinting',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'key_hash', type: 'VARCHAR', note: 'SHA-256' },
      { name: 'device_fp', type: 'VARCHAR', note: 'fingerprint' },
      { name: 'spending_limit', type: 'INTEGER' },
      { name: 'ip_whitelist', type: 'JSONB' },
      { name: 'revoked', type: 'BOOLEAN' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'providers', store: 'PostgreSQL', purpose: 'LLM provider configs and API keys',
    critical: true,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'base_url', type: 'VARCHAR' },
      { name: 'api_key_encrypted', type: 'TEXT', note: 'AES-256-GCM' },
      { name: 'models', type: 'JSONB' },
      { name: 'tag', type: 'ENUM(paid,free,local)' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'mcp_servers', store: 'PostgreSQL', purpose: 'Connected MCP server registry',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'source', type: 'ENUM(glama,smithery,official,custom)' },
      { name: 'transport', type: 'ENUM(stdio,sse)' },
      { name: 'config', type: 'JSONB' },
      { name: 'health_status', type: 'VARCHAR' },
      { name: 'usage_count', type: 'INTEGER' },
      { name: 'rating', type: 'FLOAT' },
      { name: 'connected_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'workflows', store: 'PostgreSQL', purpose: 'Forge Builder workflows with ranking',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'dag_json', type: 'JSONB', note: 'DAG definition' },
      { name: 'upvotes', type: 'INTEGER DEFAULT 0' },
      { name: 'downvotes', type: 'INTEGER DEFAULT 0' },
      { name: 'exec_count', type: 'INTEGER DEFAULT 0' },
      { name: 'is_published', type: 'BOOLEAN' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'tasks', store: 'PostgreSQL', purpose: 'Gamification task definitions',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'name', type: 'VARCHAR' },
      { name: 'description', type: 'TEXT' },
      { name: 'reward_credits', type: 'INTEGER' },
      { name: 'reward_badge', type: 'VARCHAR', note: 'nullable' },
      { name: 'type', type: 'ENUM(daily,once,referral,streak)' },
      { name: 'points', type: 'INTEGER' },
    ],
  },
  {
    name: 'user_tasks', store: 'PostgreSQL', purpose: 'Task completion tracking',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID PK' },
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'task_id', type: 'UUID FK → tasks' },
      { name: 'completed_at', type: 'TIMESTAMP' },
      { name: 'reward_granted', type: 'BOOLEAN' },
    ],
  },
  {
    name: 'user_engagement', store: 'PostgreSQL', purpose: '30-day launch reward tracking',
    critical: false,
    columns: [
      { name: 'user_id', type: 'UUID FK → users' },
      { name: 'date', type: 'DATE' },
      { name: 'points_earned', type: 'INTEGER', note: 'max 1/day' },
      { name: 'bonus_actions_json', type: 'JSONB' },
      { name: 'cumulative_points', type: 'INTEGER' },
      { name: 'current_tier', type: 'ENUM(none,bronze,silver,gold,platinum)' },
    ],
  },
  {
    name: 'audit_trail', store: 'PostgreSQL', purpose: 'Immutable security audit log (hash chain)',
    critical: true,
    columns: [
      { name: 'id', type: 'BIGSERIAL' },
      { name: 'timestamp', type: 'TIMESTAMP' },
      { name: 'user_id', type: 'UUID FK → users', note: 'nullable' },
      { name: 'action', type: 'VARCHAR' },
      { name: 'resource', type: 'VARCHAR' },
      { name: 'ip_address', type: 'INET' },
      { name: 'prev_hash', type: 'VARCHAR', note: 'blockchain chain' },
      { name: 'hash', type: 'VARCHAR' },
    ],
  },
  {
    name: 'vault_entries', store: 'Qdrant', purpose: 'Vector embeddings for vault search',
    critical: false,
    columns: [
      { name: 'id', type: 'UUID' },
      { name: 'content_vector', type: 'FLOAT[1536]', note: 'embedding' },
      { name: 'file_path', type: 'VARCHAR' },
      { name: 'chunk_index', type: 'INTEGER' },
      { name: 'metadata', type: 'JSON' },
    ],
  },
  {
    name: 'telemetry_points', store: 'SQLite', purpose: '30-day metric retention',
    critical: false,
    columns: [
      { name: 'timestamp', type: 'INTEGER', note: 'unix epoch' },
      { name: 'metric_name', type: 'VARCHAR' },
      { name: 'value', type: 'FLOAT' },
      { name: 'labels', type: 'TEXT', note: 'JSON' },
    ],
  },
];

// ============================================================================
// SPOF ANALYSIS & CRITICAL PATHS
// ============================================================================
export const SPOF_NODES = NODES.filter(n => n.spof);
export const CRITICAL_EDGES = EDGES.filter(e => e.critical);
export const RISK_CRITICAL = NODES.filter(n => n.risk === 'critical');

// ============================================================================
// HELPERS
// ============================================================================
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
  const deps = EDGES.filter(e => e.to === nodeId).map(e => e.from);
  return NODES.filter(n => deps.includes(n.id));
}

export function getDownstreamDeps(nodeId: string): ForgeNode[] {
  const deps = EDGES.filter(e => e.from === nodeId).map(e => e.to);
  return NODES.filter(n => deps.includes(n.id));
}

export const EDGE_COLORS: Record<EdgeType, string> = {
  data: '#00FFB2',
  api: '#38BDF8',
  file: '#FBBF24',
  process: '#FB923C',
  depends: '#94A3B8',
  network: '#C084FC',
  event: '#F472B6',
  config: '#6B7280',
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
  concept: { label: 'Concept', color: '#94A3B8', dot: 'bg-[#94A3B8]' },
};

export const RISK_STYLES: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#EF4444', bg: 'bg-red-500/10 text-red-400' },
  high: { label: 'High', color: '#FB923C', bg: 'bg-orange-500/10 text-orange-400' },
  medium: { label: 'Medium', color: '#FBBF24', bg: 'bg-amber-500/10 text-amber-400' },
  low: { label: 'Low', color: '#00FFB2', bg: 'bg-emerald-500/10 text-emerald-400' },
};

// Stats
export const TREE_STATS = {
  totalNodes: NODES.length,
  totalEdges: EDGES.length,
  totalLayers: LAYERS.length,
  spofCount: SPOF_NODES.length,
  criticalEdges: CRITICAL_EDGES.length,
  criticalNodes: RISK_CRITICAL.length,
  totalBuildWeeks: BUILD_PHASES.reduce((s, p) => s + p.weeks, 0),
  techCount: [...new Set(NODES.flatMap(n => n.tech))].length,
  dbTables: DB_TABLES.length,
  mitComponents: NODES.filter(n => n.license === 'MIT').length,
  bslComponents: NODES.filter(n => n.license === 'BSL 1.1').length,
};
