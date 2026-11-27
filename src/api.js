/**
 * Small fetch wrapper for the Quantex Worker API.
 * - Sends/receives JSON and the session cookie.
 * - Throws an Error with the server's message on failure.
 * - Broadcasts 'qx:unauthorized' on 401 so the app can return to the login screen.
 */
export const ROLES = ['Estimator', 'Manager', 'Admin'];
// BL-06: roles are separate, not cumulative. Admin manages users only.
export const isManager = (role) => role === 'Manager';
export const isAdmin = (role) => role === 'Admin';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('qx:unauthorized'));
    }
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
