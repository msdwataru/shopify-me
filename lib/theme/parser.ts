import type { ThemeSettingDef, ThemeBlockDef } from '@/types/database.types'

export interface SectionSchema {
  section_type: string
  name: string
  settings: ThemeSettingDef[]
  blocks: ThemeBlockDef[]
  presets: unknown[]
}

export function parseSectionSchema(raw: unknown): SectionSchema | null {
  if (typeof raw !== 'object' || raw === null) return null
  const obj = raw as Record<string, unknown>
  return {
    section_type: String(obj.section_type ?? ''),
    name: String(obj.name ?? ''),
    settings: Array.isArray(obj.settings) ? (obj.settings as ThemeSettingDef[]) : [],
    blocks: Array.isArray(obj.blocks) ? (obj.blocks as ThemeBlockDef[]) : [],
    presets: Array.isArray(obj.presets) ? obj.presets : [],
  }
}

export function getSettingDefaultValue(setting: ThemeSettingDef): unknown {
  if (setting.default !== undefined) return setting.default
  switch (setting.type) {
    case 'checkbox': return false
    case 'range': return setting.min ?? 0
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'url':
    case 'color':
    case 'image_picker':
    case 'select':
    case 'product':
    case 'collection':
      return ''
    default:
      return null
  }
}
