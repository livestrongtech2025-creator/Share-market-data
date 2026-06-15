'use client';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface Props { score: number; sentiment: string; }

const labels: Record<string, string> = {
  very_bearish: 'Extreme Fear', bearish: 'Fear', neutral: 'Neutral', bullish: 'Greed', very_bullish: 'Extreme Greed',
};

export default function FearGreedGauge({ score, sentiment }: Props) {
  const valueColor =
    score > 75 ? '#34d399' :
    score > 60 ? '#22d3ee' :
    score < 25 ? '#fb7185' :
    score < 40 ? '#f43f5e' :
    '#fbbf24';

  const gradientTo =
    score > 75 ? '#10b981' :
    score > 60 ? '#06b6d4' :
    score < 25 ? '#e11d48' :
    score < 40 ? '#be123c' :
    '#d97706';

  const gradientFrom =
    score > 60 ? '#22d3ee' :
    score < 40 ? '#fb7185' :
    '#fbbf24';

  const options: any = {
    chart: { type: 'radialBar', background: 'transparent', sparkline: { enabled: false } },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow: { size: '62%', background: 'transparent' },
        dataLabels: {
          name: { fontSize: '12px', color: '#94a3b8', offsetY: 28, fontFamily: 'Inter, sans-serif', fontWeight: 600 },
          value: {
            fontSize: '34px', fontWeight: 800,
            color: valueColor,
            offsetY: -10,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: () => String(score),
          },
        },
        track: { background: 'rgba(148, 163, 184, 0.12)', strokeWidth: '94%' },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        gradientToColors: [gradientTo],
        stops: [0, 100],
        colorStops: [
          { offset: 0,   color: gradientFrom, opacity: 1 },
          { offset: 100, color: gradientTo,   opacity: 1 },
        ],
      },
    },
    stroke: { lineCap: 'round' },
    labels: [labels[sentiment] || 'Neutral'],
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
      </div>
      <Chart options={options} series={[score]} type="radialBar" height={200} width={200} />
      <p className="-mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Fear / Greed Index
      </p>
    </div>
  );
}
