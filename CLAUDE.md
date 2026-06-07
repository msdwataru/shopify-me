# Shopify練習アプリ — CLAUDE.md

## プロジェクト概要

アパレル業務担当者（EC運用・商品登録・在庫管理・MD・ブランド担当）が
Shopifyの操作・概念を安全に学べる**練習用Webアプリ**。

Shopifyの用語・データ構造（Product/Variant/SKU/Collection/Metaobjects）に準拠した設計で、
将来的にShopify Admin API連携へ拡張できる構成にする。

---

## 技術スタック

| レイヤ | 技術 |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript + Tailwind CSS |
| UI共通 | shadcn/ui |
| フォーム/バリデーション | React Hook Form + Zod |
| Backend/DB | Supabase (Postgres + RLS + Auth + Storage + Edge Functions) |
| 認証 | Supabase Auth (`@supabase/ssr`、Cookieベース SSR対応) |
| 画像ストレージ | Supabase Storage（署名URL配信） |
| 将来連携 | Shopify Admin GraphQL API（Edge Functionsに隔離） |

---

## インフラ状況

- **Supabaseプロジェクト**: リモート作成済み（URL・anonキーは手元にある想定）
- **Next.js**: ゼロから作成（未スキャフォールド）
- **Shopify連携**: Phase 3まで実装しない（Phase 1はローカルDB完結）

---

## 実装フェーズ

### Phase 1（MVP） ← 現在着手対象
- 商品登録・編集
- バリエーション管理（サイズ×カラー マトリクス）
- 在庫管理（SKU別・ロケーション別）
- 手動コレクション管理
- ブランドマスタ管理
- ブランドページ生成・プレビュー（スキーマ駆動レンダラ）

### Phase 2
- 自動コレクション（スマートルール高度化）
- CSV一括取込
- 操作ログ UI
- チュートリアル・学習ガイド

### Phase 3
- Shopify Admin API連携（Product/Inventory/Collection同期）
- ブランドデータの Metaobjects連携

---

## ディレクトリ構成（設計書準拠）

```
app/
  (auth)/login/
  (dashboard)/
    page.tsx                 # ダッシュボード
    products/
    collections/
    brands/
      [id]/page/             # ブランドページ生成
    settings/
    logs/
  api/                       # Route Handlers (BFF)
components/
  ui/                        # shadcn/ui 共通
  products/
  brands/
  brand-page/                # スキーマ駆動レンダラ
lib/
  supabase/                  # client.ts / server.ts / admin.ts
  shopify/                   # Admin/Storefront client（Edge用）
  schema/                    # Zod スキーマ
  theme/                     # section schema パーサー
supabase/
  migrations/
  functions/                 # Edge Functions
types/
```

---

## データベース設計

### テーブル一覧（依存順）

| テーブル | 役割 |
|---|---|
| `org` | テナント（1ユーザー＝1org）|
| `app_user` | ユーザー・ロール（admin/editor/viewer）|
| `brand` | ブランドマスタ |
| `product` | 商品（親） |
| `product_image` | 商品画像 |
| `variant` | バリエーション（サイズ×カラー、SKU）|
| `location` | 在庫ロケーション（warehouse/store/online）|
| `inventory_level` | variant × location の在庫数 |
| `inventory_adjustment` | 入荷/出荷/調整ログ |
| `collection` | コレクション（manual/smart）|
| `collection_product` | 手動コレクション所属（N:N）|
| `collection_rule` | 自動コレクションのルール条件 |
| `theme_format` | 読み込んだShopifyテーマフォーマット |
| `theme_section_def` | テーマのセクション定義（schemaから抽出）|
| `brand_page` | ブランドページ本体（1ブランド1ページ）|
| `brand_page_section` | ページを構成するセクション（順序付き）|
| `activity_log` | 操作履歴 |

### 全テーブル共通方針
- 全業務テーブルに `org_id` を付与（マルチテナント）
- `created_at timestamptz default now()` / `updated_at timestamptz`（トリガーで自動更新）
- RLS有効化（`current_org_id()` / `can_write()` / `is_admin()` ヘルパー関数で制御）

### RLSヘルパー関数（全て SECURITY DEFINER）
```sql
current_org_id()  -- 現在ユーザーのorg_idを返す
current_role()    -- 現在ユーザーのroleを返す
can_write()       -- admin/editor → true
is_admin()        -- admin → true
```

### 新規ユーザー自動プロビジョニング
- `auth.users` 挿入時に `handle_new_user()` トリガーが起動
- org と app_user (role=admin) を自動作成
- 練習アプリ用途: **1ユーザー＝1org**

---

## SKU採番ルール

```
{BRAND_CODE}-{PRODUCT_SEQ}-{COLOR_ABBR}-{SIZE}
例）GNE-00012-BLK-M
```

- BRAND_CODE: brand.code（大文字）
- PRODUCT_SEQ: org内product連番5桁ゼロ埋め
- COLOR_ABBR: カラー略称（マスタ変換）
- SIZE: サイズ表記そのまま（S/M/L/XL 等）

バリエーション一括生成: `sizes[] × colors[]` の直積でvariant行を生成

---

## ブランドページ生成（コア機能・最複雑）

### 概念
Shopifyテーマ（Solid等）のセクション `{% schema %}` JSON を取り込み、
`settings` 定義を解析して**編集フォームとプレビューを自動生成**するスキーマ駆動UI。

### セクション setting type → UI対応
| Shopify type | 編集UI | 値の型 |
|---|---|---|
| text / textarea | input / textarea | string |
| richtext | リッチエディタ | html string |
| image_picker | 画像選択（Storage）| storage_path |
| color | カラーピッカー | hex |
| url | URL入力 | string |
| select | セレクト | string |
| checkbox | トグル | boolean |
| range | スライダー | number |
| product / collection | 参照ピッカー | id |

### Solidプリセット（DB関数 `solid_preset_sections()` に内蔵）
- image-banner
- rich-text
- image-with-text
- featured-collection

新規org作成時に `seed_solid_for_org(target_org)` を呼ぶとtheme_format + theme_section_defが投入される。

### ブランドページ編集UI方針
- 左: セクションリスト（追加/削除/並べ替え）
- 右: リアルタイムプレビュー

---

## API設計（Route Handlers）

ベースパス: `/api`。認証はCookie。エラーは `{ error: { code, message } }`。

### 商品
```
GET    /api/products                        一覧（q, brand_id, status, in_stock, page）
POST   /api/products                        作成
GET    /api/products/:id                    詳細（variants, images含む）
PATCH  /api/products/:id                    更新
DELETE /api/products/:id                    削除
POST   /api/products/:id/variants:generate  サイズ×カラー一括生成
PATCH  /api/variants/:id                    バリエーション更新
```

### 在庫
```
GET    /api/inventory                       一覧（product_id/location_id/低在庫フィルタ）
PATCH  /api/inventory/:variantId/:locationId 在庫数更新
POST   /api/inventory/bulk                  一括更新
POST   /api/inventory/adjust                入荷/出荷/調整記録
GET    /api/inventory/alerts                在庫切れ/在庫少
```

### コレクション
```
GET    /api/collections
POST   /api/collections
PATCH  /api/collections/:id
POST   /api/collections/:id/products        手動追加
DELETE /api/collections/:id/products/:pid   手動削除
PUT    /api/collections/:id/rules           自動ルール設定
GET    /api/collections/:id/preview         ルール適用結果プレビュー
```

### ブランド
```
GET    /api/brands
POST   /api/brands
PATCH  /api/brands/:id
DELETE /api/brands/:id
GET    /api/brands/:id/page                 ブランドページ取得
PUT    /api/brands/:id/page                 ページ構成保存
GET    /api/brands/:id/page/preview         プレビュー用データ
POST   /api/brands/:id/page:sync            Shopify反映（Phase3）
```

---

## Supabaseクライアント構成

```ts
lib/supabase/server.ts   // Server Components / Route Handlers（cookies使用）
lib/supabase/client.ts   // クライアント用（anon key）
lib/supabase/admin.ts    // service role — Edge Functions限定（フロント禁止）
```

---

## Storageバケット

- `product-images` / `brand-images`（非公開）
- パス規約: `{org_id}/.../{filename}` — 第1フォルダでorg分離をStorageレイヤで強制

---

## 画面一覧（Phase 1）

| 画面 | パス |
|---|---|
| ログイン | `/(auth)/login` |
| ダッシュボード | `/(dashboard)/` |
| 商品一覧 | `/(dashboard)/products` |
| 商品登録/編集 | `/(dashboard)/products/[id]` |
| 在庫管理 | `/(dashboard)/products/[id]/inventory` |
| コレクション一覧 | `/(dashboard)/collections` |
| コレクション編集 | `/(dashboard)/collections/[id]` |
| ブランド一覧 | `/(dashboard)/brands` |
| ブランド編集 | `/(dashboard)/brands/[id]` |
| ブランドページ生成 | `/(dashboard)/brands/[id]/page` |

### レイアウト方針
- 左サイドナビ + メインコンテンツの管理画面レイアウト
- 商品/在庫は表中心。サイズ×カラーはマトリクス入力（クライアントコンポーネント）
- ブランドページ編集は左:セクション/設定、右:プレビューの2ペイン

---

## ドキュメント・SQLファイル

| ファイル | 内容 |
|---|---|
| `docs/requirements.md` | 要件定義書 |
| `docs/basic-design.md` | 基本設計書 |
| `docs/detailed-design.md` | 詳細設計書 |
| `supabase/migrations.sql` | DBマイグレーション一式（Phase1〜3対応） |
| `supabase/seed.sql` | サンプルデータ投入SQL（ブランド3件・商品6件・在庫・コレクション・ブランドページ） |
| `supabase/seed-for-user.sql` | ユーザー別サンプルデータ |
| `supabase/add-sections.sql` | 既存DBへのセクション追加パッチ |
| `supabase/urban-edge-page.sql` | URBAN EDGEブランドページシード |
| `types/database.types.ts` | Supabase向けTypeScript型定義（実装でそのまま利用） |

---

## database.types.ts（型定義ファイル）

`lib/types/database.types.ts` 等へコピーして `createClient<Database>(...)` に渡すことで型安全にDBを操作できる。

### 提供されている主要な型

**列挙型（enumに相当）**
```ts
UserRole           // 'admin' | 'editor' | 'viewer'
Gender             // 'men' | 'women' | 'unisex' | 'kids'
ProductStatus      // 'draft' | 'active'
BrandStatus        // 'draft' | 'active'
CollectionType     // 'manual' | 'smart'
LocationKind       // 'warehouse' | 'store' | 'online'
AdjustmentReason   // 'inbound' | 'outbound' | 'adjust'
ThemeFormatSource  // 'preset' | 'upload' | 'api'
CollectionRuleField    // 'brand' | 'tag' | 'product_type' | 'season' | 'in_stock'
CollectionRuleOperator // 'equals' | 'contains' | 'is_true'
```

**補助型**
```ts
BrandSns              // brand.sns (jsonb) の構造型
ThemeSettingDef       // theme_section_def.settings の各要素
ThemeBlockDef         // theme_section_def.blocks の各要素
SectionSettingsValues // brand_page_section.settings_values (Record<string, Json>)
SectionBlockValue     // brand_page_section.blocks_values の各要素
```

**汎用ユーティリティ**
```ts
Tables<T>        // テーブルのRow型
TablesInsert<T>  // INSERT用型
TablesUpdate<T>  // UPDATE用型
Views<T>         // Viewのrow型
```

**短縮エンティティ型（アプリ内で利用）**
```ts
Brand, Product, Variant, Location, InventoryLevel,
Collection, CollectionRule, ThemeFormat, ThemeSectionDef,
BrandPage, BrandPageSection, ActivityLog, ProductStockSummary, ...
```

**複合型（JOIN結果想定）**
```ts
ProductWithRelations   // Product + brand + variants[] + images[]
VariantWithStock       // Variant + inventory[](InventoryLevel + Location)[]
BrandPageWithSections  // BrandPage + sections[](BrandPageSection + ThemeSectionDef)[]
```

### 注意：型定義とマイグレーションの差異
- `product_stock_summary` ビューの型定義に `title`・`variant_count` が含まれているが、`supabase_migrations.sql` のビュー定義にはない → 実装時にビューを拡張するか型定義を修正する必要あり
- `seed_solid_for_org` の引数名が型定義では `p_org`、マイグレーションでは `target_org` → マイグレーション適用後に `supabase gen types typescript` で再生成することを推奨

---

## supabase_seed.sql（サンプルデータ）

学習・デモ用の初期データ。`supabase_migrations.sql` 適用後に実行。冪等設計（何度実行しても安全）。

### 投入内容

**ブランド（3件）**
| コード | ブランド名 | コンセプト |
|---|---|---|
| GNE | GENIEE BASIC | 上質なデイリーベーシック |
| URB | URBAN EDGE | 都市生活のためのモードカジュアル |
| NAT | NATURE LINE | サステナブルなナチュラルウェア |

**商品（6件）**
| ブランド | 商品名 | サイズ | カラー数 |
|---|---|---|---|
| GNE | オーガニックコットンTシャツ | S/M/L/XL | 3色 |
| GNE | スウェットパーカー | M/L/XL | 2色 |
| URB | オーバーサイズシャツ | S/M/L | 2色 |
| URB | テーパードスラックス | S/M/L/XL | 2色 |
| NAT | リネンワンピース | S/M/L | 2色 |
| NAT | オーガニックリブカーディガン | F（フリー） | 2色（低在庫演出） |

**ロケーション（3件）**: EC倉庫（warehouse）/ 本店（store）/ EC共通（online）

**コレクション（3件）**
| タイトル | 種別 | 条件 |
|---|---|---|
| 2026SS 新着 | 手動 | タグ `new` を持つ商品を自動追加 |
| レディース | スマート | product_type = ワンピース |
| 在庫あり | スマート | in_stock = true |

**ブランドページ（1件）**: GENIEE BASIC に image-banner + rich-text セクションを配置

### 投入ヘルパー関数
`seed_one_product(org, brand_code, title, type, gender, season, price, tags, sizes, colors, base_stock)` — サイズ×カラー直積でvariant・inventory_levelを一括生成

---

## 次のアクション（Phase 1 実装開始手順）

1. `create-next-app` でNext.jsプロジェクト作成
2. 依存パッケージインストール（supabase, shadcn/ui, react-hook-form, zod等）
3. Supabase接続設定（環境変数）
4. `supabase_migrations.sql` をリモートプロジェクトに適用
5. `lib/supabase/` クライアント構成
6. 認証フロー（ログイン画面 + `@supabase/ssr`）
7. 管理画面レイアウト（サイドナビ）
8. 各機能ページ実装（ダッシュボード → 商品 → 在庫 → コレクション → ブランド → ブランドページ）
