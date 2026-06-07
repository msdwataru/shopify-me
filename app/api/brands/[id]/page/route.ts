import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brand_page')
    .select('*, theme_format(*), brand_page_section(*, theme_section_def(*))')
    .eq('brand_id', brandId)
    .single()

  if (error) return NextResponse.json(null)
  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_user')
    .select('org_id')
    .eq('id', user.id)
    .single()
  if (!appUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { theme_format_id, handle, status, sections } = await req.json()

  // brand_page upsert
  const { data: page, error: pageError } = await supabase
    .from('brand_page')
    .upsert(
      {
        org_id: appUser.org_id,
        brand_id: brandId,
        theme_format_id,
        handle,
        status: status ?? 'draft',
      },
      { onConflict: 'brand_id' }
    )
    .select()
    .single()

  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })

  // セクション全置換
  await supabase.from('brand_page_section').delete().eq('brand_page_id', page.id)

  if (sections && sections.length > 0) {
    const rows = sections.map((s: {
      theme_section_def_id: string
      position: number
      settings_values: Record<string, unknown>
      blocks_values: unknown[]
      enabled: boolean
    }) => ({
      org_id: appUser.org_id,
      brand_page_id: page.id,
      theme_section_def_id: s.theme_section_def_id,
      position: s.position,
      settings_values: s.settings_values ?? {},
      blocks_values: s.blocks_values ?? [],
      enabled: s.enabled ?? true,
    }))
    const { error: secError } = await supabase.from('brand_page_section').insert(rows)
    if (secError) return NextResponse.json({ error: secError.message }, { status: 500 })
  }

  await supabase.from('activity_log').insert({
    org_id: appUser.org_id,
    actor: user.id,
    action: 'update',
    entity: 'brand_page',
    entity_id: page.id,
  })

  return NextResponse.json(page)
}
