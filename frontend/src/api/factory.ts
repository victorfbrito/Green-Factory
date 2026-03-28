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
  const text = await res.text()
  if (!text || text.trim() === '') {
    throw new Error('Empty response from server')
  }
  try {
    return JSON.parse(text) as FactoryResponse
  } catch {
    throw new Error('Invalid JSON response from server')
  }
}

/** Refresh from Duolingo then load factory – use this when opening a factory for latest data. */
export async function openFactory(username: string): Promise<FactoryResponse> {
  await refreshUser(username)
  return getFactory(username)
}
