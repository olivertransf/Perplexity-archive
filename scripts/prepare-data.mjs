import { createRequire } from 'node:module'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'data')
const threadDir = path.join(outDir, 'threads')

const downloads = path.join(process.env.HOME ?? '', 'Downloads')

// data/raw first, then PERPLEXITY_EXPORT, then the newest user_data_export_* folder in Downloads.
async function exportCandidates() {
  const dirs = [path.join(root, 'data', 'raw')]
  if (process.env.PERPLEXITY_EXPORT) dirs.push(path.resolve(process.env.PERPLEXITY_EXPORT))
  try {
    const names = await readdir(downloads)
    const exports = names.filter((name) => name.startsWith('user_data_export_')).sort().reverse()
    dirs.push(...exports.map((name) => path.join(downloads, name)))
  } catch {
    // no Downloads folder
  }
  return dirs
}

const weekdayIndex = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

function words(text) {
  const matched = text.trim().match(/\S+/g)
  return matched ? matched.length : 0
}

function zonedParts(iso, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  const bag = {}
  for (const part of fmt.formatToParts(new Date(iso))) {
    if (part.type !== 'literal') bag[part.type] = part.value
  }
  let hour = Number(bag.hour)
  if (hour === 24) hour = 0
  const weekday = weekdayIndex[bag.weekday]
  if (!bag.year || !bag.month || !bag.day || Number.isNaN(hour) || weekday === undefined) {
    throw new Error(`Could not zone ${iso} in ${timeZone}`)
  }
  return {
    day: `${bag.year}-${bag.month}-${bag.day}`,
    hour,
    weekday,
  }
}

async function findExportDir() {
  const candidates = await exportCandidates()
  for (const dir of candidates) {
    try {
      const names = await readdir(dir)
      const json = names.find((name) => name.startsWith('conversations-') && name.endsWith('.json'))
      const xlsx = names.find((name) => name.startsWith('user-data-') && name.endsWith('.xlsx'))
      if (json && xlsx) return { dir, json: path.join(dir, json), xlsx: path.join(dir, xlsx) }
    } catch {
      // try the next location
    }
  }
  throw new Error(`No Perplexity export found. Looked in:\n${candidates.join('\n')}`)
}

function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name]
  if (!sheet) throw new Error(`Missing workbook sheet: ${name}`)
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

function text(value) {
  return String(value ?? '').trim()
}

function flag(value) {
  const raw = text(value).toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function memoryKey(raw) {
  const value = text(raw)
  const hash = value.indexOf('#')
  return hash === -1 ? value : value.slice(hash + 1)
}

async function writeThreads(threads) {
  let cursor = 0
  const workers = Array.from({ length: 32 }, async () => {
    while (cursor < threads.length) {
      const thread = threads[cursor]
      cursor += 1
      await writeFile(path.join(threadDir, `${thread.id}.json`), JSON.stringify(thread))
    }
  })
  await Promise.all(workers)
}

const found = await findExportDir()
const conversations = JSON.parse(await readFile(found.json, 'utf8')).conversations
if (!Array.isArray(conversations)) throw new Error('Conversations export has no conversations array')

const workbook = XLSX.readFile(found.xlsx)
const account = sheetRows(workbook, 'Account Information')[0] ?? {}
const preferences = sheetRows(workbook, 'User Preferences')[0] ?? {}
const assistant = sheetRows(workbook, 'AI Assistant Settings')[0] ?? {}
const subscription = sheetRows(workbook, 'Subscription Details')[0] ?? {}
const devices = sheetRows(workbook, 'Notification Settings')
const collections = sheetRows(workbook, 'Collections & Shared Content')
const memories = sheetRows(workbook, 'Memory')

const entries = []
const threads = []

for (const conversation of conversations) {
  const sourceEntries = [...(conversation.entries ?? [])].sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at)),
  )
  const threadEntries = []
  sourceEntries.forEach((entry, turn) => {
    const query = String(entry.query ?? '')
    const answer = String(entry.answer ?? '')
    const created = String(entry.created_at ?? '')
    if (!created) throw new Error(`Entry ${entry.entry_uuid} has no timestamp`)
    const pt = zonedParts(created, 'America/Los_Angeles')
    const utc = zonedParts(created, 'UTC')
    const engine = text(entry.engine_mode) || 'unknown'
    entries.push({
      id: String(entry.entry_uuid),
      threadId: String(conversation.context_uuid),
      title: text(conversation.context_title) || 'Untitled',
      created,
      mode: text(conversation.mode) || 'unknown',
      engine,
      status: text(entry.query_status) || 'unknown',
      collection: text(conversation.collection_uuid) || null,
      query,
      queryLen: query.length,
      answerLen: answer.length,
      queryWords: words(query),
      answerWords: words(answer),
      turn,
      turns: sourceEntries.length,
      question: query.includes('?'),
      url: /https?:\/\//i.test(query),
      codeQuery: query.includes('```') || /\b(function|const |def |import |class )\b/.test(query),
      codeAnswer: answer.includes('```'),
      citation: /\[\d+\]/.test(answer),
      heading: answer.startsWith('#') || answer.includes('\n#'),
      dayPt: pt.day,
      dayUtc: utc.day,
      hourPt: pt.hour,
      hourUtc: utc.hour,
      weekdayPt: pt.weekday,
      weekdayUtc: utc.weekday,
    })
    threadEntries.push({
      id: String(entry.entry_uuid),
      query,
      answer,
      created,
      engine,
      status: text(entry.query_status) || 'unknown',
    })
  })
  threads.push({
    id: String(conversation.context_uuid),
    title: text(conversation.context_title) || 'Untitled',
    created: String(conversation.created_at ?? ''),
    updated: String(conversation.updated_at ?? ''),
    mode: text(conversation.mode) || 'unknown',
    collection: text(conversation.collection_uuid) || null,
    entries: threadEntries,
  })
}

// Collection titles carry numeric ids that never appear on threads. Thread
// collection uuids and named collections match one to one when each side is
// sorted by date, so the mapping is inferred by rank and flagged as such.
const clusterFirst = new Map()
for (const entry of entries) {
  if (!entry.collection) continue
  const current = clusterFirst.get(entry.collection)
  if (!current || entry.created < current) clusterFirst.set(entry.collection, entry.created)
}
const clustersByDate = [...clusterFirst.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id]) => id)
const namedByDate = [...collections].sort((a, b) => text(a.CREATED).localeCompare(text(b.CREATED)))
const collectionNames = {}
const inferred = clustersByDate.length > 0 && clustersByDate.length === namedByDate.length
if (inferred) {
  clustersByDate.forEach((id, index) => {
    collectionNames[id] = text(namedByDate[index].TITLE) || 'Untitled'
  })
}
const uuidByTitle = new Map(Object.entries(collectionNames).map(([id, title]) => [title, id]))

const profile = {
  collectionNames,
  collectionsInferred: inferred,
  name: text(account.NAME) || 'Archive',
  username: text(account.USERNAME),
  city: text(assistant.LOCATION_CITY),
  region: text(assistant.LOCATION_REGION),
  country: text(assistant.LOCATION_COUNTRY),
  bio: text(assistant.BIO),
  preferences: {
    defaultModel: text(preferences.DEFAULT_MODEL),
    imageModel: text(preferences.DEFAULT_IMAGE_GENERATION_MODEL),
    videoModel: text(preferences.DEFAULT_VIDEO_GENERATION_MODEL),
    trainingDisabled: flag(preferences.DISABLE_TRAINING),
    notifications: text(preferences.NOTIF_STATUS),
    email: text(preferences.EMAIL_STATUS),
    language: text(preferences.DEVICE_LANGUAGE),
    useMemory: flag(assistant.USE_MEMORY),
    useSearchHistory: flag(assistant.USE_SEARCH_HISTORY),
    created: text(preferences.CREATED),
    updated: text(preferences.UPDATED),
  },
  subscription: {
    tier: text(subscription.SUBSCRIPTION_TIER),
    paymentTier: text(subscription.PAYMENT_TIER),
    status: text(subscription.STRIPE_STATUS),
    created: text(subscription.CREATED),
    updated: text(subscription.UPDATED),
  },
  devices: devices.map((device) => ({
    source: text(device.SOURCE),
    version: text(device.VERSION),
    created: text(device.CREATED),
    updated: text(device.UPDATED),
  })),
  collections: collections.map((collection) => {
    const title = text(collection.TITLE) || 'Untitled'
    return {
      title,
      description: text(collection.DESCRIPTION),
      created: text(collection.CREATED),
      uuid: uuidByTitle.get(title) ?? null,
    }
  }),
  memories: memories
    .map((memory) => {
      const key = memoryKey(memory.MEMORY_KEY)
      return {
        key,
        category: key.split('.')[0] || 'other',
        value: text(memory.MEMORY_VALUE),
        created: text(memory.FIRST_CREATED_AT),
        updated: text(memory.LAST_UPDATED_AT),
      }
    })
    .filter((memory) => memory.key && memory.value),
}

if (entries.some((entry) => entry.hourPt > 23 || entry.weekdayPt > 6)) {
  throw new Error('Zoned hour or weekday was out of range')
}

await rm(outDir, { recursive: true, force: true })
await mkdir(threadDir, { recursive: true })
await writeFile(path.join(outDir, 'entries.json'), JSON.stringify(entries))
await writeFile(path.join(outDir, 'profile.json'), JSON.stringify(profile))
await writeThreads(threads)

console.log(
  JSON.stringify(
    {
      source: found.dir,
      entries: entries.length,
      threads: threads.length,
      memories: profile.memories.length,
      collections: profile.collections.length,
      collectionsMatched: Object.keys(collectionNames).length,
      devices: profile.devices.length,
    },
    null,
    2,
  ),
)
