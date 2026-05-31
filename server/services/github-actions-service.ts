import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { githubActionsRuns, deploymentAlerts, githubTokens } from "../../drizzle/schema";

const GITHUB_API = "https://api.github.com";

async function ghFetch(token: string, path: string): Promise<any> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "forge-studio",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

interface WorkflowRun {
  id: number;
  run_number: number;
  name: string;
  status: string;
  conclusion: string | null;
  event: string;
  head_branch: string;
  head_sha: string;
  head_commit?: { message: string } | null;
  actor?: { login: string } | null;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
}

interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  steps?: Array<{ name: string; status: string; conclusion: string | null }>;
}

function computeDuration(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  return Math.max(0, end - start);
}

export class GithubActionsService {

  private async getToken(tenantId: number): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const row = await db.select({ token: githubTokens.token })
      .from(githubTokens)
      .where(eq(githubTokens.tenantId, tenantId))
      .limit(1)
      .then(r => r[0] || null);
    return row?.token || null;
  }

  async fetchWorkflowRuns(token: string, repo: string, branch?: string, perPage = 20, page = 1): Promise<{ runs: WorkflowRun[]; total: number }> {
    let path = `/repos/${repo}/actions/runs?per_page=${perPage}&page=${page}`;
    if (branch) path += `&branch=${branch}`;
    const data = await ghFetch(token, path);
    return { runs: data.workflow_runs || [], total: data.total_count || 0 };
  }

  async fetchRunDetails(token: string, repo: string, runId: number): Promise<any> {
    return ghFetch(token, `/repos/${repo}/actions/runs/${runId}`);
  }

  async fetchRunJobs(token: string, repo: string, runId: number): Promise<{ jobs: Job[] }> {
    const data = await ghFetch(token, `/repos/${repo}/actions/runs/${runId}/jobs`);
    return { jobs: data.jobs || [] };
  }

  async syncRecentRuns(tenantId: number, repo: string, count = 20): Promise<{ synced: number; newAlerts: number }> {
    const token = await this.getToken(tenantId);
    if (!token) throw new Error("No GitHub token configured for this tenant");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { runs } = await this.fetchWorkflowRuns(token, repo, undefined, count);
    let synced = 0;
    let newAlerts = 0;

    for (const run of runs) {
      const existing = await db.select({ id: githubActionsRuns.id })
        .from(githubActionsRuns)
        .where(and(eq(githubActionsRuns.tenantId, tenantId), eq(githubActionsRuns.runId, run.id)))
        .limit(1);

      if (existing.length > 0) continue;

      const commitMsg = run.head_commit?.message?.slice(0, 500) || null;
      const durationMs = computeDuration(run.run_started_at || run.created_at, run.updated_at);

      await db.insert(githubActionsRuns).values({
        tenantId,
        repoFullName: repo,
        runId: run.id,
        runNumber: run.run_number,
        workflowName: run.name,
        status: run.status,
        conclusion: run.conclusion || null,
        event: run.event || null,
        branch: run.head_branch || null,
        commitSha: run.head_sha || null,
        commitMessage: commitMsg,
        actor: run.actor?.login || null,
        startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
        completedAt: run.status === "completed" && run.updated_at ? new Date(run.updated_at) : null,
        durationMs,
        htmlUrl: run.html_url || null,
      });
      synced++;

      if (run.conclusion === "failure" || run.conclusion === "cancelled" || run.conclusion === "timed_out") {
        let alertType = "deploy_failure";
        let severity = "critical";
        if (run.conclusion === "cancelled") { alertType = "all_skipped"; severity = "warning"; }
        if (run.conclusion === "timed_out") { alertType = "deploy_failure"; severity = "critical"; }

        await db.insert(deploymentAlerts).values({
          tenantId,
          runId: run.id,
          alertType,
          severity,
          message: `Workflow "${run.name}" ${run.conclusion} (Run #${run.run_number}) — branch: ${run.head_branch || "unknown"}, triggered by ${run.actor?.login || "unknown"}`,
          isRead: 0,
        });
        newAlerts++;
      }
    }

    // Update rate limit info if response headers are available
    return { synced, newAlerts };
  }

  async syncRunJobs(tenantId: number, repo: string, runId: number): Promise<void> {
    const token = await this.getToken(tenantId);
    if (!token) throw new Error("No GitHub token configured");

    const db = await getDb();
    if (!db) return;

    const { jobs } = await this.fetchRunJobs(token, repo, runId);
    await db.update(githubActionsRuns)
      .set({ jobsJson: JSON.stringify(jobs) })
      .where(and(eq(githubActionsRuns.tenantId, tenantId), eq(githubActionsRuns.runId, runId)));
  }

  async getRuns(tenantId: number, options?: { repo?: string; branch?: string; status?: string; page?: number; perPage?: number }): Promise<{ runs: any[]; total: number }> {
    const db = await getDb();
    if (!db) return { runs: [], total: 0 };
    const conditions = [eq(githubActionsRuns.tenantId, tenantId)];
    if (options?.repo) conditions.push(eq(githubActionsRuns.repoFullName, options.repo));
    if (options?.branch) conditions.push(eq(githubActionsRuns.branch, options.branch));
    if (options?.status) {
      if (options.status === "completed") conditions.push(eq(githubActionsRuns.status, "completed"));
      else if (options.status === "failed") conditions.push(eq(githubActionsRuns.conclusion, "failure"));
    }
    const offset = ((options?.page || 1) - 1) * (options?.perPage || 20);
    const runs = await db.select().from(githubActionsRuns)
      .where(and(...conditions))
      .orderBy(desc(githubActionsRuns.startedAt))
      .limit(options?.perPage || 20).offset(offset);
    const totalResult = await db.select({ c: sql<number>`count(*)` }).from(githubActionsRuns).where(and(...conditions));
    return { runs, total: Number(totalResult[0]?.c || 0) };
  }

  async getRunDetail(tenantId: number, runId: number): Promise<any> {
    const db = await getDb();
    if (!db) return null;
    return db.select().from(githubActionsRuns)
      .where(and(eq(githubActionsRuns.tenantId, tenantId), eq(githubActionsRuns.runId, runId)))
      .limit(1)
      .then(r => r[0] || null);
  }

  async getAlerts(tenantId: number, unreadOnly?: boolean): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];
    const conditions: any[] = [eq(deploymentAlerts.tenantId, tenantId)];
    if (unreadOnly) conditions.push(eq(deploymentAlerts.isRead, 0));
    return db.select().from(deploymentAlerts)
      .where(and(...conditions))
      .orderBy(desc(deploymentAlerts.createdAt))
      .limit(100);
  }

  async markAlertRead(tenantId: number, alertId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.update(deploymentAlerts)
      .set({ isRead: 1 })
      .where(and(eq(deploymentAlerts.id, alertId), eq(deploymentAlerts.tenantId, tenantId)));
  }

  async markAllAlertsRead(tenantId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.update(deploymentAlerts)
      .set({ isRead: 1 })
      .where(and(eq(deploymentAlerts.tenantId, tenantId), eq(deploymentAlerts.isRead, 0)));
  }

  async dismissAlert(tenantId: number, alertId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;
    await db.update(deploymentAlerts)
      .set({ dismissedAt: new Date(), isRead: 1 })
      .where(and(eq(deploymentAlerts.id, alertId), eq(deploymentAlerts.tenantId, tenantId)));
  }

  async getDeploymentHealth(tenantId: number): Promise<{
    totalRuns: number; successRate: number; avgDurationMs: number;
    lastDeployStatus: string | null; lastDeployTime: string | null;
    failureCount: number; unreadAlerts: number;
  }> {
    const db = await getDb();
    if (!db) return { totalRuns: 0, successRate: 0, avgDurationMs: 0, lastDeployStatus: null, lastDeployTime: null, failureCount: 0, unreadAlerts: 0 };
    const recent = await db.select().from(githubActionsRuns)
      .where(eq(githubActionsRuns.tenantId, tenantId))
      .orderBy(desc(githubActionsRuns.startedAt))
      .limit(20);
    const totalRuns = recent.length;
    const successes = recent.filter(r => r.conclusion === "success").length;
    const failures = recent.filter(r => r.conclusion === "failure").length;
    const successRate = totalRuns > 0 ? Math.round((successes / totalRuns) * 100) : 0;
    const avgDurationMs = totalRuns > 0 ? Math.round(recent.reduce((s, r) => s + r.durationMs, 0) / totalRuns) : 0;
    const last = recent[0] || null;
    const unreadAlerts = Number((await db.select({ c: sql<number>`count(*)` }).from(deploymentAlerts)
      .where(and(eq(deploymentAlerts.tenantId, tenantId), eq(deploymentAlerts.isRead, 0))))[0]?.c || 0);
    return {
      totalRuns, successRate, avgDurationMs,
      lastDeployStatus: last?.conclusion || null,
      lastDeployTime: last?.completedAt?.toISOString() || last?.startedAt?.toISOString() || null,
      failureCount: failures, unreadAlerts,
    };
  }

  async getRunTimeline(tenantId: number, repo?: string): Promise<Array<{ runId: number; runNumber: number | null; conclusion: string | null; workflowName: string; startedAt: string | null; durationMs: number }>> {
    const db = await getDb();
    if (!db) return [];
    const conditions: any[] = [eq(githubActionsRuns.tenantId, tenantId)];
    if (repo) conditions.push(eq(githubActionsRuns.repoFullName, repo));
    const rows = await db.select({
      runId: githubActionsRuns.runId,
      runNumber: githubActionsRuns.runNumber,
      conclusion: githubActionsRuns.conclusion,
      workflowName: githubActionsRuns.workflowName,
      startedAt: githubActionsRuns.startedAt,
      durationMs: githubActionsRuns.durationMs,
    }).from(githubActionsRuns)
      .where(and(...conditions))
      .orderBy(desc(githubActionsRuns.startedAt))
      .limit(30);
    return rows.map(r => ({
      ...r,
      startedAt: r.startedAt?.toISOString() || null,
    }));
  }

  async saveToken(tenantId: number, token: string, username?: string, scopes?: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select({ id: githubTokens.id })
      .from(githubTokens)
      .where(eq(githubTokens.tenantId, tenantId))
      .limit(1);
    if (existing.length > 0) {
      await db.update(githubTokens)
        .set({ token, scopes: scopes || null, username: username || null, updatedAt: new Date() })
        .where(eq(githubTokens.id, existing[0].id));
    } else {
      await db.insert(githubTokens).values({ tenantId, token, scopes: scopes || null, username: username || null });
    }
  }

  async hasToken(tenantId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    const row = await db.select({ id: githubTokens.id })
      .from(githubTokens)
      .where(eq(githubTokens.tenantId, tenantId))
      .limit(1);
    return row.length > 0;
  }
}

export const githubActionsService = new GithubActionsService();
