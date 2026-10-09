import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadArchive } from '../data/load.ts'
import { applyFilters, summarize, windowBounds, type Summary } from '../lib/stats.ts'
import type { Entry, Prefs, Profile, ThemeId, ThreadSort, Zone } from '../types.ts'
import { THEME_IDS, themeById } from '../theme.ts'

const STORAGE_KEY = 'perplexity-archive-prefs-v2'

const defaultPrefs: Prefs = {
  from: '',
  to: '',
  modes: [],
  engines: [],
  collection: '',
  search: '',
  zone: 'pt',
  compare: false,
  hidden: [],
  theme: 'dark',
  threadSort: 'recency',
}
const zones: Zone[] = ['pt', 'utc']
const sorts: ThreadSort[] = ['recency', 'length', 'prompt']

function isTheme(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId)
}

function isZone(value: unknown): value is Zone {
  return typeof value === 'string' && zones.includes(value as Zone)
}

function isSort(value: unknown): value is ThreadSort {
  return typeof value === 'string' && sorts.includes(value as ThreadSort)
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
}

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Prefs>
    return {
      ...defaultPrefs,
      from: typeof raw.from === 'string' ? raw.from : '',
      to: typeof raw.to === 'string' ? raw.to : '',
      modes: stringList(raw.modes),
      engines: stringList(raw.engines),
      collection: typeof raw.collection === 'string' ? raw.collection : '',
      search: typeof raw.search === 'string' ? raw.search : '',
      zone: isZone(raw.zone) ? raw.zone : 'pt',
      compare: Boolean(raw.compare),
      hidden: stringList(raw.hidden),
      theme: isTheme(raw.theme) ? raw.theme : 'dark',
      threadSort: isSort(raw.threadSort) ? raw.threadSort : 'recency',
    }
  } catch {
    return defaultPrefs
  }
}

type ArchiveContextValue = {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
  setDates: (from: string, to: string) => void
  toggleHidden: (id: string) => void
  toggleMembership: (key: 'modes' | 'engines', value: string) => void
  resetFilters: () => void
  entries: Entry[]
  profile: Profile | null
  filtered: Entry[]
  previous: Entry[]
  bounds: ReturnType<typeof windowBounds>
  summary: Summary
  previousSummary: Summary | null
  loading: boolean
  error: string | null
  theme: ReturnType<typeof themeById>
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null)

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [entries, setEntries] = useState<Entry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  useEffect(() => {
    let cancel = false
    loadArchive()
      .then((archive) => {
        if (cancel) return
        setEntries(archive.entries)
        setProfile(archive.profile)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (cancel) return
        setError(reason instanceof Error ? reason.message : 'Could not load the archive.')
        setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  const bounds = useMemo(() => windowBounds(entries, prefs), [entries, prefs])
  const filtered = useMemo(() => applyFilters(entries, prefs, 'current'), [entries, prefs])
  const previous = useMemo(
    () => (prefs.compare ? applyFilters(entries, prefs, 'previous') : []),
    [entries, prefs],
  )
  const summary = useMemo(() => summarize(filtered, prefs.zone, bounds), [filtered, prefs.zone, bounds])
  const previousSummary = useMemo(() => {
    if (!prefs.compare) return null
    return summarize(previous, prefs.zone, {
      start: bounds.prevStart,
      end: bounds.prevEnd,
      prevStart: bounds.prevStart,
      prevEnd: bounds.prevEnd,
    })
  }, [prefs.compare, previous, prefs.zone, bounds])

  const theme = themeById(prefs.theme)

  const value = useMemo<ArchiveContextValue>(
    () => ({
      prefs,
      setPref: (key, next) => setPrefs((current) => ({ ...current, [key]: next })),
      setDates: (from, to) => setPrefs((current) => ({ ...current, from, to })),
      toggleHidden: (id) =>
        setPrefs((current) => ({
          ...current,
          hidden: current.hidden.includes(id)
            ? current.hidden.filter((item) => item !== id)
            : [...current.hidden, id],
        })),
      toggleMembership: (key, item) =>
        setPrefs((current) => {
          const list = current[key]
          return {
            ...current,
            [key]: list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item],
          }
        }),
      resetFilters: () =>
        setPrefs((current) => ({
          ...current,
          from: '',
          to: '',
          modes: [],
          engines: [],
          collection: '',
          search: '',
          compare: false,
        })),
      entries,
      profile,
      filtered,
      previous,
      bounds,
      summary,
      previousSummary,
      loading,
      error,
      theme,
    }),
    [prefs, entries, profile, filtered, previous, bounds, summary, previousSummary, loading, error, theme],
  )

  return <ArchiveContext value={value}>{children}</ArchiveContext>
}

export function useArchive(): ArchiveContextValue {
  const value = useContext(ArchiveContext)
  if (!value) throw new Error('useArchive must be used inside ArchiveProvider')
  return value
}
