'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Truck } from 'lucide-react';

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

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <motion.div
      className="glass-card p-3 w-48 shrink-0 cursor-pointer"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Product Image */}
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-white/5">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="w-full h-full object-cover"
            onError={(e) => {
              if (e.target instanceof HTMLImageElement) {
                e.target.src = 'https://via.placeholder.com/150x150?text=🛍️';
              }
            }}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
        )}
        {product.category && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(245,166,35,0.2)', border: '1px solid rgba(245,166,35,0.4)', color: '#F5A623' }}>
            {product.category}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-1.5">
        <p className="text-white/90 text-sm font-medium leading-tight line-clamp-2">{product.name}</p>

        {product.rating && (
          <div className="flex items-center gap-1">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="text-white/50 text-xs">{product.rating}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="gradient-text font-bold text-sm">
            Rs. {product.price?.toLocaleString()}
          </span>
        </div>

        {product.delivery && (
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Truck size={10} />
            <span>{product.delivery}</span>
          </div>
        )}

        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => onAddToCart?.(product)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', color: '#F5A623' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,166,35,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,166,35,0.15)')}
          >
            <ShoppingCart size={11} />
            Add
          </button>
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(0,201,167,0.15)', border: '1px solid rgba(0,201,167,0.3)', color: '#00C9A7' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,201,167,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,201,167,0.15)')}
            >
              View
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}