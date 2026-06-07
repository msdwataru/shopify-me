'use client'

import { useState, useEffect } from 'react'
import type { ThemeSectionDef, ThemeBlockDef } from '@/types/database.types'

type SectionValues = Record<string, unknown>
export type BlockValue = { type: string; settings: Record<string, unknown> }

function s(v: unknown): string { return v != null ? String(v) : '' }
function has(v: unknown): boolean { return v != null && v !== '' && v !== false }
function isUrl(v: unknown): boolean { return typeof v === 'string' && v.startsWith('http') }

interface Props {
  def: ThemeSectionDef
  values: SectionValues
  blocks?: BlockValue[]
  variant?: 'editor' | 'page'
}

export function SectionRenderer({ def, values, blocks = [], variant = 'editor' }: Props) {
  switch (def.section_type) {
    case 'announcement-bar':
      return <AnnouncementBar values={values} variant={variant} />
    case 'image-banner':
      return <ImageBanner values={values} variant={variant} />
    case 'slideshow':
      return <Slideshow values={values} blocks={blocks} variant={variant} />
    case 'rich-text':
      return <RichText values={values} variant={variant} />
    case 'image-with-text':
      return <ImageWithText values={values} variant={variant} />
    case 'multicolumn':
      return <Multicolumn values={values} blocks={blocks} variant={variant} />
    case 'featured-collection':
      return <FeaturedCollection values={values} />
    case 'featured-product':
      return <FeaturedProduct values={values} variant={variant} />
    case 'newsletter':
      return <Newsletter values={values} variant={variant} />
    case 'collapsible-content':
      return <CollapsibleContent values={values} blocks={blocks} variant={variant} />
    case 'video':
      return <Video values={values} variant={variant} />
    default:
      return <Generic def={def} values={values} />
  }
}

// ── Shared image component ──────────────────────────────────────────────
// - Handles external URLs (http/https) directly
// - Handles Supabase Storage paths by fetching a signed URL via /api/storage/signed-url
function Img({
  src,
  className,
  bucket = 'brand-images',
}: {
  src: string
  className: string
  bucket?: string
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(isUrl(src) ? src : null)

  useEffect(() => {
    if (isUrl(src)) {
      setResolvedSrc(src)
      return
    }
    if (!src) return
    let cancelled = false
    fetch(`/api/storage/signed-url?bucket=${bucket}&path=${encodeURIComponent(src)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.url) setResolvedSrc(d.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src, bucket])

  if (!resolvedSrc) {
    return <div className={`${className} bg-gray-200 animate-pulse`} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedSrc} alt="" className={className} />
}

// ── 1. Announcement bar ─────────────────────────────────────────────────
function AnnouncementBar({ values }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const bg = s(values.background_color) || '#000000'
  const color = s(values.text_color) || '#ffffff'
  const inner = <span className="text-sm tracking-wide">{s(values.text) || 'お知らせバーのテキスト'}</span>
  return (
    <div className="w-full py-2.5 px-4 text-center" style={{ backgroundColor: bg, color }}>
      {has(values.link) ? (
        <a href={s(values.link)} className="underline underline-offset-2">{inner}</a>
      ) : inner}
    </div>
  )
}

// ── 2. Image banner ────────────────────────────────────────────────────
function ImageBanner({ values, variant }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const isPage = variant === 'page'
  return (
    <div className={`relative w-full ${isPage ? 'h-[70vh]' : 'h-48 rounded-lg'} bg-gray-900 overflow-hidden`}>
      {has(values.image) ? (
        <Img src={s(values.image)} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}
      {has(values.overlay) && (
        <div className="absolute inset-0 opacity-60" style={{ backgroundColor: s(values.overlay) }} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        {has(values.heading) && (
          <h2 className={`font-black text-white drop-shadow-lg ${isPage ? 'text-5xl tracking-widest' : 'text-2xl'}`}>
            {s(values.heading)}
          </h2>
        )}
        {has(values.text) && (
          <div className={`text-white drop-shadow ${isPage ? 'text-lg' : 'text-sm'}`}
               dangerouslySetInnerHTML={{ __html: s(values.text) }} />
        )}
        {has(values.button_label) && (
          <span className={`px-6 py-2.5 bg-white text-gray-900 font-medium rounded ${isPage ? 'text-base mt-2' : 'text-sm'}`}>
            {s(values.button_label)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── 3. Slideshow ───────────────────────────────────────────────────────
function Slideshow({ values, blocks, variant }: { values: SectionValues; blocks: BlockValue[]; variant: 'editor' | 'page' }) {
  const [active, setActive] = useState(0)
  const isPage = variant === 'page'

  if (blocks.length === 0) {
    return (
      <div className={`relative w-full ${isPage ? 'h-[80vh]' : 'h-48 rounded-lg'} bg-gray-200 flex items-center justify-center`}>
        <p className="text-gray-400 text-sm">スライドを追加してください</p>
      </div>
    )
  }

  const slide = blocks[active]?.settings ?? {}
  return (
    <div className={`relative w-full ${isPage ? 'h-[80vh]' : 'h-48 rounded-lg'} bg-gray-900 overflow-hidden`}>
      {has(slide.image) ? (
        <Img src={s(slide.image)} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}
      {has(slide.overlay) && (
        <div className="absolute inset-0 opacity-60" style={{ backgroundColor: s(slide.overlay) }} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        {has(slide.heading) && (
          <h2 className={`font-black text-white drop-shadow-lg ${isPage ? 'text-5xl tracking-widest' : 'text-2xl'}`}>
            {s(slide.heading)}
          </h2>
        )}
        {has(slide.text) && (
          <div className={`text-white drop-shadow ${isPage ? 'text-lg' : 'text-sm'}`}
               dangerouslySetInnerHTML={{ __html: s(slide.text) }} />
        )}
        {has(slide.button_label) && (
          <span className={`px-6 py-2.5 bg-white text-gray-900 font-medium rounded ${isPage ? 'text-base mt-2' : 'text-sm'}`}>
            {s(slide.button_label)}
          </span>
        )}
      </div>
      {/* Navigation dots */}
      {blocks.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {blocks.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === active ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
      {/* Prev / Next (page only) */}
      {blocks.length > 1 && isPage && (
        <>
          <button onClick={() => setActive((p) => (p - 1 + blocks.length) % blocks.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full text-white text-xl flex items-center justify-center z-10">
            ‹
          </button>
          <button onClick={() => setActive((p) => (p + 1) % blocks.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full text-white text-xl flex items-center justify-center z-10">
            ›
          </button>
        </>
      )}
      {/* Slide counter (editor) */}
      {!isPage && blocks.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
          {active + 1}/{blocks.length}
        </div>
      )}
    </div>
  )
}

// ── 4. Rich text ───────────────────────────────────────────────────────
function RichText({ values, variant }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const align = s(values.alignment) || 'left'
  const isPage = variant === 'page'
  return (
    <div className={`bg-white text-${align} ${isPage ? 'py-20 px-8' : 'p-6 rounded-lg'}`}>
      {has(values.heading) && (
        <h2 className={`font-bold text-gray-900 mb-4 ${isPage ? 'text-3xl tracking-wide' : 'text-xl'}`}>
          {s(values.heading)}
        </h2>
      )}
      {has(values.text) && (
        <div className={`text-gray-700 prose ${isPage ? 'prose-lg mx-auto' : 'prose-sm'}`}
             dangerouslySetInnerHTML={{ __html: s(values.text) }} />
      )}
    </div>
  )
}

// ── 5. Image with text ─────────────────────────────────────────────────
function ImageWithText({ values, variant }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const imgFirst = values.image_first !== false
  const isPage = variant === 'page'
  return (
    <div className={`flex bg-white ${isPage
      ? `flex-col md:flex-row min-h-[50vh] ${imgFirst ? '' : 'md:flex-row-reverse'}`
      : `gap-6 p-4 rounded-lg ${imgFirst ? '' : 'flex-row-reverse'}`}`}>
      <div className={`${isPage ? 'md:w-1/2 h-64 md:h-auto' : 'w-48 h-36'} shrink-0 overflow-hidden ${isPage ? '' : 'rounded'}`}>
        {has(values.image) ? (
          <Img src={s(values.image)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">画像なし</div>
        )}
      </div>
      <div className={`flex-1 ${isPage ? 'flex flex-col justify-center p-8 md:p-16' : 'space-y-2'}`}>
        {has(values.heading) && (
          <h3 className={`font-bold text-gray-900 ${isPage ? 'text-3xl mb-4 tracking-wide' : ''}`}>
            {s(values.heading)}
          </h3>
        )}
        {has(values.text) && (
          <div className={`text-gray-600 prose ${isPage ? 'prose-lg' : 'prose-sm text-sm'}`}
               dangerouslySetInnerHTML={{ __html: s(values.text) }} />
        )}
      </div>
    </div>
  )
}

// ── 6. Multicolumn ─────────────────────────────────────────────────────
function Multicolumn({ values, blocks, variant }: { values: SectionValues; blocks: BlockValue[]; variant: 'editor' | 'page' }) {
  const cols = Number(s(values.columns_desktop) || '3')
  const align = s(values.alignment) || 'left'
  const isPage = variant === 'page'
  const gridClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
  return (
    <div className={`bg-white ${isPage ? 'py-16 px-8' : 'p-4 rounded-lg'}`}>
      {has(values.heading) && (
        <h2 className={`font-bold text-gray-900 text-center ${isPage ? 'text-3xl mb-10' : 'text-lg mb-4'}`}>
          {s(values.heading)}
        </h2>
      )}
      {blocks.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">カラムを追加してください</p>
      ) : (
        <div className={`grid ${gridClass} gap-6`}>
          {blocks.map((block, i) => {
            const bs = block.settings
            return (
              <div key={i} className={`text-${align} space-y-3`}>
                {has(bs.image) && (
                  <div className={`overflow-hidden rounded ${isPage ? 'h-48' : 'h-24'}`}>
                    <Img src={s(bs.image)} className="w-full h-full object-cover" />
                  </div>
                )}
                {has(bs.title) && (
                  <h3 className={`font-bold text-gray-900 ${isPage ? 'text-xl' : 'text-sm'}`}>{s(bs.title)}</h3>
                )}
                {has(bs.text) && (
                  <div className={`text-gray-600 prose ${isPage ? 'prose-base' : 'prose-sm text-xs'}`}
                       dangerouslySetInnerHTML={{ __html: s(bs.text) }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 7. Featured collection ─────────────────────────────────────────────
function FeaturedCollection({ values }: { values: SectionValues }) {
  const count = Math.min(Number(values.products_to_show ?? 4), 8)
  return (
    <div className="bg-white rounded-lg p-4 space-y-3">
      {has(values.heading) && (
        <h3 className="font-bold text-gray-900">{s(values.heading)}</h3>
      )}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
            商品 {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 8. Featured product ────────────────────────────────────────────────
function FeaturedProduct({ values, variant }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const isPage = variant === 'page'
  return (
    <div className={`bg-white ${isPage ? 'py-16 px-8' : 'p-4 rounded-lg'}`}>
      {has(values.heading) && (
        <h2 className={`font-bold text-gray-900 ${isPage ? 'text-3xl mb-10 text-center' : 'text-lg mb-4'}`}>
          {s(values.heading)}
        </h2>
      )}
      <div className={`flex ${isPage ? 'flex-col md:flex-row gap-12 max-w-5xl mx-auto' : 'gap-4'}`}>
        <div className={`${isPage ? 'md:w-1/2 aspect-square' : 'w-32 h-32'} bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm shrink-0`}>
          {has(values.product) ? '商品画像' : '商品未選択'}
        </div>
        <div className={`flex-1 ${isPage ? 'flex flex-col justify-center space-y-5' : 'space-y-2'}`}>
          <p className={`font-medium text-gray-500 ${isPage ? 'text-lg' : 'text-sm'}`}>商品名</p>
          {values.show_price !== false && (
            <p className={`font-bold text-gray-900 ${isPage ? 'text-3xl' : 'text-base'}`}>¥0,000</p>
          )}
          {values.show_description !== false && (
            <p className={`text-gray-600 ${isPage ? 'text-base leading-relaxed' : 'text-xs'}`}>商品の説明テキスト</p>
          )}
          {has(values.button_label) && (
            <button className={`bg-black text-white rounded font-medium ${isPage ? 'px-8 py-3 text-base w-fit' : 'px-4 py-2 text-sm'}`}>
              {s(values.button_label)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 9. Newsletter / Email signup ───────────────────────────────────────
function Newsletter({ values, variant }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const isPage = variant === 'page'
  return (
    <div className={`bg-gray-50 text-center ${isPage ? 'py-20 px-8' : 'p-6 rounded-lg'}`}>
      {has(values.heading) && (
        <h2 className={`font-bold text-gray-900 mb-4 ${isPage ? 'text-3xl' : 'text-xl'}`}>
          {s(values.heading)}
        </h2>
      )}
      {has(values.description) && (
        <div className={`text-gray-600 mb-6 ${isPage ? 'text-lg max-w-lg mx-auto' : 'text-sm'}`}
             dangerouslySetInnerHTML={{ __html: s(values.description) }} />
      )}
      <div className={`flex gap-2 mx-auto ${isPage ? 'max-w-md' : 'max-w-xs'}`}>
        <input type="email" readOnly placeholder="メールアドレス"
          className={`flex-1 border border-gray-300 rounded px-3 ${isPage ? 'py-3 text-base' : 'py-2 text-sm'} bg-white`} />
        <button className={`bg-black text-white rounded px-4 font-medium whitespace-nowrap ${isPage ? 'py-3 text-base' : 'py-2 text-sm'}`}>
          {s(values.button_label) || '登録'}
        </button>
      </div>
    </div>
  )
}

// ── 10. Collapsible content ────────────────────────────────────────────
function CollapsibleContent({ values, blocks, variant }: { values: SectionValues; blocks: BlockValue[]; variant: 'editor' | 'page' }) {
  const isPage = variant === 'page'
  return (
    <div className={`bg-white ${isPage ? 'py-16 px-8 max-w-3xl mx-auto' : 'p-4 rounded-lg'}`}>
      {has(values.heading) && (
        <h2 className={`font-bold text-gray-900 ${isPage ? 'text-3xl mb-10' : 'text-lg mb-4'}`}>
          {s(values.heading)}
        </h2>
      )}
      {blocks.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-4">項目を追加してください</p>
      ) : (
        <div className="divide-y border-y">
          {blocks.map((block, i) => {
            const bs = block.settings
            return (
              <details key={i} className="group" open={i === 0 && values.open_first === true}>
                <summary className={`flex items-center justify-between cursor-pointer list-none ${isPage ? 'py-5 text-base' : 'py-3 text-sm'} font-medium text-gray-900`}>
                  {s(bs.title) || `項目 ${i + 1}`}
                  <span className="ml-4 shrink-0 text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                {has(bs.content) && (
                  <div className={`pb-4 text-gray-600 prose ${isPage ? 'prose-base' : 'prose-sm text-xs'}`}
                       dangerouslySetInnerHTML={{ __html: s(bs.content) }} />
                )}
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 11. Video ─────────────────────────────────────────────────────────
function Video({ values, variant }: { values: SectionValues; variant: 'editor' | 'page' }) {
  const isPage = variant === 'page'
  const videoUrl = s(values.video_url)

  let embedUrl = ''
  if (videoUrl) {
    const yt = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    const vm = videoUrl.match(/vimeo\.com\/(\d+)/)
    if (yt) embedUrl = `https://www.youtube.com/embed/${yt[1]}?autoplay=0`
    else if (vm) embedUrl = `https://player.vimeo.com/video/${vm[1]}`
  }

  const fullWidth = values.full_width === true
  return (
    <div className={`bg-black ${isPage ? (fullWidth ? '' : 'py-16 px-8') : 'p-4 rounded-lg'}`}>
      {has(values.heading) && (
        <h2 className={`font-bold text-white ${isPage ? 'text-3xl text-center mb-8' : 'text-lg mb-3'}`}>
          {s(values.heading)}
        </h2>
      )}
      <div className={isPage && !fullWidth ? 'max-w-4xl mx-auto' : ''}>
        {embedUrl && isPage ? (
          <div className="aspect-video">
            <iframe src={embedUrl} className="w-full h-full" allow="fullscreen" allowFullScreen />
          </div>
        ) : has(values.cover_image) ? (
          <div className={`relative ${isPage ? 'aspect-video' : 'h-36'} overflow-hidden ${isPage ? '' : 'rounded'}`}>
            <Img src={s(values.cover_image)} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`${isPage ? 'w-16 h-16' : 'w-10 h-10'} bg-white/90 rounded-full flex items-center justify-center`}>
                <span className={`${isPage ? 'text-2xl' : 'text-base'} pl-0.5`}>▶</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${isPage ? 'aspect-video' : 'h-36'} bg-gray-800 rounded flex flex-col items-center justify-center gap-2 text-white/50`}>
            <span className={isPage ? 'text-5xl' : 'text-3xl'}>▶</span>
            <span className="text-sm">{videoUrl || '動画URLを設定してください'}</span>
          </div>
        )}
      </div>
      {has(values.description) && (
        <div className={`text-gray-400 mt-4 ${isPage ? 'text-center text-base' : 'text-xs'}`}
             dangerouslySetInnerHTML={{ __html: s(values.description) }} />
      )}
    </div>
  )
}

// ── Generic fallback ───────────────────────────────────────────────────
function Generic({ def, values }: Props) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-dashed">
      <p className="text-sm font-medium text-gray-600 mb-2">{def.name}</p>
      <pre className="text-xs text-gray-400 overflow-auto">{JSON.stringify(values, null, 2)}</pre>
    </div>
  )
}
