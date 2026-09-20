/** GitHub connector for Admin Dev Agent — read/search/branch/PR only (never force-push main) */

import { githubConfig } from "./admin-ai-platform";

type GhJson = Record<string, unknown>;

async function gh(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: GhJson }> {
  const { token } = githubConfig();
  if (!token) throw new Error("github_not_configured");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as GhJson;
  return { ok: response.ok, status: response.status, data };
}

export async function githubStatus() {
  const cfg = githubConfig();
  if (!cfg.configured) return { ok: false, configured: false, error: "GITHUB_TOKEN تنظیم نشده است." };
  const me = await gh("/user");
  if (!me.ok) return { ok: false, configured: true, error: "توکن GitHub نامعتبر است." };
  return {
    ok: true,
    configured: true,
    login: String(me.data.login || ""),
    owner: cfg.owner,
    repo: cfg.repo,
    baseBranch: cfg.baseBranch,
  };
}

export async function searchCode(query: string, limit = 12) {
  const { owner, repo } = githubConfig();
  const q = encodeURIComponent(`${query} repo:${owner}/${repo}`);
  const result = await gh(`/search/code?q=${q}&per_page=${Math.min(30, limit)}`);
  if (!result.ok) throw new Error(String(result.data.message || "github_search_failed"));
  const items = Array.isArray(result.data.items) ? result.data.items : [];
  return items.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      path: String(row.path || ""),
      name: String(row.name || ""),
      url: String(row.html_url || ""),
    };
  });
}

export async function readFile(path: string, ref?: string) {
  const { owner, repo, baseBranch } = githubConfig();
  const branch = ref || baseBranch;
  const result = await gh(`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`);
  if (!result.ok) throw new Error(String(result.data.message || "github_read_failed"));
  const encoding = String(result.data.encoding || "");
  const content = String(result.data.content || "");
  const decoded = encoding === "base64" ? Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8") : content;
  return {
    path,
    sha: String(result.data.sha || ""),
    size: Number(result.data.size || 0),
    content: decoded.slice(0, 120_000),
  };
}

export async function listTree(path = "", ref?: string) {
  const { owner, repo, baseBranch } = githubConfig();
  const branch = ref || baseBranch;
  const prefix = path ? `${path.replace(/\/$/, "")}/` : "";
  const result = await gh(`/repos/${owner}/${repo}/contents/${prefix}?ref=${encodeURIComponent(branch)}`);
  if (!result.ok) throw new Error(String(result.data.message || "github_list_failed"));
  const rows = Array.isArray(result.data) ? result.data : [];
  return rows.map((item) => {
    const row = item as Record<string, unknown>;
    return { path: String(row.path || ""), name: String(row.name || ""), type: String(row.type || ""), size: Number(row.size || 0) };
  });
}

export type FileChange = { path: string; content: string; message?: string };

export async function createBranchAndPullRequest(input: {
  branchName: string;
  title: string;
  body: string;
  files: FileChange[];
  draft?: boolean;
}) {
  const { owner, repo, baseBranch } = githubConfig();
  if (!input.files.length) throw new Error("no_files_to_commit");
  if (input.files.some((f) => f.path.includes("..") || f.path.startsWith("/"))) throw new Error("invalid_path");

  const ref = await gh(`/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
  if (!ref.ok) throw new Error(String(ref.data.message || "base_ref_failed"));
  const baseSha = String((ref.data.object as { sha?: string } | undefined)?.sha || "");
  if (!baseSha) throw new Error("base_sha_missing");

  const branch = input.branchName.replace(/[^a-zA-Z0-9._/-]/g, "-").slice(0, 80);
  const createRef = await gh(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });
  if (!createRef.ok && createRef.status !== 422) {
    throw new Error(String(createRef.data.message || "create_branch_failed"));
  }

  for (const file of input.files.slice(0, 20)) {
    let sha: string | undefined;
    try {
      const existing = await readFile(file.path, branch);
      sha = existing.sha;
    } catch {
      sha = undefined;
    }
    const put = await gh(`/repos/${owner}/${repo}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      body: JSON.stringify({
        message: file.message || `chore: update ${file.path}`,
        content: Buffer.from(file.content, "utf8").toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!put.ok) throw new Error(String(put.data.message || `write_failed:${file.path}`));
  }

  const pr = await gh(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title.slice(0, 120),
      head: branch,
      base: baseBranch,
      body: input.body.slice(0, 8000),
      draft: input.draft !== false,
    }),
  });
  if (!pr.ok) throw new Error(String(pr.data.message || "create_pr_failed"));
  return {
    branch,
    number: Number(pr.data.number || 0),
    url: String(pr.data.html_url || ""),
    draft: Boolean(pr.data.draft),
  };
}
