import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandForm } from '@/components/brands/brand-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BrandEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: brand } = await supabase.from('brand').select('*').eq('id', id).single()
  if (!brand) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/brands" className="text-gray-500 hover:text-gray-700 shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 truncate">{brand.name}</h1>
        </div>
        <Link href={`/brands/${id}/page-preview`}>
          <Button variant="outline">ブランドページ編集</Button>
        </Link>
      </div>

      <BrandForm
        brandId={id}
        defaultValues={{
          code: brand.code,
          name: brand.name,
          concept: brand.concept ?? undefined,
          description: brand.description ?? undefined,
          story: brand.story ?? undefined,
          sns: brand.sns as Record<string, string>,
          external_url: brand.external_url ?? undefined,
          display_order: brand.display_order,
          status: brand.status,
        }}
      />
    </div>
  )
}
