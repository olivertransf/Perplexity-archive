import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { formatDay } from '../lib/dates.ts'
import { formatNumber } from '../lib/stats.ts'
import { tooltip } from '../lib/charts.ts'
import type { MemoryNote } from '../types.ts'
import { Chart, type ChartClick } from './Chart.tsx'
import { Section } from './Section.tsx'

function sunburstData(memories: MemoryNote[], colors: string[]) {
  const categories = new Map<string, Map<string, number>>()
  for (const memory of memories) {
    const [category = 'other', second] = memory.key.split('.')
    const children = categories.get(category) ?? new Map<string, number>()
    const name = second || 'notes'
    children.set(name, (children.get(name) ?? 0) + 1)
    categories.set(category, children)
  }
  return [...categories.entries()]
    .map(([name, children]) => ({
      name,
      total: [...children.values()].reduce((sum, count) => sum + count, 0),
      children,
    }))
    .sort((a, b) => b.total - a.total)
    .map((category, index) => ({
      name: category.name,
      itemStyle: { color: colors[index % colors.length] },
      children: [...category.children.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
    }))
}

export function MemoryPanel() {
  const { profile, theme } = useArchive()
  const memories = profile?.memories
  const notes = useMemo(() => memories ?? [], [memories])
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = notes.filter(
    (memory) =>
      !needle || memory.key.toLowerCase().includes(needle) || memory.value.toLowerCase().includes(needle),
  )
  const data = useMemo(() => sunburstData(notes, theme.colors), [notes, theme])

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...tooltip(theme),
        formatter: (params) => {
          const raw = params as { name?: string; value?: number; treePathInfo?: { name?: string }[] }
          const path = (raw.treePathInfo ?? [])
            .map((node) => node.name)
            .filter((name) => name && name !== 'Memory')
            .join('.')
          const count = typeof raw.value === 'number' ? raw.value : 0
          return `${path || raw.name || ''} · ${formatNumber(count)}`
        },
      },
      series: [
        {
          type: 'sunburst',
          name: 'Memory',
          data,
          radius: [18, '90%'],
          sort: undefined,
          label: { color: theme.text, fontSize: 11, rotate: 'radial', minAngle: 8 },
          itemStyle: { borderColor: theme.bg, borderWidth: 2 },
        },
      ],
    }),
    [data, theme],
  )

  const onClick = (params: ChartClick) => {
    const path = (params.treePathInfo ?? [])
      .map((node) => node.name)
      .filter((name): name is string => Boolean(name) && name !== 'Memory')
      .join('.')
    if (path) setQuery(path)
  }

  return (
    <Section
      id="memory"
      title="Memory"
      note={`${formatNumber(notes.length)} stored notes, grouped by key prefix. Click a segment to filter the list.`}
    >
      <div className="split">
        <Chart option={option} height={460} onClick={onClick} />
        <div className="memory-column">
          <label className="field">
            <span>Filter</span>
            <input
              type="search"
              value={query}
              placeholder="Key or text"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="quiet">{formatNumber(visible.length)} shown</p>
          <ul className="memory-list">
            {visible.map((memory) => (
              <li key={memory.key}>
                <p className="memory-key">{memory.key}</p>
                <p>{memory.value}</p>
                <p className="quiet">{memory.updated ? formatDay(memory.updated.slice(0, 10)) : ''}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
