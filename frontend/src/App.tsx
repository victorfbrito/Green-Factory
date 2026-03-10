import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { FactoryPage } from './features/factory'
import { getTopFactories } from './api'
import type { TopFactoryItem } from './types'
import './App.css'

function Home() {
  const navigate = useNavigate()
  const [topFactories, setTopFactories] = useState<TopFactoryItem[]>([])
  const [topLoading, setTopLoading] = useState(true)

  useEffect(() => {
    getTopFactories({ limit: 5, sort: 'total_xp' })
      .then((res) => setTopFactories(res.items))
      .catch(() => setTopFactories([]))
      .finally(() => setTopLoading(false))
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <h1>Duolingo Factory</h1>
      <p>
        View your learning progress as a sustainable factory campus. Enter a Duolingo username
        to refresh and open their factory.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const input = form.querySelector<HTMLInputElement>('input[name="username"]')
          const value = input?.value.trim()
          if (value) navigate(`/users/${encodeURIComponent(value)}`)
        }}
        style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}
      >
        <input
          type="text"
          name="username"
          placeholder="Duolingo username"
          autoComplete="username"
          style={{ padding: '0.5rem', flex: 1, borderRadius: 6 }}
        />
        <button type="submit">View factory</button>
      </form>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Top 5 factories (by XP)</h2>
        {topLoading ? (
          <p style={{ opacity: 0.8 }}>Loading…</p>
        ) : topFactories.length === 0 ? (
          <p style={{ opacity: 0.8 }}>No factories yet. View a user to add them.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {topFactories.map((item) => (
              <li key={item.username} style={{ marginBottom: '0.5rem' }}>
                <Link
                  to={`/users/${encodeURIComponent(item.username)}`}
                  style={{
                    display: 'block',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.06)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.display_name || item.username}</span>
                  {' · '}
                  <span style={{ opacity: 0.9 }}>@{item.username}</span>
                  {' · '}
                  <span style={{ opacity: 0.85 }}>{item.total_xp.toLocaleString()} XP</span>
                  {' · '}
                  <span style={{ opacity: 0.85 }}>🔥 {item.streak}</span>
                  {' · '}
                  <span style={{ opacity: 0.8 }}>{item.environment_label.replace(/_/g, ' ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users/:username" element={<FactoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
