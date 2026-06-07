import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params
  const supabase = await createClient()

  const { data: rules } = await supabase
    .from('collection_rule')
    .select('*')
    .eq('collection_id', collectionId)

  if (!rules || rules.length === 0) {
    return NextResponse.json({ products: [], count: 0 })
  }

  let query = supabase
    .from('product')
    .select('id, title, status, brand(name), variants:variant(id, inventory_level(available))', { count: 'exact' })

  for (const rule of rules) {
    if (rule.field === 'brand' && rule.operator === 'equals') {
      const { data: brand } = await supabase
        .from('brand')
        .select('id')
        .eq('name', rule.value ?? '')
        .single()
      if (brand) query = query.eq('brand_id', brand.id)
    } else if (rule.field === 'product_type' && rule.operator === 'equals') {
      query = query.eq('product_type', rule.value ?? '')
    } else if (rule.field === 'season' && rule.operator === 'equals') {
      query = query.eq('season', rule.value ?? '')
    } else if (rule.field === 'tag' && rule.operator === 'contains') {
      query = query.contains('tags', [rule.value ?? ''])
    }
  }

  const { data: products, count, error } = await query.limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hasInStockRule = rules.some((r) => r.field === 'in_stock')
  const filtered = hasInStockRule
    ? (products ?? []).filter((p) => {
        const variants = p.variants as { inventory_level: { available: number }[] }[]
        return variants?.some((v) => v.inventory_level?.some((il) => il.available > 0))
      })
    : products ?? []

  return NextResponse.json({ products: filtered, count: hasInStockRule ? filtered.length : (count ?? 0) })
}
