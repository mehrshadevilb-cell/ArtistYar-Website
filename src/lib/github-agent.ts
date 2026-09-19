const GITHUB_API = "https://api.github.com";

function token(): string {
  return (process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "").trim();
}

export function githubRepo(): string {
  return (process.env.GITHUB_REPOSITORY || "mehrshadevilb-cell/ArtistYar-Website").trim();
}

function headers(): HeadersInit {
  const key = token();
  if (!key) throw new Error("GITHUB_TOKEN تنظیم نشده است.");
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${key}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function github<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method || "GET";
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : `GitHub API ${response.status}`;
    const permissionHint = response.status === 401 || response.status === 403
      ? " بررسی کنید GITHUB_TOKEN معتبر است، به همین repository دسترسی دارد و برای Fine-grained token مجوزهای Metadata: Read، Contents: Read and write و Pull requests: Read and write فعال شده‌اند."
      : "";
    throw new Error(`GitHub API ${response.status} در ${method} ${path}: ${message}.${permissionHint}`);
  }
  return data as T;
}

type RefResponse = { object: { sha: string; type: string } };
type RepoResponse = { default_branch: string; full_name: string };
type ContentResponse = { sha: string; content?: string; encoding?: string; type?: string };
type BranchResponse = { object: { sha: string } };
type PullResponse = { number: number; html_url: string; state: string; draft: boolean };

export async function getDefaultBranch(repo = githubRepo()): Promise<string> {
  const data = await github<RepoResponse>(`/repos/${repo}`);
  return data.default_branch;
}

export async function getRefSha(repo: string, ref: string): Promise<string> {
  const data = await github<RefResponse>(`/repos/${repo}/git/ref/heads/${encodeURIComponent(ref)}`);
  return data.object.sha;
}

export async function getFile(repo: string, path: string, ref: string): Promise<{ content: string; sha: string }> {
  const data = await github<ContentResponse>(`/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`);
  if (data.type !== "file" || !data.content) throw new Error(`فایل قابل خواندن نیست: ${path}`);
  const content = Buffer.from(data.content.replace(/\n/g, ""), data.encoding === "base64" ? "base64" : "utf8").toString("utf8");
  return { content, sha: data.sha };
}

export async function createBranch(repo: string, branch: string, baseRef: string): Promise<void> {
  const sha = await getRefSha(repo, baseRef);
  await github(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
}

export async function updateFile(
  repo: string,
  path: string,
  branch: string,
  content: string,
  message: string,
): Promise<string> {
  const current = await getFile(repo, path, branch);
  const data = await github<{ commit: { sha: string } }>(`/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha: current.sha,
      branch,
    }),
  });
  return data.commit.sha;
}

export async function createFile(
  repo: string,
  path: string,
  branch: string,
  content: string,
  message: string,
): Promise<string> {
  const data = await github<{ commit: { sha: string } }>(`/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
    }),
  });
  return data.commit.sha;
}

export async function createPullRequest(
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<PullResponse> {
  return github<PullResponse>(`/repos/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, body, head, base, draft: true, maintainer_can_modify: true }),
  });
}

export async function readProjectFiles(repo: string, ref: string, paths: string[]) {
  const results = await Promise.all(paths.slice(0, 18).map(async path => {
    try {
      const file = await getFile(repo, path, ref);
      return { path, content: file.content };
    } catch {
      return { path, content: "[FILE_NOT_FOUND]" };
    }
  }));
  return results;
}
