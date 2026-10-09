import type { Theme, ThemeId } from './types.ts'

const SERIES_DARK = ['#6b9bd1', '#9fb8a0', '#c9a76b', '#b08bbf', '#d08a7a', '#7fb3b3', '#a3a3a3']
const SERIES_LIGHT = ['#3f6fa3', '#5d8a60', '#a07a2f', '#7e5a94', '#a85a4a', '#3f8a8a', '#6b6b6b']
const SERIES_MONO = ['#e6e6e6', '#9a9a9a', '#6a6a6a', '#c2c2c2', '#808080', '#b0b0b0', '#555555']

export const themes: Record<ThemeId, Theme> = {
  dark: {
    id: 'dark',
    label: 'Dark',
    bg: '#0f1114',
    raise: '#14171b',
    rail: '#0f1114',
    text: '#e4e6ea',
    muted: '#8a9099',
    line: '#262b31',
    accent: '#6b9bd1',
    accentSoft: '#9fb8a0',
    heatLow: '#1d2a3a',
    heatEmpty: '#171a1f',
    colors: SERIES_DARK,
  },
  light: {
    id: 'light',
    label: 'Light',
    bg: '#ffffff',
    raise: '#f7f7f8',
    rail: '#fafafa',
    text: '#1a1d21',
    muted: '#6b7079',
    line: '#e3e5e8',
    accent: '#3f6fa3',
    accentSoft: '#5d8a60',
    heatLow: '#dde8f4',
    heatEmpty: '#f0f1f3',
    colors: SERIES_LIGHT,
  },
  mono: {
    id: 'mono',
    label: 'Mono',
    bg: '#0a0a0a',
    raise: '#111111',
    rail: '#0a0a0a',
    text: '#ededed',
    muted: '#8a8a8a',
    line: '#262626',
    accent: '#ededed',
    accentSoft: '#9a9a9a',
    heatLow: '#2a2a2a',
    heatEmpty: '#151515',
    colors: SERIES_MONO,
  },
}

export const THEME_IDS: ThemeId[] = ['dark', 'light', 'mono']

export function themeById(id: ThemeId): Theme {
  switch (id) {
    case 'dark':
      return themes.dark
    case 'light':
      return themes.light
    case 'mono':
      return themes.mono
    default: {
      const exhaustive: never = id
      return exhaustive
    }
  }
}

export const ENGINE_ORDER = ['pro', 'reasoning', 'deep_research', 'auto', 'realtime', 'asi', 'unknown']

export const ENGINE_LABEL: Record<string, string> = {
  pro: 'Pro',
  reasoning: 'Reasoning',
  deep_research: 'Deep research',
  auto: 'Auto',
  realtime: 'Realtime',
  asi: 'ASI',
  unknown: 'Unknown',
}

export const MODE_LABEL: Record<string, string> = {
  COPILOT: 'Copilot',
  CONCISE: 'Concise',
  ASI: 'ASI',
  unknown: 'Unknown',
}

export function engineLabel(engine: string): string {
  return ENGINE_LABEL[engine] ?? engine
}

export function modeLabel(mode: string): string {
  return MODE_LABEL[mode] ?? mode
}

export function seriesColor(key: string, order: string[], theme: Theme): string {
  const index = order.indexOf(key)
  const slot = index === -1 ? order.length : index
  return theme.colors[slot % theme.colors.length] ?? theme.accent
}
