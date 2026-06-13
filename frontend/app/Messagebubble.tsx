'use client';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';

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

interface MessageBubbleProps {
  message: Message;
  onAddToCart?: (product: Product) => void;
}

function ToolCallBadge({ tool }: { tool: string }) {
  const icons: Record<string, string> = {
    kapruka_search: '🔍',
    kapruka_get_categories: '📂',
    kapruka_get_delivery_quote: '🚚',
    kapruka_create_order: '🛒',
    kapruka_track_order: '📦',
  };
  const labels: Record<string, string> = {
    kapruka_search: 'Searching Kapruka...',
    kapruka_get_categories: 'Loading categories...',
    kapruka_get_delivery_quote: 'Getting delivery quote...',
    kapruka_create_order: 'Creating order...',
    kapruka_track_order: 'Tracking order...',
  };
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mb-2"
      style={{ background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.2)', color: '#00C9A7' }}>
      <span>{icons[tool] || '⚙️'}</span>
      <span>{labels[tool] || tool}</span>
    </div>
  );
}

export default function MessageBubble({ message, onAddToCart }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      initial={{ opacity: 0, y: 10, x: isUser ? 10 : -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>

        {/* Avatar for assistant */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #F5A623, #00C9A7)' }}>
              K
            </div>
            <span className="text-white/40 text-xs font-medium">Kapi</span>
          </div>
        )}

        {/* Tool call badges */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} tool={tc.tool} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm text-white'
              : 'rounded-tl-sm text-white/90'
          }`}
          style={isUser ? {
            background: 'linear-gradient(135deg, rgba(245,166,35,0.3), rgba(245,166,35,0.15))',
            border: '1px solid rgba(245,166,35,0.3)',
          } : {
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {message.content}
        </div>

        {/* Product cards carousel */}
        {!isUser && message.products && message.products.length > 0 && (
          <div className="mt-3 w-full">
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {message.products.map((product, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard product={product} onAddToCart={onAddToCart} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}