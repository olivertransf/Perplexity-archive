import { SECTIONS } from '../sections.ts'
import { ENGINE_ORDER, THEME_IDS, engineLabel, modeLabel, themeById } from '../theme.ts'
import { useArchive } from '../filters/context.tsx'
import { collectionOptions, uniqueValues } from '../lib/stats.ts'
import { zoneLabel } from '../lib/dates.ts'
import type { Zone } from '../types.ts'

function ordered(values: string[], rank: string[]): string[] {
  return [...values].sort((a, b) => {
    const aIndex = rank.indexOf(a)
    const bIndex = rank.indexOf(b)
    const aRank = aIndex === -1 ? rank.length : aIndex
    const bRank = bIndex === -1 ? rank.length : bIndex
    return aRank - bRank || a.localeCompare(b)
  })
}

export function Rail() {
  const { prefs, setPref, toggleHidden, toggleMembership, resetFilters, entries, profile } = useArchive()
  const modes = ordered(uniqueValues(entries, 'mode'), ['COPILOT', 'CONCISE', 'ASI'])
  const engines = ordered(uniqueValues(entries, 'engine'), ENGINE_ORDER)
  const collections = collectionOptions(entries, profile)
  const filtersActive =
    prefs.from !== '' ||
    prefs.to !== '' ||
    prefs.modes.length > 0 ||
    prefs.engines.length > 0 ||
    prefs.collection !== '' ||
    prefs.search !== '' ||
    prefs.compare

  return (
    <aside className="rail">
      <div className="brand">
        <h1>Perplexity export</h1>
        <p className="quiet">{profile?.name || 'Local data'}</p>
      </div>

      <label className="field">
        <span>Search</span>
        <input
          type="search"
          value={prefs.search}
          placeholder="Prompts and titles"
          onChange={(event) => setPref('search', event.target.value)}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>From</span>
          <input type="date" value={prefs.from} onChange={(event) => setPref('from', event.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={prefs.to} onChange={(event) => setPref('to', event.target.value)} />
        </label>
      </div>
      <p className="hint">{zoneLabel(prefs.zone)} dates</p>

      <fieldset>
        <legend>Timezone</legend>
        <div className="chips">
          {(['pt', 'utc'] as Zone[]).map((zone) => (
            <button
              key={zone}
              type="button"
              className="chip"
              aria-pressed={prefs.zone === zone}
              onClick={() => setPref('zone', zone)}
            >
              {zoneLabel(zone)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Mode</legend>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={prefs.modes.length === 0}
            onClick={() => setPref('modes', [])}
          >
            All
          </button>
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              className="chip"
              aria-pressed={prefs.modes.includes(mode)}
              onClick={() => toggleMembership('modes', mode)}
            >
              {modeLabel(mode)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Engine</legend>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={prefs.engines.length === 0}
            onClick={() => setPref('engines', [])}
          >
            All
          </button>
          {engines.map((engine) => (
            <button
              key={engine}
              type="button"
              className="chip"
              aria-pressed={prefs.engines.includes(engine)}
              onClick={() => toggleMembership('engines', engine)}
            >
              {engineLabel(engine)}
            </button>
          ))}
        </div>
      </fieldset>

      {collections.length > 0 ? (
        <fieldset>
          <legend>Collection</legend>
          <div className="chips">
            <button
              type="button"
              className="chip"
              aria-pressed={prefs.collection === ''}
              onClick={() => setPref('collection', '')}
            >
              All
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={prefs.collection === 'none'}
              onClick={() => setPref('collection', 'none')}
            >
              None
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className="chip"
                aria-pressed={prefs.collection === collection.id}
                onClick={() => setPref('collection', collection.id)}
                title={collection.id}
              >
                {collection.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend>Compare</legend>
        <button
          type="button"
          className="chip"
          aria-pressed={prefs.compare}
          onClick={() => setPref('compare', !prefs.compare)}
        >
          Compare with previous period
        </button>
      </fieldset>

      <fieldset>
        <legend>Theme</legend>
        <div className="chips">
          {THEME_IDS.map((theme) => (
            <button
              key={theme}
              type="button"
              className="chip"
              aria-pressed={prefs.theme === theme}
              onClick={() => setPref('theme', theme)}
            >
              {themeById(theme).label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Sections</legend>
        <ul className="section-toggles">
          {SECTIONS.map((section) => {
            const visible = !prefs.hidden.includes(section.id)
            return (
              <li key={section.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleHidden(section.id)}
                  />
                  <a href={`#${section.id}`}>{section.label}</a>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <button type="button" className="text-button" onClick={resetFilters} disabled={!filtersActive}>
        Reset filters
      </button>
    </aside>
  )
}
