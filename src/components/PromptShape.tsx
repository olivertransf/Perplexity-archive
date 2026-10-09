import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { formatNumber } from '../lib/stats.ts'
import { categoryAxis, chartGrid, tooltip, valueAxis } from '../lib/charts.ts'
import { Chart } from './Chart.tsx'
import { Empty, Section } from './Section.tsx'

export function PromptShape() {
  const { summary, theme } = useArchive()

  const lengths = useMemo<EChartsOption>(
    () => ({
      tooltip: tooltip(theme),
      grid: chartGrid(),
      xAxis: categoryAxis(theme, summary.promptBuckets.map((bucket) => bucket.label), {
        axisLabel: { color: theme.muted, fontSize: 10, interval: 0, rotate: 28 },
      }),
      yAxis: valueAxis(theme),
      series: [
        {
          type: 'bar',
          data: summary.promptBuckets.map((bucket) => bucket.count),
          itemStyle: { color: theme.accent },
        },
      ],
    }),
    [summary.promptBuckets, theme],
  )

  const shares = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...tooltip(theme),
        formatter: (params) => {
          const raw = params as { name?: string; data?: { count?: number; value?: number } }
          const count = raw.data?.count ?? 0
          const value = raw.data?.value ?? 0
          return `${raw.name ?? ''}<br/>${formatNumber(count)} · ${value}%`
        },
      },
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: valueAxis(theme, {
        min: 0,
        max: 100,
        axisLabel: {
          color: theme.muted,
          fontSize: 11,
          hideOverlap: true,
          formatter: (value: number) => `${value}%`,
        },
      }),
      yAxis: categoryAxis(theme, summary.shape.map((row) => row.label), {
        inverse: true,
        axisLabel: { color: theme.muted, fontSize: 11, width: 120, overflow: 'truncate' },
      }),
      series: [
        {
          type: 'bar',
          data: summary.shape.map((row) => ({
            value: Math.round(row.share * 1000) / 10,
            count: row.count,
          })),
          itemStyle: { color: theme.accentSoft },
        },
      ],
    }),
    [summary.shape, theme],
  )

  return (
    <Section
      id="shape"
      title="Prompt length and content"
      note={`Median ${formatNumber(summary.medianPrompt)} characters, mean ${formatNumber(summary.meanPrompt)}. Content categories overlap.`}
    >
      {summary.queries === 0 ? (
        <Empty>No prompts in this slice.</Empty>
      ) : (
        <div className="split">
          <div>
            <p className="chart-label">Prompt length, characters</p>
            <Chart option={lengths} height={280} />
          </div>
          <div>
            <p className="chart-label">Share of queries</p>
            <Chart option={shares} height={280} />
          </div>
        </div>
      )}
    </Section>
  )
}
