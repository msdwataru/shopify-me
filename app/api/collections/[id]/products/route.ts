import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_user')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!appUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { product_id, position } = await req.json()
  const { error } = await supabase
    .from('collection_product')
    .upsert(
      { collection_id: collectionId, product_id, org_id: appUser.org_id, position: position ?? 0 },
      { onConflict: 'collection_id,product_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params
  const { searchParams } = req.nextUrl
  const productId = searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('collection_product')
    .delete()
    .eq('collection_id', collectionId)
    .eq('product_id', productId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
