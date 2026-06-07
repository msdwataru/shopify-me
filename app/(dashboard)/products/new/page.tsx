import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/products/product-form'
import Link from 'next/link'
import { ChevronLeft, ImageIcon } from 'lucide-react'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase.from('brand').select('id, name, code').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/products" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">商品登録</h1>
      </div>
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 max-w-2xl">
        <ImageIcon className="h-4 w-4 mt-0.5 shrink-0" />
        <span>画像は保存後に「画像」タブからアップロードできます。</span>
      </div>
      <ProductForm brands={brands ?? []} />
    </div>
  )
}
