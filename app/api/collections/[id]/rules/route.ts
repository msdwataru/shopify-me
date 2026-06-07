import { createClient } from '@/lib/supabase/server'
import { collectionRulesSchema } from '@/lib/schema/collection'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
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

  const { rules } = collectionRulesSchema.parse(await req.json())

  await supabase.from('collection_rule').delete().eq('collection_id', collectionId)

  if (rules.length > 0) {
    const rows = rules.map((r) => ({
      ...r,
      collection_id: collectionId,
      org_id: appUser.org_id,
    }))
    const { error } = await supabase.from('collection_rule').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
