'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface Candle { date: string; open: number; high: number; low: number; close: number; volume: number; }

interface Props { data: Candle[]; symbol: string; height?: number; showVolume?: boolean; }

export default function CandlestickChart({ data, symbol, height = 400, showVolume = true }: Props) {
  const series = useMemo(() => {
    const candles = data.map(d => ({ x: new Date(d.date).getTime(), y: [d.open, d.high, d.low, d.close] }));
    const volumes = data.map(d => ({
      x: new Date(d.date).getTime(),
      y: d.volume,
      fillColor: d.close >= d.open ? '#34d399' : '#fb7185',
    }));
    return showVolume
      ? [{ name: 'Price', type: 'candlestick', data: candles }, { name: 'Volume', type: 'bar', data: volumes }]
      : [{ name: 'Price', type: 'candlestick', data: candles }];
  }, [data, showVolume]);

  const options: any = useMemo(() => ({
    chart: {
      type: 'candlestick',
      background: 'transparent',
      toolbar: { show: true, tools: { download: true, pan: true, zoom: true, zoomin: true, zoomout: true, reset: true } },
      animations: { enabled: false },
      fontFamily: 'Inter, sans-serif',
    },
    title: { text: symbol, align: 'left', style: { color: '#94a3b8', fontSize: '14px', fontWeight: 700 } },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#64748b', fontFamily: 'JetBrains Mono, monospace' } },
      axisBorder: { color: 'rgba(148, 163, 184, 0.15)' },
      axisTicks: { color: 'rgba(148, 163, 184, 0.15)' },
    },
    yaxis: showVolume ? [
      { labels: { style: { colors: '#64748b', fontFamily: 'JetBrains Mono, monospace' }, formatter: (v: number) => `₹${v.toFixed(0)}` }, title: { text: 'Price', style: { color: '#64748b' } } },
      { opposite: true, labels: { style: { colors: '#64748b', fontFamily: 'JetBrains Mono, monospace' }, formatter: (v: number) => v >= 1e7 ? `${(v/1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v/1e5).toFixed(1)}L` : String(v) }, title: { text: 'Volume', style: { color: '#64748b' } } },
    ] : [{ labels: { style: { colors: '#64748b', fontFamily: 'JetBrains Mono, monospace' }, formatter: (v: number) => `₹${v.toFixed(2)}` } }],
    grid: { borderColor: 'rgba(148, 163, 184, 0.1)', strokeDashArray: 3 },
    plotOptions: {
      candlestick: { colors: { upward: '#34d399', downward: '#fb7185' }, wick: { useFillColor: true } },
      bar: { columnWidth: '80%' },
    },
    tooltip: { theme: 'dark', x: { format: 'dd MMM yyyy' } },
    theme: { mode: 'dark' },
  }), [symbol, showVolume]);

  if (!data.length) return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400">
      No chart data available
    </div>
  );

  return <ReactApexChart options={options} series={series} type="candlestick" height={height} width="100%" />;
}
