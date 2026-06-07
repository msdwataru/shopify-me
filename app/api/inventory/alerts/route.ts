import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: outOfStock } = await supabase
    .from('inventory_level')
    .select('*, variant(id, sku, size, color, product_id, product(title, brand(name))), location(name)')
    .eq('available', 0)

  const { data: allInventory } = await supabase
    .from('inventory_level')
    .select('*, variant(id, sku, size, color, product_id, product(title, brand(name))), location(name)')
    .gt('available', 0)

  const lowStock = (allInventory ?? []).filter(
    (il) => il.low_stock_threshold > 0 && il.available <= il.low_stock_threshold
  )

  return NextResponse.json({ outOfStock: outOfStock ?? [], lowStock })
}
