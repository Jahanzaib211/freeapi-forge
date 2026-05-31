import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { trackedRepos } from "../../drizzle/schema";

const GITHUB_API = "https://api.github.com";

export class GithubExplorerService {

  async getTrending(options?: { language?: string; since?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    params.set("q", "created:>2024-01-01 sort:stars");
    params.set("per_page", "30");
    if (options?.language) params.set("q", `language:${options.language}+created:>2024-01-01 sort:stars`);
    if (options?.since) {
      const sinceDate = options.since === "daily" ? new Date(Date.now() - 86400000).toISOString().split("T")[0]
        : options.since === "weekly" ? new Date(Date.now() - 604800000).toISOString().split("T")[0]
        : options.since === "monthly" ? new Date(Date.now() - 2592000000).toISOString().split("T")[0]
        : options.since;
      params.set("q", `created:>=${sinceDate}+sort:stars`);
    }

    try {
      const res = await fetch(`${GITHUB_API}/search/repositories?${params.toString()}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "forge-studio",
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        id: item.id,
        fullName: item.full_name,
        owner: item.owner?.login,
        repo: item.name,
        description: item.description,
        language: item.language,
        stars: item.stargazers_count,
        forks: item.forks_count,
        topics: item.topics,
        url: item.html_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch {
      return [];
    }
  }

  async searchRepos(query: string, options?: { language?: string; sort?: string; order?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    let q = query;
    if (options?.language) q = `${q}+language:${options.language}`;
    params.set("q", q);
    params.set("per_page", "30");
    if (options?.sort) params.set("sort", options.sort);
    if (options?.order) params.set("order", options.order);

    try {
      const res = await fetch(`${GITHUB_API}/search/repositories?${params.toString()}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "forge-studio",
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        id: item.id,
        fullName: item.full_name,
        owner: item.owner?.login,
        repo: item.name,
        description: item.description,
        language: item.language,
        stars: item.stargazers_count,
        forks: item.forks_count,
        topics: item.topics,
        url: item.html_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch {
      return [];
    }
  }

  async getRepoDetails(owner: string, repo: string): Promise<any> {
    try {
      const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "forge-studio",
        },
      });
      if (!res.ok) return null;
      const item = await res.json();
      return {
        id: item.id,
        fullName: item.full_name,
        owner: item.owner?.login,
        repo: item.name,
        description: item.description,
        language: item.language,
        stars: item.stargazers_count,
        forks: item.forks_count,
        openIssues: item.open_issues_count,
        topics: item.topics,
        url: item.html_url,
        homepage: item.homepage,
        license: item.license?.spdx_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        pushedAt: item.pushed_at,
        defaultBranch: item.default_branch,
        visibility: item.visibility,
      };
    } catch {
      return null;
    }
  }
}

export const githubExplorerService = new GithubExplorerService();
