import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

export default async function BrandsPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('brand')
    .select('*')
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ブランド管理</h1>
        <Link href="/brands/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            ブランド登録
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">ブランド名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">コード</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">コンセプト</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">表示順</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ステータス</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {(brands ?? []).map((brand) => (
              <tr key={brand.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{brand.name}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{brand.code}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{brand.concept ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{brand.display_order}</td>
                <td className="px-4 py-3">
                  <Badge variant={brand.status === 'active' ? 'default' : 'secondary'}>
                    {brand.status === 'active' ? '公開' : '下書き'}
                  </Badge>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link href={`/brands/${brand.id}`}>
                    <Button variant="ghost" size="sm">編集</Button>
                  </Link>
                  <Link href={`/brands/${brand.id}/page-preview`}>
                    <Button variant="outline" size="sm">ページ</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {(brands ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ブランドが登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
