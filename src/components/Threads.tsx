import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { loadThread } from '../data/load.ts'
import { useArchive } from '../filters/context.tsx'
import { formatWhen, zoneLabel } from '../lib/dates.ts'
import { collectionLabel, formatNumber, sortThreads, threadSummaries } from '../lib/stats.ts'
import { engineLabel, modeLabel } from '../theme.ts'
import type { ThreadFile, ThreadSort } from '../types.ts'
import { Empty, Section } from './Section.tsx'

const sorts: { id: ThreadSort; label: string }[] = [
  { id: 'recency', label: 'Recent' },
  { id: 'length', label: 'Turns' },
  { id: 'prompt', label: 'Prompt size' },
]

function Reader({ id }: { id: string }) {
  const { prefs, profile } = useArchive()
  const [thread, setThread] = useState<ThreadFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    loadThread(id)
      .then((file) => {
        if (!cancel) setThread(file)
      })
      .catch(() => {
        if (!cancel) setError('This thread did not load.')
      })
    return () => {
      cancel = true
    }
  }, [id])

  if (error) return <p className="empty">{error}</p>
  if (!thread) return <p className="quiet">Loading</p>

  return (
    <article className="reader-body">
      <header>
        <h3>{thread.title}</h3>
        <p className="quiet">
          {modeLabel(thread.mode)} · {formatNumber(thread.entries.length)} turns
          {thread.collection ? ` · ${collectionLabel(thread.collection, profile)}` : ''} · {zoneLabel(prefs.zone)}
        </p>
      </header>
      <ol className="turns">
        {thread.entries.map((entry, index) => (
          <li key={entry.id}>
            <p className="turn-meta">
              Turn {index + 1} · {engineLabel(entry.engine)} · {formatWhen(entry.created, prefs.zone)}
              {entry.status !== 'COMPLETED' ? ` · ${entry.status}` : ''}
            </p>
            <div className="query-block">{entry.query}</div>
            {entry.answer ? (
              <div className="prose">
                <ReactMarkdown>{entry.answer}</ReactMarkdown>
              </div>
            ) : (
              <p className="quiet">No answer stored.</p>
            )}
          </li>
        ))}
      </ol>
    </article>
  )
}

export function Threads() {
  const { filtered, prefs, profile, setPref, summary } = useArchive()
  const threads = useMemo(
    () => sortThreads(threadSummaries(filtered), prefs.threadSort),
    [filtered, prefs.threadSort],
  )
  const [selected, setSelected] = useState<string | null>(null)
  const active = selected && threads.some((thread) => thread.id === selected) ? selected : null

  return (
    <Section
      id="threads"
      title="Threads"
      note={`${formatNumber(threads.length)} threads. Turn counts include only matching queries.`}
      extra={
        <div className="chips">
          {sorts.map((sort) => (
            <button
              key={sort.id}
              type="button"
              className="chip"
              aria-pressed={prefs.threadSort === sort.id}
              onClick={() => setPref('threadSort', sort.id)}
            >
              {sort.label}
            </button>
          ))}
        </div>
      }
    >
      {summary.queries === 0 ? (
        <Empty>No threads match the current filters.</Empty>
      ) : (
        <div className="threads">
          <ul className="thread-list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  className={thread.id === active ? 'thread is-selected' : 'thread'}
                  onClick={() => setSelected(thread.id)}
                >
                  <span className="thread-title">{thread.title}</span>
                  <span className="quiet">
                    {formatNumber(thread.turns)} {thread.turns === 1 ? 'turn' : 'turns'} · {modeLabel(thread.mode)}
                    {thread.collection ? ` · ${collectionLabel(thread.collection, profile)}` : ''} ·{' '}
                    {formatWhen(thread.latest, prefs.zone)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="reader">{active ? <Reader key={active} id={active} /> : <p className="empty">Select a thread.</p>}</div>
        </div>
      )}
    </Section>
  )
}
