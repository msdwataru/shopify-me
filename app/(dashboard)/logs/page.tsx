import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

const actionLabels: Record<string, string> = {
  create: '作成',
  update: '更新',
  delete: '削除',
  sync: '同期',
}
const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  sync: 'outline',
}
const entityLabels: Record<string, string> = {
  product: '商品',
  variant: 'バリエーション',
  inventory: '在庫',
  collection: 'コレクション',
  brand: 'ブランド',
  brand_page: 'ブランドページ',
}

export default async function LogsPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('activity_log')
    .select('*, actor_user:app_user(display_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">操作履歴</h1>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">日時</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">対象</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">操作者</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(logs ?? []).map((log) => {
              const actor = (log.actor_user as unknown) as { display_name: string | null; email: string } | null
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={actionColors[log.action] ?? 'outline'}>
                      {actionLabels[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{entityLabels[log.entity] ?? log.entity}</span>
                    {log.entity_id && (
                      <span className="text-gray-400 font-mono text-xs ml-2">
                        {log.entity_id.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {actor?.display_name ?? actor?.email ?? '—'}
                  </td>
                </tr>
              )
            })}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  操作履歴がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
