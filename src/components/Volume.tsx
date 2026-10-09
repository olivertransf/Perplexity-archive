import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { formatDay, formatMonth } from '../lib/dates.ts'
import { formatNumber, formatPercent } from '../lib/stats.ts'
import { categoryAxis, chartGrid, tooltip, valueAxis } from '../lib/charts.ts'
import { ENGINE_ORDER, engineLabel, modeLabel, seriesColor } from '../theme.ts'
import { Chart } from './Chart.tsx'
import { Empty, Section } from './Section.tsx'

export function Volume() {
  const { summary, previousSummary, prefs, bounds, theme } = useArchive()
  const area = useMemo<EChartsOption>(() => {
    const months = summary.months
    const present = ENGINE_ORDER.filter((engine) =>
      months.some((month) => (summary.byMonthEngine[month]?.[engine] ?? 0) > 0),
    )
    return {
      tooltip: { ...tooltip(theme), trigger: 'axis' },
      legend: {
        type: 'scroll',
        top: 0,
        textStyle: { color: theme.muted, fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        pageIconColor: theme.muted,
        pageIconInactiveColor: theme.line,
        pageTextStyle: { color: theme.muted },
      },
      grid: { ...chartGrid(), top: 36 },
      xAxis: categoryAxis(theme, months.map(formatMonth)),
      yAxis: valueAxis(theme),
      series: present.map((engine) => ({
        name: engineLabel(engine),
        type: 'line' as const,
        stack: 'queries',
        smooth: false,
        showSymbol: false,
        areaStyle: { opacity: 0.7 },
        lineStyle: { width: 1.5 },
        itemStyle: { color: seriesColor(engine, ENGINE_ORDER, theme) },
        data: months.map((month) => summary.byMonthEngine[month]?.[engine] ?? 0),
      })),
    }
  }, [summary.months, summary.byMonthEngine, theme])

  const donut = useMemo<EChartsOption>(
    () => ({
      tooltip: tooltip(theme),
      series: [
        {
          type: 'pie',
          radius: ['52%', '76%'],
          label: { color: theme.text, fontSize: 12 },
          labelLine: { length: 10, length2: 8 },
          itemStyle: { borderColor: theme.bg, borderWidth: 2 },
          data: summary.byMode.map((row) => {
            const visible = summary.queries > 0 && row.count / summary.queries >= 0.03
            return {
              name: modeLabel(row.mode),
              value: row.count,
              label: { show: visible },
              labelLine: { show: visible },
              itemStyle: { color: seriesColor(row.mode, ['COPILOT', 'CONCISE', 'ASI'], theme) },
            }
          }),
        },
      ],
    }),
    [summary.byMode, summary.queries, theme],
  )

  const overlay = useMemo<EChartsOption | null>(() => {
    if (!prefs.compare || !previousSummary) return null
    const length = Math.max(summary.daily.length, previousSummary.daily.length)
    const labels = Array.from({ length }, (_, index) => String(index + 1))
    return {
      tooltip: { ...tooltip(theme), trigger: 'axis' },
      legend: { top: 0, textStyle: { color: theme.muted, fontSize: 11 } },
      grid: { ...chartGrid(), top: 36 },
      xAxis: categoryAxis(theme, labels, { axisLabel: { color: theme.muted, fontSize: 11, interval: Math.ceil(length / 8) } }),
      yAxis: valueAxis(theme),
      series: [
        {
          name: 'This window',
          type: 'line',
          showSymbol: false,
          smooth: false,
          data: summary.daily.map((point) => point.queries),
          lineStyle: { width: 2, color: theme.accent },
          itemStyle: { color: theme.accent },
        },
        {
          name: 'Previous window',
          type: 'line',
          showSymbol: false,
          smooth: false,
          data: previousSummary.daily.map((point) => point.queries),
          lineStyle: { width: 2, type: 'dashed', color: theme.accentSoft },
          itemStyle: { color: theme.accentSoft },
        },
      ],
    }
  }, [prefs.compare, previousSummary, summary.daily, theme])

  const note =
    prefs.compare && previousSummary
      ? `Previous period ${formatDay(bounds.prevStart)} to ${formatDay(bounds.prevEnd)}: ${formatNumber(previousSummary.queries)} queries, ${formatPercent(previousSummary.questionRate)} with a question mark.`
      : 'Monthly queries by engine; thread mode share.'

  return (
    <Section id="volume" title="Volume by engine" note={note}>
      {summary.queries === 0 ? (
        <Empty>No queries in this slice.</Empty>
      ) : (
        <>
          <div className="split volume-split">
            <Chart option={area} height={320} />
            <Chart option={donut} height={320} />
          </div>
          {overlay && previousSummary && previousSummary.queries > 0 ? (
            <div className="stack-chart">
              <p className="chart-label">Daily queries, aligned by day index</p>
              <Chart option={overlay} height={240} />
            </div>
          ) : null}
        </>
      )}
    </Section>
  )
}
