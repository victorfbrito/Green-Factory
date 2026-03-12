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
  const { user, factory_meta } = factory

  return (
    <aside className="factory-sidebar">
      <h2>{user.display_name || user.username}</h2>
      <p>@{user.username} · {user.total_xp.toLocaleString()} XP · 🔥 {user.streak} streak</p>
      <div className="factory-sidebar__meta">
        <span className="factory-sidebar__badge">{factory_meta.environment_label}</span>
        <span className="factory-sidebar__badge">Level {factory_meta.environment_level}</span>
        <span className="factory-sidebar__badge">Sustainability {factory_meta.sustainability_score}</span>
      </div>
      <UpgradeList details={factory_meta.upgrade_details} />
    </aside>
  )
}
