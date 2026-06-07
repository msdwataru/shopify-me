import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductForm } from '@/components/products/product-form'
import { VariantMatrixWrapper } from '@/components/products/variant-matrix-wrapper'
import { ProductImages } from '@/components/products/product-images'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('product')
    .select('*, brand(id, name, code), variants:variant(*)')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const { data: brands } = await supabase.from('brand').select('id, name, code').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/products" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
        </div>
        <Link href={`/products/${id}/inventory`}>
          <Button variant="outline">在庫管理</Button>
        </Link>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="images">画像</TabsTrigger>
          <TabsTrigger value="variants">バリエーション</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="pt-4">
          <ProductForm
            productId={id}
            brands={brands ?? []}
            defaultValues={{
              title: product.title,
              description: product.description ?? undefined,
              brand_id: product.brand_id,
              product_type: product.product_type ?? undefined,
              gender: product.gender ?? undefined,
              season: product.season ?? undefined,
              price: product.price ?? undefined,
              compare_at_price: product.compare_at_price ?? undefined,
              tags: product.tags,
              status: product.status,
            }}
          />
        </TabsContent>

        <TabsContent value="images" className="pt-4">
          <ProductImages productId={id} />
        </TabsContent>

        <TabsContent value="variants" className="pt-4">
          <VariantMatrixWrapper
            productId={id}
            initialVariants={product.variants ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
