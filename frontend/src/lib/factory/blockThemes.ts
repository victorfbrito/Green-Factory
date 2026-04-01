/**
 * Block themes group compounds by knowledge-flow role (intake → processing → …).
 * Which themes exist at a given campus tier mirrors district evolution:
 * early tiers feel like a school; later tiers unlock storage, distribution, then research/culture.
 */

import type { CompoundCategory } from './compoundRegistry'

export interface BlockTheme {
  id: string
  category: CompoundCategory
  minTier: 1 | 2 | 3 | 4 | 5
  /** Registry ids preferred when this theme is active */
  preferredCompoundIds: string[]
}

export const BLOCK_THEMES: BlockTheme[] = [
  {
    id: 'intake',
    category: 'intake',
    minTier: 1,
    preferredCompoundIds: ['lesson_intake_center', 'listening_lab'],
  },
  {
    id: 'processing',
    category: 'processing',
    minTier: 2,
    preferredCompoundIds: [
      'grammar_reactor',
      'vocabulary_assembler',
      'sentence_forge',
      'repetition_loop',
      'mistake_recycling_center',
      'speaking_booth',
    ],
  },
  {
    id: 'storage',
    category: 'storage',
    minTier: 3,
    preferredCompoundIds: [
      'memory_warehouse',
      'vocabulary_vault',
      'archive_library',
      'knowledge_silo',
      'review_center',
    ],
  },
  {
    id: 'distribution',
    category: 'distribution',
    minTier: 4,
    preferredCompoundIds: [
      'communication_tower',
      'conversation_dispatch_center',
      'translation_engine',
      'media_center',
      'cultural_exchange_port',
    ],
  },
  {
    id: 'research',
    category: 'research',
    minTier: 5,
    preferredCompoundIds: ['linguistics_research_lab', 'ai_translation_lab', 'innovation_lab'],
  },
  {
    id: 'culture',
    category: 'culture',
    minTier: 5,
    preferredCompoundIds: [
      'literature_institute',
      'culture_museum',
      'language_cafe',
      'theater',
      'practice_arena',
      'small_library',
    ],
  },
]

/** Themes unlocked at this district tier (minimum tier gate). */
export function getBlockThemesForTier(tier: 1 | 2 | 3 | 4 | 5): BlockTheme[] {
  return BLOCK_THEMES.filter((t) => t.minTier <= tier).sort((a, b) => a.id.localeCompare(b.id))
}
