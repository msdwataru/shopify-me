import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Database } from '@/types/database.types'

interface PageProps {
  params: Promise<{ handle: string }>
}

type Variant = {
  id: string
  size: string | null
  color: string | null
  color_code: string | null
  price: number | null
}

type ProductWithMeta = {
  id: string
  title: string
  product_type: string | null
  season: string | null
  price: number | null
  tags: string[]
  variants: Variant[]
  mainImageUrl: string | null
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'F', 'FREE', 'ONE']

export default async function BrandProductsPage({ params }: PageProps) {
  const { handle } = await params

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ブランドページ → ブランド取得
  const { data: brandPage } = await supabase
    .from('brand_page')
    .select('*, brand(id, name, concept, code)')
    .eq('handle', handle)
    .eq('status', 'active')
    .single()

  if (!brandPage) notFound()

  const brand = brandPage.brand as {
    id: string; name: string; concept: string | null; code: string
  } | null
  if (!brand) notFound()

  // 商品 + バリエーション + 画像 を一括取得
  const { data: rawProducts } = await supabase
    .from('product')
    .select(`
      id, title, product_type, season, price, tags,
      variants:variant(id, size, color, color_code, price),
      images:product_image(id, storage_path, position, alt)
    `)
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // メイン画像の署名URL を並列生成
  const products: ProductWithMeta[] = await Promise.all(
    (rawProducts ?? []).map(async (p) => {
      type RawImage = { id: string; storage_path: string; position: number; alt: string | null }
      const images = ((p.images as RawImage[] | null) ?? [])
        .sort((a, b) => a.position - b.position)

      let mainImageUrl: string | null = null
      const mainPath = images[0]?.storage_path
      if (mainPath) {
        const { data } = await supabase.storage
          .from('product-images')
          .createSignedUrl(mainPath, 3600)
        mainImageUrl = data?.signedUrl ?? null
      }

      return {
        id: p.id,
        title: p.title,
        product_type: p.product_type ?? null,
        season: p.season ?? null,
        price: p.price ?? null,
        tags: (p.tags as string[]) ?? [],
        variants: (p.variants as Variant[] | null) ?? [],
        mainImageUrl,
      }
    })
  )

  return (
    <div className="min-h-screen bg-white">

      {/* ── ナビゲーション ── */}
      <header className="sticky top-0 z-50 bg-black">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href={`/p/${handle}`}
            className="text-sm font-black tracking-[0.3em] uppercase text-white hover:opacity-70 transition-opacity"
          >
            {brand.name}
          </Link>
          <nav className="flex items-center gap-8 text-xs tracking-widest uppercase">
            <Link href={`/p/${handle}`} className="text-white/50 hover:text-white transition-colors">
              Brand
            </Link>
            <span className="text-white border-b border-white pb-0.5">Products</span>
          </nav>
        </div>
      </header>

      {/* ── コレクションヘッダー ── */}
      <section className="bg-gray-950 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs tracking-[0.4em] uppercase text-white/40 mb-3">
            {brand.name} / Collection
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-widest uppercase mb-4">
            2026 S/S
          </h1>
          <p className="text-white/40 text-sm tracking-widest">
            {products.length} ITEMS
          </p>
        </div>
      </section>

      {/* ── 商品グリッド ── */}
      <main className="max-w-7xl mx-auto px-6 py-14">
        {products.length === 0 ? (
          <div className="text-center py-32 text-gray-400">
            <p className="text-lg tracking-widest uppercase">No products available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} handle={handle} />
            ))}
          </div>
        )}
      </main>

      {/* ── フッター ── */}
      <footer className="border-t mt-8 px-6 py-8 text-center text-xs text-gray-400 tracking-[0.3em] uppercase">
        {brand.name} &mdash; Shopify Practice App
      </footer>
    </div>
  )
}

// ── 商品カード ─────────────────────────────────────────────────────────

function ProductCard({ product, handle }: { product: ProductWithMeta; handle: string }) {
  // ユニークカラー（重複除去）
  const colors = Array.from(
    new Map(
      product.variants
        .filter((v) => v.color)
        .map((v) => [v.color!, v.color_code ?? '#ccc'])
    ).entries()
  ).map(([name, code]) => ({ name, code }))

  // ユニークサイズ（サイズ順ソート）
  const sizes = [...new Set(
    product.variants.filter((v) => v.size).map((v) => v.size!)
  )].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.toUpperCase())
    const bi = SIZE_ORDER.indexOf(b.toUpperCase())
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const isNew = product.tags.includes('new')
  const price = product.price
    ? `¥${product.price.toLocaleString('ja-JP')}`
    : null

  return (
    <Link href={`/p/${handle}/products/${product.id}`} className="group block">
    <article>
      {/* ── 画像エリア (4:5) ── */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-900 mb-4">

        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out hover:scale-105"
          />
        ) : (
          /* 画像未登録プレースホルダー */
          <div className="w-full h-full flex flex-col items-end justify-end p-5
                          bg-gradient-to-br from-zinc-800 via-zinc-900 to-black select-none">
            {/* 大きな文字装飾 */}
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center
                         text-[7rem] font-black text-white/5 tracking-widest uppercase leading-none"
            >
              {product.product_type?.[0] ?? product.title[0]}
            </span>
            {product.product_type && (
              <span className="relative text-[10px] text-white/30 tracking-[0.3em] uppercase">
                {product.product_type}
              </span>
            )}
          </div>
        )}

        {/* NEW バッジ */}
        {isNew && (
          <span className="absolute top-3 left-3 bg-white text-black text-[10px] font-black
                           px-2 py-0.5 tracking-[0.2em] uppercase">
            New
          </span>
        )}
      </div>

      {/* ── 商品情報 ── */}
      <div className="space-y-2">
        {/* 商品名 */}
        <h2 className="text-sm font-bold text-gray-900 leading-snug tracking-wide uppercase">
          {product.title}
        </h2>

        {/* 価格 */}
        {price && (
          <p className="text-sm font-medium text-gray-700 tabular-nums">{price}</p>
        )}

        {/* カラーバッジ */}
        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {colors.map(({ name, code }) => (
              <span
                key={name}
                title={name}
                className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0 block"
                style={{ backgroundColor: code }}
              />
            ))}
            {colors.length > 4 && (
              <span className="text-xs text-gray-400">+{colors.length - 4}</span>
            )}
          </div>
        )}

        {/* サイズチップ */}
        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sizes.map((size) => (
              <span
                key={size}
                className="text-[10px] text-gray-500 border border-gray-200 px-1.5 py-0.5
                           leading-none tracking-wider uppercase"
              >
                {size}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
    </Link>
  )
}
