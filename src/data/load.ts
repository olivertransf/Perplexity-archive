import type { Entry, Profile, ThreadFile } from '../types.ts'

const threadCache = new Map<string, Promise<ThreadFile>>()

export async function loadArchive(): Promise<{ entries: Entry[]; profile: Profile }> {
  const [entriesResponse, profileResponse] = await Promise.all([
    fetch('/data/entries.json'),
    fetch('/data/profile.json'),
  ])
  if (!entriesResponse.ok || !profileResponse.ok) {
    throw new Error('Archive data is missing. Run npm run prepare-data, then reload.')
  }
  const entries = (await entriesResponse.json()) as Entry[]
  const profile = (await profileResponse.json()) as Profile
  return { entries, profile }
}

export function loadThread(id: string): Promise<ThreadFile> {
  const cached = threadCache.get(id)
  if (cached) return cached
  const pending = fetch(`/data/threads/${id}.json`).then(async (response) => {
    if (!response.ok) throw new Error('missing thread')
    return (await response.json()) as ThreadFile
  })
  threadCache.set(id, pending)
  pending.catch(() => threadCache.delete(id))
  return pending
}
