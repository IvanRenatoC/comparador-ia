import { useState, useEffect } from 'react'

interface ChartColors {
  text: string
  grid: string
}

function readColors(): ChartColors {
  const style = getComputedStyle(document.documentElement)
  return {
    text: style.getPropertyValue('--chart-text').trim() || '#f5f6f7',
    grid: style.getPropertyValue('--chart-grid').trim() || '#1e2d45',
  }
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(readColors)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readColors()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return colors
}
