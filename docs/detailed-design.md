# Shopify練習アプリ 詳細設計書

- バージョン: 1.0
- 作成日: 2026-06-07
- 前提資料: 要件定義書 / 基本設計書
- スタック: Supabase（Postgres + Auth + Storage + Edge Functions） / Next.js App Router / React / TypeScript / Tailwind CSS

---

## 1. 全体方針

- 認証: Supabase Auth（`@supabase/ssr`）。Cookieベースでサーバ/クライアント両対応。
- 認可: Postgres RLS。全業務テーブルに `org_id`。
- データ取得: Server Components / Route Handlers。更新は Server Actions or Route Handlers。
- 検証: Zod。フォームは React Hook Form。
- 画像: Supabase Storage。署名URLで配信。
- Shopify連携: Edge Functions に隔離（Admin/Storefront API）。

---

## 2. データベース詳細設計

> Postgres想定。型は実装時に調整。全テーブルに `created_at timestamptz default now()`, `updated_at timestamptz` を付与。

### 2.1 org / app_user

```sql
create table org (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table app_user (
  id uuid primary key references auth.users(id),
  org_id uuid not null references org(id),
  email text not null,
  display_name text,
  role text not null default 'editor'
    check (role in ('admin','editor','viewer')),
  created_at timestamptz default now()
);
```

### 2.2 brand

```sql
create table brand (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  code text not null,                 -- ブランドコード
  name text not null,
  logo_path text,                     -- Storageキー
  hero_image_path text,
  concept text,
  description text,                    -- 紹介文
  story text,                          -- ブランドストーリー
  sns jsonb default '{}'::jsonb,       -- {instagram, x, ...}
  external_url text,
  display_order int default 0,
  status text not null default 'draft'
    check (status in ('draft','active')),
  shopify_metaobject_id text,          -- 連携時のMetaobject GID
  created_at timestamptz default now(),
  updated_at timestamptz,
  unique (org_id, code)
);
```

### 2.3 product / product_image / variant

```sql
create table product (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  brand_id uuid references brand(id),
  title text not null,
  description text,
  product_type text,                   -- アウター等
  gender text check (gender in ('men','women','unisex','kids')),
  season text,                         -- 2026SS 等
  price numeric(12,2),
  compare_at_price numeric(12,2),
  tags text[] default '{}',
  status text not null default 'draft'
    check (status in ('draft','active')),
  shopify_product_id text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table product_image (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  product_id uuid not null references product(id) on delete cascade,
  storage_path text not null,
  position int default 0,
  alt text
);

create table variant (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  product_id uuid not null references product(id) on delete cascade,
  size text,                           -- S/M/L 等
  color text,                          -- Black 等
  color_code text,                     -- #000000
  sku text not null,                   -- 自動採番
  barcode text,
  price numeric(12,2),                 -- null時はproduct.price
  shopify_variant_id text,
  created_at timestamptz default now(),
  unique (org_id, sku)
);
```

### 2.4 location / inventory_level

```sql
create table location (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  name text not null,                  -- 倉庫/店舗/EC共通
  kind text not null default 'warehouse'
    check (kind in ('warehouse','store','online')),
  shopify_location_id text
);

create table inventory_level (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  variant_id uuid not null references variant(id) on delete cascade,
  location_id uuid not null references location(id),
  available int not null default 0,
  low_stock_threshold int default 0,
  updated_at timestamptz default now(),
  unique (variant_id, location_id)
);

create table inventory_adjustment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  variant_id uuid not null references variant(id),
  location_id uuid not null references location(id),
  delta int not null,
  reason text check (reason in ('inbound','outbound','adjust')),
  created_by uuid references app_user(id),
  created_at timestamptz default now()
);
```

### 2.5 collection / 関連

```sql
create table collection (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  title text not null,
  description text,
  type text not null default 'manual'
    check (type in ('manual','smart')),
  position int default 0,
  status text not null default 'active'
    check (status in ('draft','active')),
  shopify_collection_id text
);

create table collection_product (
  collection_id uuid references collection(id) on delete cascade,
  product_id uuid references product(id) on delete cascade,
  position int default 0,
  primary key (collection_id, product_id)
);

create table collection_rule (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collection(id) on delete cascade,
  field text not null
    check (field in ('brand','tag','product_type','season','in_stock')),
  operator text not null
    check (operator in ('equals','contains','is_true')),
  value text
);
```

### 2.6 テーマフォーマット / ブランドページ（核）

```sql
-- 読み込んだShopifyテーマフォーマット (Solid 等)
create table theme_format (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  name text not null,                  -- "Solid"
  source text not null default 'preset'
    check (source in ('preset','upload','api')),
  raw_schema jsonb,                    -- 取り込んだ生schema(任意)
  created_at timestamptz default now()
);

-- テーマのセクション定義（schemaから抽出）
create table theme_section_def (
  id uuid primary key default gen_random_uuid(),
  theme_format_id uuid not null references theme_format(id) on delete cascade,
  section_type text not null,          -- "image-banner" 等
  name text not null,
  settings jsonb not null,             -- schema.settings (配列)
  blocks jsonb default '[]'::jsonb,    -- schema.blocks
  presets jsonb default '[]'::jsonb
);

-- ブランドページ本体 (1ブランド1ページ)
create table brand_page (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  brand_id uuid not null references brand(id) on delete cascade,
  theme_format_id uuid references theme_format(id),
  handle text,                         -- URLハンドル
  status text not null default 'draft'
    check (status in ('draft','active')),
  unique (brand_id)
);

-- ページを構成するセクション（順序付き）
create table brand_page_section (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  brand_page_id uuid not null references brand_page(id) on delete cascade,
  theme_section_def_id uuid not null references theme_section_def(id),
  position int not null default 0,
  -- schemaのsetting id -> 値。ブランドデータからマッピング/手入力
  settings_values jsonb not null default '{}'::jsonb,
  blocks_values jsonb default '[]'::jsonb,
  enabled boolean default true
);
```

### 2.7 activity_log

```sql
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  actor uuid references app_user(id),
  action text not null,                -- create/update/delete/sync
  entity text not null,                -- product/variant/...
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);
```

### 2.8 RLS（代表例）

```sql
alter table product enable row level security;

-- 所属orgのみ参照
create policy product_select on product
for select using (
  org_id = (select org_id from app_user where id = auth.uid())
);

-- editor/admin のみ更新
create policy product_write on product
for all using (
  org_id = (select org_id from app_user where id = auth.uid())
  and (select role from app_user where id = auth.uid()) in ('admin','editor')
) with check (
  org_id = (select org_id from app_user where id = auth.uid())
);
```

> 同様のポリシーを全業務テーブルに展開（viewerは select のみ）。

---

## 3. SKU自動採番ロジック（詳細）

### 3.1 ルール
```
SKU = {BRAND_CODE}-{PRODUCT_SEQ}-{COLOR}-{SIZE}
例) GNE-00012-BLK-M
```

- BRAND_CODE: brand.code（大文字）
- PRODUCT_SEQ: org内product連番をゼロ埋め
- COLOR: カラー略称（マスタ変換）
- SIZE: サイズ表記そのまま

### 3.2 バリエーション一括生成
- 入力: 選択サイズ配列 × 選択カラー配列
- 出力: 直積でvariant行を生成、SKU自動付与、重複SKUはスキップ
- 擬似コード:

```ts
function buildVariants(sizes: string[], colors: Color[], ctx) {
  const variants = [];
  for (const c of colors) {
    for (const s of sizes) {
      variants.push({
        size: s,
        color: c.name,
        color_code: c.code,
        sku: `${ctx.brandCode}-${ctx.seq}-${c.abbr}-${s}`.toUpperCase(),
      });
    }
  }
  return variants;
}
```

---

## 4. API設計（Route Handlers / Server Actions）

> ベースパス: `/api`。認証はCookie。レスポンスはJSON。エラーは `{ error: { code, message } }`。

### 4.1 商品

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/products` | 一覧（q, brand_id, collection_id, status, in_stock, page） |
| POST | `/api/products` | 作成 |
| GET | `/api/products/:id` | 詳細（variants, images含む） |
| PATCH | `/api/products/:id` | 更新 |
| DELETE | `/api/products/:id` | 削除 |
| POST | `/api/products/:id/variants:generate` | サイズ×カラー一括生成 |
| PATCH | `/api/variants/:id` | バリエーション更新 |

リクエスト例（作成）:
```json
{
  "title": "オーバーサイズシャツ",
  "brand_id": "uuid",
  "product_type": "シャツ",
  "gender": "unisex",
  "season": "2026SS",
  "price": 8900,
  "tags": ["new","cotton"],
  "status": "draft"
}
```

### 4.2 在庫

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/inventory` | 在庫一覧（product_id/location_id/低在庫フィルタ） |
| PATCH | `/api/inventory/:variantId/:locationId` | 在庫数更新 |
| POST | `/api/inventory/bulk` | 一括更新（CSV相当の配列） |
| POST | `/api/inventory/adjust` | 入荷/出荷/調整記録 |
| GET | `/api/inventory/alerts` | 在庫切れ/在庫少 |

一括更新例:
```json
{ "items": [
  { "sku": "GNE-00012-BLK-M", "location": "EC", "available": 20 },
  { "sku": "GNE-00012-BLK-L", "location": "EC", "available": 5 }
]}
```

### 4.3 コレクション

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/collections` | 一覧 |
| POST | `/api/collections` | 作成 |
| PATCH | `/api/collections/:id` | 更新 |
| POST | `/api/collections/:id/products` | 手動追加 |
| DELETE | `/api/collections/:id/products/:productId` | 手動削除 |
| PUT | `/api/collections/:id/rules` | 自動ルール設定 |
| GET | `/api/collections/:id/preview` | ルール適用結果プレビュー |

スマートルール評価（擬似SQL）:
```sql
-- brand=GNE かつ tag に 'new' を含む かつ 在庫あり
select p.* from product p
join variant v on v.product_id = p.id
join inventory_level il on il.variant_id = v.id
where p.org_id = :org
  and p.brand_id = :brand
  and 'new' = any(p.tags)
group by p.id
having sum(il.available) > 0;
```

### 4.4 ブランド

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/brands` | 一覧 |
| POST | `/api/brands` | 作成 |
| PATCH | `/api/brands/:id` | 更新 |
| DELETE | `/api/brands/:id` | 削除 |

### 4.5 テーマフォーマット & ブランドページ（核）

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/theme-formats` | 読込済フォーマット一覧（Solid等） |
| POST | `/api/theme-formats:import` | schema取込（preset/upload/api） |
| GET | `/api/theme-formats/:id/sections` | セクション定義一覧 |
| GET | `/api/brands/:id/page` | ブランドページ取得 |
| PUT | `/api/brands/:id/page` | ページ構成（セクション/値）保存 |
| GET | `/api/brands/:id/page/preview` | プレビュー用レンダリングデータ |
| POST | `/api/brands/:id/page:sync` | Shopify反映（Metaobject/テンプレート） |

schema取込リクエスト:
```json
{
  "name": "Solid",
  "source": "upload",
  "sections": [
    {
      "section_type": "image-banner",
      "name": "Image banner",
      "schema": "{ ...Shopify section {% schema %} JSON... }"
    }
  ]
}
```

### 4.6 Shopify連携設定

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/settings/shopify` | 接続状態 |
| POST | `/api/settings/shopify` | ストア接続情報登録（Edge保管） |
| POST | `/api/sync/products` | 商品同期 |
| POST | `/api/sync/inventory` | 在庫同期 |
| POST | `/api/sync/collections` | コレクション同期 |

---

## 5. ブランドページ：スキーマ駆動レンダラ（核機能 詳細）

### 5.1 概念
Shopifyテーマ（Solid等）のセクションは `{% schema %}` に `settings` を持つ。
このsettingsを **入力定義** として読み込み、編集フォームとプレビューを **自動生成** する。

### 5.2 取り込むschema構造（例）
```json
{
  "name": "Image banner",
  "settings": [
    { "type": "image_picker", "id": "image", "label": "背景画像" },
    { "type": "text", "id": "heading", "label": "見出し" },
    { "type": "richtext", "id": "text", "label": "本文" },
    { "type": "color", "id": "overlay", "label": "オーバーレイ色" },
    { "type": "url", "id": "button_link", "label": "ボタンリンク" }
  ],
  "blocks": [],
  "presets": [{ "name": "Image banner" }]
}
```

### 5.3 setting type → UIコンポーネント対応表

| Shopify setting type | 編集UI | 値の型 |
|---|---|---|
| text / textarea | input / textarea | string |
| richtext | リッチエディタ | html string |
| image_picker | 画像選択（Storage） | storage_path |
| color | カラーピッカー | hex |
| url | URL入力 | string |
| select | セレクト | string |
| checkbox | トグル | boolean |
| range | スライダー | number |
| product / collection | 参照ピッカー | id |

### 5.4 編集→保存
- `brand_page_section.settings_values` に `{ "heading": "...", "image": "path", ... }` で保存。
- ブランドデータ（brand.name, hero_image_path 等）から **オートマッピング** ボタンで初期流し込み可能。

### 5.5 プレビュー描画
- フロントは setting type ごとのレンダラで、セクションをHTMLに展開。
- 画像はSupabase署名URL。richtextはサニタイズして表示。
- 並び順は `position` 昇順。

```ts
function renderSection(def: SectionDef, values: Record<string, unknown>) {
  switch (def.section_type) {
    case 'image-banner':
      return <ImageBanner image={values.image} heading={values.heading} ... />;
    case 'rich-text':
      return <RichText html={values.text as string} />;
    case 'product-list':
      return <ProductList collectionId={values.collection} />;
    default:
      return <GenericSection def={def} values={values} />; // schema駆動の汎用描画
  }
}
```

### 5.6 Shopify反映マッピング
| アプリ側 | Shopify側 |
|---|---|
| brand | Metaobject（type: brand） |
| brand_page_section.settings_values | section settings / metaobject fields |
| image (storage_path) | アップロード→file GID |
| brand_page | metaobject template が割当たったページ |

> 反映はEdge FunctionでAdmin GraphQL（metaobjectCreate/Update, metafieldsSet）を実行。

---

## 6. 画面詳細

### 6.1 商品登録/編集
- セクション: 基本情報 / 画像 / バリエーション / 価格 / 公開状態
- バリエーション: サイズ・カラーをチップ選択→「生成」でマトリクス表
- 検証(Zod): title必須、price>=0、SKU重複不可

### 6.2 在庫管理
- 商品単位でサイズ×カラーのマトリクス在庫表
- セル直接編集→onBlurで保存
- 在庫少は黄、在庫0は赤でハイライト
- 上部にロケーション切替タブ

### 6.3 コレクション編集
- type=manual: 商品検索→追加、ドラッグで並び替え
- type=smart: ルールビルダー（field/operator/value）+ リアルタイムプレビュー件数

### 6.4 ブランド編集
- マスタタブ / ページタブ
- ページタブ: 左にセクションリスト（追加/削除/並べ替え）、右にプレビュー
- 「テーマフォーマット選択」で Solid 等を選び、利用可能セクションを提示

### 6.5 ダッシュボード
- 商品数 / ブランド数 / コレクション数
- 在庫切れ件数 / 在庫少件数（アラート）
- 直近の操作履歴

---

## 7. バリデーション（Zod 抜粋）

```ts
export const productSchema = z.object({
  title: z.string().min(1),
  brand_id: z.string().uuid().optional(),
  price: z.number().nonnegative().optional(),
  compare_at_price: z.number().nonnegative().optional(),
  gender: z.enum(['men','women','unisex','kids']).optional(),
  status: z.enum(['draft','active']).default('draft'),
  tags: z.array(z.string()).default([]),
});

export const inventoryBulkSchema = z.object({
  items: z.array(z.object({
    sku: z.string(),
    location: z.string(),
    available: z.number().int().nonnegative(),
  })),
});
```

---

## 8. Supabaseクライアント構成

```ts
// lib/supabase/server.ts  … Server Components/Route Handlers用 (cookies)
// lib/supabase/client.ts  … クライアント用 (anon key)
// lib/supabase/admin.ts   … service role。Edge Functions限定（フロント禁止）
```

- service role キーはEdge Functionsのみで使用。
- フロントはanonキー + RLSで保護。

---

## 9. Shopify連携処理（Edge Function 詳細）

### 9.1 商品同期（push）
```graphql
mutation CreateProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product { id variants(first: 100){ nodes { id sku } } }
    userErrors { field message }
  }
}
```
- 成功時 `shopify_product_id` / `shopify_variant_id` を保存。

### 9.2 在庫同期
- `inventorySetQuantities` 等でロケーション×SKU在庫を反映。

### 9.3 ブランド（Metaobject）
```graphql
mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id }
    userErrors { field message }
  }
}
```
- brand → metaobject(type: "brand")。フィールドにname/description/logo等。

---

## 10. 操作履歴（監査）
- 主要更新系API成功時に `activity_log` へ insert。
- diffは変更前後の差分（jsonb）。
- 画面で actor / action / entity / 日時を一覧表示。

---

## 11. テスト観点（抜粋）

| 区分 | 観点 |
|---|---|
| 商品 | 必須検証、SKU重複、バリエーション直積生成 |
| 在庫 | マトリクス保存、一括更新、アラート閾値 |
| コレクション | smartルール評価結果の一致 |
| ブランドページ | schema取込→フォーム自動生成→プレビュー一致 |
| 権限 | viewerが更新不可、他org不可視（RLS） |
| 連携 | Shopify push成功時ID保存、userErrors処理 |

---

## 12. 実装フェーズ対応
- Phase1(MVP): §2.1〜2.6(連携除く), §4.1〜4.5, §5, §6
- Phase2: 自動コレクション高度化, CSV取込, activity_log, ガイド
- Phase3: §9 Shopify連携一式
