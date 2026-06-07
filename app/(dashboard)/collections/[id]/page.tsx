import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CollectionForm } from '@/components/collections/collection-form'
import { CollectionProducts } from '@/components/collections/collection-products'
import type { CollectionRuleValues } from '@/lib/schema/collection'
import type {
  CollectionProduct,
  AvailableProduct,
} from '@/components/collections/collection-products'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CollectionEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Collection + rules
  const { data: collection } = await supabase
    .from('collection')
    .select('*, collection_rule(*)')
    .eq('id', id)
    .single()

  if (!collection) notFound()

  // ── Products in this collection ──
  const { data: cpRows } = await supabase
    .from('collection_product')
    .select('position, product(id, title, status, product_type, brand(name))')
    .eq('collection_id', id)
    .order('position', { ascending: true })

  const collectionProducts: CollectionProduct[] = (cpRows ?? []).flatMap((row) => {
    const p = row.product as {
      id: string; title: string; status: string
      product_type: string | null
      brand: { name: string } | null
    } | null
    if (!p) return []
    return [{
      id: p.id,
      title: p.title,
      brand: p.brand?.name ?? null,
      product_type: p.product_type,
      status: p.status as 'active' | 'draft',
      position: row.position,
    }]
  })

  // ── All products (for add picker) ──
  const { data: allRaw } = await supabase
    .from('product')
    .select('id, title, status, product_type, brand(name)')
    .order('title', { ascending: true })

  const allProducts: AvailableProduct[] = (allRaw ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    brand: (p.brand as { name: string } | null)?.name ?? null,
    product_type: p.product_type ?? null,
    status: p.status as 'active' | 'draft',
  }))

  const productCount = collection.type === 'manual'
    ? collectionProducts.length
    : null

  return (
    <div className="space-y-6">
      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-2">
        <Link href="/collections" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{collection.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {collection.type === 'manual' ? '手動コレクション' : 'スマートコレクション'}
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">設定</TabsTrigger>
          <TabsTrigger value="products">
            商品
            {productCount !== null && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full
                               bg-blue-100 text-blue-700 text-[10px] font-bold">
                {productCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── 設定タブ ── */}
        <TabsContent value="settings" className="pt-4">
          <CollectionForm
            collectionId={id}
            defaultValues={{
              title: collection.title,
              description: collection.description ?? undefined,
              type: collection.type,
              position: collection.position,
              status: collection.status,
            }}
            initialRules={(collection.collection_rule ?? []) as CollectionRuleValues[]}
          />
        </TabsContent>

        {/* ── 商品タブ ── */}
        <TabsContent value="products" className="pt-4">
          {collection.type === 'manual' ? (
            <CollectionProducts
              type="manual"
              collectionId={id}
              collectionProducts={collectionProducts}
              allProducts={allProducts}
            />
          ) : (
            <CollectionProducts type="smart" collectionId={id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
