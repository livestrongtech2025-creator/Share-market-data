'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface Candle { date: string; open: number; high: number; low: number; close: number; volume: number; }

interface Props { data: Candle[]; symbol: string; height?: number; showVolume?: boolean; }

export default function CandlestickChart({ data, symbol, height = 400, showVolume = true }: Props) {
  const series = useMemo(() => {
    const candles = data.map(d => ({ x: new Date(d.date).getTime(), y: [d.open, d.high, d.low, d.close] }));
    const volumes = data.map(d => ({ x: new Date(d.date).getTime(), y: d.volume, fillColor: d.close >= d.open ? '#10b981' : '#ef4444' }));
    return showVolume ? [{ name: 'Price', type: 'candlestick', data: candles }, { name: 'Volume', type: 'bar', data: volumes }] : [{ name: 'Price', type: 'candlestick', data: candles }];
  }, [data, showVolume]);

  const options: any = useMemo(() => ({
    chart: { type: 'candlestick', background: 'transparent', toolbar: { show: true, tools: { download: true, pan: true, zoom: true, zoomin: true, zoomout: true, reset: true } }, animations: { enabled: false } },
    title: { text: symbol, align: 'left', style: { color: '#94a3b8', fontSize: '14px', fontWeight: 600 } },
    xaxis: { type: 'datetime', labels: { style: { colors: '#64748b' } }, axisBorder: { color: '#334155' }, axisTicks: { color: '#334155' } },
    yaxis: showVolume ? [
      { labels: { style: { colors: '#64748b' }, formatter: (v: number) => `₹${v.toFixed(0)}` }, title: { text: 'Price', style: { color: '#64748b' } } },
      { opposite: true, labels: { style: { colors: '#64748b' }, formatter: (v: number) => v >= 1e7 ? `${(v/1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v/1e5).toFixed(1)}L` : String(v) }, title: { text: 'Volume', style: { color: '#64748b' } } },
    ] : [{ labels: { style: { colors: '#64748b' }, formatter: (v: number) => `₹${v.toFixed(2)}` } }],
    grid: { borderColor: '#1e293b', strokeDashArray: 3 },
    plotOptions: { candlestick: { colors: { upward: '#10b981', downward: '#ef4444' }, wick: { useFillColor: true } }, bar: { columnWidth: '80%' } },
    tooltip: { theme: 'dark', x: { format: 'dd MMM yyyy' }, custom: showVolume ? undefined : ({ seriesIndex, dataPointIndex, w }: any) => {
      const o = w.globals.seriesCandleO[0]?.[dataPointIndex];
      const h = w.globals.seriesCandleH[0]?.[dataPointIndex];
      const l = w.globals.seriesCandleL[0]?.[dataPointIndex];
      const c = w.globals.seriesCandleC[0]?.[dataPointIndex];
      if (!o) return '';
      const color = c >= o ? '#10b981' : '#ef4444';
      return `<div class="p-2 text-xs"><b style="color:${color}">O:</b> ₹${o?.toFixed(2)} <b style="color:${color}">H:</b> ₹${h?.toFixed(2)} <b style="color:${color}">L:</b> ₹${l?.toFixed(2)} <b style="color:${color}">C:</b> ₹${c?.toFixed(2)}</div>`;
    }},
    theme: { mode: 'dark' },
  }), [symbol, showVolume]);

  if (!data.length) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No chart data available</div>;

  return <ReactApexChart options={options} series={series} type="candlestick" height={height} width="100%" />;
}
