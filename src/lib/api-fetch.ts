/**
 * Shared API fetch helper that automatically includes credentials for cookie-based auth.
 * Session token is stored in httpOnly cookie and sent automatically by the browser.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
  });
}
