import type { WorldThemeId } from '../../lib/procedural'

interface WorldLayerProps {
  theme: WorldThemeId
}

const themeClass: Record<WorldThemeId, string> = {
  industrial: 'world-industrial',
  improving: 'world-improving',
  sustainable: 'world-sustainable',
  advanced_green: 'world-advanced_green',
  regenerative: 'world-regenerative',
}

export function WorldLayer({ theme }: WorldLayerProps) {
  return (
    <div
      className={`factory-map__world ${themeClass[theme]}`}
      aria-hidden
    />
  )
}
