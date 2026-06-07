'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, Trash2, ImageIcon, GripVertical } from 'lucide-react'

interface ProductImage {
  id: string
  storage_path: string
  position: number
  alt: string | null
  signedUrl?: string
}

export function ProductImages({ productId }: { productId: string }) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [editingAlt, setEditingAlt] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    void loadOrgId()
  }, [])

  useEffect(() => {
    void loadImages()
  }, [productId])

  async function loadOrgId() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('app_user').select('org_id').eq('id', user.id).single()
    if (data) setOrgId(data.org_id)
  }

  async function loadImages() {
    const { data } = await supabase
      .from('product_image')
      .select('*')
      .eq('product_id', productId)
      .order('position')
    if (!data) return

    const withUrls = await Promise.all(
      data.map(async (img) => {
        const { data: urlData } = await supabase.storage
          .from('product-images')
          .createSignedUrl(img.storage_path, 3600)
        return { ...img, signedUrl: urlData?.signedUrl ?? undefined }
      })
    )
    setImages(withUrls)
    setEditingAlt(Object.fromEntries(withUrls.map((i) => [i.id, i.alt ?? ''])))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !orgId) return

    setUploading(true)
    let successCount = 0

    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${orgId}/${productId}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false })

      if (uploadErr) {
        toast.error(`${file.name}: アップロード失敗 — ${uploadErr.message}`)
        continue
      }

      const nextPosition = images.length + successCount
      const { error: dbErr } = await supabase.from('product_image').insert({
        product_id: productId,
        org_id: orgId,
        storage_path: path,
        position: nextPosition,
        alt: file.name.replace(/\.[^/.]+$/, ''),
      })

      if (dbErr) {
        toast.error(`${file.name}: DB保存失敗 — ${dbErr.message}`)
        await supabase.storage.from('product-images').remove([path])
      } else {
        successCount++
      }
    }

    if (successCount > 0) toast.success(`${successCount}件アップロードしました`)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    await loadImages()
  }

  async function deleteImage(img: ProductImage) {
    const { error: storageErr } = await supabase.storage
      .from('product-images')
      .remove([img.storage_path])
    if (storageErr) {
      toast.error(`Storage削除失敗: ${storageErr.message}`)
      return
    }
    const { error: dbErr } = await supabase.from('product_image').delete().eq('id', img.id)
    if (dbErr) {
      toast.error(`DB削除失敗: ${dbErr.message}`)
    } else {
      toast.success('削除しました')
      const next = images
        .filter((i) => i.id !== img.id)
        .map((i, idx) => ({ ...i, position: idx }))
      setImages(next)
      await reorderDB(next)
    }
  }

  async function saveAlt(img: ProductImage) {
    const alt = editingAlt[img.id] ?? ''
    const { error } = await supabase.from('product_image').update({ alt }).eq('id', img.id)
    if (error) {
      toast.error('更新失敗')
    } else {
      toast.success('alt更新しました')
      setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, alt } : i))
    }
  }

  async function moveImage(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= images.length) return
    const next = [...images]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    const reordered = next.map((img, idx) => ({ ...img, position: idx }))
    setImages(reordered)
    await reorderDB(reordered)
  }

  async function reorderDB(imgs: ProductImage[]) {
    for (const img of imgs) {
      await supabase.from('product_image').update({ position: img.position }).eq('id', img.id)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Drop zone / Upload button */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault()
          if (!orgId) return
          const dt = e.dataTransfer
          const synth = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>
          await handleFileChange(synth)
        }}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">
          クリックまたはドラッグ＆ドロップで画像をアップロード
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP（複数可）</p>
        {uploading && <p className="text-sm text-blue-600 mt-2 font-medium">アップロード中...</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            登録済み画像（{images.length}件）— 最初の画像がメイン画像になります
          </p>
          <div className="space-y-2">
            {images.map((img, idx) => (
              <div key={img.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveImage(idx, idx - 1)}
                    disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                  >▲</button>
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <button
                    type="button"
                    onClick={() => moveImage(idx, idx + 1)}
                    disabled={idx === images.length - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                  >▼</button>
                </div>

                {/* Thumbnail */}
                <div className="w-16 h-16 shrink-0 rounded overflow-hidden bg-gray-100">
                  {img.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.signedUrl} alt={img.alt ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Alt + position badge */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded shrink-0">メイン</span>
                    )}
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={editingAlt[img.id] ?? ''}
                      onChange={(e) => setEditingAlt((prev) => ({ ...prev, [img.id]: e.target.value }))}
                      placeholder="alt テキスト"
                      className="h-7 text-xs flex-1"
                      onBlur={() => saveAlt(img)}
                    />
                  </div>
                  <p className="text-xs text-gray-400 truncate">{img.storage_path.split('/').pop()}</p>
                </div>

                {/* Delete */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteImage(img)}
                  className="text-gray-400 hover:text-red-500 shrink-0 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
