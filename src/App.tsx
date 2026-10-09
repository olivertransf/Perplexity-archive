import { ArchiveProvider, useArchive } from './filters/context.tsx'
import { formatDay, zoneLabel } from './lib/dates.ts'
import { collectionLabel, formatNumber } from './lib/stats.ts'
import { engineLabel, modeLabel } from './theme.ts'
import { CalendarHeat } from './components/CalendarHeat.tsx'
import { Depth } from './components/Depth.tsx'
import { Lexicon } from './components/Lexicon.tsx'
import { MemoryPanel } from './components/MemoryPanel.tsx'
import { PromptShape } from './components/PromptShape.tsx'
import { Pulse } from './components/Pulse.tsx'
import { Rail } from './components/Rail.tsx'
import { Rhythm } from './components/Rhythm.tsx'
import { Spaces } from './components/Spaces.tsx'
import { Threads } from './components/Threads.tsx'
import { Volume } from './components/Volume.tsx'
import { SECTIONS } from './sections.ts'

function Dashboard() {
  const { prefs, setPref, setDates, profile, filtered, bounds, loading, error, summary } = useArchive()
  const hidden = new Set(prefs.hidden)
  const span = bounds.start && bounds.end ? `${formatDay(bounds.start)} to ${formatDay(bounds.end)}` : ''

  return (
    <div className="app">
      <Rail />
      <main>
        {loading ? <p className="quiet">Loading</p> : null}
        {error ? <p className="empty">{error}</p> : null}
        {!loading && !error && profile ? (
          <>
            <header className="mast">
              <div>
                <h1>{formatNumber(filtered.length)} queries</h1>
                <p className="note">
                  {span}, {zoneLabel(prefs.zone)}. {formatNumber(summary.threads)} threads,{' '}
                  {formatNumber(summary.activeDays)} active days.
                </p>
              </div>
            </header>
            <div className="active-filters">
              {prefs.search ? (
                <button type="button" className="chip" onClick={() => setPref('search', '')}>
                  search: {prefs.search} ×
                </button>
              ) : null}
              {prefs.modes.map((mode) => (
                <button key={mode} type="button" className="chip" onClick={() => setPref('modes', prefs.modes.filter((item) => item !== mode))}>
                  {modeLabel(mode)} ×
                </button>
              ))}
              {prefs.engines.map((engine) => (
                <button
                  key={engine}
                  type="button"
                  className="chip"
                  onClick={() => setPref('engines', prefs.engines.filter((item) => item !== engine))}
                >
                  {engineLabel(engine)} ×
                </button>
              ))}
              {prefs.collection ? (
                <button type="button" className="chip" onClick={() => setPref('collection', '')}>
                  collection: {prefs.collection === 'none' ? 'none' : collectionLabel(prefs.collection, profile)} ×
                </button>
              ) : null}
              {prefs.from || prefs.to ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() => setDates('', '')}
                >
                  {prefs.from || 'start'} to {prefs.to || 'end'} ×
                </button>
              ) : null}
            </div>
            {SECTIONS.every((section) => hidden.has(section.id)) ? (
              <p className="empty">All sections hidden.</p>
            ) : null}
            {hidden.has('pulse') ? null : <Pulse />}
            {hidden.has('calendar') ? null : <CalendarHeat />}
            {hidden.has('rhythm') ? null : <Rhythm />}
            {hidden.has('volume') ? null : <Volume />}
            {hidden.has('depth') ? null : <Depth />}
            {hidden.has('shape') ? null : <PromptShape />}
            {hidden.has('lexicon') ? null : <Lexicon />}
            {hidden.has('threads') ? null : <Threads />}
            {hidden.has('memory') ? null : <MemoryPanel />}
            {hidden.has('spaces') ? null : <Spaces />}
            <footer className="colophon">Local data from public/data. Not uploaded.</footer>
          </>
        ) : null}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ArchiveProvider>
      <Dashboard />
    </ArchiveProvider>
  )
}
