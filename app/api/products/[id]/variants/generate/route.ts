import { createClient } from '@/lib/supabase/server'
import { variantGenerateSchema } from '@/lib/schema/product'
import { buildVariants } from '@/lib/theme/sku'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_user')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!appUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: product } = await supabase
    .from('product')
    .select('*, brand(code)')
    .eq('id', productId)
    .single()
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const { sizes, colors } = variantGenerateSchema.parse(await req.json())

  const brandCode = (product.brand as { code: string } | null)?.code ?? 'UNK'

  const { count: productCount } = await supabase
    .from('product')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', appUser.org_id)
  const seq = productCount ?? 1

  const variantDefs = buildVariants(sizes, colors, brandCode, seq)

  const rows = variantDefs.map((v) => ({
    org_id: appUser.org_id,
    product_id: productId,
    size: v.size,
    color: v.color,
    color_code: v.color_code,
    sku: v.sku,
    price: product.price,
  }))

  const { data, error } = await supabase
    .from('variant')
    .upsert(rows, { onConflict: 'org_id,sku', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
