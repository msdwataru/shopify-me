import { z } from 'zod'

export const inventoryUpdateSchema = z.object({
  available: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
})

export const inventoryBulkSchema = z.object({
  items: z.array(z.object({
    sku: z.string(),
    location_id: z.string().uuid(),
    available: z.number().int().nonnegative(),
  })),
})

export const inventoryAdjustSchema = z.object({
  variant_id: z.string().uuid(),
  location_id: z.string().uuid(),
  delta: z.number().int(),
  reason: z.enum(['inbound', 'outbound', 'adjust']),
})

export type InventoryUpdateValues = z.infer<typeof inventoryUpdateSchema>
export type InventoryBulkValues = z.infer<typeof inventoryBulkSchema>
export type InventoryAdjustValues = z.infer<typeof inventoryAdjustSchema>
