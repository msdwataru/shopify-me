'use client'

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SectionEditor } from './section-editor'
import { SectionRenderer, type BlockValue } from './section-renderer'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, Eye, Link2 } from 'lucide-react'
import type { ThemeSectionDef } from '@/types/database.types'

interface ThemeFormat {
  id: string
  name: string
  theme_section_def: ThemeSectionDef[]
}

interface PageSection {
  id?: string
  theme_section_def_id: string
  position: number
  settings_values: Record<string, unknown>
  blocks_values: unknown[]
  enabled: boolean
  definition?: ThemeSectionDef
}

interface BrandPage {
  id: string
  theme_format_id: string | null
  status: string
  brand_page_section: (PageSection & { theme_section_def: ThemeSectionDef })[]
}

interface Props {
  brandId: string
  brandName: string
  initialPage: BrandPage | null
  themeFormats: ThemeFormat[]
  handle?: string | null
}

export function BrandPageEditor({ brandId, initialPage, themeFormats, handle }: Props) {
  const [selectedFormatId, setSelectedFormatId] = useState(
    initialPage?.theme_format_id ?? themeFormats[0]?.id ?? ''
  )
  const [sections, setSections] = useState<PageSection[]>(
    (initialPage?.brand_page_section ?? [])
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        ...s,
        definition: s.theme_section_def,
      }))
  )
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
    sections.length > 0 ? 0 : null
  )
  const [saving, setSaving] = useState(false)
  const [pageHandle, setPageHandle] = useState(handle ?? '')
  const [isPublic, setIsPublic] = useState(initialPage?.status === 'active')

  const selectedFormat = themeFormats.find((f) => f.id === selectedFormatId)
  const availableSectionDefs = selectedFormat?.theme_section_def ?? []

  function addSection(def: ThemeSectionDef) {
    const newSection: PageSection = {
      theme_section_def_id: def.id,
      position: sections.length,
      settings_values: {},
      blocks_values: [],
      enabled: true,
      definition: def,
    }
    const next = [...sections, newSection]
    setSections(next)
    setActiveSectionIndex(next.length - 1)
  }

  function removeSection(index: number) {
    const next = sections.filter((_, i) => i !== index)
    setSections(next.map((s, i) => ({ ...s, position: i })))
    setActiveSectionIndex(next.length > 0 ? Math.min(index, next.length - 1) : null)
  }

  function updateSectionValues(index: number, values: Record<string, unknown>) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, settings_values: values } : s))
    )
  }

  function updateSectionBlocks(index: number, blocks: BlockValue[]) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, blocks_values: blocks } : s))
    )
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/brands/${brandId}/page`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme_format_id: selectedFormatId || null,
        handle: pageHandle || null,
        status: isPublic ? 'active' : 'draft',
        sections: sections.map((s, i) => ({
          theme_section_def_id: s.theme_section_def_id,
          position: i,
          settings_values: s.settings_values,
          blocks_values: s.blocks_values ?? [],
          enabled: s.enabled,
        })),
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? '保存に失敗しました')
    } else {
      toast.success('ブランドページを保存しました')
    }
    setSaving(false)
  }

  const activeSection = activeSectionIndex != null ? sections[activeSectionIndex] : null
  const activeDef = activeSection?.definition

  return (
    <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0 border rounded-lg overflow-hidden bg-white">
      {/* 左ペイン: セクション管理 */}
      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col max-h-[70vh] lg:max-h-none overflow-y-auto lg:overflow-visible">
        <div className="p-3 border-b space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">テーマフォーマット</label>
            <Select value={selectedFormatId} onValueChange={(v) => setSelectedFormatId(v ?? '')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="フォーマットを選択" />
              </SelectTrigger>
              <SelectContent>
                {themeFormats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">ページURL（handle）</label>
            <Input
              value={pageHandle}
              onChange={(e) => setPageHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="my-brand"
              className="h-8 text-sm font-mono"
            />
            {pageHandle && (
              <p className="text-xs text-gray-400 truncate">/p/{pageHandle}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">公開する</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {availableSectionDefs.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500">セクション追加</label>
              <div className="flex flex-wrap gap-1">
                {availableSectionDefs.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => addSection(def)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="inline h-3 w-3 mr-0.5" />
                    {def.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* セクション一覧 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sections.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              上からセクションを追加してください
            </p>
          )}
          {sections.map((section, index) => {
            const def = section.definition
            return (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                  activeSectionIndex === index
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => setActiveSectionIndex(index)}
              >
                <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{def?.name ?? 'セクション'}</p>
                  <p className="text-xs text-gray-400">{def?.section_type}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {index + 1}
                </Badge>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSection(index) }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>

        {/* 設定・ブロックフォーム */}
        {activeSection && activeDef && (
          <div className="border-t p-3 space-y-3 overflow-y-auto max-h-[60vh]">
            <p className="text-xs font-medium text-gray-700">
              {activeDef.name} — 設定
            </p>
            <SectionEditor
              def={activeDef}
              values={activeSection.settings_values}
              onChange={(values) => updateSectionValues(activeSectionIndex!, values)}
              blocksValues={activeSection.blocks_values as BlockValue[]}
              onBlocksChange={(blocks) => updateSectionBlocks(activeSectionIndex!, blocks)}
            />
          </div>
        )}

        <div className="p-3 border-t space-y-2">
          <Button className="w-full" onClick={save} disabled={saving} size="sm">
            {saving ? '保存中...' : '保存'}
          </Button>
          {pageHandle && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => {
                const url = `${window.location.origin}/p/${pageHandle}`
                navigator.clipboard.writeText(url)
                toast.success('プレビューURLをコピーしました')
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
              プレビューURLをコピー
            </Button>
          )}
        </div>
      </div>

      {/* 右ペイン: プレビュー */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">プレビュー</span>
        </div>

        {sections.length === 0 ? (
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg text-gray-400">
            セクションを追加するとここにプレビューが表示されます
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {sections
              .filter((s) => s.enabled)
              .sort((a, b) => a.position - b.position)
              .map((section, index) => {
                if (!section.definition) return null
                return (
                  <div
                    key={index}
                    className={`transition-all ${activeSectionIndex === index ? 'ring-2 ring-blue-400 ring-offset-2 rounded-lg' : ''}`}
                    onClick={() => setActiveSectionIndex(index)}
                  >
                    <SectionRenderer
                      def={section.definition}
                      values={section.settings_values}
                      blocks={section.blocks_values as BlockValue[]}
                    />
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
