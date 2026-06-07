import { z } from 'zod'

export const productSchema = z.object({
  title: z.string().min(1, '商品名は必須です'),
  description: z.string().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  product_type: z.string().optional().nullable(),
  gender: z.enum(['men', 'women', 'unisex', 'kids']).optional().nullable(),
  season: z.string().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  compare_at_price: z.number().nonnegative().optional().nullable(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active']).default('draft'),
})

export const variantGenerateSchema = z.object({
  sizes: z.array(z.string()).min(1, 'サイズを1つ以上選択してください'),
  colors: z.array(z.object({
    name: z.string().min(1),
    abbr: z.string().min(1).max(4),
    code: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '有効なカラーコードを入力してください'),
  })).min(1, 'カラーを1つ以上追加してください'),
})

export const variantUpdateSchema = z.object({
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  color_code: z.string().optional().nullable(),
  sku: z.string().optional(),
  barcode: z.string().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
})

export type ProductFormValues = z.infer<typeof productSchema>
export type VariantGenerateValues = z.infer<typeof variantGenerateSchema>
