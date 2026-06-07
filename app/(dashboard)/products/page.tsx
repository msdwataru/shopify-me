import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { ProductSearch } from '@/components/products/product-search'

interface PageProps {
  searchParams: Promise<{ q?: string; brand_id?: string; status?: string; page?: string }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brand')
    .select('id, name')
    .order('name')

  let query = supabase
    .from('product')
    .select('*, brand(id, name, code)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (sp.q) query = query.ilike('title', `%${sp.q}%`)
  if (sp.brand_id) query = query.eq('brand_id', sp.brand_id)
  if (sp.status) query = query.eq('status', sp.status as 'draft' | 'active')

  const { data: products, count } = await query.limit(50)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <p className="text-sm text-gray-500">{count ?? 0} 件</p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            商品登録
          </Button>
        </Link>
      </div>

      <ProductSearch brands={brands ?? []} />

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">商品名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ブランド</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">タイプ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">価格</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ステータス</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {(products ?? []).map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{product.title}</td>
                <td className="px-4 py-3 text-gray-500">
                  {(product.brand as { name: string } | null)?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{product.product_type ?? '—'}</td>
                <td className="px-4 py-3">
                  {product.price != null
                    ? `¥${product.price.toLocaleString()}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                    {product.status === 'active' ? '公開' : '下書き'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/products/${product.id}`}>
                    <Button variant="ghost" size="sm">編集</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {(products ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  商品が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
