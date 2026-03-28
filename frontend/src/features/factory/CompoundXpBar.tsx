import type { FactoryLanguage, FactoryResponse } from '../../types'

function primaryCompoundLanguage(factory: FactoryResponse): FactoryLanguage | null {
  const { languages, factory_meta } = factory
  if (languages.length === 0) return null
  return (
    languages.find((l) => l.is_current) ??
    languages.find((l) => l.language_code === factory_meta.primary_language_code) ??
    languages[0]
  )
}

interface CompoundXpBarProps {
  factory: FactoryResponse
}

export function CompoundXpBar({ factory }: CompoundXpBarProps) {
  const lang = primaryCompoundLanguage(factory)
  if (!lang) return null

  const xpLeft = lang.xp_to_next_compound
  const ratio = Math.max(0, Math.min(1, lang.compound_progress_ratio))

  return (
    <div className="factory-map__xp-bar" role="status" aria-live="polite">
      <div className="factory-map__xp-bar-row">
        <span className="factory-map__xp-bar-title">
          {lang.language_name}
          {lang.is_current ? ' · current course' : ''}
        </span>
        <span className="factory-map__xp-bar-value">
          {xpLeft > 0 ? (
            <>
              <strong>{xpLeft.toLocaleString()}</strong> XP to next compound
            </>
          ) : (
            <>Next compound unlocked</>
          )}
        </span>
      </div>
      <div className="factory-map__xp-track" aria-hidden>
        <div className="factory-map__xp-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}
