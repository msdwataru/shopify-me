import { createClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/schema/product'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const brandId = searchParams.get('brand_id')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20

  let query = supabase
    .from('product')
    .select('*, brand(id, name, code)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (brandId) query = query.eq('brand_id', brandId)
  if (status) query = query.eq('status', status as 'draft' | 'active')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, limit })
}

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

  const body = productSchema.parse(await req.json())
  const { data, error } = await supabase
    .from('product')
    .insert({ ...body, org_id: appUser.org_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('activity_log').insert({
    org_id: appUser.org_id,
    actor: user.id,
    action: 'create',
    entity: 'product',
    entity_id: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}
