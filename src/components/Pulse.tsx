import { formatDay, zoneLabel } from '../lib/dates.ts'
import { formatNumber, formatPercent, percentDelta } from '../lib/stats.ts'
import { engineLabel } from '../theme.ts'
import { useArchive } from '../filters/context.tsx'
import { Empty, Section } from './Section.tsx'
import { Spark } from './Spark.tsx'

export function Pulse() {
  const { summary, previousSummary, prefs, theme } = useArchive()
  const compare = prefs.compare && previousSummary && previousSummary.queries > 0 ? previousSummary : null

  if (summary.queries === 0) {
    return (
      <Section id="pulse" title="Overview">
        <Empty>No queries match the current filters.</Empty>
      </Section>
    )
  }

  const cards = [
    {
      label: 'Queries',
      value: formatNumber(summary.queries),
      series: summary.daily.map((point) => point.queries),
      delta: compare ? percentDelta(summary.queries, compare.queries) : null,
    },
    {
      label: 'Threads',
      value: formatNumber(summary.threads),
      series: summary.daily.map((point) => point.threads),
      delta: compare ? percentDelta(summary.threads, compare.threads) : null,
    },
    {
      label: 'Active days',
      value: formatNumber(summary.activeDays),
      series: summary.daily.map((point) => point.active),
      delta: compare ? percentDelta(summary.activeDays, compare.activeDays) : null,
    },
    {
      label: 'Longest streak',
      value: `${formatNumber(summary.streak)}d`,
      series: summary.daily.map((point) => point.streak),
      delta: compare ? percentDelta(summary.streak, compare.streak) : null,
    },
    {
      label: 'Sittings',
      value: formatNumber(summary.sittings),
      series: summary.daily.map((point) => point.sittings),
      delta: compare ? percentDelta(summary.sittings, compare.sittings) : null,
    },
    {
      label: 'Words asked',
      value: formatNumber(summary.wordsAsked),
      series: summary.daily.map((point) => point.wordsAsked),
      delta: compare ? percentDelta(summary.wordsAsked, compare.wordsAsked) : null,
    },
    {
      label: 'Words answered',
      value: formatNumber(summary.wordsAnswered),
      series: summary.daily.map((point) => point.wordsAnswered),
      delta: compare ? percentDelta(summary.wordsAnswered, compare.wordsAnswered) : null,
    },
    {
      label: 'Median prompt',
      value: `${formatNumber(summary.medianPrompt)} ch`,
      series: summary.daily.map((point) => point.medianPrompt ?? 0),
      delta: compare ? percentDelta(summary.medianPrompt, compare.medianPrompt) : null,
    },
    {
      label: 'Follow-up threads',
      value: formatPercent(summary.followUpRate),
      series: summary.daily.map((point) => (point.queries ? point.followUps / point.queries : 0)),
      delta: compare ? percentDelta(summary.followUpRate, compare.followUpRate) : null,
    },
  ]

  const facts: [string, string][] = [
    ['Busiest day', summary.busiest ? `${formatDay(summary.busiest.day)} (${formatNumber(summary.busiest.count)})` : '–'],
    [
      'Top engine',
      summary.dominantEngine
        ? `${engineLabel(summary.dominantEngine.engine)}, ${formatPercent(summary.dominantEngine.share)}`
        : '–',
    ],
    ['Prompts with ?', formatPercent(summary.questionRate)],
    ['Per active day', summary.perActiveDay.toFixed(1)],
    ['Timezone', zoneLabel(prefs.zone)],
  ]

  return (
    <Section
      id="pulse"
      title="Overview"
      note={prefs.compare && !compare ? 'Previous period has no queries; deltas hidden.' : undefined}
    >
      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat">
            <p className="stat-label">{card.label}</p>
            <p className="stat-value">
              {card.value}
              {card.delta ? <span className={card.delta.startsWith('-') ? 'delta down' : 'delta'}>{card.delta}</span> : null}
            </p>
            <Spark values={card.series} color={theme.muted} />
          </div>
        ))}
      </div>
      <dl className="facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
