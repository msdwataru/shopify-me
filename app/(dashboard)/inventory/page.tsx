import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ location_id?: string; low_stock?: string }>
}

type InventoryRow = {
  id: string
  available: number
  low_stock_threshold: number
  variant: {
    id: string
    sku: string
    size: string | null
    color: string | null
    product_id: string
    product: { title: string } | null
  } | null
  location: { id: string; name: string } | null
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('location')
    .select('id, name, kind')
    .order('kind')

  let query = supabase
    .from('inventory_level')
    .select('id, available, low_stock_threshold, variant(id, sku, size, color, product_id, product(title)), location(id, name)')
    .order('available', { ascending: true })

  if (sp.location_id) query = query.eq('location_id', sp.location_id)

  const { data } = await query.limit(200)
  let rows = (data ?? []) as unknown as InventoryRow[]

  if (sp.low_stock === '1') {
    rows = rows.filter((r) => r.available <= r.low_stock_threshold)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">在庫管理</h1>
        <p className="text-sm text-gray-500">{rows.length} 件</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/inventory"
          className={`text-sm px-3 py-1.5 rounded-md border ${
            !sp.location_id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          すべてのロケーション
        </Link>
        {(locations ?? []).map((loc) => (
          <Link
            key={loc.id}
            href={`/inventory?location_id=${loc.id}${sp.low_stock === '1' ? '&low_stock=1' : ''}`}
            className={`text-sm px-3 py-1.5 rounded-md border ${
              sp.location_id === loc.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {loc.name}
          </Link>
        ))}
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Link
          href={`/inventory?${sp.location_id ? `location_id=${sp.location_id}&` : ''}low_stock=${sp.low_stock === '1' ? '0' : '1'}`}
          className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border ${
            sp.low_stock === '1' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          在庫少のみ表示
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">商品</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">バリエーション</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ロケーション</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">在庫数</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">状態</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  在庫データがありません
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const variant = row.variant
                const isOut = row.available === 0
                const isLow = !isOut && row.available <= row.low_stock_threshold && row.low_stock_threshold > 0
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{variant?.product?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{variant?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {[variant?.color, variant?.size].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.location?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{row.available}</td>
                    <td className="px-4 py-3">
                      {isOut ? (
                        <Badge variant="destructive">在庫切れ</Badge>
                      ) : isLow ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">在庫少</Badge>
                      ) : (
                        <Badge variant="secondary">在庫あり</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {variant && (
                        <Link
                          href={`/products/${variant.product_id}/inventory`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          編集
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
