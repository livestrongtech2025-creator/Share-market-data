'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import { Star, Plus, Trash2, X, Search } from 'lucide-react';
import clsx from 'clsx';
import type { Watchlist } from '@/types';

export default function WatchlistsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedWl, setSelectedWl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: watchlists = [], isLoading } = useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: () => watchlistApi.getWatchlists().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => watchlistApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setNewName(''); setCreating(false);
      toast.success('Watchlist created');
    },
    onError: () => toast.error('Failed to create watchlist'),
  });

  const addSymbolMutation = useMutation({
    mutationFn: ({ id, symbol }: { id: string; symbol: string }) => watchlistApi.addSymbol(id, symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setNewSymbol('');
      toast.success('Symbol added');
    },
    onError: () => toast.error('Failed to add symbol'),
  });

  const removeSymbolMutation = useMutation({
    mutationFn: ({ id, symbol }: { id: string; symbol: string }) => watchlistApi.removeSymbol(id, symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      toast.success('Symbol removed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setSelectedWl(null);
      toast.success('Watchlist deleted');
    },
  });

  const selectedWatchlist = watchlists.find(w => w.id === selectedWl);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        icon={Star}
        title="Watchlists"
        description="Track your favourite NSE stocks"
        accent="amber"
        actions={
          <button onClick={() => setCreating(!creating)} className="btn-primary btn-sm">
            <Plus className="h-4 w-4" /> New Watchlist
          </button>
        }
      />

      {creating && (
        <div className="card flex gap-3 p-4">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Watchlist name (e.g. My Top Picks)"
            className="input flex-1"
            onKeyDown={e => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
          />
          <button onClick={() => createMutation.mutate(newName.trim())} disabled={!newName.trim()} className="btn-primary btn-sm">
            Create
          </button>
          <button onClick={() => setCreating(false)} className="btn-secondary btn-sm">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Watchlist list */}
        <div className="space-y-2">
          <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Your Watchlists
          </h3>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
          ) : watchlists.length === 0 ? (
            <div className="card p-6 text-center">
              <Star className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No watchlists yet</p>
              <p className="mt-1 text-xs text-slate-400">Create one to start tracking stocks</p>
            </div>
          ) : (
            watchlists.map(wl => {
              const isSelected = selectedWl === wl.id;
              return (
                <button
                  key={wl.id}
                  onClick={() => setSelectedWl(wl.id)}
                  className={clsx(
                    'card card-interactive w-full p-4 text-left transition-all',
                    isSelected && 'ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-transparent',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{wl.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{wl.symbols?.length ?? 0} symbols</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(wl.id); }}
                      className="p-1 text-slate-400 transition-colors hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {wl.symbols?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {wl.symbols.slice(0, 5).map(s => (
                        <span key={s} className="badge badge-blue">{s}</span>
                      ))}
                      {wl.symbols.length > 5 && <span className="badge badge-gray">+{wl.symbols.length - 5}</span>}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Watchlist detail */}
        <div className="lg:col-span-2">
          {selectedWatchlist ? (
            <div className="card relative h-full overflow-hidden p-5">
              <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedWatchlist.name}</h3>
                <span className="badge badge-gray">{selectedWatchlist.symbols?.length ?? 0} symbols</span>
              </div>

              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSymbol.trim()) {
                        addSymbolMutation.mutate({ id: selectedWl!, symbol: newSymbol.trim() });
                      }
                    }}
                    placeholder="Add symbol (e.g. RELIANCE)"
                    className="input h-9 pl-8 text-sm"
                  />
                </div>
                <button
                  onClick={() => newSymbol.trim() && addSymbolMutation.mutate({ id: selectedWl!, symbol: newSymbol.trim() })}
                  disabled={!newSymbol.trim()}
                  className="btn-primary btn-sm"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {selectedWatchlist.symbols?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Star className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>No symbols added yet</p>
                  <p className="mt-1 text-xs">Type a symbol above to add it</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {selectedWatchlist.symbols.map(symbol => (
                    <div
                      key={symbol}
                      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/30 px-3 py-2 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 dark:bg-white/[0.03]"
                    >
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{symbol}</span>
                      <button
                        onClick={() => removeSymbolMutation.mutate({ id: selectedWl!, symbol })}
                        className="ml-2 text-slate-400 transition-colors hover:text-rose-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card flex h-full flex-col items-center justify-center p-12 text-center">
              <Star className="mb-4 h-16 w-16 text-slate-200 dark:text-slate-700" />
              <p className="text-slate-500 dark:text-slate-400">Select a watchlist to manage symbols</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
