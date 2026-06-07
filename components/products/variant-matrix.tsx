'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, X, RefreshCw } from 'lucide-react'
import type { Variant } from '@/types/database.types'

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'F']

interface ColorDef {
  name: string
  abbr: string
  code: string
}

interface VariantMatrixProps {
  productId: string
  variants: Variant[]
  onRefresh: () => void
}

export function VariantMatrix({ productId, variants, onRefresh }: VariantMatrixProps) {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [colors, setColors] = useState<ColorDef[]>([{ name: '', abbr: '', code: '#000000' }])
  const [generating, setGenerating] = useState(false)

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  function updateColor(index: number, field: keyof ColorDef, value: string) {
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function addColor() {
    setColors((prev) => [...prev, { name: '', abbr: '', code: '#000000' }])
  }

  function removeColor(index: number) {
    setColors((prev) => prev.filter((_, i) => i !== index))
  }

  async function generateVariants() {
    if (selectedSizes.length === 0) {
      toast.error('サイズを1つ以上選択してください')
      return
    }
    const validColors = colors.filter((c) => c.name && c.abbr)
    if (validColors.length === 0) {
      toast.error('カラーを1つ以上入力してください')
      return
    }

    setGenerating(true)
    const res = await fetch(`/api/products/${productId}/variants/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sizes: selectedSizes, colors: validColors }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'バリエーション生成に失敗しました')
    } else {
      const data = await res.json()
      toast.success(`${data.length} 件のバリエーションを生成しました`)
      onRefresh()
    }
    setGenerating(false)
  }

  // マトリクス表示用データ整理
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[]
  const colorNames = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[]
  const variantMap = new Map(variants.map((v) => [`${v.color}__${v.size}`, v]))

  return (
    <div className="space-y-6">
      {/* バリエーション生成フォーム */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-700">バリエーション生成</h3>

        <div className="space-y-2">
          <Label>サイズ選択</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedSizes.includes(size)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>カラー</Label>
          <div className="space-y-2">
            {colors.map((color, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color.code}
                  onChange={(e) => updateColor(i, 'code', e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer border"
                />
                <Input
                  placeholder="カラー名 (例: Black)"
                  value={color.name}
                  onChange={(e) => updateColor(i, 'name', e.target.value)}
                  className="w-40"
                />
                <Input
                  placeholder="略称 (例: BLK)"
                  value={color.abbr}
                  onChange={(e) => updateColor(i, 'abbr', e.target.value.toUpperCase())}
                  className="w-24"
                  maxLength={4}
                />
                {colors.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeColor(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addColor}>
            <Plus className="h-4 w-4 mr-1" />
            カラーを追加
          </Button>
        </div>

        <Button type="button" onClick={generateVariants} disabled={generating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          バリエーションを生成
        </Button>
      </div>

      {/* 生成済みバリエーション マトリクス */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700">バリエーション一覧</h3>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border px-3 py-2 bg-gray-50 text-left">カラー</th>
                  {sizes.map((size) => (
                    <th key={size} className="border px-3 py-2 bg-gray-50 text-center w-20">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colorNames.map((color) => {
                  const sample = variants.find((v) => v.color === color)
                  return (
                    <tr key={color}>
                      <td className="border px-3 py-2">
                        <div className="flex items-center gap-2">
                          {sample?.color_code && (
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: sample.color_code }}
                            />
                          )}
                          {color}
                        </div>
                      </td>
                      {sizes.map((size) => {
                        const variant = variantMap.get(`${color}__${size}`)
                        return (
                          <td key={size} className="border px-3 py-2 text-center">
                            {variant ? (
                              <Badge variant="outline" className="text-xs font-mono">
                                {variant.sku}
                              </Badge>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
