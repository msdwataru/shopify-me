import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_BUCKETS = ['brand-images', 'product-images'] as const

export async function GET(req: NextRequest) {
  const bucket = req.nextUrl.searchParams.get('bucket') ?? 'brand-images'
  const path = req.nextUrl.searchParams.get('path')

  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
  if (!(ALLOWED_BUCKETS as readonly string[]).includes(bucket)) {
    return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  return NextResponse.json({ url: data?.signedUrl ?? null })
}
