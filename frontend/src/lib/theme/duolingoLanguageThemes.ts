export type LanguageTheme = {
  code: string
  name: string
  flagEmoji: string | null
  palette: {
    primary: string
    secondary: string
    accent?: string
    neutral: string
  }
  /** Ordered from most recognizable to least recognizable for the associated flag. */
  flagColors: string[]
  /** Optional note for languages without a sovereign-country flag. */
  note?: string
}

/**
 * Curated district palettes for DuoFactory.
 *
 * Goals:
 * - stay faithful to the best-known flag association for quick recognition
 * - avoid raw, overly-saturated flag hexes on every building
 * - keep one neutral per language so roofs / concrete / trim stay readable
 *
 * Guidance:
 * - use palette.primary for the main district tint
 * - use palette.secondary for signage / windows / accents
 * - use palette.accent sparingly on lights, stripes, moving props
 * - use palette.neutral for roofs, roadside props, concrete, inactive surfaces
 */
export const DUOLINGO_LANGUAGE_THEMES: Record<string, LanguageTheme> = {
  ar: {
    code: 'ar',
    name: 'Arabic',
    flagEmoji: '🇸🇦',
    palette: { primary: '#0B7A43', secondary: '#F7F7F2', neutral: '#DDEEE5' },
    flagColors: ['#006C35', '#FFFFFF'],
    note: 'Uses Saudi green/white as the most broadly recognizable modern flag association.',
  },
  yue: {
    code: 'yue',
    name: 'Cantonese',
    flagEmoji: '🇭🇰',
    palette: { primary: '#C8102E', secondary: '#FFF7F8', neutral: '#F2E7EA' },
    flagColors: ['#DE2910', '#FFFFFF'],
    note: 'Uses Hong Kong red/white for easy recognition.',
  },
  ca: {
    code: 'ca',
    name: 'Catalan',
    flagEmoji: '🇪🇸',
    palette: { primary: '#C81D25', secondary: '#F2C318', neutral: '#FFF1CC' },
    flagColors: ['#C60B1E', '#FFC400'],
    note: 'Catalonia has no standard country-emoji flag, so this uses a senyera-inspired palette with Spain emoji as a fallback.',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    flagEmoji: '🇨🇳',
    palette: { primary: '#CF2E1F', secondary: '#F4C400', neutral: '#FFF1C9' },
    flagColors: ['#EE1C25', '#FFFF00'],
  },
  cs: {
    code: 'cs',
    name: 'Czech',
    flagEmoji: '🇨🇿',
    palette: { primary: '#0F4C81', secondary: '#D7363C', neutral: '#F5F6F8' },
    flagColors: ['#11457E', '#D7141A', '#FFFFFF'],
  },
  da: {
    code: 'da',
    name: 'Danish',
    flagEmoji: '🇩🇰',
    palette: { primary: '#B3263B', secondary: '#FAFAF8', neutral: '#EEEAE6' },
    flagColors: ['#C60C30', '#FFFFFF'],
  },
  nl: {
    code: 'nl',
    name: 'Dutch',
    flagEmoji: '🇳🇱',
    palette: { primary: '#AE2A36', secondary: '#315E9B', neutral: '#F4F5F7' },
    flagColors: ['#AE1C28', '#FFFFFF', '#21468B'],
  },
  en: {
    code: 'en',
    name: 'English',
    flagEmoji: '🇬🇧',
    palette: { primary: '#244A86', secondary: '#C9353E', neutral: '#F4F5F8' },
    flagColors: ['#012169', '#C8102E', '#FFFFFF'],
    note: 'Uses UK colors as the most recognizable emoji-flag association for English.',
  },
  eo: {
    code: 'eo',
    name: 'Esperanto',
    flagEmoji: null,
    palette: { primary: '#169B62', secondary: '#F7F7F2', neutral: '#DFF2E8' },
    flagColors: ['#009A49', '#FFFFFF'],
    note: 'Constructed language; uses Esperanto movement green/white instead of a country flag.',
  },
  fi: {
    code: 'fi',
    name: 'Finnish',
    flagEmoji: '🇫🇮',
    palette: { primary: '#1B5FA7', secondary: '#FAFAFA', neutral: '#E8F0F8' },
    flagColors: ['#003580', '#FFFFFF'],
  },
  fr: {
    code: 'fr',
    name: 'French',
    flagEmoji: '🇫🇷',
    palette: { primary: '#1D57A6', secondary: '#D63A3A', neutral: '#F5F7FB' },
    flagColors: ['#0055A4', '#FFFFFF', '#EF4135'],
  },
  de: {
    code: 'de',
    name: 'German',
    flagEmoji: '🇩🇪',
    palette: { primary: '#2C2C2C', secondary: '#C72E29', accent: '#D8A31A', neutral: '#F2E7BF' },
    flagColors: ['#000000', '#DD0000', '#FFCE00'],
  },
  el: {
    code: 'el',
    name: 'Greek',
    flagEmoji: '🇬🇷',
    palette: { primary: '#1C6BC2', secondary: '#F8FAFC', neutral: '#E8F1FB' },
    flagColors: ['#0D5EAF', '#FFFFFF'],
  },
  gn: {
    code: 'gn',
    name: 'Guarani',
    flagEmoji: '🇵🇾',
    palette: { primary: '#D64045', secondary: '#2957A4', neutral: '#F8F7F4' },
    flagColors: ['#D52B1E', '#FFFFFF', '#0038A8'],
    note: 'Uses Paraguay-inspired colors as the most recognizable modern flag association.',
  },
  ht: {
    code: 'ht',
    name: 'Haitian Creole',
    flagEmoji: '🇭🇹',
    palette: { primary: '#17428C', secondary: '#C93B45', neutral: '#F6F3EE' },
    flagColors: ['#00209F', '#D21034', '#FFFFFF'],
  },
  haw: {
    code: 'haw',
    name: 'Hawaiian',
    flagEmoji: '🇺🇸',
    palette: { primary: '#C83E4D', secondary: '#315C9A', neutral: '#F4F6F8' },
    flagColors: ['#B22234', '#FFFFFF', '#3C3B6E'],
    note: 'Hawaiian has no country-emoji flag; uses a U.S.-adjacent red/blue/white palette for readability.',
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    flagEmoji: '🇮🇱',
    palette: { primary: '#1E67B1', secondary: '#F8FAFC', neutral: '#E8F0F8' },
    flagColors: ['#0038B8', '#FFFFFF'],
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    flagEmoji: '🇮🇳',
    palette: { primary: '#E38B2E', secondary: '#1D8A46', accent: '#2458A6', neutral: '#F8F5EF' },
    flagColors: ['#FF9933', '#FFFFFF', '#138808', '#000080'],
  },
  hu: {
    code: 'hu',
    name: 'Hungarian',
    flagEmoji: '🇭🇺',
    palette: { primary: '#C8393D', secondary: '#2F8A57', neutral: '#F7F6F2' },
    flagColors: ['#CD2A3E', '#FFFFFF', '#436F4D'],
  },
  id: {
    code: 'id',
    name: 'Indonesian',
    flagEmoji: '🇮🇩',
    palette: { primary: '#D53B45', secondary: '#FAFAF8', neutral: '#EDE9E3' },
    flagColors: ['#CE1126', '#FFFFFF'],
  },
  ga: {
    code: 'ga',
    name: 'Irish',
    flagEmoji: '🇮🇪',
    palette: { primary: '#169B62', secondary: '#E58E2F', neutral: '#F7F7F2' },
    flagColors: ['#169B62', '#FFFFFF', '#FF883E'],
  },
  it: {
    code: 'it',
    name: 'Italian',
    flagEmoji: '🇮🇹',
    palette: { primary: '#1C8F5E', secondary: '#C93B45', neutral: '#F6F6F2' },
    flagColors: ['#009246', '#FFFFFF', '#CE2B37'],
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    flagEmoji: '🇯🇵',
    palette: { primary: '#BC2942', secondary: '#F7F7F4', neutral: '#ECE9E3' },
    flagColors: ['#BC002D', '#FFFFFF'],
  },
  tlh: {
    code: 'tlh',
    name: 'Klingon',
    flagEmoji: null,
    palette: { primary: '#7A2026', secondary: '#C89B3C', neutral: '#2E2621' },
    flagColors: ['#7A2026', '#C89B3C', '#2E2621'],
    note: 'Constructed language; uses a curated Klingon-inspired palette instead of a country flag.',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    flagEmoji: '🇰🇷',
    palette: { primary: '#C73A4A', secondary: '#215AA8', neutral: '#F7F7F5' },
    flagColors: ['#CD2E3A', '#0047A0', '#FFFFFF'],
  },
  la: {
    code: 'la',
    name: 'Latin',
    flagEmoji: null,
    palette: { primary: '#8C6A2E', secondary: '#7A1F1F', neutral: '#F1E6C9' },
    flagColors: ['#8C6A2E', '#7A1F1F', '#F1E6C9'],
    note: 'Classical language; uses a Roman-inspired palette instead of a country flag.',
  },
  nv: {
    code: 'nv',
    name: 'Navajo',
    flagEmoji: '🇺🇸',
    palette: { primary: '#1E5E8A', secondary: '#C86B2A', neutral: '#E8D7B6' },
    flagColors: ['#0B3D91', '#C96E2D', '#D9C39A'],
    note: 'Navajo has no country-emoji flag; uses a Southwest-inspired palette for legibility.',
  },
  no: {
    code: 'no',
    name: 'Norwegian',
    flagEmoji: '🇳🇴',
    palette: { primary: '#B6344A', secondary: '#274D86', neutral: '#F5F6F8' },
    flagColors: ['#BA0C2F', '#FFFFFF', '#00205B'],
  },
  pl: {
    code: 'pl',
    name: 'Polish',
    flagEmoji: '🇵🇱',
    palette: { primary: '#CF3D59', secondary: '#FAFAF8', neutral: '#ECE7E2' },
    flagColors: ['#DC143C', '#FFFFFF'],
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    flagEmoji: '🇵🇹',
    palette: { primary: '#0F7A3C', secondary: '#C9353E', accent: '#D4A81E', neutral: '#F5EFD6' },
    flagColors: ['#006600', '#FF0000', '#FFD700'],
  },
  ro: {
    code: 'ro',
    name: 'Romanian',
    flagEmoji: '🇷🇴',
    palette: { primary: '#1659A7', secondary: '#C73A3F', accent: '#D8AF1C', neutral: '#F3EAC6' },
    flagColors: ['#002B7F', '#FCD116', '#CE1126'],
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    flagEmoji: '🇷🇺',
    palette: { primary: '#2458A8', secondary: '#C73A3F', neutral: '#F4F5F7' },
    flagColors: ['#FFFFFF', '#0039A6', '#D52B1E'],
  },
  gd: {
    code: 'gd',
    name: 'Scottish Gaelic',
    flagEmoji: '🇬🇧',
    palette: { primary: '#2B63B7', secondary: '#F8FAFC', neutral: '#E7EEF8' },
    flagColors: ['#0065BD', '#FFFFFF'],
    note: 'Scottish Gaelic has no standard country-emoji flag; uses Scotland-inspired blue/white with UK emoji fallback.',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    flagEmoji: '🇪🇸',
    palette: { primary: '#B32730', secondary: '#E0B21A', neutral: '#FFF0C9' },
    flagColors: ['#AA151B', '#F1BF00'],
  },
  sw: {
    code: 'sw',
    name: 'Swahili',
    flagEmoji: '🇹🇿',
    palette: { primary: '#2AAE66', secondary: '#2C3E8F', accent: '#F1C232', neutral: '#1F1F1F' },
    flagColors: ['#1EB53A', '#00A3DD', '#FCD116', '#000000'],
    note: 'Uses Tanzania-inspired colors as the most recognizable national association for Swahili.',
  },
  sv: {
    code: 'sv',
    name: 'Swedish',
    flagEmoji: '🇸🇪',
    palette: { primary: '#1E6DB4', secondary: '#E3B61A', neutral: '#EAF4FF' },
    flagColors: ['#006AA7', '#FECC00'],
  },
  tr: {
    code: 'tr',
    name: 'Turkish',
    flagEmoji: '🇹🇷',
    palette: { primary: '#C7353E', secondary: '#FAFAF8', neutral: '#ECE8E3' },
    flagColors: ['#E30A17', '#FFFFFF'],
  },
  uk: {
    code: 'uk',
    name: 'Ukrainian',
    flagEmoji: '🇺🇦',
    palette: { primary: '#2B6EC8', secondary: '#E6BC1A', neutral: '#FFF2C9' },
    flagColors: ['#0057B7', '#FFD700'],
  },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    flagEmoji: '🇻🇳',
    palette: { primary: '#C92E27', secondary: '#E2BE1A', neutral: '#FFF0C9' },
    flagColors: ['#DA251D', '#FFFF00'],
  },
  cy: {
    code: 'cy',
    name: 'Welsh',
    flagEmoji: '🇬🇧',
    palette: { primary: '#1E8E4A', secondary: '#C83B45', neutral: '#F7F7F2' },
    flagColors: ['#FFFFFF', '#D30731', '#00AB39'],
    note: 'Welsh has no standard country-emoji flag; uses Wales-inspired green/red/white with UK emoji fallback.',
  },
  yi: {
    code: 'yi',
    name: 'Yiddish',
    flagEmoji: null,
    palette: { primary: '#2458A8', secondary: '#F8FAFC', neutral: '#E8F0F8' },
    flagColors: ['#0038B8', '#FFFFFF'],
    note: 'Yiddish has no sovereign-country flag; uses a blue/white palette for recognizability.',
  },
  zu: {
    code: 'zu',
    name: 'Zulu',
    flagEmoji: '🇿🇦',
    palette: { primary: '#1C7C54', secondary: '#D03A3E', accent: '#E0B11E', neutral: '#1C1C1C' },
    flagColors: ['#007A4D', '#DE3831', '#FFB612', '#000000', '#FFFFFF', '#001489'],
    note: 'Uses South Africa-inspired colors as the most recognizable modern flag association for Zulu.',
  },
  hv: {
    code: 'hv',
    name: 'High Valyrian',
    flagEmoji: null,
    palette: { primary: '#6E1F2F', secondary: '#C9A34A', neutral: '#E8E0D2' },
    flagColors: ['#6E1F2F', '#C9A34A', '#E8E0D2'],
    note: 'Constructed language; uses a curated fantasy heraldry palette instead of a country flag.',
  },
}

export const DUOLINGO_LANGUAGE_THEME_LIST = Object.values(DUOLINGO_LANGUAGE_THEMES)

export function getLanguageTheme(code?: string | null): LanguageTheme {
  if (!code) return DEFAULT_LANGUAGE_THEME
  return DUOLINGO_LANGUAGE_THEMES[code] ?? DEFAULT_LANGUAGE_THEME
}

export const DEFAULT_LANGUAGE_THEME: LanguageTheme = {
  code: 'default',
  name: 'Default',
  flagEmoji: null,
  palette: {
    primary: '#3C8D5A',
    secondary: '#5AA6D6',
    neutral: '#E8ECEB',
  },
  flagColors: ['#3C8D5A', '#5AA6D6', '#E8ECEB'],
  note: 'Fallback theme when a language code is missing from the map.',
}
