'use client';
import { useState } from 'react';
import CandlestickChart from '@/components/charts/CandlestickChart';
import PageHeader from '@/components/layout/PageHeader';
import { useHistoricalData, useStockIndicators } from '@/hooks/useMarketData';
import { History, Search } from 'lucide-react';
import clsx from 'clsx';

function IndicatorCard({ label, value, subtext, color }: { label: string; value: any; subtext?: string; color?: string }) {
  return (
    <div className="card card-interactive p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={clsx('mt-1 font-mono text-lg font-bold tabular-nums', color || 'text-slate-900 dark:text-white')}>
        {value ?? '—'}
      </p>
      {subtext && <p className="mt-0.5 text-[10px] text-slate-400">{subtext}</p>}
    </div>
  );
}

export default function HistoricalPage() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [inputSymbol, setInputSymbol] = useState('RELIANCE');
  const [days, setDays] = useState(90);
  const { data: histData, isLoading: histLoading } = useHistoricalData(symbol, days);
  const { data: indicators } = useStockIndicators(symbol, days);

  const handleSearch = () => setSymbol(inputSymbol.toUpperCase().trim());

  const rsi   = indicators?.indicators?.rsi;
  const macd  = indicators?.indicators?.macd?.macd;
  const ema20 = indicators?.indicators?.ema_20;
  const bb    = indicators?.indicators?.bollinger_bands;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={History}
        title="Historical Analytics"
        description="Price history and technical indicators"
        accent="amber"
      />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            value={inputSymbol}
            onChange={e => setInputSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter NSE Symbol (e.g. RELIANCE)"
            className="input h-9 flex-1 text-sm"
          />
          <button onClick={handleSearch} className="btn-primary btn-sm px-4">
            <Search className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1">
          {[30, 60, 90, 180, 365].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx('btn-sm', days === d ? 'btn-primary' : 'btn-secondary')}
            >{d}D</button>
          ))}
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <IndicatorCard label="RSI (14)" value={rsi ? Number(rsi).toFixed(1) : '—'}
          color={rsi > 70 ? 'text-rose-500' : rsi < 30 ? 'text-emerald-500' : undefined}
          subtext={rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Normal'} />
        <IndicatorCard label="MACD" value={macd ? Number(macd).toFixed(3) : '—'}
          color={macd > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'} />
        <IndicatorCard label="EMA 20" value={ema20 ? `₹${Number(ema20).toFixed(2)}` : '—'} />
        <IndicatorCard label="BB Upper" value={bb?.upper ? `₹${Number(bb.upper).toFixed(2)}` : '—'} color="text-emerald-500" />
        <IndicatorCard label="BB Lower" value={bb?.lower ? `₹${Number(bb.lower).toFixed(2)}` : '—'} color="text-rose-500" />
        <IndicatorCard label="ATR" value={indicators?.indicators?.atr ? Number(indicators.indicators.atr).toFixed(2) : '—'} />
      </div>

      {/* Prediction */}
      {indicators?.prediction && (
        <div className="card flex flex-wrap items-center gap-4 p-4">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Prediction (Next Day)</p>
            <span className={clsx('badge text-sm',
              indicators.prediction.direction === 'up'   ? 'badge-green' :
              indicators.prediction.direction === 'down' ? 'badge-red'   : 'badge-gray',
            )}>
              {indicators.prediction.direction === 'up'   ? '▲ UP' :
               indicators.prediction.direction === 'down' ? '▼ DOWN' : '→ SIDEWAYS'}
              {' · '}<span className="font-mono tabular-nums">{(indicators.prediction.probability * 100).toFixed(0)}%</span> confidence
            </span>
          </div>
          <p className="text-xs italic text-amber-600 dark:text-amber-400">
            {indicators.prediction.disclaimer}
          </p>
        </div>
      )}

      {/* Patterns */}
      {indicators?.indicators?.patterns?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {indicators.indicators.patterns.map((p: string) => (
            <span key={p} className="badge badge-blue">{p.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )}

      {/* Candlestick Chart */}
      <div className="card relative overflow-hidden p-4">
        <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        {histLoading
          ? <div className="skeleton h-96 w-full rounded-lg" />
          : <CandlestickChart data={histData?.data ?? []} symbol={symbol} height={420} />
        }
      </div>
    </div>
  );
}
