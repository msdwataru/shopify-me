'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import type { ThemeSettingDef, ThemeBlockDef, ThemeSectionDef } from '@/types/database.types'
import type { BlockValue } from './section-renderer'

interface Props {
  def: ThemeSectionDef
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  blocksValues?: BlockValue[]
  onBlocksChange?: (blocks: BlockValue[]) => void
}

export function SectionEditor({ def, values, onChange, blocksValues = [], onBlocksChange }: Props) {
  const settings = def.settings as ThemeSettingDef[]
  const blockDefs = (def.blocks as ThemeBlockDef[] | null) ?? []

  function update(id: string, value: unknown) {
    onChange({ ...values, [id]: value })
  }

  return (
    <div className="space-y-4">
      {/* ─ Settings ─ */}
      {settings.map((setting) => (
        <SettingField
          key={setting.id}
          setting={setting}
          value={values[setting.id]}
          onChange={(v) => update(setting.id, v)}
        />
      ))}

      {/* ─ Blocks ─ */}
      {blockDefs.length > 0 && onBlocksChange && (
        <BlocksEditor
          blockDefs={blockDefs}
          blocksValues={blocksValues}
          onChange={onBlocksChange}
        />
      )}
    </div>
  )
}

// ── Blocks editor ──────────────────────────────────────────────────────
function BlocksEditor({
  blockDefs,
  blocksValues,
  onChange,
}: {
  blockDefs: ThemeBlockDef[]
  blocksValues: BlockValue[]
  onChange: (blocks: BlockValue[]) => void
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function addBlock(def: ThemeBlockDef) {
    onChange([...blocksValues, { type: def.type, settings: {} }])
    setOpenIndex(blocksValues.length)
  }

  function removeBlock(i: number) {
    const next = blocksValues.filter((_, idx) => idx !== i)
    onChange(next)
    setOpenIndex(null)
  }

  function updateBlock(i: number, settings: Record<string, unknown>) {
    onChange(blocksValues.map((b, idx) => idx === i ? { ...b, settings } : b))
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ブロック</p>

      {/* Block list */}
      {blocksValues.map((block, i) => {
        const def = blockDefs.find((d) => d.type === block.type) ?? blockDefs[0]
        const isOpen = openIndex === i
        const label = def
          ? (block.settings[def.settings[0]?.id] as string | undefined) || def.name
          : block.type

        return (
          <div key={i} className="border rounded text-sm overflow-hidden">
            <div
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              <span className="flex-1 truncate text-gray-700">{label}</span>
              <span className="text-xs text-gray-400 shrink-0">{def?.name ?? block.type}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeBlock(i) }}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {isOpen && def && (
              <div className="px-3 pb-3 pt-1 border-t bg-gray-50 space-y-3">
                {def.settings.map((setting) => (
                  <SettingField
                    key={setting.id}
                    setting={setting}
                    value={block.settings[setting.id]}
                    onChange={(v) => updateBlock(i, { ...block.settings, [setting.id]: v })}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add block buttons */}
      <div className="flex flex-wrap gap-1 pt-1">
        {blockDefs.map((def) => (
          <Button
            key={def.type}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => addBlock(def)}
          >
            <Plus className="h-3 w-3" />
            {def.name}を追加
          </Button>
        ))}
      </div>
    </div>
  )
}

// ── Setting field renderer ─────────────────────────────────────────────
function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: ThemeSettingDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const strVal = value != null ? String(value) : ''

  switch (setting.type) {
    case 'text':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Input value={strVal} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
        </div>
      )

    case 'textarea':
    case 'richtext':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Textarea
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="text-sm"
            placeholder={setting.type === 'richtext' ? 'HTMLタグ使用可 (<p>, <strong> など)' : ''}
          />
        </div>
      )

    case 'image_picker':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Input
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... または Storage パス"
            className="h-8 text-sm"
          />
        </div>
      )

    case 'color':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={strVal || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-8 cursor-pointer border rounded"
            />
            <Input
              value={strVal}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="h-8 text-sm w-28"
            />
          </div>
        </div>
      )

    case 'url':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Input
            type="url"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="h-8 text-sm"
          />
        </div>
      )

    case 'select': {
      const opts = (setting.options ?? []) as Array<{ value: string; label: string }>
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Select value={strVal} onValueChange={(v) => onChange(v ?? '')}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opts.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    case 'checkbox':
      return (
        <div className="flex items-center gap-3">
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          <Label className="text-xs text-gray-600">{setting.label}</Label>
        </div>
      )

    case 'range':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">
            {setting.label}: {strVal || (setting.min ?? 0)}
          </Label>
          <input
            type="range"
            min={setting.min ?? 0}
            max={setting.max ?? 100}
            step={setting.step ?? 1}
            value={Number(value ?? (setting.min ?? 0))}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )

    case 'product':
    case 'collection':
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label} (ID)</Label>
          <Input
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder="UUID"
            className="h-8 text-sm font-mono"
          />
        </div>
      )

    default:
      return (
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">{setting.label}</Label>
          <Input value={strVal} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
        </div>
      )
  }
}
