import type { Entry, Prefs, Profile, Zone } from '../types.ts'
import { addDays, dayOf, diffDays, eachDay, hourOf, SITTING_GAP_MS, weekdayOf } from './dates.ts'

export type Bounds = {
  start: string
  end: string
  prevStart: string
  prevEnd: string
}

export type DailyPoint = {
  day: string
  queries: number
  threads: number
  wordsAsked: number
  wordsAnswered: number
  sittings: number
  streak: number
  medianPrompt: number | null
  followUps: number
  active: number
}

export type Summary = {
  queries: number
  threads: number
  activeDays: number
  spanDays: number
  streak: number
  sittings: number
  wordsAsked: number
  wordsAnswered: number
  medianPrompt: number
  meanPrompt: number
  followUpRate: number
  questionRate: number
  perActiveDay: number
  medianGapMinutes: number | null
  busiest: { day: string; count: number } | null
  dominantEngine: { engine: string; count: number; share: number } | null
  daily: DailyPoint[]
  months: string[]
  byMonthEngine: Record<string, Record<string, number>>
  byMode: { mode: string; count: number }[]
  byHour: number[]
  byWeekdayHour: number[][]
  threadBuckets: { label: string; count: number }[]
  followUpSplit: { single: number; multi: number }
  sittingBuckets: { label: string; count: number }[]
  promptBuckets: { label: string; count: number }[]
  shape: { label: string; count: number; share: number }[]
  scatter: [number, number][]
  scatterSampled: boolean
}

export type ThreadSummary = {
  id: string
  title: string
  mode: string
  collection: string | null
  turns: number
  started: string
  latest: string
  queryChars: number
  engines: string[]
}

const emptySummary = (daily: DailyPoint[] = []): Summary => ({
  queries: 0,
  threads: 0,
  activeDays: 0,
  spanDays: daily.length,
  streak: 0,
  sittings: 0,
  wordsAsked: 0,
  wordsAnswered: 0,
  medianPrompt: 0,
  meanPrompt: 0,
  followUpRate: 0,
  questionRate: 0,
  perActiveDay: 0,
  medianGapMinutes: null,
  busiest: null,
  dominantEngine: null,
  daily,
  months: [],
  byMonthEngine: {},
  byMode: [],
  byHour: Array.from({ length: 24 }, () => 0),
  byWeekdayHour: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
  threadBuckets: bucketLabels(THREAD_EDGES).map((label) => ({ label, count: 0 })),
  followUpSplit: { single: 0, multi: 0 },
  sittingBuckets: bucketLabels(SITTING_EDGES).map((label) => ({ label, count: 0 })),
  promptBuckets: bucketLabels(PROMPT_EDGES).map((label) => ({ label, count: 0 })),
  shape: [],
  scatter: [],
  scatterSampled: false,
})

const THREAD_EDGES = [1, 2, 3, 4, 5, 10, 20, Number.POSITIVE_INFINITY]
const SITTING_EDGES = [1, 2, 4, 8, 15, Number.POSITIVE_INFINITY]
const PROMPT_EDGES = [20, 50, 100, 250, 500, 1000, Number.POSITIVE_INFINITY]

function bucketLabels(edges: number[]): string[] {
  const labels: string[] = []
  let previous = 1
  for (const edge of edges) {
    if (!Number.isFinite(edge)) {
      labels.push(`${previous.toLocaleString()}+`)
    } else if (previous === edge) {
      labels.push(String(edge))
    } else {
      labels.push(`${previous}–${edge}`)
    }
    previous = edge + 1
  }
  return labels
}

function bucketIndex(value: number, edges: number[]): number {
  const index = edges.findIndex((edge) => value <= edge)
  return index === -1 ? edges.length - 1 : index
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function datasetBounds(entries: Entry[], zone: Zone): { start: string; end: string } {
  let start = ''
  let end = ''
  for (const entry of entries) {
    const day = dayOf(entry, zone)
    if (!start || day < start) start = day
    if (!end || day > end) end = day
  }
  return { start, end }
}

export function windowBounds(entries: Entry[], prefs: Prefs): Bounds {
  const data = datasetBounds(entries, prefs.zone)
  let start = prefs.from || data.start
  let end = prefs.to || data.end
  if (start && end && start > end) {
    const swap = start
    start = end
    end = swap
  }
  if (!start || !end) {
    return { start: '', end: '', prevStart: '', prevEnd: '' }
  }
  const duration = diffDays(start, end) + 1
  const prevEnd = addDays(start, -1)
  const prevStart = addDays(prevEnd, -(duration - 1))
  return { start, end, prevStart, prevEnd }
}

export function applyFilters(entries: Entry[], prefs: Prefs, which: 'current' | 'previous'): Entry[] {
  const bounds = windowBounds(entries, prefs)
  const start = which === 'current' ? bounds.start : bounds.prevStart
  const end = which === 'current' ? bounds.end : bounds.prevEnd
  if (!start || !end) return []
  const query = prefs.search.trim().toLowerCase()
  return entries.filter((entry) => {
    const day = dayOf(entry, prefs.zone)
    if (day < start || day > end) return false
    if (prefs.modes.length > 0 && !prefs.modes.includes(entry.mode)) return false
    if (prefs.engines.length > 0 && !prefs.engines.includes(entry.engine)) return false
    if (prefs.collection === 'none' ? entry.collection !== null : prefs.collection && entry.collection !== prefs.collection) {
      return false
    }
    if (query && !entry.query.toLowerCase().includes(query) && !entry.title.toLowerCase().includes(query)) {
      return false
    }
    return true
  })
}

function groupThreads(entries: Entry[]) {
  const threads = new Map<string, Entry[]>()
  for (const entry of entries) {
    const group = threads.get(entry.threadId)
    if (group) group.push(entry)
    else threads.set(entry.threadId, [entry])
  }
  return threads
}

export function threadSummaries(entries: Entry[]): ThreadSummary[] {
  const threads = groupThreads(entries)
  const summaries: ThreadSummary[] = []
  for (const [id, group] of threads) {
    const ordered = [...group].sort((a, b) => a.created.localeCompare(b.created))
    const engines = [...new Set(ordered.map((entry) => entry.engine))]
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (!first || !last) continue
    summaries.push({
      id,
      title: first.title,
      mode: first.mode,
      collection: first.collection,
      turns: ordered.length,
      started: first.created,
      latest: last.created,
      queryChars: ordered.reduce((sum, entry) => sum + entry.queryLen, 0),
      engines,
    })
  }
  return summaries
}

export function sortThreads(threads: ThreadSummary[], sort: Prefs['threadSort']): ThreadSummary[] {
  const copy = [...threads]
  switch (sort) {
    case 'recency':
      return copy.sort((a, b) => b.latest.localeCompare(a.latest))
    case 'length':
      return copy.sort((a, b) => b.turns - a.turns || b.latest.localeCompare(a.latest))
    case 'prompt':
      return copy.sort((a, b) => b.queryChars - a.queryChars || b.latest.localeCompare(a.latest))
    default: {
      const exhaustive: never = sort
      return exhaustive
    }
  }
}

function sittingsOf(entries: Entry[]): Entry[][] {
  const ordered = [...entries].sort((a, b) => a.created.localeCompare(b.created))
  const groups: Entry[][] = []
  for (const entry of ordered) {
    const current = groups[groups.length - 1]
    const previous = current?.[current.length - 1]
    if (!current || !previous || Date.parse(entry.created) - Date.parse(previous.created) > SITTING_GAP_MS) {
      groups.push([entry])
    } else {
      current.push(entry)
    }
  }
  return groups
}

export function summarize(entries: Entry[], zone: Zone, bounds: Bounds): Summary {
  if (!bounds.start || !bounds.end) return emptySummary()
  const days = eachDay(bounds.start, bounds.end)
  const dayIndex = new Map(days.map((day, index) => [day, index]))
  const daily: DailyPoint[] = days.map((day) => ({
    day,
    queries: 0,
    threads: 0,
    wordsAsked: 0,
    wordsAnswered: 0,
    sittings: 0,
    streak: 0,
    medianPrompt: null,
    followUps: 0,
    active: 0,
  }))
  const lengthsByDay: number[][] = days.map(() => [])
  const threads = groupThreads(entries)
  const modeCounts = new Map<string, number>()
  const engineCounts = new Map<string, number>()
  const byMonthEngine: Record<string, Record<string, number>> = {}
  const byHour = Array.from({ length: 24 }, () => 0)
  const byWeekdayHour = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  const threadBucketCounts = THREAD_EDGES.map(() => 0)
  const promptBucketCounts = PROMPT_EDGES.map(() => 0)
  let wordsAsked = 0
  let wordsAnswered = 0
  let questions = 0
  let urls = 0
  let codeQueries = 0
  let longPrompts = 0
  let citations = 0
  let codeAnswers = 0
  let headings = 0
  let single = 0
  let multi = 0
  const queryLens: number[] = []

  for (const entry of entries) {
    const day = dayOf(entry, zone)
    const index = dayIndex.get(day)
    if (index === undefined) continue
    const point = daily[index]
    if (!point) continue
    point.queries += 1
    point.wordsAsked += entry.queryWords
    point.wordsAnswered += entry.answerWords
    if (entry.turn > 0) point.followUps += 1
    lengthsByDay[index]?.push(entry.queryLen)
    wordsAsked += entry.queryWords
    wordsAnswered += entry.answerWords
    queryLens.push(entry.queryLen)
    if (entry.question) questions += 1
    if (entry.url) urls += 1
    if (entry.codeQuery) codeQueries += 1
    if (entry.queryLen > 1000) longPrompts += 1
    if (entry.citation) citations += 1
    if (entry.codeAnswer) codeAnswers += 1
    if (entry.heading) headings += 1
    modeCounts.set(entry.mode, (modeCounts.get(entry.mode) ?? 0) + 1)
    engineCounts.set(entry.engine, (engineCounts.get(entry.engine) ?? 0) + 1)
    const month = day.slice(0, 7)
    byMonthEngine[month] ??= {}
    byMonthEngine[month][entry.engine] = (byMonthEngine[month][entry.engine] ?? 0) + 1
    const hour = hourOf(entry, zone)
    const weekday = weekdayOf(entry, zone)
    byHour[hour] = (byHour[hour] ?? 0) + 1
    const row = byWeekdayHour[weekday]
    if (row) row[hour] = (row[hour] ?? 0) + 1
    promptBucketCounts[bucketIndex(entry.queryLen, PROMPT_EDGES)] += 1
  }

  for (const group of threads.values()) {
    const ordered = [...group].sort((a, b) => a.created.localeCompare(b.created))
    const first = ordered[0]
    if (!first) continue
    const index = dayIndex.get(dayOf(first, zone))
    if (index !== undefined && daily[index]) daily[index].threads += 1
    if (ordered.length > 1) multi += 1
    else single += 1
    threadBucketCounts[bucketIndex(ordered.length, THREAD_EDGES)] += 1
  }

  const sittingGroups = sittingsOf(entries)
  const sittingBucketCounts = SITTING_EDGES.map(() => 0)
  for (const sitting of sittingGroups) {
    const first = sitting[0]
    if (!first) continue
    const index = dayIndex.get(dayOf(first, zone))
    if (index !== undefined && daily[index]) daily[index].sittings += 1
    sittingBucketCounts[bucketIndex(sitting.length, SITTING_EDGES)] += 1
  }

  let streak = 0
  let best = 0
  let busiest: { day: string; count: number } | null = null
  for (const point of daily) {
    const index = dayIndex.get(point.day) ?? 0
    const lengths = lengthsByDay[index] ?? []
    point.medianPrompt = lengths.length ? median(lengths) : null
    if (point.queries > 0) {
      streak += 1
      point.active = 1
      if (!busiest || point.queries > busiest.count) busiest = { day: point.day, count: point.queries }
    } else {
      streak = 0
    }
    point.streak = streak
    if (streak > best) best = streak
  }

  const times = entries.map((entry) => Date.parse(entry.created)).sort((a, b) => a - b)
  const gaps: number[] = []
  for (let index = 1; index < times.length; index += 1) {
    const current = times[index]
    const previous = times[index - 1]
    if (current !== undefined && previous !== undefined) gaps.push((current - previous) / 60_000)
  }

  let dominantEngine: Summary['dominantEngine'] = null
  for (const [engine, count] of engineCounts) {
    if (!dominantEngine || count > dominantEngine.count) {
      dominantEngine = { engine, count, share: entries.length ? count / entries.length : 0 }
    }
  }

  const months = eachDay(bounds.start, bounds.end)
    .map((day) => day.slice(0, 7))
    .filter((month, index, all) => all.indexOf(month) === index)
  for (const month of months) byMonthEngine[month] ??= {}

  const scatterSource = [...entries].sort((a, b) => a.created.localeCompare(b.created))
  const sampleSize = 3500
  const sampled = scatterSource.length > sampleSize
  const scatter: [number, number][] = []
  const step = sampled ? scatterSource.length / sampleSize : 1
  const points = sampled ? sampleSize : scatterSource.length
  for (let index = 0; index < points; index += 1) {
    const entry = scatterSource[Math.floor(index * step)]
    if (entry) scatter.push([Math.max(entry.queryLen, 1), Math.max(entry.answerLen, 1)])
  }

  const shapeRows = [
    ['Question mark', questions],
    ['Statement', entries.length - questions],
    ['Long prompt', longPrompts],
    ['Includes a URL', urls],
    ['Code-like prompt', codeQueries],
    ['Cites sources', citations],
    ['Includes code', codeAnswers],
    ['Uses headings', headings],
  ] as const

  return {
    queries: entries.length,
    threads: threads.size,
    activeDays: daily.filter((point) => point.queries > 0).length,
    spanDays: days.length,
    streak: best,
    sittings: sittingGroups.length,
    wordsAsked,
    wordsAnswered,
    medianPrompt: median(queryLens),
    meanPrompt: queryLens.length ? Math.round(queryLens.reduce((sum, value) => sum + value, 0) / queryLens.length) : 0,
    followUpRate: threads.size ? multi / threads.size : 0,
    questionRate: entries.length ? questions / entries.length : 0,
    perActiveDay: daily.some((point) => point.queries > 0)
      ? entries.length / daily.filter((point) => point.queries > 0).length
      : 0,
    medianGapMinutes: gaps.length ? median(gaps) : null,
    busiest,
    dominantEngine,
    daily,
    months,
    byMonthEngine,
    byMode: [...modeCounts.entries()]
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count),
    byHour,
    byWeekdayHour,
    threadBuckets: bucketLabels(THREAD_EDGES).map((label, index) => ({
      label,
      count: threadBucketCounts[index] ?? 0,
    })),
    followUpSplit: { single, multi },
    sittingBuckets: bucketLabels(SITTING_EDGES).map((label, index) => ({
      label,
      count: sittingBucketCounts[index] ?? 0,
    })),
    promptBuckets: bucketLabels(PROMPT_EDGES).map((label, index) => ({
      label,
      count: promptBucketCounts[index] ?? 0,
    })),
    shape: shapeRows.map(([label, count]) => ({
      label,
      count,
      share: entries.length ? count / entries.length : 0,
    })),
    scatter,
    scatterSampled: sampled,
  }
}

export function percentDelta(current: number, previous: number): string | null {
  if (previous === 0) return null
  const delta = ((current - previous) / previous) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}%`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function uniqueValues(entries: Entry[], key: 'mode' | 'engine'): string[] {
  return [...new Set(entries.map((entry) => entry[key]))].sort((a, b) => a.localeCompare(b))
}

export type CollectionOption = { id: string; label: string; threads: number; queries: number; first: string }

export function collectionLabel(id: string, profile: Profile | null): string {
  return profile?.collectionNames[id] ?? id.slice(0, 8)
}

export function collectionOptions(entries: Entry[], profile: Profile | null): CollectionOption[] {
  const groups = new Map<string, { threads: Set<string>; queries: number; first: string }>()
  for (const entry of entries) {
    if (!entry.collection) continue
    const group = groups.get(entry.collection) ?? { threads: new Set<string>(), queries: 0, first: entry.created }
    group.threads.add(entry.threadId)
    group.queries += 1
    if (entry.created < group.first) group.first = entry.created
    groups.set(entry.collection, group)
  }
  return [...groups.entries()]
    .map(([id, group]) => ({
      id,
      label: collectionLabel(id, profile),
      threads: group.threads.size,
      queries: group.queries,
      first: group.first,
    }))
    .sort((a, b) => b.threads - a.threads || b.queries - a.queries || a.label.localeCompare(b.label))
}
