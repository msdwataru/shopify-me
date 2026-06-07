import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { InventoryMatrix } from '@/components/inventory/inventory-matrix'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InventoryPage({ params }: PageProps) {
  const { id: productId } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('product')
    .select('id, title, variants:variant(id, sku, size, color, color_code)')
    .eq('id', productId)
    .single()

  if (!product) notFound()

  const { data: locations } = await supabase
    .from('location')
    .select('*')
    .order('kind')

  const variants = product.variants as {
    id: string; sku: string; size: string | null
    color: string | null; color_code: string | null
  }[]

  if (!variants || variants.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href={`/products/${productId}`} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{product.title} — 在庫管理</h1>
        </div>
        <p className="text-gray-500">バリエーションが登録されていません。先にバリエーションを生成してください。</p>
      </div>
    )
  }

  const variantIds = variants.map((v) => v.id)
  const { data: inventoryLevels } = await supabase
    .from('inventory_level')
    .select('*')
    .in('variant_id', variantIds)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/products/${productId}`} className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{product.title} — 在庫管理</h1>
      </div>

      <InventoryMatrix
        variants={variants}
        locations={locations ?? []}
        initialInventory={inventoryLevels ?? []}
      />
    </div>
  )
}
