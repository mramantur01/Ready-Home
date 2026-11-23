// Client API helper keeping Bearer tokens in JS memory (never localStorage)
// while also sending X-Requested-With for HttpOnly cookie verification across reloads.

let clientToken: string | null = null;
let adminToken: string | null = null;

export function setClientToken(token: string | null): void {
  clientToken = token;
}

export function setAdminToken(token: string | null): void {
  adminToken = token;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit & { auth?: 'client' | 'admin' | 'none' } = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const { auth = 'none', headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'X-Requested-With': 'ReadyHome',
    ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
    ...(customHeaders as Record<string, string> | undefined),
  };

  if (auth === 'client' && clientToken) {
    headers.Authorization = `Bearer ${clientToken}`;
  } else if (auth === 'admin' && adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include',
  });

  let data = {} as T;
  try {
    data = (await res.json()) as T;
  } catch {
    // Non-JSON response
  }

  return { ok: res.ok, status: res.status, data };
}
