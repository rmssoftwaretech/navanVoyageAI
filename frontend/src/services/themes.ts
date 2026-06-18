export interface NvaTheme {
  id: string
  name: string
  brand: string
  brandHover: string
  brandLight: string
  brandMedium: string
  brandGradient: string
  dark: boolean
}

export const BUILTIN_THEMES: NvaTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    brand: '#1473e6',
    brandHover: '#0d66d0',
    brandLight: 'rgba(20,115,230,0.08)',
    brandMedium: 'rgba(20,115,230,0.15)',
    brandGradient: '#1473e6',
    dark: false,
  },
  {
    id: 'verna',
    name: 'Verna',
    brand: '#7154fa',
    brandHover: '#5c41e8',
    brandLight: 'rgba(113,84,250,0.08)',
    brandMedium: 'rgba(113,84,250,0.15)',
    brandGradient: 'linear-gradient(135deg, #7154fa, #b93fd3, #eb1000)',
    dark: false,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    brand: '#8b78fb',
    brandHover: '#7264e8',
    brandLight: 'rgba(139,120,251,0.08)',
    brandMedium: 'rgba(139,120,251,0.15)',
    brandGradient: 'linear-gradient(135deg, #1e1e2e, #2d2b55)',
    dark: true,
  },
  {
    id: 'material',
    name: 'Material',
    brand: '#6750a4',
    brandHover: '#54408e',
    brandLight: 'rgba(103,80,164,0.08)',
    brandMedium: 'rgba(103,80,164,0.15)',
    brandGradient: 'linear-gradient(135deg, #6750a4, #7965af)',
    dark: false,
  },
  {
    id: 'grey',
    name: 'Grey',
    brand: '#64748b',
    brandHover: '#475569',
    brandLight: 'rgba(100,116,139,0.08)',
    brandMedium: 'rgba(100,116,139,0.15)',
    brandGradient: 'linear-gradient(135deg, #64748b, #94a3b8)',
    dark: false,
  },
  {
    id: 'slate',
    name: 'Slate',
    brand: '#94a3b8',
    brandHover: '#7c8fa4',
    brandLight: 'rgba(148,163,184,0.08)',
    brandMedium: 'rgba(148,163,184,0.15)',
    brandGradient: 'linear-gradient(135deg, #0f172a, #1e293b)',
    dark: true,
  },
]

const STORAGE_KEY = 'nva_theme'

export function applyTheme(theme: NvaTheme): void {
  const root = document.documentElement
  root.style.setProperty('--brand', theme.brand)
  root.style.setProperty('--brand-hover', theme.brandHover)
  root.style.setProperty('--brand-light', theme.brandLight)
  root.style.setProperty('--brand-medium', theme.brandMedium)
  root.style.setProperty('--brand-gradient', theme.brandGradient)
  // Keep legacy aliases in sync
  root.style.setProperty('--navy', theme.brand)
  root.style.setProperty('--navy-dark', theme.brandHover)

  if (theme.dark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function loadSavedTheme(): NvaTheme {
  const saved = localStorage.getItem(STORAGE_KEY)
  return BUILTIN_THEMES.find((t) => t.id === saved) ?? BUILTIN_THEMES[0]
}

export function saveTheme(themeId: string): void {
  localStorage.setItem(STORAGE_KEY, themeId)
}
