import { BrandForm } from '@/components/brands/brand-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/brands" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">ブランド登録</h1>
      </div>
      <BrandForm />
    </div>
  )
}
