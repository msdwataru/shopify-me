import { CollectionForm } from '@/components/collections/collection-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewCollectionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/collections" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">コレクション作成</h1>
      </div>
      <CollectionForm />
    </div>
  )
}
