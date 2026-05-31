import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { trackedRepos, githubTokens } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

const CLI_TOOLS = [
  { name: "ollama", description: "Run large language models locally", category: "AI/LLM", installCommand: "curl -fsSL https://ollama.ai/install.sh | sh", stars: 105000, url: "https://github.com/ollama/ollama", tags: ["llm", "local", "inference"] },
  { name: "gh", description: "GitHub CLI - manage repos, PRs, issues from terminal", category: "DevOps", installCommand: "brew install gh # or: sudo apt install gh", stars: 37000, url: "https://github.com/cli/cli", tags: ["github", "cli", "devops"] },
  { name: "lazygit", description: "Simple terminal UI for git commands", category: "DevOps", installCommand: "brew install lazygit", stars: 53000, url: "https://github.com/jesseduffield/lazygit", tags: ["git", "tui", "devops"] },
  { name: "fzf", description: "Command-line fuzzy finder", category: "Text Processing", installCommand: "brew install fzf", stars: 66000, url: "https://github.com/junegunn/fzf", tags: ["search", "fuzzy", "cli"] },
  { name: "ripgrep", description: "Ultra-fast grep alternative", category: "Text Processing", installCommand: "brew install ripgrep", stars: 49000, url: "https://github.com/BurntSushi/ripgrep", tags: ["search", "regex", "cli"] },
  { name: "zoxide", description: "Smarter cd command", category: "System", installCommand: "brew install zoxide", stars: 23000, url: "https://github.com/ajeetdsouza/zoxide", tags: ["navigation", "shell", "cli"] },
  { name: "htop", description: "Interactive process viewer", category: "Monitoring", installCommand: "brew install htop", stars: 7400, url: "https://github.com/htop-dev/htop", tags: ["monitoring", "process", "tui"] },
  { name: "ncdu", description: "Disk usage analyzer with ncurses interface", category: "Monitoring", installCommand: "brew install ncdu", stars: 4900, url: "https://github.com/rofl0r/ncdu", tags: ["disk", "monitoring", "tui"] },
  { name: "jq", description: "Command-line JSON processor", category: "Text Processing", installCommand: "brew install jq", stars: 30000, url: "https://github.com/jqlang/jq", tags: ["json", "parsing", "cli"] },
  { name: "tldr", description: "Simplified community-driven man pages", category: "System", installCommand: "brew install tldr", stars: 52000, url: "https://github.com/tldr-pages/tldr", tags: ["docs", "help", "cli"] },
  { name: "bat", description: "Cat clone with syntax highlighting", category: "File Management", installCommand: "brew install bat", stars: 50000, url: "https://github.com/sharkdp/bat", tags: ["files", "viewer", "cli"] },
  { name: "fd", description: "Simple, fast user-friendly alternative to find", category: "File Management", installCommand: "brew install fd", stars: 35000, url: "https://github.com/sharkdp/fd", tags: ["search", "files", "cli"] },
  { name: "delta", description: "Syntax-highlighting pager for git", category: "DevOps", installCommand: "brew install git-delta", stars: 25000, url: "https://github.com/dandavison/delta", tags: ["git", "diff", "cli"] },
  { name: "httpie", description: "Human-friendly HTTP client", category: "Networking", installCommand: "brew install httpie", stars: 34000, url: "https://github.com/httpie/cli", tags: ["http", "api", "cli"] },
  { name: "curlie", description: "curl but with httpie-like output", category: "Networking", installCommand: "brew install curlie", stars: 2900, url: "https://github.com/rs/curlie", tags: ["http", "curl", "cli"] },
  { name: "bandwhich", description: "Bandwidth utilization tool", category: "Networking", installCommand: "brew install bandwhich", stars: 11000, url: "https://github.com/imsnif/bandwhich", tags: ["network", "bandwidth", "tui"] },
  { name: "doggo", description: "DNS client with colors and JSON output", category: "Networking", installCommand: "brew install doggo", stars: 2400, url: "https://github.com/mr-karan/doggo", tags: ["dns", "network", "cli"] },
  { name: "glow", description: "Render markdown in the terminal", category: "Text Processing", installCommand: "brew install glow", stars: 17000, url: "https://github.com/charmbracelet/glow", tags: ["markdown", "viewer", "tui"] },
  { name: "helix", description: "Post-modern modal text editor", category: "Text Processing", installCommand: "brew install helix", stars: 35000, url: "https://github.com/helix-editor/helix", tags: ["editor", "programming", "tui"] },
  { name: "lazydocker", description: "Lazier way to manage Docker", category: "DevOps", installCommand: "brew install lazydocker", stars: 41000, url: "https://github.com/jesseduffield/lazydocker", tags: ["docker", "container", "tui"] },
  { name: "k9s", description: "Kubernetes CLI to manage clusters", category: "DevOps", installCommand: "brew install k9s", stars: 29000, url: "https://github.com/derailed/k9s", tags: ["kubernetes", "cluster", "tui"] },
  { name: "broot", description: "New way to see and navigate directory trees", category: "File Management", installCommand: "brew install broot", stars: 9600, url: "https://github.com/Canop/broot", tags: ["files", "navigation", "tui"] },
  { name: "bottom", description: "Graphical process/system monitor", category: "Monitoring", installCommand: "brew install bottom", stars: 9400, url: "https://github.com/ClementTsang/bottom", tags: ["monitoring", "system", "tui"] },
  { name: "duf", description: "Disk usage/free utility", category: "Monitoring", installCommand: "brew install duf", stars: 13000, url: "https://github.com/muesli/duf", tags: ["disk", "monitoring", "cli"] },
  { name: "exa", description: "Modern replacement for ls", category: "File Management", installCommand: "brew install exa", stars: 25000, url: "https://github.com/ogham/exa", tags: ["files", "listing", "cli"] },
  { name: "xh", description: "Friendly and fast tool for sending HTTP requests", category: "Networking", installCommand: "brew install xh", stars: 6000, url: "https://github.com/ducaale/xh", tags: ["http", "api", "cli"] },
  { name: "gitleaks", description: "Find secrets in git repos", category: "Security", installCommand: "brew install gitleaks", stars: 19000, url: "https://github.com/gitleaks/gitleaks", tags: ["security", "secrets", "git"] },
  { name: "trivy", description: "Scanner for vulnerabilities in containers", category: "Security", installCommand: "brew install trivy", stars: 24000, url: "https://github.com/aquasecurity/trivy", tags: ["security", "scanning", "container"] },
  { name: "sops", description: "Encrypted secrets management", category: "Security", installCommand: "brew install sops", stars: 17000, url: "https://github.com/getsops/sops", tags: ["security", "secrets", "encryption"] },
  { name: "starship", description: "Cross-shell prompt", category: "System", installCommand: "brew install starship", stars: 47000, url: "https://github.com/starship/starship", tags: ["shell", "prompt", "customization"] },
];

const CATEGORIES = Array.from(new Set(CLI_TOOLS.map(t => t.category))).sort();

export const githubExplorerRouter = router({
  cliTools: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.category) return CLI_TOOLS.filter(t => t.category === input.category);
      return CLI_TOOLS;
    }),

  cliCategories: protectedProcedure
    .query(async () => {
      return CATEGORIES.map(c => ({ category: c, count: CLI_TOOLS.filter(t => t.category === c).length }));
    }),

  trackedRepos: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(trackedRepos)
        .where(eq(trackedRepos.tenantId, ctx.tenantId || 1))
        .orderBy(desc(trackedRepos.stars));
    }),

  trackRepo: protectedProcedure
    .input(z.object({
      fullName: z.string(), owner: z.string(), repo: z.string(),
      description: z.string().optional(), language: z.string().optional(),
      stars: z.number().optional(), topics: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tenantId = ctx.tenantId || 1;
      const existing = await db.select().from(trackedRepos)
        .where(and(eq(trackedRepos.tenantId, tenantId), eq(trackedRepos.fullName, input.fullName)))
        .limit(1);
      if (existing.length > 0) return { success: true, message: "Already tracked" };
      await db.insert(trackedRepos).values({
        tenantId, fullName: input.fullName, owner: input.owner, repo: input.repo,
        description: input.description || null, language: input.language || null,
        stars: input.stars || null, topics: input.topics || null,
      });
      return { success: true };
    }),

  untrackRepo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(trackedRepos)
        .where(and(eq(trackedRepos.id, input.id), eq(trackedRepos.tenantId, ctx.tenantId || 1)));
      return { success: true };
    }),

  connectToken: protectedProcedure
    .input(z.object({ token: z.string(), username: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tenantId = ctx.tenantId || 1;
      const existing = await db.select().from(githubTokens)
        .where(eq(githubTokens.tenantId, tenantId)).limit(1);
      if (existing.length > 0) {
        await db.update(githubTokens).set({ token: input.token, username: input.username || null, updatedAt: new Date() })
          .where(eq(githubTokens.id, existing[0].id));
      } else {
        await db.insert(githubTokens).values({ tenantId, token: input.token, username: input.username || null });
      }
      return { success: true };
    }),

  hasToken: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return false;
      const row = await db.select().from(githubTokens)
        .where(eq(githubTokens.tenantId, ctx.tenantId || 1)).limit(1);
      return row.length > 0;
    }),
});
