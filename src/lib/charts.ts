import type { EChartsOption } from 'echarts'
import type { Theme } from '../types.ts'

export function chartText(theme: Theme) {
  return { color: theme.muted, fontSize: 11 }
}

export function tooltip(theme: Theme) {
  return {
    backgroundColor: theme.raise,
    borderColor: theme.line,
    textStyle: { color: theme.text, fontSize: 12 },
    confine: true,
  }
}

export function categoryAxis(theme: Theme, data: string[], extra: Record<string, unknown> = {}) {
  return {
    type: 'category' as const,
    data,
    axisLabel: chartText(theme),
    axisLine: { lineStyle: { color: theme.line } },
    axisTick: { show: false },
    ...extra,
  }
}

export function valueAxis(theme: Theme, extra: Record<string, unknown> = {}) {
  return {
    type: 'value' as const,
    axisLabel: chartText(theme),
    splitLine: { lineStyle: { color: theme.line } },
    axisLine: { show: false },
    ...extra,
  }
}

export function chartGrid(): EChartsOption['grid'] {
  return { left: 8, right: 12, top: 24, bottom: 8, containLabel: true }
}
