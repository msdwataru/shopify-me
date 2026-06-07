'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'

interface Brand { id: string; name: string }

export function ProductSearch({ brands }: { brands: Brand[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <Input
        placeholder="商品名で検索..."
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => updateParam('q', e.target.value)}
        className="w-64"
      />
      <Select
        defaultValue={searchParams.get('brand_id') ?? 'all'}
        onValueChange={(v) => updateParam('brand_id', v ?? '')}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="ブランドで絞り込み" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのブランド</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get('status') ?? 'all'}
        onValueChange={(v) => updateParam('status', v ?? '')}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="active">公開</SelectItem>
          <SelectItem value="draft">下書き</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(pathname)}
      >
        クリア
      </Button>
    </div>
  )
}
