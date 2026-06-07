'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Variant {
  id: string; sku: string
  size: string | null; color: string | null; color_code: string | null
}
interface Location { id: string; name: string; kind: string }
interface InventoryLevel {
  variant_id: string; location_id: string
  available: number; low_stock_threshold: number
}

interface Props {
  variants: Variant[]
  locations: Location[]
  initialInventory: InventoryLevel[]
}

export function InventoryMatrix({ variants, locations, initialInventory }: Props) {
  const [activeLocationId, setActiveLocationId] = useState(locations[0]?.id ?? '')
  const [inventory, setInventory] = useState<Map<string, InventoryLevel>>(
    new Map(initialInventory.map((il) => [`${il.variant_id}__${il.location_id}`, il]))
  )
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[]
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[]
  const variantMap = new Map(variants.map((v) => [`${v.color}__${v.size}`, v]))

  function getAvailable(variantId: string) {
    return inventory.get(`${variantId}__${activeLocationId}`)?.available ?? 0
  }

  function getThreshold(variantId: string) {
    return inventory.get(`${variantId}__${activeLocationId}`)?.low_stock_threshold ?? 0
  }

  async function handleBlur(variantId: string, value: string) {
    const available = parseInt(value, 10)
    if (isNaN(available) || available < 0) return

    const key = `${variantId}__${activeLocationId}`
    setSaving((prev) => new Set(prev).add(key))

    const res = await fetch(`/api/inventory/${variantId}/${activeLocationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available }),
    })

    if (res.ok) {
      const data = await res.json()
      setInventory((prev) => new Map(prev).set(key, data))
    } else {
      toast.error('在庫更新に失敗しました')
    }

    setSaving((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  function getCellClass(variantId: string) {
    const available = getAvailable(variantId)
    const threshold = getThreshold(variantId)
    if (available === 0) return 'bg-red-50 border-red-200'
    if (threshold > 0 && available <= threshold) return 'bg-yellow-50 border-yellow-200'
    return ''
  }

  if (locations.length === 0) {
    return <p className="text-gray-500">ロケーションが登録されていません。</p>
  }

  return (
    <div className="space-y-4">
      {/* ロケーションタブ */}
      <div className="flex gap-2 border-b">
        {locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => setActiveLocationId(loc.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeLocationId === loc.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* 在庫マトリクス */}
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="border px-3 py-2 bg-gray-50 text-left min-w-[120px]">カラー</th>
              {sizes.map((size) => (
                <th key={size} className="border px-3 py-2 bg-gray-50 text-center w-20">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => {
              const sample = variants.find((v) => v.color === color)
              return (
                <tr key={color}>
                  <td className="border px-3 py-2">
                    <div className="flex items-center gap-2">
                      {sample?.color_code && (
                        <div
                          className="w-4 h-4 rounded-full border shrink-0"
                          style={{ backgroundColor: sample.color_code }}
                        />
                      )}
                      <span className="truncate">{color}</span>
                    </div>
                  </td>
                  {sizes.map((size) => {
                    const variant = variantMap.get(`${color}__${size}`)
                    if (!variant) {
                      return (
                        <td key={size} className="border px-2 py-1 text-center text-gray-300">
                          —
                        </td>
                      )
                    }
                    const key = `${variant.id}__${activeLocationId}`
                    const isSaving = saving.has(key)
                    return (
                      <td key={size} className={cn('border px-2 py-1', getCellClass(variant.id))}>
                        <input
                          type="number"
                          min="0"
                          defaultValue={getAvailable(variant.id)}
                          key={`${variant.id}__${activeLocationId}__${getAvailable(variant.id)}`}
                          onBlur={(e) => handleBlur(variant.id, e.target.value)}
                          disabled={isSaving}
                          className="w-16 text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">セルを編集してフォーカスを外すと自動保存されます。<span className="text-red-400">赤</span>=在庫0 / <span className="text-yellow-500">黄</span>=在庫少</p>
    </div>
  )
}
