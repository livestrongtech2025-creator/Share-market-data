'use client';
import { useState, useRef, useEffect } from 'react';
import { aiServiceApi } from '@/lib/api';
import { MessageSquare, Send, Bot, User, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

const suggestions = [
  'What is today\'s market sentiment?',
  'Show top breakout stocks',
  'Which stocks have strong RSI?',
  'Explain today\'s market trend',
  'What are the upper circuit stocks?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your NSE market AI assistant. Ask me about stocks, market trends, technical indicators, or anything about NSE India markets. Note: This is not financial advice.', timestamp: new Date() },
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting to the AI service. Please ensure the AI service is running.', timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-0">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Chat Assistant</h1><p className="text-sm text-gray-500">Ask anything about NSE markets</p></div>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={clsx('max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed', msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-tl-sm')}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className={clsx('text-xs mt-1.5 opacity-60')}>{msg.timestamp.toLocaleTimeString('en-IN')}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
              <div className="bg-gray-100 dark:bg-dark-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                <span className="text-sm text-gray-500">Analyzing market data...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => sendMessage(s)} className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-full text-gray-600 dark:text-gray-400 transition-colors">{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-700">
          <div className="flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about stocks, sectors, indicators..."
              className="input flex-1" disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="btn-primary px-4">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Not financial advice. AI responses are for informational purposes only.</p>
        </div>
      </div>
    </div>
  );
}
