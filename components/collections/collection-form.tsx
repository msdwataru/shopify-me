'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { collectionSchema, collectionRuleSchema, type CollectionFormValues, type CollectionRuleValues } from '@/lib/schema/collection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface CollectionFormProps {
  collectionId?: string
  defaultValues?: Partial<CollectionFormValues>
  initialRules?: CollectionRuleValues[]
}

const FIELD_LABELS: Record<string, string> = {
  brand: 'ブランド',
  tag: 'タグ',
  product_type: '商品タイプ',
  season: 'シーズン',
  in_stock: '在庫あり',
}
const OPERATOR_LABELS: Record<string, string> = {
  equals: 'が一致する',
  contains: 'を含む',
  is_true: 'である',
}

export function CollectionForm({ collectionId, defaultValues, initialRules = [] }: CollectionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<CollectionRuleValues[]>(initialRules)
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema) as Resolver<CollectionFormValues>,
    defaultValues: {
      title: '',
      type: 'manual',
      status: 'active',
      position: 0,
      ...defaultValues,
    },
  })

  const collectionType = form.watch('type')

  function addRule() {
    setRules((prev) => [...prev, { field: 'product_type', operator: 'equals', value: '' }])
  }

  function updateRule(index: number, field: keyof CollectionRuleValues, value: string) {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        if (field === 'field') {
          const newField = value as CollectionRuleValues['field']
          return {
            field: newField,
            operator: newField === 'in_stock' ? 'is_true' : 'equals',
            value: newField === 'in_stock' ? null : '',
          }
        }
        return { ...r, [field]: value }
      })
    )
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  async function previewRules() {
    if (!collectionId) return
    const res = await fetch(`/api/collections/${collectionId}/preview`)
    if (res.ok) {
      const data = await res.json()
      setPreviewCount(data.count)
    }
  }

  async function onSubmit(values: CollectionFormValues) {
    setSaving(true)
    const url = collectionId ? `/api/collections/${collectionId}` : '/api/collections'
    const method = collectionId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? '保存に失敗しました')
      setSaving(false)
      return
    }

    const data = await res.json()
    const id = collectionId ?? data.id

    if (values.type === 'smart' && rules.length > 0) {
      const validRules = rules.filter((r) => {
        try { collectionRuleSchema.parse(r); return true } catch { return false }
      })
      await fetch(`/api/collections/${id}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: validRules }),
      })
    }

    toast.success('保存しました')
    if (!collectionId) {
      router.push(`/collections/${id}`)
    } else {
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="title">タイトル *</Label>
        <Input id="title" {...form.register('title')} />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>種別</Label>
          <Select
            value={form.watch('type')}
            onValueChange={(v) => form.setValue('type', v as 'manual' | 'smart')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">手動コレクション</SelectItem>
              <SelectItem value="smart">スマートコレクション</SelectItem>
            </SelectContent>
          </Select>
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
              <SelectItem value="active">公開</SelectItem>
              <SelectItem value="draft">下書き</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* スマートルール */}
      {collectionType === 'smart' && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label>自動分類ルール</Label>
            {collectionId && (
              <div className="flex items-center gap-2">
                {previewCount != null && (
                  <Badge variant="outline">{previewCount} 件がマッチ</Badge>
                )}
                <Button type="button" variant="outline" size="sm" onClick={previewRules}>
                  プレビュー
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={rule.field}
                  onValueChange={(v) => updateRule(i, 'field', v ?? '')}
                >
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {rule.field !== 'in_stock' && (
                  <>
                    <Select
                      value={rule.operator}
                      onValueChange={(v) => updateRule(i, 'operator', v ?? '')}
                    >
                      <SelectTrigger className="w-28 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['equals', 'contains'].map((op) => (
                          <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={rule.value ?? ''}
                      onChange={(e) => updateRule(i, 'value', e.target.value)}
                      placeholder="値を入力"
                      className="h-8 text-sm flex-1"
                    />
                  </>
                )}
                {rule.field === 'in_stock' && (
                  <span className="text-sm text-gray-500">在庫が1件以上あること</span>
                )}

                <Button type="button" variant="ghost" size="sm" onClick={() => removeRule(i)}>
                  <Trash2 className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="h-4 w-4 mr-1" />
            ルールを追加
          </Button>
        </div>
      )}

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
