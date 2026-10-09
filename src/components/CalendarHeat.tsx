import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { diffDays, formatDay } from '../lib/dates.ts'
import { formatNumber } from '../lib/stats.ts'
import { chartText, tooltip } from '../lib/charts.ts'
import { Chart, type ChartClick } from './Chart.tsx'
import { Empty, Section } from './Section.tsx'

function dayFromClick(params: ChartClick): string | null {
  const sources = [params.data, params.value]
  for (const source of sources) {
    if (Array.isArray(source) && typeof source[0] === 'string') return source[0]
    if (source && typeof source === 'object' && 'value' in source) {
      const value = (source as { value: unknown }).value
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    }
  }
  return null
}

export function CalendarHeat() {
  const { summary, setDates, theme, bounds } = useArchive()
  const weeks = Math.max(12, Math.ceil(diffDays(bounds.start, bounds.end) / 7) + 3)
  const width = Math.max(760, weeks * 16)
  const max = Math.max(...summary.daily.map((point) => point.queries), 1)

  const option = useMemo<EChartsOption>(() => {
    return {
      tooltip: {
        ...tooltip(theme),
        formatter: (params) => {
          const raw = params as { data?: unknown }
          const data = raw.data
          if (!Array.isArray(data)) return ''
          const day = typeof data[0] === 'string' ? data[0] : ''
          const count = typeof data[1] === 'number' ? data[1] : 0
          return `${formatDay(day)} · ${formatNumber(count)} queries`
        },
      },
      visualMap: {
        min: 0,
        max,
        calculable: false,
        orient: 'horizontal',
        left: 28,
        bottom: 0,
        itemWidth: 12,
        itemHeight: 80,
        text: ['More', 'Less'],
        textStyle: chartText(theme),
        inRange: { color: [theme.heatLow, theme.accent] },
        formatter: (value) => formatNumber(Math.round(Number(value))),
      },
      calendar: {
        range: [bounds.start, bounds.end],
        cellSize: [13, 13],
        left: 36,
        right: 12,
        top: 28,
        bottom: 36,
        orient: 'horizontal',
        splitLine: { show: false },
        itemStyle: { color: theme.heatEmpty, borderWidth: 2, borderColor: theme.bg },
        dayLabel: { color: theme.muted, fontSize: 10, firstDay: 1, nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
        monthLabel: { color: theme.muted, fontSize: 11 },
        yearLabel: { show: false },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: summary.daily.map((point) => [point.day, point.queries]),
        },
      ],
    }
  }, [summary.daily, theme, bounds.start, bounds.end, max])

  const onClick = (params: ChartClick) => {
    const day = dayFromClick(params)
    if (day) setDates(day, day)
  }

  return (
    <Section
      id="calendar"
      title="Daily activity"
      note="Queries per day. Click a cell to filter to that day."
    >
      {summary.queries === 0 ? (
        <Empty>No days to draw.</Empty>
      ) : (
        <div className="chart-scroll">
          <Chart option={option} height={188} width={width} onClick={onClick} />
        </div>
      )}
    </Section>
  )
}
