'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { brandSchema, type BrandFormValues } from '@/lib/schema/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface BrandFormProps {
  brandId?: string
  defaultValues?: Partial<BrandFormValues>
}

export function BrandForm({ brandId, defaultValues }: BrandFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema) as Resolver<BrandFormValues>,
    defaultValues: {
      code: '',
      name: '',
      sns: {},
      display_order: 0,
      status: 'draft',
      ...defaultValues,
    },
  })

  async function onSubmit(values: BrandFormValues) {
    setSaving(true)
    const url = brandId ? `/api/brands/${brandId}` : '/api/brands'
    const method = brandId ? 'PATCH' : 'POST'

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
      if (!brandId) {
        router.push(`/brands/${data.id}`)
      } else {
        router.refresh()
      }
    }
    setSaving(false)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">ブランド名 *</Label>
          <Input id="name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">ブランドコード *</Label>
          <Input
            id="code"
            placeholder="GNE"
            {...form.register('code')}
            onChange={(e) => form.setValue('code', e.target.value.toUpperCase())}
          />
          {form.formState.errors.code && (
            <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept">コンセプト</Label>
        <Input id="concept" placeholder="ブランドの一言コンセプト" {...form.register('concept')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">ブランド紹介文</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="story">ブランドストーリー</Label>
        <Textarea id="story" rows={5} {...form.register('story')} />
      </div>

      <div className="space-y-3">
        <Label>SNSリンク</Label>
        {(['instagram', 'x', 'facebook', 'tiktok', 'youtube'] as const).map((platform) => (
          <div key={platform} className="flex items-center gap-3">
            <span className="w-24 text-sm text-gray-500 capitalize">{platform}</span>
            <Input
              placeholder={`https://...`}
              {...form.register(`sns.${platform}`)}
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="external_url">外部URL</Label>
        <Input id="external_url" type="url" {...form.register('external_url')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="display_order">表示順</Label>
          <Input
            id="display_order"
            type="number"
            min="0"
            {...form.register('display_order', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>ステータス</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(v) => form.setValue('status', v as 'draft' | 'active')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="active">公開</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
