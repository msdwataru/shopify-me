import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 開発環境専用: メール確認をスキップしてユーザー作成 → 即ログイン
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // メール確認済みでユーザー作成（既存ユーザーはそのまま）
  const { data: existing } = await admin.auth.admin.listUsers()
  const alreadyExists = existing.users.some((u) => u.email === email)

  if (!alreadyExists) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 通常のサインインでセッション取得
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return NextResponse.json({ error: signInError.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
