import type { TopFactoriesResponse, GetTopFactoriesParams } from '../types'
import { topFactoriesUrl } from './config'

export async function getTopFactories(params: GetTopFactoriesParams = {}): Promise<TopFactoriesResponse> {
  const url = topFactoriesUrl(params)
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<TopFactoriesResponse>
}
