import { z } from 'zod'

export const collectionSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional().nullable(),
  type: z.enum(['manual', 'smart']).default('manual'),
  position: z.number().int().nonnegative().default(0),
  status: z.enum(['draft', 'active']).default('active'),
})

export const collectionRuleSchema = z.object({
  field: z.enum(['brand', 'tag', 'product_type', 'season', 'in_stock']),
  operator: z.enum(['equals', 'contains', 'is_true']),
  value: z.string().optional().nullable(),
})

export const collectionRulesSchema = z.object({
  rules: z.array(collectionRuleSchema),
})

export type CollectionFormValues = z.infer<typeof collectionSchema>
export type CollectionRuleValues = z.infer<typeof collectionRuleSchema>
