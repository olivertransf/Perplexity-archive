import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { formatHour, WEEKDAYS, zoneLabel } from '../lib/dates.ts'
import { formatNumber } from '../lib/stats.ts'
import { categoryAxis, chartGrid, chartText, tooltip, valueAxis } from '../lib/charts.ts'
import { Chart } from './Chart.tsx'
import { Empty, Section } from './Section.tsx'

export function Rhythm() {
  const { summary, prefs, theme } = useArchive()
  const heatMax = Math.max(...summary.byWeekdayHour.flat(), 1)

  const heat = useMemo<EChartsOption>(() => {
    const data: [number, number, number][] = []
    summary.byWeekdayHour.forEach((row, weekday) => {
      row.forEach((count, hour) => {
        data.push([hour, weekday, count])
      })
    })
    return {
      tooltip: {
        ...tooltip(theme),
        formatter: (params) => {
          const raw = params as { data?: number[] }
          const point = raw.data
          if (!point) return ''
          const hour = point[0] ?? 0
          const weekday = point[1] ?? 0
          const count = point[2] ?? 0
          return `${WEEKDAYS[weekday] ?? ''} ${formatHour(hour)} · ${formatNumber(count)}`
        },
      },
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      xAxis: categoryAxis(theme, Array.from({ length: 24 }, (_, hour) => String(hour)), {
        axisLabel: { ...chartText(theme), interval: 2 },
      }),
      yAxis: categoryAxis(theme, [...WEEKDAYS], { inverse: true }),
      visualMap: {
        min: 0,
        max: heatMax,
        show: false,
        inRange: { color: [theme.heatEmpty, theme.accent] },
      },
      series: [
        {
          type: 'heatmap',
          data,
          itemStyle: { borderColor: theme.bg, borderWidth: 2 },
          emphasis: { itemStyle: { borderColor: theme.text } },
        },
      ],
    }
  }, [summary.byWeekdayHour, theme, heatMax])

  const hours = useMemo<EChartsOption>(
    () => ({
      tooltip: tooltip(theme),
      grid: chartGrid(),
      xAxis: categoryAxis(theme, Array.from({ length: 24 }, (_, hour) => String(hour)), {
        axisLabel: { ...chartText(theme), interval: 2 },
      }),
      yAxis: valueAxis(theme),
      series: [
        {
          type: 'bar',
          data: summary.byHour,
          itemStyle: { color: theme.accentSoft },
        },
      ],
    }),
    [summary.byHour, theme],
  )

  return (
    <Section
      id="rhythm"
      title="Time of day"
      note={`Queries by weekday and hour, ${zoneLabel(prefs.zone)}.`}
    >
      {summary.queries === 0 ? (
        <Empty>No hours to draw.</Empty>
      ) : (
        <div className="split">
          <Chart option={heat} height={280} />
          <Chart option={hours} height={280} />
        </div>
      )}
    </Section>
  )
}
