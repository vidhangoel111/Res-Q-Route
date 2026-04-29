const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api") as string;

function getStoredUser() {
  try {
    const raw = localStorage.getItem("resqroute_user");
    return raw ? (JSON.parse(raw) as { id?: string; name?: string; email?: string; role?: string; hospitalId?: string | null }) : null;
  } catch {
    return null;
  }
}

function buildHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  const token = localStorage.getItem("resqroute_token");
  const user = getStoredUser();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (user?.id && user?.role) {
    headers.set("X-Dev-User-Id", user.id);
    headers.set("X-Dev-Role", user.role);
    if (user.name) headers.set("X-Dev-User-Name", user.name);
    if (user.email) headers.set("X-Dev-User-Email", user.email);
    if (user.hospitalId) headers.set("X-Dev-Hospital-Id", user.hospitalId);
  }

  return headers;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: buildHeaders(init.headers),
  });
}

export function getApiBase() {
  return API_BASE;
}
