export type MarketplaceProject = {
  id: number;
  employer_name: string;
  title: string;
  description: string;
  category: string;
  skills: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  remote: boolean;
  status: string;
  ai_summary?: string | null;
  created_at: string;
};

const backend = (process.env.NEXT_PUBLIC_RAHYAR_API_URL || process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export async function fetchMarketplaceProjects(): Promise<MarketplaceProject[]> {
  const response = await fetch(`${backend}/api/v1/projects`, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error("projects_unavailable");
  return response.json() as Promise<MarketplaceProject[]>;
}

export async function submitMarketplaceProject(input: Omit<MarketplaceProject, "id" | "status" | "created_at" | "ai_summary">) {
  const response = await fetch(`${backend}/api/v1/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("project_submission_failed");
  return response.json() as Promise<MarketplaceProject>;
}
