import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <Skeleton className="h-14 w-full rounded-none" />
      <Skeleton className="h-[70vh] w-full rounded-none" />
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-40 w-full max-w-3xl mx-auto rounded-lg" />
      </div>
    </div>
  )
}
