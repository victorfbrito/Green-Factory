import type { FactoryResponse } from '../types'
import { factoryUrl } from './config'
import { refreshUser } from './refresh'

export async function getFactory(username: string): Promise<FactoryResponse> {
  const url = factoryUrl(username)
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(res.status === 404 ? `User "${username}" not found` : text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<FactoryResponse>
}

/** Refresh from Duolingo then load factory – use this when opening a factory for latest data. */
export async function openFactory(username: string): Promise<FactoryResponse> {
  await refreshUser(username)
  return getFactory(username)
}
