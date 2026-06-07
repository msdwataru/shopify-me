import { createClient } from '@/lib/supabase/server'
import { inventoryBulkSchema } from '@/lib/schema/inventory'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_user')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!appUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { items } = inventoryBulkSchema.parse(await req.json())

  // SKU → variant_id の解決
  const skus = items.map((i) => i.sku)
  const { data: variants } = await supabase
    .from('variant')
    .select('id, sku')
    .in('sku', skus)

  const skuToId = Object.fromEntries((variants ?? []).map((v) => [v.sku, v.id]))

  const rows = items
    .filter((i) => skuToId[i.sku])
    .map((i) => ({
      org_id: appUser.org_id,
      variant_id: skuToId[i.sku],
      location_id: i.location_id,
      available: i.available,
    }))

  const { data, error } = await supabase
    .from('inventory_level')
    .upsert(rows, { onConflict: 'variant_id,location_id' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: data?.length ?? 0 })
}
