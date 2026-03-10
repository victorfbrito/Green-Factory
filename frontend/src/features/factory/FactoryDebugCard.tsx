import type { FactoryResponse } from '../../types'
import type { FactorySceneModel } from '../../lib/procedural'
import { getTerritoryBudget } from '../../lib/procedural'
import { DISTRICT_COLORS } from './constants'

interface FactoryDebugCardProps {
  factory: FactoryResponse
  scene: FactorySceneModel
}

const themeVarNames: Record<string, string> = {
  industrial: 'Grey/dark, low greenery',
  improving: 'Slightly greener tones',
  sustainable: 'Green mid-palette',
  advanced_green: 'Strong green',
  regenerative: 'Deep green, clean',
}

export function FactoryDebugCard({ factory, scene }: FactoryDebugCardProps) {
  const { user, factory_meta, languages } = factory
  const { worldTheme, mapSize, districts } = scene

  return (
    <section
      className="factory-debug-card"
      style={{
        width: '100%',
        maxWidth: 720,
        marginTop: '1rem',
        padding: '1rem 1.25rem',
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        fontSize: '0.8rem',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', opacity: 0.95 }}>
        Debug — data driving this factory
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* User & meta */}
        <div>
          <strong style={{ opacity: 0.9 }}>User & meta</strong>
          <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
            <li>username: {user.username} · current_course_id: {user.current_course_id ?? '—'}</li>
            <li>total_languages: {factory_meta.total_languages} · primary_language_code: {factory_meta.primary_language_code ?? '—'}</li>
            <li>dominant_language_xp_share: {factory_meta.dominant_language_xp_share}</li>
            <li>active_streak_band: {factory_meta.active_streak_band}</li>
          </ul>
        </div>

        {/* World / background */}
        <div>
          <strong style={{ opacity: 0.9 }}>World & environment</strong>
          <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
            <li>worldTheme: <code>{worldTheme}</code> → {themeVarNames[worldTheme] ?? worldTheme}</li>
            <li>environment_level: {factory_meta.environment_level} · environment_label: <code>{factory_meta.environment_label}</code></li>
            <li>sustainability_score: {factory_meta.sustainability_score}</li>
            <li>mapSize: {mapSize}px (canvas and coordinate space)</li>
          </ul>
        </div>

        {/* Languages / districts */}
        <div>
          <strong style={{ opacity: 0.9 }}>Languages (districts) — {languages.length} total</strong>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.85 }}>
            District colors (by variant): {DISTRICT_COLORS.map((c, i) => (
              <span key={i} style={{ marginRight: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c, verticalAlign: 'middle', marginRight: 4 }} />
                {i}: {c}
              </span>
            ))}
          </p>
          <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
            {districts.map((d, i) => {
              const color = DISTRICT_COLORS[i % DISTRICT_COLORS.length]
              const lang = d.language
              return (
                <li key={lang.seed_key} style={{ marginBottom: '0.35rem' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, verticalAlign: 'middle', marginRight: 6 }} />
                  [{i}] {lang.language_name} — course_id: <code>{lang.course_id}</code> · xp: {lang.xp} · xp_share: {lang.xp_share} · sector_tier: {lang.sector_tier} · sort_order: {lang.sort_order}
                  {lang.is_current && ' · is_current'}
                  <br />
                  <span style={{ paddingLeft: 16, opacity: 0.8 }}>
                    seed_key: {lang.seed_key} · variant: {d.variant} · color: {color} · anchor: ({d.x.toFixed(0)}, {d.y.toFixed(0)})
                    {' · '}territory_budget: {getTerritoryBudget(lang.sector_tier, lang.xp_share, lang.seed_key)} cells (world grid + motifs)
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Upgrades */}
        <div>
          <strong style={{ opacity: 0.9 }}>Unlocked upgrades — {factory_meta.unlocked_upgrades.length} total</strong>
          <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
            {factory_meta.unlocked_upgrades.map((id) => (
              <li key={id}><code>{id}</code></li>
            ))}
          </ul>
          <p style={{ margin: '0.35rem 0 0 0', opacity: 0.8 }}>Details (title + short_description) drive popups; placements use scene.upgrades (x, y, variant).</p>
        </div>

        {/* Scene summary */}
        <div>
          <strong style={{ opacity: 0.9 }}>Scene summary</strong>
          <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
            <li>shared world grid: 60×60 cells · districts: {districts.length}</li>
            <li>each district: territory on grid → filled with multiple motifs (courtyard, staggered_row, paired_blocks, etc.) · 1x1 / 2x1 / 2x2 blocks</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
