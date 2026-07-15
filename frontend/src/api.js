export const API_BASE = '/api';
export const FALLBACK_API_BASE = 'http://127.0.0.1:5000/api';

async function requestWithFallback(url, options, fallbackUrl) {
  try {
    const res = await fetch(url, options);
    if (res.ok || !fallbackUrl || url === fallbackUrl) {
      return res;
    }
    if (res.status === 404 || res.status >= 500) {
      return fetch(fallbackUrl, options);
    }
    return res;
  } catch (error) {
    if (!fallbackUrl || url === fallbackUrl) {
      throw error;
    }
    return fetch(fallbackUrl, options);
  }
}

export async function apiRequest(path, { token = '', method = 'GET', body = null } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const options = { method, headers };

  if (body instanceof FormData || body instanceof Blob) {
    options.body = body;
  } else if (body !== null && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const primaryUrl = `${API_BASE}${path}`;
  const fallbackUrl = `${FALLBACK_API_BASE}${path}`;
  const res = await requestWithFallback(primaryUrl, options, fallbackUrl);

  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload;
}
