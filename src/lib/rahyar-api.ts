export type ApiProduct = {
  id: number;
  title: string;
  description: string | null;
  price: number;
  is_active: boolean;
};

export type ApiClass = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
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
    next: { revalidate: 30 },
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
  return backendFetch<{ ok: boolean; payment_id: number; amount: number; message: string; card: { number: string | null; holder: string | null } }>(
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
