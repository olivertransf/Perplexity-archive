import { useMemo, useState } from 'react'
import { useArchive } from '../filters/context.tsx'
import { formatDay } from '../lib/dates.ts'
import { applyFilters, collectionOptions, formatNumber } from '../lib/stats.ts'
import { Section } from './Section.tsx'

function deviceName(source: string): string {
  if (source === 'ios') return 'iOS'
  if (source === 'personal-computer-macos') return 'Mac'
  return source || 'Device'
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No'
}

type CollectionRow = {
  id: string
  title: string
  description: string
  created: string
  threads: number
  queries: number
  matched: boolean
}

export function Spaces() {
  const { entries, profile, prefs, setPref, summary } = useArchive()
  const [query, setQuery] = useState('')

  // Counts honour every filter except the collection filter itself, so other
  // rows stay comparable while one collection is selected.
  const scoped = useMemo(() => applyFilters(entries, { ...prefs, collection: '' }, 'current'), [entries, prefs])

  const rows = useMemo<CollectionRow[]>(() => {
    const all = collectionOptions(entries, profile)
    const inView = new Map(collectionOptions(scoped, profile).map((option) => [option.id, option]))
    const named = new Map((profile?.collections ?? []).map((collection) => [collection.uuid ?? '', collection]))
    const result: CollectionRow[] = all.map((option) => {
      const meta = named.get(option.id)
      const current = inView.get(option.id)
      return {
        id: option.id,
        title: meta?.title ?? option.id.slice(0, 8),
        description: meta?.description ?? '',
        created: meta?.created ?? option.first,
        threads: current?.threads ?? 0,
        queries: current?.queries ?? 0,
        matched: Boolean(meta),
      }
    })
    for (const collection of profile?.collections ?? []) {
      if (collection.uuid) continue
      result.push({
        id: '',
        title: collection.title,
        description: collection.description,
        created: collection.created,
        threads: 0,
        queries: 0,
        matched: false,
      })
    }
    return result
  }, [entries, scoped, profile])

  const needle = query.trim().toLowerCase()
  const visible = rows.filter(
    (row) =>
      !needle ||
      row.title.toLowerCase().includes(needle) ||
      row.description.toLowerCase().includes(needle) ||
      row.id.startsWith(needle),
  )

  const looseThreads = useMemo(() => {
    const ids = new Set<string>()
    let queries = 0
    for (const entry of scoped) {
      if (entry.collection) continue
      ids.add(entry.threadId)
      queries += 1
    }
    return { threads: ids.size, queries }
  }, [scoped])

  const place = [profile?.city, profile?.region, profile?.country].filter(Boolean).join(', ')
  const preferences = profile?.preferences
  const subscription = profile?.subscription
  const inferredNote = profile?.collectionsInferred
    ? 'Collection titles are matched to thread collection uuids by creation order, since the export uses different ids on each side.'
    : 'Collection titles in the export could not be matched to thread collection uuids.'

  const toggle = (id: string) => setPref('collection', prefs.collection === id ? '' : id)

  return (
    <Section
      id="spaces"
      title="Collections and account"
      note={`${inferredNote} Click a row to filter everything to that collection.`}
      extra={
        <label className="field inline-field">
          <span>Filter collections</span>
          <input type="search" value={query} placeholder="Title or uuid" onChange={(event) => setQuery(event.target.value)} />
        </label>
      }
    >
      <table className="table clickable">
        <thead>
          <tr>
            <th>Collection</th>
            <th>Description</th>
            <th className="mono">uuid</th>
            <th className="num">Created</th>
            <th className="num">Threads</th>
            <th className="num">Queries</th>
          </tr>
        </thead>
        <tbody>
          {!needle || 'none'.includes(needle) ? (
            <tr
              className={prefs.collection === 'none' ? 'is-active' : undefined}
              onClick={() => toggle('none')}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle('none')
                }
              }}
            >
              <td>No collection</td>
              <td className="quiet">Threads outside any collection</td>
              <td className="mono"></td>
              <td className="num"></td>
              <td className="num">{formatNumber(looseThreads.threads)}</td>
              <td className="num">{formatNumber(looseThreads.queries)}</td>
            </tr>
          ) : null}
          {visible.map((row) => {
            const clickable = row.id !== ''
            return (
              <tr
                key={row.id || row.title}
                className={[prefs.collection === row.id && clickable ? 'is-active' : '', clickable ? '' : 'is-static']
                  .filter(Boolean)
                  .join(' ') || undefined}
                onClick={clickable ? () => toggle(row.id) : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggle(row.id)
                        }
                      }
                    : undefined
                }
              >
                <td>{row.title}</td>
                <td className="quiet">{row.description}</td>
                <td className="mono">{row.id ? row.id.slice(0, 8) : ''}</td>
                <td className="num">{row.created ? formatDay(row.created.slice(0, 10)) : ''}</td>
                <td className="num">{clickable ? formatNumber(row.threads) : ''}</td>
                <td className="num">{clickable ? formatNumber(row.queries) : ''}</td>
              </tr>
            )
          })}
          {visible.length === 0 && needle && !'none'.includes(needle) ? (
            <tr className="is-static">
              <td colSpan={6} className="quiet">
                No collection matches.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="chart-label account-label">Account</p>
      <dl className="facts">
        <div>
          <dt>Subscription</dt>
          <dd>
            {subscription?.tier || 'unknown'}, {subscription?.status || 'unknown'}
            {subscription?.created ? `, since ${formatDay(subscription.created.slice(0, 10))}` : ''}
          </dd>
        </div>
        <div>
          <dt>Payment tier</dt>
          <dd>{subscription?.paymentTier || 'unknown'}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{place || 'not set'}</dd>
        </div>
        <div>
          <dt>Device language</dt>
          <dd>{preferences?.language || 'not set'}</dd>
        </div>
        <div>
          <dt>Default model</dt>
          <dd>{preferences?.defaultModel || 'unset'}</dd>
        </div>
        <div>
          <dt>Image / video model</dt>
          <dd>
            {preferences?.imageModel || 'unset'} / {preferences?.videoModel || 'unset'}
          </dd>
        </div>
        <div>
          <dt>Memory</dt>
          <dd>{yesNo(Boolean(preferences?.useMemory))}</dd>
        </div>
        <div>
          <dt>Search history</dt>
          <dd>{yesNo(Boolean(preferences?.useSearchHistory))}</dd>
        </div>
        <div>
          <dt>Training disabled</dt>
          <dd>{yesNo(Boolean(preferences?.trainingDisabled))}</dd>
        </div>
        <div>
          <dt>Notifications</dt>
          <dd>
            {preferences?.notifications || 'unset'}, email {preferences?.email || 'unset'}
          </dd>
        </div>
        <div>
          <dt>Threads in view</dt>
          <dd>{formatNumber(summary.threads)}</dd>
        </div>
      </dl>

      {profile?.bio ? (
        <div className="bio">
          <p className="chart-label">Assistant instructions</p>
          <p>{profile.bio}</p>
        </div>
      ) : null}

      <div>
        <p className="chart-label">Clients</p>
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Version</th>
              <th className="num">Registered</th>
            </tr>
          </thead>
          <tbody>
            {(profile?.devices ?? []).map((device) => (
              <tr key={`${device.source}-${device.created}`}>
                <td>{deviceName(device.source)}</td>
                <td className="mono">{device.version}</td>
                <td className="num">{device.created ? formatDay(device.created.slice(0, 10)) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
