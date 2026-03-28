import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { openFactory } from '../../api'
import { buildFactoryRenderModel } from '../../lib/procedural'
import type { FactoryResponse } from '../../types'
import { FactoryMap } from './FactoryMap'
import { FactorySidebar } from './FactorySidebar'
import { FactoryDebugCard } from './FactoryDebugCard'

export function FactoryPage() {
  const { username } = useParams<{ username: string }>()
  const [factory, setFactory] = useState<FactoryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!username) {
      setLoading(false)
      setError('Missing username')
      return
    }
    setLoading(true)
    setError(null)
    openFactory(username)
      .then((data) => setFactory(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [username])

  const renderModel = useMemo(() => {
    if (!factory) return null
    try {
      return buildFactoryRenderModel(factory)
    } catch (e) {
      console.error('buildFactoryRenderModel failed:', e)
      return null
    }
  }, [factory])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Refreshing from Duolingo & loading factory…
      </div>
    )
  }

  if (error || !factory) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#c00' }}>
        {error ?? 'Not found'}
      </div>
    )
  }

  if (!renderModel) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#c00' }}>
        Failed to build factory layout. Check console for details.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <FactoryMap factory={factory} renderModel={renderModel} />
        <FactorySidebar factory={factory} />
      </div>
      <FactoryDebugCard factory={factory} renderModel={renderModel} />
    </div>
  )
}
