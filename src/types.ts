export type Zone = 'pt' | 'utc'

export type ThemeId = 'dark' | 'light' | 'mono'

export type ThreadSort = 'recency' | 'length' | 'prompt'

export type Entry = {
  id: string
  threadId: string
  title: string
  created: string
  mode: string
  engine: string
  status: string
  collection: string | null
  query: string
  queryLen: number
  answerLen: number
  queryWords: number
  answerWords: number
  turn: number
  turns: number
  question: boolean
  url: boolean
  codeQuery: boolean
  codeAnswer: boolean
  citation: boolean
  heading: boolean
  dayPt: string
  dayUtc: string
  hourPt: number
  hourUtc: number
  weekdayPt: number
  weekdayUtc: number
}

export type MemoryNote = {
  key: string
  category: string
  value: string
  created: string
  updated: string
}

export type Profile = {
  name: string
  username: string
  city: string
  region: string
  country: string
  bio: string
  preferences: {
    defaultModel: string
    imageModel: string
    videoModel: string
    trainingDisabled: boolean
    notifications: string
    email: string
    language: string
    useMemory: boolean
    useSearchHistory: boolean
    created: string
    updated: string
  }
  subscription: {
    tier: string
    paymentTier: string
    status: string
    created: string
    updated: string
  }
  devices: { source: string; version: string; created: string; updated: string }[]
  collections: { title: string; description: string; created: string; uuid: string | null }[]
  collectionNames: Record<string, string>
  collectionsInferred: boolean
  memories: MemoryNote[]
}

export type ThreadFile = {
  id: string
  title: string
  created: string
  updated: string
  mode: string
  collection: string | null
  entries: {
    id: string
    query: string
    answer: string
    created: string
    engine: string
    status: string
  }[]
}

export type Prefs = {
  from: string
  to: string
  modes: string[]
  engines: string[]
  collection: string
  search: string
  zone: Zone
  compare: boolean
  hidden: string[]
  theme: ThemeId
  threadSort: ThreadSort
}

export type Theme = {
  id: ThemeId
  label: string
  bg: string
  raise: string
  rail: string
  text: string
  muted: string
  line: string
  accent: string
  accentSoft: string
  heatLow: string
  heatEmpty: string
  colors: string[]
}
