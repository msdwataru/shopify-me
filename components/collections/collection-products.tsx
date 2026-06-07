'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, X, Search, Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ── Types ──────────────────────────────────────────────────────────────
export type CollectionProduct = {
  id: string
  title: string
  brand: string | null
  product_type: string | null
  status: 'active' | 'draft'
  position: number
}

export type AvailableProduct = {
  id: string
  title: string
  brand: string | null
  product_type: string | null
  status: 'active' | 'draft'
}

export type SmartPreviewProduct = {
  id: string
  title: string
  brand: string | null
  status: string
}

interface ManualProductsProps {
  collectionId: string
  type: 'manual'
  collectionProducts: CollectionProduct[]
  allProducts: AvailableProduct[]
}

interface SmartProductsProps {
  collectionId: string
  type: 'smart'
}

type Props = ManualProductsProps | SmartProductsProps

// ── Main ───────────────────────────────────────────────────────────────
export function CollectionProducts(props: Props) {
  return props.type === 'manual'
    ? <ManualProducts {...props} />
    : <SmartProducts collectionId={props.collectionId} />
}

// ── Manual collection product manager ─────────────────────────────────
function ManualProducts({
  collectionId,
  collectionProducts: initial,
  allProducts,
}: ManualProductsProps) {
  const router = useRouter()
  const [included, setIncluded] = useState<CollectionProduct[]>(initial)
  const [searchAdd, setSearchAdd] = useState('')
  const [searchRemove, setSearchRemove] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const includedIds = new Set(included.map((p) => p.id))

  // Products not yet in the collection
  const available = allProducts.filter(
    (p) =>
      !includedIds.has(p.id) &&
      (searchAdd === '' ||
        p.title.toLowerCase().includes(searchAdd.toLowerCase()) ||
        (p.brand ?? '').toLowerCase().includes(searchAdd.toLowerCase()))
  )

  const filtered = included.filter(
    (p) =>
      searchRemove === '' ||
      p.title.toLowerCase().includes(searchRemove.toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes(searchRemove.toLowerCase())
  )

  const add = useCallback(async (product: AvailableProduct) => {
    setLoadingId(product.id)
    const res = await fetch(`/api/collections/${collectionId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, position: included.length }),
    })
    if (!res.ok) {
      toast.error('追加に失敗しました')
    } else {
      setIncluded((prev) => [
        ...prev,
        {
          id: product.id,
          title: product.title,
          brand: product.brand,
          product_type: product.product_type,
          status: product.status,
          position: prev.length,
        },
      ])
      toast.success(`「${product.title}」を追加しました`)
      router.refresh()
    }
    setLoadingId(null)
  }, [collectionId, included.length, router])

  const remove = useCallback(async (productId: string, title: string) => {
    setLoadingId(productId)
    const res = await fetch(
      `/api/collections/${collectionId}/products?product_id=${productId}`,
      { method: 'DELETE' }
    )
    if (!res.ok) {
      toast.error('削除に失敗しました')
    } else {
      setIncluded((prev) => prev.filter((p) => p.id !== productId))
      toast.success(`「${title}」を削除しました`)
      router.refresh()
    }
    setLoadingId(null)
  }, [collectionId, router])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── 所属商品（左・上） ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {included.length}
            </span>
            所属商品
          </h3>
        </div>

        {/* 所属商品検索 */}
        {included.length > 4 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="所属商品を検索..."
              value={searchRemove}
              onChange={(e) => setSearchRemove(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}

        <div className="border rounded-lg overflow-hidden bg-white divide-y min-h-[120px]">
          {included.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-2">
              <Package className="h-8 w-8 text-gray-300" />
              <p>まだ商品が追加されていません</p>
              <p className="text-xs">右側から商品を追加してください</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">
              該当する商品が見つかりません
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 group hover:bg-gray-50"
              >
                {/* 商品アイコン */}
                <div className="w-8 h-8 shrink-0 rounded bg-gray-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">
                    {p.title[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {p.brand ?? '—'}
                    {p.product_type ? ` · ${p.product_type}` : ''}
                  </p>
                </div>

                <Badge
                  variant={p.status === 'active' ? 'default' : 'secondary'}
                  className="shrink-0 text-[10px]"
                >
                  {p.status === 'active' ? '公開' : '下書き'}
                </Badge>

                <button
                  onClick={() => remove(p.id, p.title)}
                  disabled={loadingId === p.id}
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50
                             disabled:opacity-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="コレクションから削除"
                >
                  {loadingId === p.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 追加できる商品（右・下） ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">商品を追加</h3>
          <span className="text-xs text-gray-400">{available.length} 件</span>
        </div>

        {/* 商品検索 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="商品名・ブランドで検索..."
            value={searchAdd}
            onChange={(e) => setSearchAdd(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="border rounded-lg overflow-hidden bg-white divide-y max-h-[420px] overflow-y-auto">
          {available.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {searchAdd ? '該当する商品が見つかりません' : 'すべての商品が追加済みです'}
            </div>
          ) : (
            available.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50"
              >
                <div className="w-8 h-8 shrink-0 rounded bg-gray-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">
                    {p.title[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {p.brand ?? '—'}
                    {p.product_type ? ` · ${p.product_type}` : ''}
                  </p>
                </div>

                <Badge
                  variant={p.status === 'active' ? 'default' : 'secondary'}
                  className="shrink-0 text-[10px]"
                >
                  {p.status === 'active' ? '公開' : '下書き'}
                </Badge>

                <button
                  onClick={() => add(p)}
                  disabled={loadingId === p.id}
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50
                             disabled:opacity-50 transition-colors"
                  title="コレクションに追加"
                >
                  {loadingId === p.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

// ── Smart collection product preview ──────────────────────────────────
function SmartProducts({ collectionId }: { collectionId: string }) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<SmartPreviewProduct[] | null>(null)

  async function fetchPreview() {
    setLoading(true)
    const res = await fetch(`/api/collections/${collectionId}/preview`)
    if (res.ok) {
      const data = await res.json()
      setProducts(data.products ?? [])
    } else {
      toast.error('プレビューの取得に失敗しました')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-600">
          スマートルールに合致する商品が自動的に表示されます。
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPreview}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />取得中...</>
          ) : (
            '適用結果を確認'
          )}
        </Button>
      </div>

      {products !== null && (
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Header */}
          <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              適用結果
            </span>
            <Badge variant="outline" className="text-[10px]">{products.length} 件</Badge>
          </div>

          {products.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              条件に合致する商品がありません
            </div>
          ) : (
            <div className="divide-y">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 shrink-0 rounded bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-400">
                      {p.title[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    {p.brand && <p className="text-xs text-gray-500">{p.brand}</p>}
                  </div>
                  <Badge
                    variant={p.status === 'active' ? 'default' : 'secondary'}
                    className="shrink-0 text-[10px]"
                  >
                    {p.status === 'active' ? '公開' : '下書き'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
