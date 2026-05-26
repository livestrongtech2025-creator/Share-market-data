'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Star, Plus, Trash2, X, Search } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watchlists</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your favourite NSE stocks</p>
          </div>
        </div>
        <button onClick={() => setCreating(!creating)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> New Watchlist
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card p-4 flex gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist list */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Your Watchlists</h3>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
          ) : watchlists.length === 0 ? (
            <div className="card p-6 text-center">
              <Star className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No watchlists yet</p>
              <p className="text-xs text-gray-400 mt-1">Create one to start tracking stocks</p>
            </div>
          ) : (
            watchlists.map(wl => (
              <button
                key={wl.id}
                onClick={() => setSelectedWl(wl.id)}
                className={`w-full text-left card p-4 hover:shadow-md transition-all ${selectedWl === wl.id ? 'ring-2 ring-primary-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{wl.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{wl.symbols?.length ?? 0} symbols</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteMutation.mutate(wl.id); }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {wl.symbols?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wl.symbols.slice(0, 5).map(s => (
                      <span key={s} className="badge badge-blue text-xs">{s}</span>
                    ))}
                    {wl.symbols.length > 5 && <span className="badge badge-gray text-xs">+{wl.symbols.length - 5}</span>}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Watchlist detail */}
        <div className="lg:col-span-2">
          {selectedWatchlist ? (
            <div className="card p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{selectedWatchlist.name}</h3>
                <span className="badge badge-gray">{selectedWatchlist.symbols?.length ?? 0} symbols</span>
              </div>

              {/* Add symbol */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSymbol.trim()) {
                        addSymbolMutation.mutate({ id: selectedWl!, symbol: newSymbol.trim() });
                      }
                    }}
                    placeholder="Add symbol (e.g. RELIANCE)"
                    className="input pl-8 h-9 text-sm"
                  />
                </div>
                <button
                  onClick={() => newSymbol.trim() && addSymbolMutation.mutate({ id: selectedWl!, symbol: newSymbol.trim() })}
                  disabled={!newSymbol.trim()}
                  className="btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Symbols grid */}
              {selectedWatchlist.symbols?.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No symbols added yet</p>
                  <p className="text-xs mt-1">Type a symbol above to add it</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {selectedWatchlist.symbols.map(symbol => (
                    <div key={symbol} className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 rounded-lg px-3 py-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{symbol}</span>
                      <button
                        onClick={() => removeSymbolMutation.mutate({ id: selectedWl!, symbol })}
                        className="text-gray-400 hover:text-red-500 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center h-full flex flex-col items-center justify-center">
              <Star className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Select a watchlist to manage symbols</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
