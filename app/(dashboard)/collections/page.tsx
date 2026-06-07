import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Tag, Zap } from 'lucide-react'

export default async function CollectionsPage() {
  const supabase = await createClient()

  // コレクション + 所属商品（名前プレビュー用に最大3件）
  const { data: collections } = await supabase
    .from('collection')
    .select(`
      *,
      collection_product(
        position,
        product(id, title, product_type, status)
      )
    `)
    .order('position', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">コレクション</h1>
          <p className="text-sm text-gray-500">{collections?.length ?? 0} 件</p>
        </div>
        <Link href="/collections/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            コレクション作成
          </Button>
        </Link>
      </div>

      {/* ── コレクションカード一覧 ── */}
      {(collections ?? []).length === 0 ? (
        <div className="bg-white rounded-lg border py-16 text-center text-gray-400">
          <p>コレクションが登録されていません</p>
          <Link href="/collections/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            最初のコレクションを作成する
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(collections ?? []).map((col) => {
            type CPRow = {
              position: number
              product: { id: string; title: string; product_type: string | null; status: string } | null
            }
            const cpRows = ((col.collection_product ?? []) as CPRow[])
              .sort((a, b) => a.position - b.position)
            const productCount = cpRows.length
            const previewProducts = cpRows.slice(0, 3).map((r) => r.product).filter(Boolean)
            const hasMore = productCount > 3

            return (
              <div
                key={col.id}
                className="bg-white rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* アイコン */}
                  <div className={`mt-0.5 w-9 h-9 rounded-lg shrink-0 flex items-center justify-center
                                   ${col.type === 'manual' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                    {col.type === 'manual'
                      ? <Tag className="h-4 w-4 text-blue-600" />
                      : <Zap className="h-4 w-4 text-purple-600" />}
                  </div>

                  {/* メイン情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-gray-900">{col.title}</h2>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {col.type === 'manual' ? '手動' : 'スマート'}
                      </Badge>
                      <Badge
                        variant={col.status === 'active' ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5"
                      >
                        {col.status === 'active' ? '公開' : '下書き'}
                      </Badge>
                    </div>

                    {col.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{col.description}</p>
                    )}

                    {/* 所属商品プレビュー */}
                    <div className="mt-3">
                      {col.type === 'manual' ? (
                        productCount === 0 ? (
                          <p className="text-xs text-gray-400 italic">商品が追加されていません</p>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-gray-500 font-medium shrink-0">
                              商品 {productCount}件:
                            </span>
                            {previewProducts.map((p) => p && (
                              <span
                                key={p.id}
                                className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium
                                            ${p.status === 'active'
                                              ? 'bg-gray-100 text-gray-700'
                                              : 'bg-gray-50 text-gray-400 border border-gray-200'}`}
                              >
                                {p.title}
                              </span>
                            ))}
                            {hasMore && (
                              <span className="text-[11px] text-gray-400 px-1.5">
                                +{productCount - 3}件
                              </span>
                            )}
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          スマートルールで自動分類されます
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 操作 */}
                  <Link href={`/collections/${col.id}`} className="shrink-0">
                    <Button variant="outline" size="sm">編集</Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
