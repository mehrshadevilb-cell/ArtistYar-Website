export type ApiProduct = {
  id: number;
  title: string;
  description: string | null;
  price: number;
  is_active: boolean;
  delivery_type?: "spotplayer" | "telegram" | string;
};

export type ApiClass = {
  id: number;
  name: string;
  description: string | null;
  teacher?: string | null;
  duration_minutes?: number;
  monthly_price?: number | null;
  term_price?: number | null;
  monthly_sessions?: number;
  term_sessions?: number;
  is_active: boolean;
};

function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
}

export function hasBackend(): boolean {
  return Boolean(backendBase());
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = backendBase();
  if (!base) throw new Error("RAHYAR_API_URL is not configured");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...(init?.cache === "no-store" ? {} : { next: { revalidate: 30 } }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  return backendFetch<ApiProduct[]>("/api/v1/products");
}

export async function fetchClasses(): Promise<ApiClass[]> {
  return backendFetch<ApiClass[]>("/api/v1/classes");
}

export async function createOrder(body: {
  product_id: number;
  full_name: string;
  phone: string;
  note?: string;
}) {
  return backendFetch<{ ok: boolean; payment_id: number; amount: number; message: string; bot_url?: string | null; card: { number: string | null; holder: string | null } }>(
    "/api/v1/orders",
    { method: "POST", body: JSON.stringify(body) },
  );
}

export type OrderStatus = {
  payment_id: number;
  product_title: string;
  amount: number;
  status: string;
  created_at: string;
};

export async function fetchOrderStatus(paymentId: number, phone: string): Promise<OrderStatus> {
  return backendFetch<OrderStatus>(
    `/api/v1/orders/${paymentId}/status?phone=${encodeURIComponent(phone)}`,
  );
}

export async function uploadOrderReceipt(paymentId: number, phone: string, receipt: File) {
  const form = new FormData();
  form.set("phone", phone);
  form.set("receipt", receipt);

  const res = await fetch(`/api/rahyar/orders/receipt?payment_id=${encodeURIComponent(paymentId)}`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "آپلود رسید ناموفق بود.");
  return data as { ok: boolean; payment_id: number; status: string; message: string };
}

export type ApiLicense = {
  id: number;
  product_id: number;
  product_title: string;
  status: string;
  license_key: string | null;
  license_url: string | null;
  payment_id: number | null;
  created_at: string;
};

export async function fetchLicenses(phone: string): Promise<ApiLicense[]> {
  return backendFetch<ApiLicense[]>(`/api/v1/licenses?phone=${encodeURIComponent(phone)}`);
}

export async function createClassInquiry(body: {
  course_id: number;
  full_name: string;
  phone: string;
  message?: string;
}) {
  return backendFetch<{ ok: boolean; message: string }>("/api/v1/class-inquiries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}


export type ApiChapter = { title: string; time: number };
export type ApiFreeLesson = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  duration_label: string;
  video_url: string | null;
  thumbnail_url: string | null;
  chapters: ApiChapter[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchFreeLessons(): Promise<ApiFreeLesson[]> {
  const res = await fetch("/api/rahyar/free-lessons", { cache: "no-store" });
  if (!res.ok) throw new Error("free_lessons_unavailable");
  return res.json() as Promise<ApiFreeLesson[]>;
}

export async function fetchAdminFreeLessons(): Promise<ApiFreeLesson[]> {
  const response = await fetch("/api/rahyar/admin/free-lessons", { cache: "no-store" });
  if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
  return response.json() as Promise<ApiFreeLesson[]>;
}

export type FreeLessonInput = Omit<ApiFreeLesson, "id" | "created_at" | "updated_at">;

export async function saveAdminFreeLesson(input: FreeLessonInput, id?: number) {
  const response = await fetch(id ? `/api/rahyar/admin/free-lessons/${id}` : "/api/rahyar/admin/free-lessons", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
  return response.json() as Promise<ApiFreeLesson>;
}

export async function deleteAdminFreeLesson(id: number) {
  const res = await fetch(`/api/rahyar/admin/free-lessons/${id}`, { method: "DELETE", cache: "no-store" });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
}
