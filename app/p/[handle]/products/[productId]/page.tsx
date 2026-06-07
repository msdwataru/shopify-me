import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/types/database.types'
import { ProductDetail, type PDPVariant, type PDPImage, type RelatedProduct } from '@/components/products/product-detail'

interface PageProps {
  params: Promise<{ handle: string; productId: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { handle, productId } = await params

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Brand via brand_page handle
  const { data: brandPage } = await supabase
    .from('brand_page')
    .select('*, brand(id, name, code)')
    .eq('handle', handle)
    .eq('status', 'active')
    .single()

  if (!brandPage) notFound()

  const brand = brandPage.brand as { id: string; name: string; code: string } | null
  if (!brand) notFound()

  // Product with variants and images
  const { data: rawProduct } = await supabase
    .from('product')
    .select(`
      id, title, description, product_type, season, price, compare_at_price, tags, status,
      variants:variant(id, size, color, color_code, sku, price),
      images:product_image(id, storage_path, position, alt)
    `)
    .eq('id', productId)
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .single()

  if (!rawProduct) notFound()

  type RawImage = { id: string; storage_path: string; position: number; alt: string | null }
  const sortedImages = ((rawProduct.images as RawImage[] | null) ?? [])
    .sort((a, b) => a.position - b.position)

  // Generate signed URLs for all product images in parallel
  const images: PDPImage[] = await Promise.all(
    sortedImages.map(async (img) => {
      const { data } = await supabase.storage
        .from('product-images')
        .createSignedUrl(img.storage_path, 3600)
      return { ...img, signedUrl: data?.signedUrl ?? undefined }
    })
  )

  const variants = (rawProduct.variants as PDPVariant[] | null) ?? []

  // Inventory: sum available across all locations per variant
  const variantIds = variants.map((v) => v.id)
  const inventoryMap: Record<string, number> = {}

  if (variantIds.length > 0) {
    const { data: levels } = await supabase
      .from('inventory_level')
      .select('variant_id, available')
      .in('variant_id', variantIds)

    for (const row of levels ?? []) {
      inventoryMap[row.variant_id] = (inventoryMap[row.variant_id] ?? 0) + row.available
    }
  }

  // Related products (same brand, up to 4, exclude current)
  const { data: relatedRaw } = await supabase
    .from('product')
    .select(`
      id, title, price, tags,
      images:product_image(id, storage_path, position, alt)
    `)
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .neq('id', productId)
    .limit(4)

  const relatedProducts: RelatedProduct[] = await Promise.all(
    (relatedRaw ?? []).map(async (p) => {
      const imgs = ((p.images as RawImage[] | null) ?? []).sort((a, b) => a.position - b.position)
      let mainImageUrl: string | null = null
      if (imgs[0]) {
        const { data } = await supabase.storage
          .from('product-images')
          .createSignedUrl(imgs[0].storage_path, 3600)
        mainImageUrl = data?.signedUrl ?? null
      }
      return {
        id: p.id,
        title: p.title,
        price: p.price ?? null,
        tags: (p.tags as string[]) ?? [],
        mainImageUrl,
      }
    })
  )

  return (
    <div className="min-h-screen bg-white">
      {/* ── Sticky header ── */}
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
            <Link href={`/p/${handle}/products`} className="text-white/50 hover:text-white transition-colors">
              Products
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <ol className="flex items-center gap-2 text-xs text-gray-400 tracking-wider flex-wrap">
          <li>
            <Link href={`/p/${handle}`} className="hover:text-gray-700 uppercase transition-colors">
              {brand.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/p/${handle}/products`} className="hover:text-gray-700 uppercase transition-colors">
              Products
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-gray-700 uppercase truncate max-w-xs">{rawProduct.title}</li>
        </ol>
      </nav>

      {/* ── Product + Related (client) ── */}
      <ProductDetail
        product={{
          id: rawProduct.id,
          title: rawProduct.title,
          description: rawProduct.description ?? null,
          product_type: rawProduct.product_type ?? null,
          season: rawProduct.season ?? null,
          price: rawProduct.price ?? null,
          compare_at_price: rawProduct.compare_at_price ?? null,
          tags: (rawProduct.tags as string[]) ?? [],
          variants,
          images,
        }}
        inventory={inventoryMap}
        relatedProducts={relatedProducts}
        handle={handle}
      />

      <footer className="border-t px-6 py-8 text-center text-xs text-gray-400 tracking-[0.3em] uppercase">
        {brand.name} &mdash; Shopify Practice App
      </footer>
    </div>
  )
}
