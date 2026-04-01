/**
 * Semantic compound registry (frontend-only).
 *
 * Compounds are knowledge-themed buildings on a shared campus—not anonymous industrial boxes.
 * The API does not assign specific building identities; the backend only supplies counts and
 * language metadata. The frontend deterministically maps each placed compound to a definition
 * here so visuals and copy can evolve without contract changes.
 */

export type CompoundCategory =
  | 'intake'
  | 'processing'
  | 'storage'
  | 'distribution'
  | 'research'
  | 'culture'

export type CompoundSize = 'small' | 'medium' | 'large' | 'landmark'

export type CompoundAnimationType =
  | 'idle'
  | 'belt'
  | 'signal'
  | 'vehicles'
  | 'liquid'
  | 'hologram'
  | 'crowd'

export interface CompoundDefinition {
  id: string
  name: string
  category: CompoundCategory
  /** Minimum campus tier (1–5) at which this building may appear */
  tierRequired: 1 | 2 | 3 | 4 | 5
  size: CompoundSize
  footprint: { w: number; h: number }
  blockTypes: string[]
  animationType: CompoundAnimationType
  landmark?: boolean
  description: string
}

/** Runtime metadata attached to each placed compound after packing (spatial layout unchanged). */
export interface CompoundSemantic {
  compoundDefinitionId: string
  category: CompoundCategory
  size: CompoundSize
  animationType: CompoundAnimationType
  displayName: string
}

function def(
  partial: Omit<CompoundDefinition, 'footprint' | 'blockTypes'> & {
    footprint?: { w: number; h: number }
    blockTypes?: string[]
  }
): CompoundDefinition {
  const size = partial.size
  const footprint =
    partial.footprint ??
    (size === 'small'
      ? { w: 2, h: 2 }
      : size === 'medium'
        ? { w: 3, h: 2 }
        : size === 'large'
          ? { w: 3, h: 3 }
          : { w: 4, h: 4 })
  return {
    ...partial,
    footprint,
    blockTypes: partial.blockTypes ?? ['knowledge', 'campus'],
  }
}

export const COMPOUND_REGISTRY: CompoundDefinition[] = [
  // Tier 1 — small school / training
  def({
    id: 'lesson_intake_center',
    name: 'Lesson Intake Center',
    category: 'intake',
    tierRequired: 1,
    size: 'small',
    animationType: 'idle',
    description: 'Entry hall for new lessons and daily learning flow.',
  }),
  def({
    id: 'listening_lab',
    name: 'Listening Lab',
    category: 'intake',
    tierRequired: 1,
    size: 'small',
    animationType: 'signal',
    description: 'Calm booths tuned for audio comprehension.',
  }),
  def({
    id: 'speaking_booth',
    name: 'Speaking Booth',
    category: 'processing',
    tierRequired: 1,
    size: 'small',
    animationType: 'idle',
    description: 'Compact spaces for pronunciation practice.',
  }),
  def({
    id: 'practice_arena',
    name: 'Practice Arena',
    category: 'culture',
    tierRequired: 1,
    size: 'medium',
    animationType: 'crowd',
    description: 'Open floor for drills and friendly competition.',
  }),
  def({
    id: 'small_library',
    name: 'Small Library',
    category: 'culture',
    tierRequired: 1,
    size: 'small',
    animationType: 'idle',
    description: 'Starter stacks and study nooks.',
  }),

  // Tier 2 — processing factory
  def({
    id: 'grammar_reactor',
    name: 'Grammar Reactor',
    category: 'processing',
    tierRequired: 2,
    size: 'medium',
    animationType: 'belt',
    description: 'Structured grammar chains under steady throughput.',
  }),
  def({
    id: 'vocabulary_assembler',
    name: 'Vocabulary Assembler',
    category: 'processing',
    tierRequired: 2,
    size: 'medium',
    animationType: 'belt',
    description: 'Word parts snap into place on light assembly lines.',
  }),
  def({
    id: 'sentence_forge',
    name: 'Sentence Forge',
    category: 'processing',
    tierRequired: 2,
    size: 'large',
    animationType: 'liquid',
    description: 'Hot lines shaping clauses and connectors.',
  }),
  def({
    id: 'repetition_loop',
    name: 'Repetition Loop',
    category: 'processing',
    tierRequired: 2,
    size: 'medium',
    animationType: 'belt',
    description: 'Spaced repetition circuits on a short belt.',
  }),
  def({
    id: 'mistake_recycling_center',
    name: 'Mistake Recycling Center',
    category: 'processing',
    tierRequired: 2,
    size: 'medium',
    animationType: 'vehicles',
    description: 'Errors sorted, cleaned, and fed back into practice.',
  }),

  // Tier 3 — industrial campus / memory
  def({
    id: 'memory_warehouse',
    name: 'Memory Warehouse',
    category: 'storage',
    tierRequired: 3,
    size: 'large',
    animationType: 'vehicles',
    description: 'Bulk retention bays with labeled aisles.',
  }),
  def({
    id: 'vocabulary_vault',
    name: 'Vocabulary Vault',
    category: 'storage',
    tierRequired: 3,
    size: 'medium',
    animationType: 'idle',
    description: 'Secure shelving for high-value word stock.',
  }),
  def({
    id: 'archive_library',
    name: 'Archive Library',
    category: 'storage',
    tierRequired: 3,
    size: 'large',
    animationType: 'idle',
    description: 'Deep stacks for long-horizon reference.',
  }),
  def({
    id: 'knowledge_silo',
    name: 'Knowledge Silo',
    category: 'storage',
    tierRequired: 3,
    size: 'large',
    animationType: 'liquid',
    description: 'Vertical silos for chunked knowledge reserves.',
  }),
  def({
    id: 'review_center',
    name: 'Review Center',
    category: 'storage',
    tierRequired: 3,
    size: 'medium',
    animationType: 'belt',
    description: 'Scheduled pull-through for spaced review.',
  }),

  // Tier 4 — communication city
  def({
    id: 'communication_tower',
    name: 'Communication Tower',
    category: 'distribution',
    tierRequired: 4,
    size: 'large',
    animationType: 'signal',
    landmark: true,
    description: 'High-bandwidth relay for live discourse.',
  }),
  def({
    id: 'conversation_dispatch_center',
    name: 'Conversation Dispatch Center',
    category: 'distribution',
    tierRequired: 4,
    size: 'large',
    animationType: 'vehicles',
    description: 'Routes dialog traffic across the campus.',
  }),
  def({
    id: 'translation_engine',
    name: 'Translation Engine',
    category: 'distribution',
    tierRequired: 4,
    size: 'medium',
    animationType: 'belt',
    description: 'Cross-language transfer with visible routing.',
  }),
  def({
    id: 'media_center',
    name: 'Media Center',
    category: 'distribution',
    tierRequired: 4,
    size: 'medium',
    animationType: 'signal',
    description: 'Broadcasts stories, clips, and listening loops.',
  }),
  def({
    id: 'cultural_exchange_port',
    name: 'Cultural Exchange Port',
    category: 'distribution',
    tierRequired: 4,
    size: 'large',
    animationType: 'crowd',
    description: 'Harbor-style hub for cross-cultural handoffs.',
  }),

  // Tier 5 — research metropolis
  def({
    id: 'linguistics_research_lab',
    name: 'Linguistics Research Lab',
    category: 'research',
    tierRequired: 5,
    size: 'large',
    animationType: 'hologram',
    landmark: true,
    description: 'Primary research floor for language structure.',
  }),
  def({
    id: 'ai_translation_lab',
    name: 'AI Translation Lab',
    category: 'research',
    tierRequired: 5,
    size: 'large',
    animationType: 'hologram',
    description: 'Experimental models and assistive translation.',
  }),
  def({
    id: 'literature_institute',
    name: 'Literature Institute',
    category: 'culture',
    tierRequired: 5,
    size: 'large',
    animationType: 'idle',
    description: 'Long-form texts and narrative craft.',
  }),
  def({
    id: 'culture_museum',
    name: 'Culture Museum',
    category: 'culture',
    tierRequired: 5,
    size: 'landmark',
    animationType: 'crowd',
    landmark: true,
    description: 'Exhibits and context for cultural fluency.',
  }),
  def({
    id: 'language_cafe',
    name: 'Language Café',
    category: 'culture',
    tierRequired: 5,
    size: 'medium',
    animationType: 'crowd',
    description: 'Social tables for casual conversation.',
  }),
  def({
    id: 'theater',
    name: 'Theater',
    category: 'culture',
    tierRequired: 5,
    size: 'large',
    animationType: 'crowd',
    description: 'Performance space for dialogue and drama.',
  }),
  def({
    id: 'innovation_lab',
    name: 'Innovation Lab',
    category: 'research',
    tierRequired: 5,
    size: 'landmark',
    animationType: 'hologram',
    landmark: true,
    description: 'Open-ended experiments at the edge of mastery.',
  }),
]

const byId = new Map<string, CompoundDefinition>()
for (const c of COMPOUND_REGISTRY) {
  byId.set(c.id, c)
}

export function getCompoundDefinitionById(id: string): CompoundDefinition | undefined {
  return byId.get(id)
}
