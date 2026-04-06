import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { openFactory } from '../../api'
import { buildFactoryRenderModel } from '../../lib/procedural'
import type { FactoryResponse } from '../../types'
import { getCompoundProgress } from '../../lib/factory/compoundProgression'
import { FactoryMap } from './FactoryMap'
import { FactoryDebugCard } from './FactoryDebugCard'

function getSimulationTargetSeedKey(factory: FactoryResponse): string | null {
  const current = factory.languages.find((lang) => lang.is_current)
  return current?.seed_key ?? factory.languages[0]?.seed_key ?? null
}

function applyXpDelta(factory: FactoryResponse, delta: number): FactoryResponse {
  const targetSeedKey = getSimulationTargetSeedKey(factory)
  if (!targetSeedKey || delta === 0) return factory

  const nextLanguages = factory.languages.map((lang) => {
    if (lang.seed_key !== targetSeedKey) return lang

    const nextXp = Math.max(0, lang.xp + delta)
    const progress = getCompoundProgress(nextXp)
    return {
      ...lang,
      xp: nextXp,
      ...progress,
    }
  })

  const totalXp = nextLanguages.reduce((sum, lang) => sum + lang.xp, 0)
  const dominantLanguage = nextLanguages.reduce((best, lang) => (lang.xp > best.xp ? lang : best), nextLanguages[0])

  return {
    ...factory,
    user: {
      ...factory.user,
      total_xp: totalXp,
    },
    factory_meta: {
      ...factory.factory_meta,
      dominant_language_xp_share: totalXp > 0 ? dominantLanguage.xp / totalXp : 0,
      primary_language_code: dominantLanguage.language_code,
    },
    languages: nextLanguages.map((lang) => ({
      ...lang,
      xp_share: totalXp > 0 ? lang.xp / totalXp : 0,
    })),
  }
}

export function FactoryPage() {
  const { username } = useParams<{ username: string }>()
  const [factory, setFactory] = useState<FactoryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [xpStepAmount, setXpStepAmount] = useState(25)
  const [xpDelta, setXpDelta] = useState(0)
  useEffect(() => {
    if (!username) {
      setLoading(false)
      setError('Missing username')
      return
    }
    setLoading(true)
    setError(null)
    setXpDelta(0)
    openFactory(username)
      .then((data) => setFactory(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [username])

  const simulationTarget = useMemo(() => {
    if (!factory) return null
    const targetSeedKey = getSimulationTargetSeedKey(factory)
    return factory.languages.find((lang) => lang.seed_key === targetSeedKey) ?? null
  }, [factory])

  const simulatedFactory = useMemo(() => {
    if (!factory) return null
    return applyXpDelta(factory, xpDelta)
  }, [factory, xpDelta])

  const renderModel = useMemo(() => {
    if (!simulatedFactory) return null
    try {
      return buildFactoryRenderModel(simulatedFactory)
    } catch (e) {
      console.error('buildFactoryRenderModel failed:', e)
      return null
    }
  }, [simulatedFactory])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Refreshing from Duolingo & loading factory…
      </div>
    )
  }

  if (error || !factory || !simulatedFactory) {
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
    <div className="factory-page">
      <div className="factory-page__map">
        <FactoryMap
          factory={simulatedFactory}
          renderModel={renderModel}
          xpStepAmount={xpStepAmount}
          xpDelta={xpDelta}
          simulationTargetName={simulationTarget?.language_name ?? null}
          onXpStepAmountChange={setXpStepAmount}
          onAddXp={() => setXpDelta((current) => current + xpStepAmount)}
          onRemoveXp={() =>
            setXpDelta((current) => Math.max(-(simulationTarget?.xp ?? 0), current - xpStepAmount))
          }
        />
      </div>
      <div className="factory-page__debug">
        <FactoryDebugCard factory={simulatedFactory} renderModel={renderModel} />
      </div>
    </div>
  )
}
