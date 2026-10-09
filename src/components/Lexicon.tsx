import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { useArchive } from '../filters/context.tsx'
import { lexicon, type TokenCount } from '../lib/tokens.ts'
import { categoryAxis, tooltip, valueAxis } from '../lib/charts.ts'
import { Chart, type ChartClick } from './Chart.tsx'
import { Empty, Section } from './Section.tsx'

function TokenList({ items, onPick }: { items: TokenCount[]; onPick: (text: string) => void }) {
  return (
    <ul className="token-list">
      {items.map((item) => (
        <li key={item.text}>
          <button type="button" onClick={() => onPick(item.text)}>
            <span>{item.text}</span>
            <span className="token-count">{item.count.toLocaleString('en-US')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Lexicon() {
  const { filtered, summary, setPref, theme } = useArchive()
  const words = useMemo(() => lexicon(filtered.map((entry) => entry.query)), [filtered])
  const onPick = (text: string) => setPref('search', text)

  const tokenChart = useMemo<EChartsOption>(() => {
    const top = words.tokens.slice(0, 15)
    return {
      tooltip: tooltip(theme),
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      xAxis: valueAxis(theme),
      yAxis: categoryAxis(theme, top.map((item) => item.text), { inverse: true }),
      series: [
        {
          type: 'bar',
          data: top.map((item) => item.count),
          itemStyle: { color: theme.accent },
        },
      ],
    }
  }, [words.tokens, theme])

  const bigramChart = useMemo(
    () =>
      ({
        tooltip: tooltip(theme),
        grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
        xAxis: valueAxis(theme, { axisLabel: { color: theme.muted, fontSize: 11, hideOverlap: true } }),
        yAxis: categoryAxis(theme, words.bigrams.map((item) => item.text), {
          inverse: true,
          axisLabel: { color: theme.muted, fontSize: 11, width: 120, overflow: 'truncate' },
        }),
        series: [
          {
            type: 'bar' as const,
            data: words.bigrams.map((item) => item.count),
            itemStyle: { color: theme.accentSoft },
          },
        ],
      }) satisfies EChartsOption,
    [words.bigrams, theme],
  )

  const pickName = (params: ChartClick) => {
    if (params.name) onPick(params.name)
  }

  return (
    <Section
      id="lexicon"
      title="Vocabulary"
      note="Most frequent tokens and bigrams in matching prompts, stopwords removed. Click to search."
    >
      {summary.queries === 0 || words.tokens.length === 0 ? (
        <Empty>Not enough repeated tokens.</Empty>
      ) : (
        <>
          <TokenList items={words.tokens} onPick={onPick} />
          <div className="split">
            <div>
              <p className="chart-label">Tokens</p>
              <Chart option={tokenChart} height={420} onClick={pickName} />
            </div>
            <div>
              <p className="chart-label">Bigrams</p>
              <Chart option={bigramChart} height={420} onClick={pickName} />
            </div>
          </div>
        </>
      )}
    </Section>
  )
}
