// 一度きりの実行用スクリプト: LIMORAブランド画像を Supabase Storage (brand-images) にアップロードする
// 実行: node --env-file=.env.local scripts/upload-limora-images.mjs
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE env vars not set (.env.local)')

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const ASSETS_DIR = 'C:\\Users\\ssin5\\src\\limora\\dawn\\assets'
const FILES = [
  'limora-logo.png',
  'limora-look-blouse.png',
  'limora-look-blazer.png',
  'limora-look-trousers.png',
]

// ヒーロー画像は別ディレクトリから個別アップロード
const HERO_SRC  = 'C:\\Users\\ssin5\\src\\limora\\Gemini_Generated_Image_wazrowwazrowwazr.png'
const HERO_DEST = 'limora-hero.png'

const { data: appUser, error: appUserErr } = await supabase
  .from('app_user')
  .select('org_id')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (appUserErr || !appUser) throw new Error(`app_user が見つかりません: ${appUserErr?.message}`)

const orgId = appUser.org_id
console.log(`org_id: ${orgId}`)

for (const filename of FILES) {
  const filePath = join(ASSETS_DIR, filename)
  const fileBuffer = await readFile(filePath)
  const storagePath = `${orgId}/limora/${filename}`

  const { error } = await supabase.storage
    .from('brand-images')
    .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: true })

  if (error) {
    console.error(`✗ ${filename}: ${error.message}`)
  } else {
    console.log(`✓ ${filename} -> ${storagePath}`)
  }
}

// ヒーロー画像
{
  const fileBuffer = await readFile(HERO_SRC)
  const storagePath = `${orgId}/limora/${HERO_DEST}`
  const { error } = await supabase.storage
    .from('brand-images')
    .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: true })
  if (error) {
    console.error(`✗ ${HERO_DEST}: ${error.message}`)
  } else {
    console.log(`✓ ${HERO_DEST} -> ${storagePath}`)
  }
}
