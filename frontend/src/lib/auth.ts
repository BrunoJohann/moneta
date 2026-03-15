export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('moneta_token');
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('moneta_token', access);
  localStorage.setItem('moneta_refresh_token', refresh);
  document.cookie = 'moneta_session=true; path=/; max-age=604800; SameSite=Lax';
}

export function clearTokens(): void {
  localStorage.removeItem('moneta_token');
  localStorage.removeItem('moneta_refresh_token');
  document.cookie = 'moneta_session=; path=/; max-age=0';
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
