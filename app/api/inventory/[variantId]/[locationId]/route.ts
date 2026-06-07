import { createClient } from '@/lib/supabase/server'
import { inventoryUpdateSchema } from '@/lib/schema/inventory'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string; locationId: string }> }
) {
  const { variantId, locationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_user')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!appUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = inventoryUpdateSchema.parse(await req.json())

  const { data, error } = await supabase
    .from('inventory_level')
    .upsert({
      org_id: appUser.org_id,
      variant_id: variantId,
      location_id: locationId,
      ...body,
    }, { onConflict: 'variant_id,location_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
