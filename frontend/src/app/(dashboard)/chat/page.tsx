'use client';
import { useState, useRef, useEffect } from 'react';
import { aiServiceApi } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import { MessageSquare, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

const suggestions = [
  "What is today's market sentiment?",
  'Show top breakout stocks',
  'Which stocks have strong RSI?',
  "Explain today's market trend",
  'What are the upper circuit stocks?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your NSE market AI assistant. Ask me about stocks, market trends, technical indicators, or anything about NSE India markets. Note: This is not financial advice.", timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await aiServiceApi.chat(text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the AI service. Please ensure the AI service is running.", timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <PageHeader
          icon={MessageSquare}
          title="AI Chat Assistant"
          description="Ask anything about NSE markets"
          accent="cyan"
        />
      </div>

      <div className="card relative flex flex-1 flex-col overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.map((msg, i) => (
            <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="relative mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-white shadow-glow-cyan">
                  <Bot className="h-4 w-4" strokeWidth={2.4} />
                  <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 opacity-40 blur-md" />
                </div>
              )}
              <div className={clsx(
                'max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'rounded-tr-md bg-gradient-to-br from-cyan-500 via-violet-500 to-fuchsia-500 text-white shadow-glow-cyan'
                  : 'rounded-tl-md border border-white/[0.06] bg-white/40 text-slate-800 backdrop-blur-md dark:bg-white/[0.03] dark:text-slate-200',
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className="mt-1.5 font-mono text-[10px] tabular-nums opacity-60">{msg.timestamp.toLocaleTimeString('en-IN')}</p>
              </div>
              {msg.role === 'user' && (
                <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white/40 text-slate-600 backdrop-blur-md dark:bg-white/[0.05] dark:text-slate-300">
                  <User className="h-4 w-4" strokeWidth={2.4} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-white shadow-glow-cyan">
                <Bot className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/40 px-4 py-3 backdrop-blur-md dark:bg-white/[0.03]">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Analyzing market data...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 px-4 pb-2 md:px-6">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-600 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-600 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:text-cyan-300"
              >
                <Sparkles className="h-3 w-3 text-cyan-400 transition-colors group-hover:text-cyan-500" />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/[0.06] p-4 dark:border-white/[0.06]">
          <div className="flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about stocks, sectors, indicators..."
              className="input flex-1" disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="btn-primary px-4">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">Not financial advice. AI responses are for informational purposes only.</p>
        </div>
      </div>
    </div>
  );
}
