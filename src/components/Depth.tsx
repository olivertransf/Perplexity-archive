import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { formatNumber, formatPercent } from '../lib/stats.ts'
import { categoryAxis, chartGrid, tooltip, valueAxis } from '../lib/charts.ts'
import { Chart } from './Chart.tsx'
import { Empty, Section } from './Section.tsx'

export function Depth() {
  const { summary, theme } = useArchive()

  const lengths = useMemo<EChartsOption>(
    () => ({
      tooltip: tooltip(theme),
      grid: chartGrid(),
      xAxis: categoryAxis(theme, summary.threadBuckets.map((bucket) => bucket.label)),
      yAxis: valueAxis(theme),
      series: [
        {
          type: 'bar',
          data: summary.threadBuckets.map((bucket) => bucket.count),
          itemStyle: { color: theme.accent },
        },
      ],
    }),
    [summary.threadBuckets, theme],
  )

  const sittings = useMemo<EChartsOption>(
    () => ({
      tooltip: tooltip(theme),
      grid: chartGrid(),
      xAxis: categoryAxis(theme, summary.sittingBuckets.map((bucket) => bucket.label)),
      yAxis: valueAxis(theme),
      series: [
        {
          type: 'bar',
          data: summary.sittingBuckets.map((bucket) => bucket.count),
          itemStyle: { color: theme.accentSoft },
        },
      ],
    }),
    [summary.sittingBuckets, theme],
  )

  const follow = useMemo<EChartsOption>(
    () => ({
      tooltip: tooltip(theme),
      series: [
        {
          type: 'pie',
          radius: ['48%', '74%'],
          label: { color: theme.text, fontSize: 12 },
          itemStyle: { borderColor: theme.bg, borderWidth: 2 },
          data: [
            { name: 'One turn', value: summary.followUpSplit.single, itemStyle: { color: theme.muted } },
            { name: 'Follow-up', value: summary.followUpSplit.multi, itemStyle: { color: theme.accent } },
          ],
        },
      ],
    }),
    [summary.followUpSplit, theme],
  )

  const scatter = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...tooltip(theme),
        formatter: (params) => {
          const raw = params as { value?: number[] }
          const value = raw.value
          if (!value) return ''
          return `Prompt ${formatNumber(value[0] ?? 0)} characters<br/>Answer ${formatNumber(value[1] ?? 0)} characters`
        },
      },
      grid: { left: 12, right: 16, top: 16, bottom: 28, containLabel: true },
      xAxis: {
        type: 'log',
        min: 1,
        name: 'Prompt characters',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: theme.muted, fontSize: 11 },
        axisLabel: { color: theme.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.line } },
      },
      yAxis: {
        type: 'log',
        min: 1,
        name: 'Answer characters',
        nameTextStyle: { color: theme.muted, fontSize: 11 },
        axisLabel: { color: theme.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.line } },
      },
      series: [
        {
          type: 'scatter',
          data: summary.scatter,
          symbolSize: 5,
          large: true,
          largeThreshold: 2000,
          itemStyle: { color: theme.accent, opacity: 0.35 },
        },
      ],
    }),
    [summary.scatter, theme],
  )

  const gap =
    summary.medianGapMinutes === null
      ? ''
      : `Median gap between queries is ${summary.medianGapMinutes < 1 ? `${Math.round(summary.medianGapMinutes * 60)} seconds` : `${summary.medianGapMinutes.toFixed(1)} minutes`}.`
  const followRate = `${formatPercent(summary.followUpRate)} of threads have more than one turn.`

  return (
    <Section
      id="depth"
      title="Thread depth"
      note={`${followRate} ${gap} Sittings split at 30 minutes idle.`}
    >
      {summary.queries === 0 ? (
        <Empty>No threads match the current filters.</Empty>
      ) : (
        <>
          <div className="trio">
            <div>
              <p className="chart-label">Turns per thread</p>
              <Chart option={lengths} height={240} />
            </div>
            <div>
              <p className="chart-label">Queries per sitting</p>
              <Chart option={sittings} height={240} />
            </div>
            <div>
              <p className="chart-label">Follow-ups</p>
              <Chart option={follow} height={240} />
            </div>
          </div>
          <div className="stack-chart">
            <p className="chart-label">
              Prompt length vs answer length, log scale
              {summary.scatterSampled ? ' (3,500 sampled)' : ''}
            </p>
            <Chart option={scatter} height={360} />
          </div>
        </>
      )}
    </Section>
  )
}
