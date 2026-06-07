export interface ColorDef {
  name: string
  abbr: string
  code: string
}

export interface VariantDef {
  size: string
  color: string
  color_code: string
  sku: string
}

export function buildVariants(
  sizes: string[],
  colors: ColorDef[],
  brandCode: string,
  productSeq: number,
): VariantDef[] {
  const seq = String(productSeq).padStart(5, '0')
  const variants: VariantDef[] = []

  for (const c of colors) {
    for (const s of sizes) {
      const sku = `${brandCode}-${seq}-${c.abbr}-${s}`.toUpperCase()
      variants.push({
        size: s,
        color: c.name,
        color_code: c.code,
        sku,
      })
    }
  }

  return variants
}
