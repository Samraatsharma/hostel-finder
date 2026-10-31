export const API_BASE = (() => {
  if (typeof window === "undefined") return "/api";
  if (window.API_BASE_OVERRIDE) return window.API_BASE_OVERRIDE;
  if (window.location.protocol === "file:") return "http://localhost:8080/api";
  if (window.location.port === "5500" || window.location.port === "5000") {
    return "http://localhost:8080/api";
  }
  return "/api";
})();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

export function getToken() {
  return localStorage.getItem("accessToken");
}

export function setToken(token) {
  localStorage.setItem("accessToken", token);
}

export function clearToken() {
  localStorage.removeItem("accessToken");
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiFetch(path, { method = "GET", headers = {}, body } = {}, retryCount = 0) {
  const token = getToken();
  const finalHeaders = { ...headers };
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const msg = (data && data.message) ? data.message : `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (error) {
    // On first API call failure (likely backend not ready), retry
    if (retryCount < MAX_RETRIES && 
        (error.message.includes("Failed to fetch") || 
         error.message.includes("timeout") ||
         error.message.includes("ERR") ||
         error instanceof TypeError)) {
      
      console.warn(`API request failed (attempt ${retryCount + 1}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
      return apiFetch(path, { method, headers, body }, retryCount + 1);
    }
    
    throw error;
  }
}
