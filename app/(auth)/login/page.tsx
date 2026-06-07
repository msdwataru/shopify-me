'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const isDev = process.env.NEXT_PUBLIC_APP_ENV !== 'production'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (isDev) {
      // 開発環境: サービスロールで即時ユーザー作成 → ログイン
      const res = await fetch('/api/dev/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? '登録に失敗しました')
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      // 本番環境: メール確認フロー
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        toast.error(error.message)
      } else if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        toast.info('確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">ShopifyMe</CardTitle>
          <CardDescription>
            {isDev
              ? 'メールアドレスとパスワードを入力してください'
              : 'メールアドレスとパスワードでログインしてください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? '処理中...' : 'ログイン'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={handleSignUp}
              >
                新規登録
              </Button>
            </div>
            {isDev && (
              <p className="text-xs text-center text-amber-600">
                開発環境: メール確認なしで即時登録・ログインできます
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
