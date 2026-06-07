'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormValues } from '@/lib/schema/product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { X } from 'lucide-react'

interface Brand { id: string; name: string; code: string }

interface ProductFormProps {
  productId?: string
  defaultValues?: Partial<ProductFormValues>
  brands: Brand[]
}

export function ProductForm({ productId, defaultValues, brands }: ProductFormProps) {
  const router = useRouter()
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      title: '',
      description: '',
      tags: [],
      status: 'draft',
      ...defaultValues,
    },
  })

  const tags = form.watch('tags')

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim()
      if (!tags.includes(newTag)) {
        form.setValue('tags', [...tags, newTag])
      }
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    form.setValue('tags', tags.filter((t) => t !== tag))
  }

  async function onSubmit(values: ProductFormValues) {
    setSaving(true)
    const url = productId ? `/api/products/${productId}` : '/api/products'
    const method = productId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? '保存に失敗しました')
    } else {
      const data = await res.json()
      toast.success('保存しました')
      if (!productId) {
        router.push(`/products/${data.id}`)
      } else {
        router.refresh()
      }
    }
    setSaving(false)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">商品名 *</Label>
        <Input id="title" {...form.register('title')} />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">商品説明</Label>
        <Textarea id="description" rows={4} {...form.register('description')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ブランド</Label>
          <Select
            value={form.watch('brand_id') ?? ''}
            onValueChange={(v) => form.setValue('brand_id', v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="ブランドを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未選択</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_type">商品タイプ</Label>
          <Input id="product_type" placeholder="Tシャツ、パンツ..." {...form.register('product_type')} />
        </div>

        <div className="space-y-2">
          <Label>性別カテゴリ</Label>
          <Select
            value={form.watch('gender') ?? ''}
            onValueChange={(v) => form.setValue('gender', v as ProductFormValues['gender'] || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="性別を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未選択</SelectItem>
              <SelectItem value="men">メンズ</SelectItem>
              <SelectItem value="women">レディース</SelectItem>
              <SelectItem value="unisex">ユニセックス</SelectItem>
              <SelectItem value="kids">キッズ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="season">シーズン</Label>
          <Input id="season" placeholder="2026SS" {...form.register('season')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">販売価格</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="1"
            {...form.register('price', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="compare_at_price">比較価格</Label>
          <Input
            id="compare_at_price"
            type="number"
            min="0"
            step="1"
            {...form.register('compare_at_price', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>タグ</Label>
        <Input
          placeholder="タグを入力してEnter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>公開状態</Label>
        <Select
          value={form.watch('status')}
          onValueChange={(v) => form.setValue('status', v as 'draft' | 'active')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="active">公開</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  )
}
