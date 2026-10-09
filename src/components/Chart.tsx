import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECharts } from 'echarts'

export type ChartClick = {
  data?: unknown
  value?: unknown
  name?: string
  treePathInfo?: { name?: string }[]
}

type ChartProps = {
  option: EChartsOption
  height?: number
  width?: number | string
  onClick?: (params: ChartClick) => void
}

export function Chart({ option, height = 320, width = '100%', onClick }: ChartProps) {
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<ECharts | null>(null)
  const click = useRef(onClick)

  useEffect(() => {
    click.current = onClick
  }, [onClick])

  useEffect(() => {
    if (!host.current) return
    const chart = echarts.init(host.current)
    instance.current = chart
    const handle = (params: unknown) => click.current?.(params as ChartClick)
    chart.on('click', handle)
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!chart.isDisposed()) chart.resize()
      })
    })
    observer.observe(host.current)
    return () => {
      observer.disconnect()
      chart.off('click', handle)
      chart.dispose()
      instance.current = null
    }
  }, [])

  useEffect(() => {
    instance.current?.setOption(option, { notMerge: true })
  }, [option])

  useEffect(() => {
    instance.current?.resize()
  }, [width, height])

  return <div ref={host} style={{ height, width }} />
}
