import type { FactoryResponse, UpgradeDetail } from '../../types'

interface FactorySidebarProps {
  factory: FactoryResponse
}

function UpgradeList({ details }: { details: UpgradeDetail[] }) {
  if (details.length === 0) return null
  return (
    <section style={{ marginTop: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Unlocked upgrades</h3>
      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
        {details.map((u) => (
          <li key={u.id} style={{ marginBottom: '0.25rem' }}>
            <strong>{u.title}</strong>: {u.short_description}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FactorySidebar({ factory }: FactorySidebarProps) {
  const { user, factory_meta, languages } = factory

  return (
    <aside className="factory-sidebar">
      <h2>{user.display_name || user.username}</h2>
      <p>@{user.username} · {user.total_xp.toLocaleString()} XP · 🔥 {user.streak} streak</p>
      <div className="factory-sidebar__meta">
        <span className="factory-sidebar__badge">{factory_meta.environment_label}</span>
        <span className="factory-sidebar__badge">Level {factory_meta.environment_level}</span>
        <span className="factory-sidebar__badge">Sustainability {factory_meta.sustainability_score}</span>
      </div>

      {languages.length > 0 && (
        <section style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>District growth</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {languages.map((lang) => (
              <li key={lang.seed_key} style={{ marginBottom: '0.5rem' }}>
                <strong>{lang.language_name}</strong>
                {lang.is_current && ' (current)'}
                <br />
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  {lang.compound_count} compounds · {lang.xp.toLocaleString()} XP
                  {lang.xp_to_next_compound > 0 && (
                    <> · {lang.xp_to_next_compound.toLocaleString()} XP to next</>
                  )}
                </span>
                {lang.xp_to_next_compound > 0 && (
                  <div
                    style={{
                      marginTop: 2,
                      height: 4,
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      width: 100,
                    }}
                  >
                    <div
                      style={{
                        width: `${lang.compound_progress_ratio * 100}%`,
                        height: '100%',
                        background: 'var(--color-accent, #3b82f6)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <UpgradeList details={factory_meta.upgrade_details} />
    </aside>
  )
}
