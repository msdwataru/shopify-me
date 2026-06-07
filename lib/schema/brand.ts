import { z } from 'zod'

export const brandSnsSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  x: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
})

export const brandSchema = z.object({
  code: z.string().min(1, 'ブランドコードは必須です').max(10).transform((v) => v.toUpperCase()),
  name: z.string().min(1, 'ブランド名は必須です'),
  concept: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  story: z.string().optional().nullable(),
  sns: brandSnsSchema.default({}),
  external_url: z.string().url().optional().nullable().or(z.literal('')),
  display_order: z.number().int().nonnegative().default(0),
  status: z.enum(['draft', 'active']).default('draft'),
})

export const brandPageSectionSchema = z.object({
  theme_section_def_id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  settings_values: z.record(z.string(), z.unknown()).default({}),
  blocks_values: z.array(z.unknown()).default([]),
  enabled: z.boolean().default(true),
})

export const brandPageSchema = z.object({
  theme_format_id: z.string().uuid().optional().nullable(),
  handle: z.string().optional().nullable(),
  status: z.enum(['draft', 'active']).default('draft'),
  sections: z.array(brandPageSectionSchema).default([]),
})

export type BrandFormValues = z.infer<typeof brandSchema>
export type BrandPageSectionValues = z.infer<typeof brandPageSectionSchema>
export type BrandPageFormValues = z.infer<typeof brandPageSchema>
