export interface CliTool {
  name: string;
  description: string;
  category: string;
  installCommand: string;
  stars: number;
  url: string;
  tags: string[];
}

const TOOLS: CliTool[] = [
  // ─── AI/LLM ─────────────────────────────────────────────────────────────
  { name: "ollama", description: "Run LLMs locally with ease", category: "AI/LLM", installCommand: "curl -fsSL https://ollama.ai/install.sh | sh", stars: 120000, url: "https://ollama.ai", tags: ["llm", "local", "inference"] },
  { name: "gpt-cli", description: "ChatGPT in your terminal", category: "AI/LLM", installCommand: "npm install -g gpt-cli", stars: 8500, url: "https://github.com/kharvd/gpt-cli", tags: ["chatgpt", "cli", "openai"] },
  { name: "mods", description: "AI on the command line, pipe-able", category: "AI/LLM", installCommand: "go install github.com/charmbracelet/mods@latest", stars: 3400, url: "https://github.com/charmbracelet/mods", tags: ["llm", "pipe", "charm"] },
  { name: "sgpt", description: "Shell GPT — AI-powered shell", category: "AI/LLM", installCommand: "pip install shell-gpt", stars: 9800, url: "https://github.com/TheR1D/shell_gpt", tags: ["shell", "openai", "automation"] },

  // ─── DevOps ─────────────────────────────────────────────────────────────
  { name: "k9s", description: "Terminal UI for Kubernetes cluster management", category: "DevOps", installCommand: "brew install k9s", stars: 29000, url: "https://k9scli.io", tags: ["kubernetes", "tui", "management"] },
  { name: "lazydocker", description: "A lazier way to manage Docker", category: "DevOps", installCommand: "brew install lazydocker", stars: 41000, url: "https://github.com/jesseduffield/lazydocker", tags: ["docker", "tui", "management"] },
  { name: "doctl", description: "DigitalOcean CLI", category: "DevOps", installCommand: "brew install doctl", stars: 3300, url: "https://github.com/digitalocean/doctl", tags: ["cloud", "digitalocean", "infra"] },
  { name: "gh", description: "GitHub CLI — manage repos, PRs, issues", category: "DevOps", installCommand: "brew install gh", stars: 38000, url: "https://cli.github.com", tags: ["github", "git", "pr"] },

  // ─── Monitoring ─────────────────────────────────────────────────────────
  { name: "btop", description: "Resource monitor with game-like UI", category: "Monitoring", installCommand: "brew install btop", stars: 22000, url: "https://github.com/aristocratos/btop", tags: ["system", "monitor", "tui"] },
  { name: "glances", description: "Cross-platform system monitoring", category: "Monitoring", installCommand: "pip install glances", stars: 27000, url: "https://nicolargo.github.io/glances/", tags: ["system", "monitor", "web"] },
  { name: "bandwhich", description: "Terminal bandwidth utilization tool", category: "Monitoring", installCommand: "cargo install bandwhich", stars: 10000, url: "https://github.com/imsnif/bandwhich", tags: ["network", "bandwidth", "tui"] },
  { name: "zenith", description: "Sort of like top or htop but with charts", category: "Monitoring", installCommand: "cargo install zenith", stars: 2600, url: "https://github.com/bvaisvil/zenith", tags: ["system", "charts", "tui"] },

  // ─── Networking ─────────────────────────────────────────────────────────
  { name: "wireshark", description: "Network protocol analyzer (TShark CLI)", category: "Networking", installCommand: "brew install wireshark", stars: 7500, url: "https://www.wireshark.org", tags: ["packet", "analysis", "security"] },
  { name: "nmap", description: "Network discovery and security auditing", category: "Networking", installCommand: "brew install nmap", stars: 10000, url: "https://nmap.org", tags: ["scan", "security", "discovery"] },
  { name: "doggo", description: "Modern DNS client in Go", category: "Networking", installCommand: "brew install doggo", stars: 3400, url: "https://github.com/mr-karan/doggo", tags: ["dns", "lookup", "tui"] },
  { name: "gping", description: "Ping with a graph", category: "Networking", installCommand: "cargo install gping", stars: 11000, url: "https://github.com/orf/gping", tags: ["network", "ping", "graph"] },

  // ─── File Management ────────────────────────────────────────────────────
  { name: "fzf", description: "General-purpose fuzzy finder", category: "File Management", installCommand: "brew install fzf", stars: 68000, url: "https://github.com/junegunn/fzf", tags: ["fuzzy", "search", "cli"] },
  { name: "broot", description: "A new way to navigate directory trees", category: "File Management", installCommand: "brew install broot", stars: 11000, url: "https://dystroy.org/broot/", tags: ["tree", "nav", "tui"] },
  { name: "ripgrep", description: "Ultra-fast recursive grep tool", category: "File Management", installCommand: "brew install ripgrep", stars: 50000, url: "https://github.com/BurntSushi/ripgrep", tags: ["search", "grep", "fast"] },
  { name: "fd", description: "Simple, fast user-friendly alternative to find", category: "File Management", installCommand: "brew install fd", stars: 36000, url: "https://github.com/sharkdp/fd", tags: ["find", "search", "fast"] },

  // ─── Security ───────────────────────────────────────────────────────────
  { name: "trivy", description: "Comprehensive vulnerability scanner", category: "Security", installCommand: "brew install trivy", stars: 25000, url: "https://github.com/aquasecurity/trivy", tags: ["scanner", "containers", "vuln"] },
  { name: "sops", description: "Secrets management with encryption", category: "Security", installCommand: "brew install sops", stars: 18000, url: "https://github.com/getsops/sops", tags: ["secrets", "encryption", "gitops"] },
  { name: "age", description: "Simple modern file encryption tool", category: "Security", installCommand: "brew install age", stars: 18000, url: "https://github.com/FiloSottile/age", tags: ["encryption", "file", "modern"] },

  // ─── Text Processing ────────────────────────────────────────────────────
  { name: "bat", description: "Cat clone with syntax highlighting", category: "Text Processing", installCommand: "brew install bat", stars: 51000, url: "https://github.com/sharkdp/bat", tags: ["viewer", "syntax", "highlight"] },
  { name: "delta", description: "Syntax-highlighting pager for git", category: "Text Processing", installCommand: "brew install git-delta", stars: 25000, url: "https://github.com/dandavison/delta", tags: ["git", "diff", "syntax"] },
  { name: "jq", description: "Command-line JSON processor", category: "Text Processing", installCommand: "brew install jq", stars: 31000, url: "https://jqlang.github.io/jq/", tags: ["json", "parse", "filter"] },
  { name: "yq", description: "YAML/JSON/XML processor (like jq)", category: "Text Processing", installCommand: "brew install yq", stars: 13000, url: "https://github.com/mikefarah/yq", tags: ["yaml", "json", "transform"] },

  // ─── System ─────────────────────────────────────────────────────────────
  { name: "zoxide", description: "Smarter cd command with frecency", category: "System", installCommand: "brew install zoxide", stars: 24000, url: "https://github.com/ajeetdsouza/zoxide", tags: ["cd", "nav", "frecency"] },
  { name: "eza", description: "Modern replacement for ls", category: "System", installCommand: "brew install eza", stars: 14000, url: "https://github.com/eza-community/eza", tags: ["ls", "icons", "modern"] },
  { name: "tldr", description: "Simplified man pages", category: "System", installCommand: "npm install -g tldr", stars: 52000, url: "https://tldr.sh", tags: ["docs", "help", "man"] },
  { name: "thefuck", description: "Auto-corrects your console commands", category: "System", installCommand: "pip install thefuck", stars: 87000, url: "https://github.com/nvbn/thefuck", tags: ["fix", "autocorrect", "shell"] },
];

export class CliToolsService {

  getTools(category?: string): CliTool[] {
    if (category) {
      return TOOLS.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }
    return TOOLS;
  }

  getCategories(): { category: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const t of TOOLS) {
      counts.set(t.category, (counts.get(t.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  }
}

export const cliToolsService = new CliToolsService();
