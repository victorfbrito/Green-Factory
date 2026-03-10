/** Contract types for GET /factories/top */

export interface TopFactoryItem {
  username: string
  display_name: string | null
  avatar_url: string | null
  total_xp: number
  streak: number
  current_course_id: string | null
  total_languages: number
  primary_language_code: string | null
  dominant_language_xp_share: number
  sustainability_score: number
  environment_level: number
  environment_label: string
}

export interface TopFactoriesResponse {
  items: TopFactoryItem[]
}

export interface GetTopFactoriesParams {
  limit?: number
  sort?: 'total_xp' | 'streak' | 'sustainability' | 'languages'
}
