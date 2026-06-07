'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────
export type PDPVariant = {
  id: string
  size: string | null
  color: string | null
  color_code: string | null
  price: number | null
  sku: string | null
}

export type PDPImage = {
  id: string
  storage_path: string
  position: number
  alt: string | null
  signedUrl?: string
}

export interface ProductDetailProps {
  product: {
    id: string
    title: string
    description: string | null
    product_type: string | null
    season: string | null
    price: number | null
    compare_at_price: number | null
    tags: string[]
    variants: PDPVariant[]
    images: PDPImage[]
  }
  relatedProducts: RelatedProduct[]
  inventory: Record<string, number>
  handle: string
}

export type RelatedProduct = {
  id: string
  title: string
  price: number | null
  tags: string[]
  mainImageUrl: string | null
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'F', 'FREE', 'ONE']

// ── Main component ─────────────────────────────────────────────────────
export function ProductDetail({ product, relatedProducts, inventory, handle }: ProductDetailProps) {
  const { variants, images } = product

  // Unique colors (preserve insertion order)
  const colors = Array.from(
    new Map(
      variants.filter((v) => v.color).map((v) => [v.color!, v.color_code ?? '#ccc'])
    ).entries()
  ).map(([name, code]) => ({ name, code }))

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0]?.name ?? null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [openSection, setOpenSection] = useState<string>('details')

  // Sizes available for selected color, sorted
  const sizesForColor = [
    ...new Set(
      variants.filter((v) => v.color === selectedColor && v.size).map((v) => v.size!)
    ),
  ].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.toUpperCase())
    const bi = SIZE_ORDER.indexOf(b.toUpperCase())
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const selectedVariant =
    variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null

  // Per-variant inventory helper
  const getStock = (variantId: string) => inventory[variantId] ?? 0
  const sizeStock = (size: string) => {
    const v = variants.find((v) => v.color === selectedColor && v.size === size)
    return v ? getStock(v.id) : 0
  }

  const selectedStock = selectedVariant ? getStock(selectedVariant.id) : null
  const stockStatus =
    selectedStock === null ? null
    : selectedStock <= 0 ? 'out'
    : selectedStock <= 5 ? 'low'
    : 'in'

  // Price
  const displayPrice = selectedVariant?.price ?? product.price
  const comparePrice = product.compare_at_price
  const isOnSale = comparePrice != null && displayPrice != null && comparePrice > displayPrice
  const discountPct = isOnSale ? Math.round((1 - displayPrice! / comparePrice!) * 100) : null

  const isNew = product.tags.includes('new')
  const activeImage = images[activeImageIdx]

  function handleAddToCart() {
    if (sizesForColor.length > 0 && !selectedSize) {
      toast.error('サイズを選択してください')
      return
    }
    if (stockStatus === 'out') {
      toast.error('この商品は在庫切れです')
      return
    }
    const label = [selectedColor, selectedSize].filter(Boolean).join(' / ')
    toast.success(`カートに追加しました — ${product.title}${label ? ` (${label})` : ''}`)
  }

  return (
    <div>
      {/* ── Product section ── */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-20">

          {/* ─── Left: Media gallery ─── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="aspect-[4/5] bg-gray-900 overflow-hidden">
              {activeImage?.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage.signedUrl}
                  alt={activeImage.alt ?? product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Placeholder label={product.product_type ?? product.title[0]} />
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIdx(i)}
                    className={`shrink-0 w-16 h-20 overflow-hidden border-2 transition-colors
                                ${i === activeImageIdx
                                  ? 'border-black'
                                  : 'border-transparent hover:border-gray-300'}`}
                  >
                    {img.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Right: Product info ─── */}
          <div className="lg:sticky lg:top-20 space-y-6 self-start">

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {isNew && (
                <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 tracking-[0.2em] uppercase">
                  New
                </span>
              )}
              {product.season && (
                <span className="text-[10px] text-gray-500 border border-gray-200 px-2 py-0.5 tracking-[0.2em] uppercase">
                  {product.season}
                </span>
              )}
              {product.product_type && (
                <span className="text-[10px] text-gray-500 border border-gray-200 px-2 py-0.5 tracking-[0.2em] uppercase">
                  {product.product_type}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-black tracking-wide uppercase leading-tight">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              {isOnSale && (
                <span className="text-gray-400 line-through text-lg tabular-nums">
                  ¥{comparePrice!.toLocaleString('ja-JP')}
                </span>
              )}
              <span className={`text-2xl font-bold tabular-nums ${isOnSale ? 'text-red-600' : 'text-gray-900'}`}>
                {displayPrice != null ? `¥${displayPrice.toLocaleString('ja-JP')}` : '---'}
              </span>
              {discountPct != null && (
                <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5">
                  {discountPct}% OFF
                </span>
              )}
            </div>

            {/* Color selector */}
            {colors.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">
                    Color
                  </span>
                  {selectedColor && (
                    <span className="text-xs text-gray-500 tracking-wide">{selectedColor}</span>
                  )}
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  {colors.map(({ name, code }) => (
                    <button
                      key={name}
                      title={name}
                      onClick={() => { setSelectedColor(name); setSelectedSize(null) }}
                      className={`w-9 h-9 rounded-full border-2 transition-all
                                  ${selectedColor === name
                                    ? 'border-black shadow-md scale-110'
                                    : 'border-gray-200 hover:border-gray-400'}`}
                      style={{ backgroundColor: code }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {sizesForColor.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">
                  Size
                </span>
                <div className="flex flex-wrap gap-2">
                  {sizesForColor.map((size) => {
                    const stock = sizeStock(size)
                    const disabled = stock <= 0
                    const selected = selectedSize === size
                    return (
                      <button
                        key={size}
                        disabled={disabled}
                        onClick={() => !disabled && setSelectedSize(size)}
                        className={`min-w-[3rem] px-4 py-2.5 text-sm font-medium border tracking-wider transition-all
                                    ${selected
                                      ? 'bg-black text-white border-black'
                                      : disabled
                                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                                        : 'bg-white text-gray-900 border-gray-300 hover:border-black'}`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stock status + SKU */}
            <div className="flex items-center justify-between text-xs">
              <div>
                {stockStatus === 'out' && (
                  <span className="text-red-600 font-medium tracking-wide">在庫切れ</span>
                )}
                {stockStatus === 'low' && (
                  <span className="text-amber-600 font-medium tracking-wide">
                    残りわずか（{selectedStock}点）
                  </span>
                )}
                {stockStatus === 'in' && (
                  <span className="text-green-700 font-medium tracking-wide">在庫あり</span>
                )}
              </div>
              {selectedVariant?.sku && (
                <span className="text-gray-400 font-mono tracking-wider">
                  SKU: {selectedVariant.sku}
                </span>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">
                Quantity
              </span>
              <div className="flex items-center border border-gray-300">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg text-gray-600 hover:bg-gray-50"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-medium tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-lg text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full bg-black text-white py-4 text-sm font-black tracking-[0.3em] uppercase
                           hover:bg-gray-900 active:scale-[.99] transition-all"
              >
                Add to Cart
              </button>
              <button
                onClick={() => toast.info('購入フローは Shopify 連携後に有効化されます')}
                className="w-full border border-black text-black py-4 text-sm font-black tracking-[0.3em] uppercase
                           hover:bg-gray-50 active:scale-[.99] transition-all"
              >
                Buy Now
              </button>
            </div>

            {/* Accordion */}
            <div className="border-t pt-2">
              {[
                {
                  id: 'details',
                  label: 'Product Details',
                  body: product.description ? (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">商品説明が設定されていません。</p>
                  ),
                },
                {
                  id: 'material',
                  label: 'Material & Care',
                  body: (
                    <div className="text-sm text-gray-600 space-y-1.5">
                      <p>素材情報は管理画面のメタフィールドから設定できます。</p>
                      <p>洗濯: 手洗い可。乾燥機使用不可。陰干し。</p>
                    </div>
                  ),
                },
                {
                  id: 'shipping',
                  label: 'Shipping & Returns',
                  body: (
                    <div className="text-sm text-gray-600 space-y-1.5">
                      <p>通常2〜5営業日以内に発送いたします。</p>
                      <p>返品は商品到着後7日以内、未使用・タグ付きに限ります。</p>
                    </div>
                  ),
                },
              ].map(({ id, label, body }) => (
                <div key={id} className="border-b">
                  <button
                    onClick={() => setOpenSection((s) => (s === id ? '' : id))}
                    className="w-full flex items-center justify-between py-4 text-left group"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">
                      {label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${openSection === id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openSection === id && <div className="pb-5">{body}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Related products ── */}
      {relatedProducts.length > 0 && (
        <section className="border-t">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-black tracking-[0.2em] uppercase mb-10">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${handle}/products/${p.id}`}
                  className="group"
                >
                  <div className="aspect-[4/5] bg-gray-900 overflow-hidden mb-3">
                    {p.mainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.mainImageUrl}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Placeholder label={p.title[0]} />
                    )}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-900 truncate">
                    {p.title}
                  </p>
                  {p.price != null && (
                    <p className="text-xs text-gray-600 mt-0.5 tabular-nums">
                      ¥{p.price.toLocaleString('ja-JP')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ── Dark placeholder ───────────────────────────────────────────────────
function Placeholder({ label }: { label: string }) {
  return (
    <div className="relative w-full h-full flex flex-col items-end justify-end p-5 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black select-none">
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-[8rem] font-black text-white/[0.04] tracking-widest uppercase leading-none"
      >
        {label[0]}
      </span>
      <span className="relative text-[10px] text-white/25 tracking-[0.3em] uppercase">{label}</span>
    </div>
  )
}
