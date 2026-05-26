'use client';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface Props { score: number; sentiment: string; }

const labels: Record<string, string> = {
  very_bearish: 'Extreme Fear', bearish: 'Fear', neutral: 'Neutral', bullish: 'Greed', very_bullish: 'Extreme Greed',
};

export default function FearGreedGauge({ score, sentiment }: Props) {
  const options: any = {
    chart: { type: 'radialBar', background: 'transparent' },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow: { size: '60%' },
        dataLabels: {
          name: { fontSize: '13px', color: '#94a3b8', offsetY: 25 },
          value: { fontSize: '32px', fontWeight: 700, color: score > 60 ? '#10b981' : score < 40 ? '#ef4444' : '#f59e0b', offsetY: -10, formatter: () => String(score) },
        },
        track: { background: '#1e293b', strokeWidth: '97%' },
      },
    },
    fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#10b981'], stops: [0, 100] } },
    stroke: { lineCap: 'round' },
    labels: [labels[sentiment] || 'Neutral'],
  };

  return (
    <div className="flex flex-col items-center">
      <Chart options={options} series={[score]} type="radialBar" height={200} width={200} />
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4">Fear/Greed Index</p>
    </div>
  );
}
