'use client'

import { useState } from 'react'
import { VariantMatrix } from './variant-matrix'
import type { Variant } from '@/types/database.types'

interface Props {
  productId: string
  initialVariants: Variant[]
}

export function VariantMatrixWrapper({ productId, initialVariants }: Props) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants)

  async function refresh() {
    const res = await fetch(`/api/products/${productId}`)
    if (res.ok) {
      const data = await res.json()
      setVariants(data.variants ?? [])
    }
  }

  return (
    <VariantMatrix
      productId={productId}
      variants={variants}
      onRefresh={refresh}
    />
  )
}
