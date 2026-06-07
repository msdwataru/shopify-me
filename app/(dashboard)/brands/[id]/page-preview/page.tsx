import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BrandPageEditor } from '@/components/brand-page/brand-page-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BrandPagePreviewPage({ params }: PageProps) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const { data: brand } = await supabase.from('brand').select('*').eq('id', brandId).single()
  if (!brand) notFound()

  const { data: brandPage } = await supabase
    .from('brand_page')
    .select('*, brand_page_section(*, theme_section_def(*))')
    .eq('brand_id', brandId)
    .single()

  const { data: themeFormats } = await supabase
    .from('theme_format')
    .select('*, theme_section_def(*)')
    .order('name')

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/brands/${brandId}`} className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{brand.name} — ブランドページ</h1>
      </div>

      <BrandPageEditor
        brandId={brandId}
        brandName={brand.name}
        initialPage={brandPage}
        themeFormats={themeFormats ?? []}
        handle={brandPage?.handle ?? null}
      />
    </div>
  )
}
