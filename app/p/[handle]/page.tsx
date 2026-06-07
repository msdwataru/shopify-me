import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/types/database.types'
import { SectionRenderer, type BlockValue } from '@/components/brand-page/section-renderer'
import type { ThemeSectionDef } from '@/types/database.types'

interface PageProps {
  params: Promise<{ handle: string }>
}

// 公開プレビュー: サーバーコンポーネントでサービスロールを使いRLSを迂回
// status='active' のみ表示し、データはクライアントに漏れない
export default async function PublicBrandPage({ params }: PageProps) {
  const { handle } = await params

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: page } = await supabase
    .from('brand_page')
    .select(`
      *,
      brand(*),
      brand_page_section(
        *,
        theme_section_def(*)
      )
    `)
    .eq('handle', handle)
    .eq('status', 'active')
    .single()

  if (!page) notFound()

  const brand = page.brand as { name: string; concept: string | null; code: string } | null
  const rawSections = ((page.brand_page_section ?? []) as Array<{
    id: string
    position: number
    settings_values: Record<string, unknown>
    blocks_values: BlockValue[] | null
    enabled: boolean
    theme_section_def: ThemeSectionDef
  }>)
    .filter((s) => s.enabled)
    .sort((a, b) => a.position - b.position)

  // Resolve Supabase Storage paths → signed URLs server-side (avoids client-side API calls)
  const sections = await Promise.all(
    rawSections.map(async (sec) => {
      const values = { ...sec.settings_values }
      if (typeof values.image === 'string' && values.image && !values.image.startsWith('http')) {
        const { data } = await supabase.storage
          .from('brand-images')
          .createSignedUrl(values.image, 3600)
        if (data?.signedUrl) values.image = data.signedUrl
      }
      return { ...sec, settings_values: values }
    })
  )

  return (
    <div className="min-h-screen bg-white">
      {/* ブランドヘッダー */}
      <header className="absolute top-0 left-0 right-0 z-10 px-8 py-5 flex items-center justify-between">
        <h1 className="text-lg font-black tracking-[0.3em] uppercase text-white drop-shadow">
          {brand?.name ?? handle}
        </h1>
        <nav className="flex items-center gap-6">
          <Link
            href={`/p/${handle}/products`}
            className="text-xs text-white/70 hover:text-white tracking-widest uppercase transition-colors drop-shadow"
          >
            Products
          </Link>
          <span className="text-xs text-white/70 border border-white/40 rounded px-2 py-1 backdrop-blur-sm">
            PREVIEW
          </span>
        </nav>
      </header>

      {/* セクション一覧（full-bleed） */}
      <main>
        {sections.length === 0 ? (
          <div className="text-center py-40 text-gray-400">
            <p>セクションがまだ追加されていません</p>
          </div>
        ) : (
          sections.map((section) => (
            <SectionRenderer
              key={section.id}
              def={section.theme_section_def}
              values={section.settings_values}
              blocks={section.blocks_values ?? []}
              variant="page"
            />
          ))
        )}
      </main>

      <footer className="border-t px-8 py-8 text-center text-xs text-gray-400 tracking-widest uppercase">
        {brand?.name} &mdash; Shopify Practice App
      </footer>
    </div>
  )
}
