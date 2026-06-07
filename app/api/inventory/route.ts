import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const productId = searchParams.get('product_id')
  const locationId = searchParams.get('location_id')

  let query = supabase
    .from('inventory_level')
    .select('*, variant(id, sku, size, color, color_code, product_id), location(id, name, kind)')

  if (locationId) query = query.eq('location_id', locationId)
  if (productId) {
    query = query.eq('variant.product_id', productId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
