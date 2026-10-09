export const SECTIONS = [
  { id: 'pulse', label: 'Overview' },
  { id: 'calendar', label: 'Daily activity' },
  { id: 'rhythm', label: 'Time of day' },
  { id: 'volume', label: 'Volume by engine' },
  { id: 'depth', label: 'Thread depth' },
  { id: 'shape', label: 'Prompt length and content' },
  { id: 'lexicon', label: 'Vocabulary' },
  { id: 'threads', label: 'Threads' },
  { id: 'memory', label: 'Memory' },
  { id: 'spaces', label: 'Collections and account' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']
