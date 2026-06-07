import { createClient } from '@/lib/supabase/server'
import { brandSchema } from '@/lib/schema/brand'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brand')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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

  const body = brandSchema.parse(await req.json())
  const { data, error } = await supabase
    .from('brand')
    .insert({ ...body, org_id: appUser.org_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('activity_log').insert({
    org_id: appUser.org_id,
    actor: user.id,
    action: 'create',
    entity: 'brand',
    entity_id: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}
