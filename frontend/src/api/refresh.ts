import { refreshUrl } from './config'

/** POST /users/{username}/refresh – sync from Duolingo, then data is ready for GET factory. */
export async function refreshUser(username: string): Promise<void> {
  const url = refreshUrl(username)
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(res.status === 404 ? `User "${username}" not found` : text || `HTTP ${res.status}`)
  }
}
