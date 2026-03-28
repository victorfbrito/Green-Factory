/** Contract types for GET /users/{username}/factory */

export interface FactoryUser {
  username: string
  display_name: string | null
  streak: number
  total_xp: number
  current_course_id: string | null
}

export interface UpgradeDetail {
  id: string
  title: string
  short_description: string
  educational_note: string
}

export interface FactoryMeta {
  total_languages: number
  primary_language_code: string | null
  active_streak_band: string
  dominant_language_xp_share: number
  sustainability_score: number
  environment_level: number
  environment_label: string
  unlocked_upgrades: string[]
  upgrade_details: UpgradeDetail[]
}

export interface FactoryLanguage {
  course_id: string
  language_code: string
  language_name: string
  xp: number
  crowns: number
  is_current: boolean
  xp_share: number
  sort_order: number
  seed_key: string
  compound_count: number
  next_compound_at_xp: number
  xp_to_next_compound: number
  compound_progress_ratio: number
}

export interface FactoryResponse {
  user: FactoryUser
  factory_meta: FactoryMeta
  languages: FactoryLanguage[]
}
