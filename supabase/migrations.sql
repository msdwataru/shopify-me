-- =====================================================================
-- Shopify練習アプリ DBマイグレーション一式 (Supabase / Postgres)
-- Version : 1.0
-- Date    : 2026-06-07
-- 前提     : 詳細設計書 v1.0 / Phase1(MVP) 範囲 + Phase3連携用カラムは確保
-- 方針     : 全業務テーブルに org_id、RLS有効化、auth.uid()ベースの分離
-- 適用順   : 本ファイルを上から順に実行（1ファイルで完結）
--
-- 推奨運用 : supabase/migrations/ に分割保存しても良い。
--           その場合は (0)extensions → (1)core → (2)domain → (3)brandpage
--           → (4)log → (5)functions/triggers → (6)rls → (7)seed の順。
-- =====================================================================


-- =====================================================================
-- 0) 拡張機能
-- =====================================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid()


-- =====================================================================
-- 1) 共通: updated_at 自動更新トリガー関数
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =====================================================================
-- 2) 認可ヘルパー関数 (RLSから利用)
--    SECURITY DEFINER でapp_userを参照し、再帰RLSを回避
-- =====================================================================

-- 現在ユーザーの org_id を返す
create or replace function public.current_org_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select org_id from public.app_user where id = auth.uid());
end;
$$;

-- 現在ユーザーの role を返す
create or replace function public.current_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (select role from public.app_user where id = auth.uid());
end;
$$;

-- 編集権限(admin/editor)があるか
create or replace function public.can_write()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (select role from public.app_user where id = auth.uid()) in ('admin','editor'),
    false
  );
end;
$$;

-- 管理者か
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (select role from public.app_user where id = auth.uid()) = 'admin',
    false
  );
end;
$$;


-- =====================================================================
-- 3) コアテーブル: org / app_user
-- =====================================================================

create table public.org (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.app_user (
  id            uuid primary key references auth.users(id) on delete cascade,
  org_id        uuid not null references public.org(id) on delete cascade,
  email         text not null,
  display_name  text,
  role          text not null default 'editor'
                check (role in ('admin','editor','viewer')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_app_user_org on public.app_user(org_id);

create trigger trg_org_updated
  before update on public.org
  for each row execute function public.set_updated_at();

create trigger trg_app_user_updated
  before update on public.app_user
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 4) ブランド
-- =====================================================================

create table public.brand (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.org(id) on delete cascade,
  code                  text not null,
  name                  text not null,
  logo_path             text,
  hero_image_path       text,
  concept               text,
  description           text,
  story                 text,
  sns                   jsonb not null default '{}'::jsonb,
  external_url          text,
  display_order         int not null default 0,
  status                text not null default 'draft'
                        check (status in ('draft','active')),
  -- Phase3連携用 (今は未使用)
  shopify_metaobject_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, code)
);

create index idx_brand_org on public.brand(org_id);
create index idx_brand_status on public.brand(org_id, status);

create trigger trg_brand_updated
  before update on public.brand
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 5) 商品 / 画像 / バリエーション
-- =====================================================================

create table public.product (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.org(id) on delete cascade,
  brand_id            uuid references public.brand(id) on delete set null,
  title               text not null,
  description         text,
  product_type        text,
  gender              text check (gender in ('men','women','unisex','kids')),
  season              text,
  price               numeric(12,2) check (price >= 0),
  compare_at_price    numeric(12,2) check (compare_at_price >= 0),
  tags                text[] not null default '{}',
  status              text not null default 'draft'
                      check (status in ('draft','active')),
  shopify_product_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_product_org on public.product(org_id);
create index idx_product_brand on public.product(brand_id);
create index idx_product_status on public.product(org_id, status);
create index idx_product_tags on public.product using gin(tags);

create trigger trg_product_updated
  before update on public.product
  for each row execute function public.set_updated_at();


create table public.product_image (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.org(id) on delete cascade,
  product_id    uuid not null references public.product(id) on delete cascade,
  storage_path  text not null,
  position      int not null default 0,
  alt           text,
  created_at    timestamptz not null default now()
);

create index idx_product_image_product on public.product_image(product_id);


create table public.variant (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.org(id) on delete cascade,
  product_id          uuid not null references public.product(id) on delete cascade,
  size                text,
  color               text,
  color_code          text,
  sku                 text not null,
  barcode             text,
  price               numeric(12,2) check (price >= 0),  -- null時はproduct.priceを使用
  shopify_variant_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, sku)
);

create index idx_variant_product on public.variant(product_id);

create trigger trg_variant_updated
  before update on public.variant
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 6) ロケーション / 在庫
-- =====================================================================

create table public.location (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.org(id) on delete cascade,
  name                text not null,
  kind                text not null default 'warehouse'
                      check (kind in ('warehouse','store','online')),
  shopify_location_id text,
  created_at          timestamptz not null default now()
);

create index idx_location_org on public.location(org_id);


create table public.inventory_level (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.org(id) on delete cascade,
  variant_id           uuid not null references public.variant(id) on delete cascade,
  location_id          uuid not null references public.location(id) on delete cascade,
  available            int not null default 0 check (available >= 0),
  low_stock_threshold  int not null default 0 check (low_stock_threshold >= 0),
  updated_at           timestamptz not null default now(),
  unique (variant_id, location_id)
);

create index idx_inventory_variant on public.inventory_level(variant_id);
create index idx_inventory_location on public.inventory_level(location_id);

create trigger trg_inventory_updated
  before update on public.inventory_level
  for each row execute function public.set_updated_at();


create table public.inventory_adjustment (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.org(id) on delete cascade,
  variant_id   uuid not null references public.variant(id) on delete cascade,
  location_id  uuid not null references public.location(id) on delete cascade,
  delta        int not null,
  reason       text not null check (reason in ('inbound','outbound','adjust')),
  created_by   uuid references public.app_user(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index idx_adjustment_variant on public.inventory_adjustment(variant_id);


-- =====================================================================
-- 7) コレクション
-- =====================================================================

create table public.collection (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.org(id) on delete cascade,
  title                 text not null,
  description           text,
  type                  text not null default 'manual'
                        check (type in ('manual','smart')),
  position              int not null default 0,
  status                text not null default 'active'
                        check (status in ('draft','active')),
  shopify_collection_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_collection_org on public.collection(org_id);

create trigger trg_collection_updated
  before update on public.collection
  for each row execute function public.set_updated_at();


create table public.collection_product (
  collection_id  uuid not null references public.collection(id) on delete cascade,
  product_id     uuid not null references public.product(id) on delete cascade,
  org_id         uuid not null references public.org(id) on delete cascade,
  position       int not null default 0,
  primary key (collection_id, product_id)
);

create index idx_collection_product_product on public.collection_product(product_id);


create table public.collection_rule (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.org(id) on delete cascade,
  collection_id  uuid not null references public.collection(id) on delete cascade,
  field          text not null
                 check (field in ('brand','tag','product_type','season','in_stock')),
  operator       text not null
                 check (operator in ('equals','contains','is_true')),
  value          text,
  created_at     timestamptz not null default now()
);

create index idx_collection_rule_collection on public.collection_rule(collection_id);


-- =====================================================================
-- 8) テーマフォーマット / ブランドページ (Solid等プリセット前提)
-- =====================================================================

create table public.theme_format (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.org(id) on delete cascade,
  name        text not null,                       -- "Solid"
  source      text not null default 'preset'
              check (source in ('preset','upload','api')),
  raw_schema  jsonb,
  created_at  timestamptz not null default now()
);

create index idx_theme_format_org on public.theme_format(org_id);


create table public.theme_section_def (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.org(id) on delete cascade,
  theme_format_id  uuid not null references public.theme_format(id) on delete cascade,
  section_type     text not null,                  -- "image-banner" 等
  name             text not null,
  settings         jsonb not null default '[]'::jsonb,  -- schema.settings
  blocks           jsonb not null default '[]'::jsonb,
  presets          jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

create index idx_section_def_format on public.theme_section_def(theme_format_id);


create table public.brand_page (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.org(id) on delete cascade,
  brand_id         uuid not null references public.brand(id) on delete cascade,
  theme_format_id  uuid references public.theme_format(id) on delete set null,
  handle           text,
  status           text not null default 'draft'
                   check (status in ('draft','active')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (brand_id)
);

create index idx_brand_page_org on public.brand_page(org_id);

create trigger trg_brand_page_updated
  before update on public.brand_page
  for each row execute function public.set_updated_at();


create table public.brand_page_section (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.org(id) on delete cascade,
  brand_page_id         uuid not null references public.brand_page(id) on delete cascade,
  theme_section_def_id  uuid not null references public.theme_section_def(id) on delete cascade,
  position              int not null default 0,
  settings_values       jsonb not null default '{}'::jsonb,
  blocks_values         jsonb not null default '[]'::jsonb,
  enabled               boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_page_section_page on public.brand_page_section(brand_page_id);

create trigger trg_page_section_updated
  before update on public.brand_page_section
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 9) 操作履歴
-- =====================================================================

create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.org(id) on delete cascade,
  actor       uuid references public.app_user(id) on delete set null,
  action      text not null,         -- create/update/delete/sync
  entity      text not null,         -- product/variant/...
  entity_id   uuid,
  diff        jsonb,
  created_at  timestamptz not null default now()
);

create index idx_activity_org on public.activity_log(org_id, created_at desc);


-- =====================================================================
-- 10) 新規ユーザー自動プロビジョニング
--     auth.users 追加時に org とapp_user(admin)を自動作成
--     ※練習アプリ向け。1ユーザー=1org(個人/学習グループ)運用。
--     ※招待ベースに変える場合はこのトリガーを無効化し別フローへ。
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.org (name)
  values (coalesce(new.raw_user_meta_data->>'org_name', new.email) || ' のワークスペース')
  returning id into new_org_id;

  insert into public.app_user (id, org_id, email, display_name, role)
  values (
    new.id,
    new_org_id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    'admin'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- 11) RLS 有効化 + ポリシー
--     パターン:
--       SELECT : 同一org
--       WRITE  : 同一org かつ can_write() (admin/editor)
--     ※app_userのみ自分行参照 + adminによるorg内管理を許可
-- =====================================================================

-- ---- org -------------------------------------------------------------
alter table public.org enable row level security;

create policy org_select on public.org
  for select using (id = public.current_org_id());

create policy org_update on public.org
  for update using (id = public.current_org_id() and public.is_admin())
  with check (id = public.current_org_id());

-- ---- app_user --------------------------------------------------------
alter table public.app_user enable row level security;

create policy app_user_select on public.app_user
  for select using (org_id = public.current_org_id());

create policy app_user_admin_write on public.app_user
  for all using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id());


-- ---- 汎用ポリシー生成 (org_idを持つ全業務テーブル) -------------------
-- 各テーブルに同型のSELECT/INSERT/UPDATE/DELETEポリシーを付与する。
do $$
declare
  t text;
  business_tables text[] := array[
    'brand','product','product_image','variant',
    'location','inventory_level','inventory_adjustment',
    'collection','collection_product','collection_rule',
    'theme_format','theme_section_def',
    'brand_page','brand_page_section','activity_log'
  ];
begin
  foreach t in array business_tables loop
    execute format('alter table public.%I enable row level security;', t);

    -- SELECT: 同一org
    execute format($f$
      create policy %1$s_select on public.%1$I
      for select using (org_id = public.current_org_id());
    $f$, t);

    -- INSERT: 同一org かつ 書込権限
    execute format($f$
      create policy %1$s_insert on public.%1$I
      for insert with check (org_id = public.current_org_id() and public.can_write());
    $f$, t);

    -- UPDATE: 同一org かつ 書込権限
    execute format($f$
      create policy %1$s_update on public.%1$I
      for update using (org_id = public.current_org_id() and public.can_write())
      with check (org_id = public.current_org_id());
    $f$, t);

    -- DELETE: 同一org かつ 書込権限
    execute format($f$
      create policy %1$s_delete on public.%1$I
      for delete using (org_id = public.current_org_id() and public.can_write());
    $f$, t);
  end loop;
end $$;

-- 備考: activity_log はアプリ(サーバ)側からのみ書き込む想定。
--       上記INSERTポリシーで editor/admin の挿入を許可。改ざん防止のため
--       UPDATE/DELETE を実質禁止したい場合は下記で締める。
drop policy if exists activity_log_update on public.activity_log;
drop policy if exists activity_log_delete on public.activity_log;
create policy activity_log_admin_purge on public.activity_log
  for delete using (org_id = public.current_org_id() and public.is_admin());


-- =====================================================================
-- 12) Storage バケット (商品画像 / ブランド画像)
--     RLS相当のStorageポリシーを付与
-- =====================================================================

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', false),
  ('brand-images',   'brand-images',   false)
on conflict (id) do nothing;

-- パス規約: {org_id}/{...}/{filename}
-- 認証ユーザーは自org配下のオブジェクトのみ読み書き可
create policy "storage_select_own_org"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('product-images','brand-images')
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy "storage_insert_own_org"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('product-images','brand-images')
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.can_write()
  );

create policy "storage_update_own_org"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('product-images','brand-images')
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.can_write()
  );

create policy "storage_delete_own_org"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('product-images','brand-images')
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.can_write()
  );


-- =====================================================================
-- 13) スマートコレクション評価ビュー(任意・参考)
--     ルールはアプリ側で組み立てる想定だが、in_stock集計用の補助ビュー。
-- =====================================================================

create or replace view public.product_stock_summary as
select
  p.id          as product_id,
  p.org_id      as org_id,
  coalesce(sum(il.available), 0) as total_available
from public.product p
left join public.variant v on v.product_id = p.id
left join public.inventory_level il on il.variant_id = v.id
group by p.id, p.org_id;
-- ※ビューはベーステーブルのRLSを継承（security_invoker想定環境）。
--   Supabaseでビューにinvoker権限を効かせる場合:
--   alter view public.product_stock_summary set (security_invoker = true);
alter view public.product_stock_summary set (security_invoker = true);


-- =====================================================================
-- 14) シードデータ: Solidプリセットのセクション定義
--     org非依存のテンプレ原本として保持したいが、本設計はorg_id必須のため
--     「新規org作成時にコピーする」運用を推奨。
--     ここでは参照用にプリセットschema(JSON)を関数で提供する。
-- =====================================================================

-- Solid代表セクションのschema(JSON)を返す。アプリ初期化時にorgへ流し込む。
create or replace function public.solid_preset_sections()
returns jsonb
language sql
immutable
as $$
  select '[
    {
      "section_type": "announcement-bar",
      "name": "Announcement bar",
      "settings": [
        {"type":"text","id":"text","label":"テキスト"},
        {"type":"url","id":"link","label":"リンク"},
        {"type":"color","id":"background_color","label":"背景色"},
        {"type":"color","id":"text_color","label":"テキスト色"}
      ],
      "blocks": [],
      "presets": [{"name":"Announcement bar"}]
    },
    {
      "section_type": "image-banner",
      "name": "Image banner",
      "settings": [
        {"type":"image_picker","id":"image","label":"背景画像"},
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"richtext","id":"text","label":"本文"},
        {"type":"color","id":"overlay","label":"オーバーレイ色"},
        {"type":"url","id":"button_link","label":"ボタンリンク"},
        {"type":"text","id":"button_label","label":"ボタンラベル"}
      ],
      "blocks": [],
      "presets": [{"name":"Image banner"}]
    },
    {
      "section_type": "slideshow",
      "name": "Slideshow",
      "settings": [
        {"type":"checkbox","id":"autoplay","label":"自動再生"},
        {"type":"range","id":"delay","label":"切り替え間隔(秒)","min":3,"max":9,"step":1,"default":5}
      ],
      "blocks": [
        {
          "type": "slide",
          "name": "スライド",
          "settings": [
            {"type":"image_picker","id":"image","label":"画像"},
            {"type":"text","id":"heading","label":"見出し"},
            {"type":"richtext","id":"text","label":"本文"},
            {"type":"text","id":"button_label","label":"ボタンテキスト"},
            {"type":"url","id":"button_link","label":"ボタンリンク"},
            {"type":"color","id":"overlay","label":"オーバーレイ色"}
          ]
        }
      ],
      "presets": [{"name":"Slideshow"}]
    },
    {
      "section_type": "rich-text",
      "name": "Rich text",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"richtext","id":"text","label":"本文"},
        {"type":"select","id":"alignment","label":"配置","options":[{"value":"left","label":"左"},{"value":"center","label":"中央"},{"value":"right","label":"右"}]}
      ],
      "blocks": [],
      "presets": [{"name":"Rich text"}]
    },
    {
      "section_type": "image-with-text",
      "name": "Image with text",
      "settings": [
        {"type":"image_picker","id":"image","label":"画像"},
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"richtext","id":"text","label":"本文"},
        {"type":"checkbox","id":"image_first","label":"画像を左に配置"}
      ],
      "blocks": [],
      "presets": [{"name":"Image with text"}]
    },
    {
      "section_type": "multicolumn",
      "name": "Multicolumn",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"select","id":"columns_desktop","label":"列数","options":[{"value":"2","label":"2列"},{"value":"3","label":"3列"},{"value":"4","label":"4列"}]},
        {"type":"select","id":"alignment","label":"テキスト配置","options":[{"value":"left","label":"左"},{"value":"center","label":"中央"}]}
      ],
      "blocks": [
        {
          "type": "column",
          "name": "カラム",
          "settings": [
            {"type":"image_picker","id":"image","label":"画像"},
            {"type":"text","id":"title","label":"タイトル"},
            {"type":"richtext","id":"text","label":"テキスト"},
            {"type":"url","id":"link","label":"リンク"}
          ]
        }
      ],
      "presets": [{"name":"Multicolumn"}]
    },
    {
      "section_type": "featured-collection",
      "name": "Featured collection",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"collection","id":"collection","label":"対象コレクション"},
        {"type":"range","id":"products_to_show","label":"表示件数","min":2,"max":12,"step":1,"default":4}
      ],
      "blocks": [],
      "presets": [{"name":"Featured collection"}]
    },
    {
      "section_type": "featured-product",
      "name": "Featured product",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"product","id":"product","label":"対象商品"},
        {"type":"checkbox","id":"show_description","label":"説明文を表示"},
        {"type":"checkbox","id":"show_price","label":"価格を表示"},
        {"type":"text","id":"button_label","label":"ボタンテキスト"}
      ],
      "blocks": [],
      "presets": [{"name":"Featured product"}]
    },
    {
      "section_type": "newsletter",
      "name": "Email signup",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"richtext","id":"description","label":"説明文"},
        {"type":"text","id":"button_label","label":"ボタンテキスト"}
      ],
      "blocks": [],
      "presets": [{"name":"Email signup"}]
    },
    {
      "section_type": "collapsible-content",
      "name": "Collapsible content",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"checkbox","id":"open_first","label":"最初の項目を展開"}
      ],
      "blocks": [
        {
          "type": "item",
          "name": "項目",
          "settings": [
            {"type":"text","id":"title","label":"タイトル（質問）"},
            {"type":"richtext","id":"content","label":"内容（回答）"}
          ]
        }
      ],
      "presets": [{"name":"Collapsible content"}]
    },
    {
      "section_type": "video",
      "name": "Video",
      "settings": [
        {"type":"text","id":"heading","label":"見出し"},
        {"type":"richtext","id":"description","label":"説明"},
        {"type":"image_picker","id":"cover_image","label":"カバー画像"},
        {"type":"url","id":"video_url","label":"動画URL (YouTube/Vimeo)"},
        {"type":"checkbox","id":"full_width","label":"全幅表示"}
      ],
      "blocks": [],
      "presets": [{"name":"Video"}]
    }
  ]'::jsonb;
$$;

-- org初期化ヘルパー: 指定orgにSolidフォーマットとセクション定義を投入
create or replace function public.seed_solid_for_org(target_org uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fmt_id uuid;
  rec jsonb;
begin
  insert into public.theme_format (org_id, name, source, raw_schema)
  values (target_org, 'Solid', 'preset', public.solid_preset_sections())
  returning id into fmt_id;

  for rec in select * from jsonb_array_elements(public.solid_preset_sections())
  loop
    insert into public.theme_section_def
      (org_id, theme_format_id, section_type, name, settings, blocks, presets)
    values (
      target_org,
      fmt_id,
      rec->>'section_type',
      rec->>'name',
      coalesce(rec->'settings','[]'::jsonb),
      coalesce(rec->'blocks','[]'::jsonb),
      coalesce(rec->'presets','[]'::jsonb)
    );
  end loop;

  return fmt_id;
end;
$$;

-- 使い方:
--   select public.seed_solid_for_org('<org_id>');
-- 新規org作成時(handle_new_user内)に組み込んでもよい。


-- =====================================================================
-- 15) ロールバック (参考・コメント)
-- =====================================================================
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop schema public cascade; create schema public;  -- ※全削除。注意。
-- =====================================================================
-- END
-- =====================================================================
