import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, Store, FolderOpen, AlertTriangle, TrendingDown } from 'lucide-react'

async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: productCount },
    { count: brandCount },
    { count: collectionCount },
    { data: outOfStock },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from('product').select('*', { count: 'exact', head: true }),
    supabase.from('brand').select('*', { count: 'exact', head: true }),
    supabase.from('collection').select('*', { count: 'exact', head: true }),
    supabase.from('inventory_level').select('variant_id').eq('available', 0),
    supabase
      .from('inventory_level')
      .select('variant_id, available, low_stock_threshold')
      .gt('available', 0)
      .filter('available', 'lte', 'low_stock_threshold'),
  ])

  return {
    productCount: productCount ?? 0,
    brandCount: brandCount ?? 0,
    collectionCount: collectionCount ?? 0,
    outOfStockCount: outOfStock?.length ?? 0,
    lowStockCount: lowStock?.length ?? 0,
  }
}

async function getRecentLogs() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

const actionLabels: Record<string, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
  sync: '同期',
}

const entityLabels: Record<string, string> = {
  product: '商品',
  variant: 'バリエーション',
  inventory: '在庫',
  collection: 'コレクション',
  brand: 'ブランド',
  brand_page: 'ブランドページ',
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const logs = await getRecentLogs()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/products">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">商品数</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.productCount}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/brands">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">ブランド数</CardTitle>
              <Store className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.brandCount}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/collections">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">コレクション数</CardTitle>
              <FolderOpen className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.collectionCount}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 在庫アラート */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={stats.outOfStockCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">在庫切れSKU</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.outOfStockCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="text-3xl font-bold">{stats.outOfStockCount}</div>
            {stats.outOfStockCount > 0 && (
              <Badge variant="destructive">要対応</Badge>
            )}
          </CardContent>
        </Card>

        <Card className={stats.lowStockCount > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">在庫少SKU</CardTitle>
            <TrendingDown className={`h-4 w-4 ${stats.lowStockCount > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="text-3xl font-bold">{stats.lowStockCount}</div>
            {stats.lowStockCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">注意</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 直近の操作履歴 */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">直近の操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="shrink-0">
                    {actionLabels[log.action] ?? log.action}
                  </Badge>
                  <span className="text-gray-700">
                    {entityLabels[log.entity] ?? log.entity}
                  </span>
                  <span className="text-gray-400 text-xs ml-auto">
                    {new Date(log.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
