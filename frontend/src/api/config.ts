const base = import.meta.env.VITE_API_URL ?? ''
export const apiBase = base.replace(/\/$/, '')

export function refreshUrl(username: string): string {
  return `${apiBase}/users/${encodeURIComponent(username)}/refresh`
}

export function factoryUrl(username: string): string {
  return `${apiBase}/users/${encodeURIComponent(username)}/factory`
}

export function topFactoriesUrl(params: { limit?: number; sort?: string }): string {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.sort != null) sp.set('sort', params.sort)
  const q = sp.toString()
  return `${apiBase}/factories/top${q ? `?${q}` : ''}`
}
