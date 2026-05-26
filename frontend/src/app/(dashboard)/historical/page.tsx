'use client';
import { useState } from 'react';
import CandlestickChart from '@/components/charts/CandlestickChart';
import { useHistoricalData, useStockIndicators } from '@/hooks/useMarketData';
import { History, Search } from 'lucide-react';
import clsx from 'clsx';

function IndicatorCard({ label, value, subtext, color }: { label: string; value: any; subtext?: string; color?: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={clsx('text-lg font-bold mt-0.5', color || 'text-gray-900 dark:text-white')}>{value ?? '—'}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

export default function HistoricalPage() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [inputSymbol, setInputSymbol] = useState('RELIANCE');
  const [days, setDays] = useState(90);
  const { data: histData, isLoading: histLoading } = useHistoricalData(symbol, days);
  const { data: indicators, isLoading: indLoading } = useStockIndicators(symbol, days);

  const handleSearch = () => setSymbol(inputSymbol.toUpperCase().trim());

  const rsi = indicators?.indicators?.rsi;
  const macd = indicators?.indicators?.macd?.macd;
  const ema20 = indicators?.indicators?.ema_20;
  const bb = indicators?.indicators?.bollinger_bands;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center"><History className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historical Analytics</h1><p className="text-sm text-gray-500">Price history and technical indicators</p></div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-1 min-w-0">
          <input value={inputSymbol} onChange={e => setInputSymbol(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Enter NSE Symbol (e.g. RELIANCE)" className="input h-9 text-sm flex-1" />
          <button onClick={handleSearch} className="btn-primary btn-sm px-4"><Search className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1">
          {[30, 60, 90, 180, 365].map(d => (
            <button key={d} onClick={() => setDays(d)} className={clsx('btn-sm px-3', days === d ? 'btn-primary' : 'btn-secondary')}>{d}D</button>
          ))}
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <IndicatorCard label="RSI (14)" value={rsi ? Number(rsi).toFixed(1) : '—'} color={rsi > 70 ? 'text-red-500' : rsi < 30 ? 'text-green-500' : undefined} subtext={rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Normal'} />
        <IndicatorCard label="MACD" value={macd ? Number(macd).toFixed(3) : '—'} color={macd > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
        <IndicatorCard label="EMA 20" value={ema20 ? `₹${Number(ema20).toFixed(2)}` : '—'} />
        <IndicatorCard label="BB Upper" value={bb?.upper ? `₹${Number(bb.upper).toFixed(2)}` : '—'} color="text-green-500" />
        <IndicatorCard label="BB Lower" value={bb?.lower ? `₹${Number(bb.lower).toFixed(2)}` : '—'} color="text-red-500" />
        <IndicatorCard label="ATR" value={indicators?.indicators?.atr ? Number(indicators.indicators.atr).toFixed(2) : '—'} />
      </div>

      {/* Prediction */}
      {indicators?.prediction && (
        <div className="card p-4 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">AI Prediction (Next Day)</p>
            <span className={clsx('badge text-sm', indicators.prediction.direction === 'up' ? 'badge-green' : indicators.prediction.direction === 'down' ? 'badge-red' : 'badge-gray')}>
              {indicators.prediction.direction === 'up' ? '▲ UP' : indicators.prediction.direction === 'down' ? '▼ DOWN' : '→ SIDEWAYS'} — {(indicators.prediction.probability * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">{indicators.prediction.disclaimer}</p>
        </div>
      )}

      {/* Patterns */}
      {indicators?.indicators?.patterns?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {indicators.indicators.patterns.map((p: string) => <span key={p} className="badge badge-blue text-xs">{p.replace(/_/g, ' ')}</span>)}
        </div>
      )}

      {/* Candlestick Chart */}
      <div className="card p-4">
        {histLoading ? <div className="skeleton h-96 w-full rounded-lg" /> : (
          <CandlestickChart data={histData?.data ?? []} symbol={symbol} height={420} />
        )}
      </div>
    </div>
  );
}
