import type { Entry, Zone } from '../types.ts'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const SITTING_GAP_MS = 30 * 60 * 1000

export function dayOf(entry: Entry, zone: Zone): string {
  switch (zone) {
    case 'pt':
      return entry.dayPt
    case 'utc':
      return entry.dayUtc
    default: {
      const exhaustive: never = zone
      return exhaustive
    }
  }
}

export function hourOf(entry: Entry, zone: Zone): number {
  switch (zone) {
    case 'pt':
      return entry.hourPt
    case 'utc':
      return entry.hourUtc
    default: {
      const exhaustive: never = zone
      return exhaustive
    }
  }
}

export function weekdayOf(entry: Entry, zone: Zone): number {
  switch (zone) {
    case 'pt':
      return entry.weekdayPt
    case 'utc':
      return entry.weekdayUtc
    default: {
      const exhaustive: never = zone
      return exhaustive
    }
  }
}

export function addDays(ymd: string, delta: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + delta))
  return date.toISOString().slice(0, 10)
}

export function diffDays(start: string, end: string): number {
  const [startYear, startMonth, startDay] = start.split('-').map(Number)
  const [endYear, endMonth, endDay] = end.split('-').map(Number)
  const ms = Date.UTC(endYear, endMonth - 1, endDay) - Date.UTC(startYear, startMonth - 1, startDay)
  return Math.round(ms / 86_400_000)
}

export function eachDay(start: string, end: string): string[] {
  if (!start || !end || start > end) return []
  const days: string[] = []
  let cursor = start
  while (cursor <= end) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

export function formatDay(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  if (!year || !month || !day) return ymd
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  if (!year || !month) return ym
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatWhen(iso: string, zone: Zone): string {
  const timeZone = zone === 'pt' ? 'America/Los_Angeles' : 'UTC'
  return new Date(iso).toLocaleString('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function zoneLabel(zone: Zone): string {
  switch (zone) {
    case 'pt':
      return 'Pacific'
    case 'utc':
      return 'UTC'
    default: {
      const exhaustive: never = zone
      return exhaustive
    }
  }
}
