'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ShoppingCart, X, Trash2, Sparkles } from 'lucide-react';
import MessageBubble from './Messagebubble';

interface Product {
  id?: string;
  name: string;
  price: number;
  image?: string;
  rating?: number;
  delivery?: string;
  category?: string;
  url?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  toolCalls?: { tool: string; args: Record<string, unknown> }[];
}

const SUGGESTIONS = [
  '🎂 Birthday gift under Rs. 3000',
  '🍫 Chocolates delivery Colombo',
  '💐 Flowers for anniversary',
  '🎁 Corporate gifts bulk order',
];

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'ආයුබෝවන්! 👋 මම Kapi — ඔයාගේ Kapruka shopping assistant. ඔයාට gifts, groceries, flowers, හෝ ඕනෑම දෙයක් order කරන්න help කරන්නම්! කොහොමද ඔයාට help කරන්නේ? 🛍️',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const parseProducts = (content: string): Product[] => {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        if (Array.isArray(data)) return data;
        if (data.products) return data.products;
      }
    } catch {}
    return [];
  };

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const products = parseProducts(data.reply);
      const cleanContent = data.reply.replace(/```json\n[\s\S]*?\n```/g, '').trim();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanContent,
        products: products.length > 0 ? products : undefined,
        toolCalls: data.tool_calls || [],
      }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry machan, error එකක් ආවා 😅 Backend running ද check කරන්න! (${errorMessage})`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => [...prev, product]);
    setCartOpen(true);
  };

  const cartTotal = cart.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <div className="relative flex h-screen w-full overflow-hidden" style={{ zIndex: 1 }}>

      {/* Background grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        zIndex: 0
      }} />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 h-full relative z-10">

        {/* Header */}
        <div className="glass-strong px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #F5A623, #00C9A7)' }}>
              K
            </div>
            <div>
              <h1 className="font-semibold text-white flex items-center gap-2">
                Kapi <Sparkles size={14} className="text-yellow-400" />
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Kapruka AI Shopping Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)', color: '#00C9A7' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Live
            </div>

            <button onClick={() => setCartOpen(!cartOpen)}
              className="relative p-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <ShoppingCart size={18} style={{ color: '#F5A623' }} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white font-bold"
                  style={{ background: '#F5A623', fontSize: '10px' }}>
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} onAddToCart={addToCart} />
          ))}

          {/* Loading indicator */}
          {loading && (
            <motion.div className="flex justify-start mb-4"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #F5A623, #00C9A7)' }}>K</div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full typing-dot"
                      style={{ background: '#F5A623', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,166,35,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="glass-strong px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Kapi... (Sinhala, English, Singlish OK!)"
              rows={1}
              className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 input-glow transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                outline: 'none',
                maxHeight: '120px',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="p-3 rounded-2xl font-medium transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #F5A623, #E8940F)', color: '#000' }}>
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Powered by Kapruka MCP × Groq LLaMA
          </p>
        </div>
      </div>

      {/* Cart sidebar */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="glass-strong w-80 h-full flex flex-col"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ShoppingCart size={16} style={{ color: '#F5A623' }} />
                Cart ({cart.length})
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center text-white/30 text-sm mt-8">
                  <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                  Cart empty machan!
                </div>
              ) : (
                cart.map((item, i) => (
                  <div key={i} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs truncate">{item.name}</p>
                      <p className="gradient-text text-xs font-bold">Rs. {item.price?.toLocaleString()}</p>
                    </div>
                    <button onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}
                      className="text-white/30 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/50 text-sm">Total</span>
                  <span className="gradient-text font-bold">Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => sendMessage(`I want to checkout these ${cart.length} items totaling Rs. ${cartTotal}. Please help me with delivery and payment.`)}
                  className="w-full py-3 rounded-2xl font-semibold text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #F5A623, #E8940F)', color: '#000' }}>
                  Checkout Now 🛒
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}