-- =====================================================================
-- Shopify練習アプリ : シードデータ（サンプルブランド/商品/在庫）
-- バージョン: 1.0  (2026-06-07)
-- 前提: supabase_migrations.sql 実行済み
--
-- 使い方:
--   1) 対象 org_id を決める（既存orgを使う or 下のDOブロックで新規作成）
--   2) このファイルを実行
--   3) Solidフォーマットも投入したい場合は seed_solid_for_org(org) を実行
--
-- 注意:
--   - 学習/デモ用データです。何度実行しても極力安全になるよう
--     code/sku/title の一意性で衝突回避しています。
--   - app_user は auth.users 依存のため、ここでは作成しません
--     （handle_new_user トリガーで作成される想定）。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 対象 org を1つ用意（デモ用orgを find-or-create）
-- ---------------------------------------------------------------------
do $$
declare
  v_org uuid;
begin
  select id into v_org from org where name = 'Demo Apparel Org' limit 1;
  if v_org is null then
    insert into org (name) values ('Demo Apparel Org') returning id into v_org;
  end if;

  -- 後続の anonymous PL/pgSQL から参照できるよう一時設定に保持
  perform set_config('app.seed_org_id', v_org::text, false);

  -- Solidプリセット投入（既に入っていれば内部で重複回避される想定）
  begin
    perform seed_solid_for_org(v_org);
  exception when others then
    raise notice 'seed_solid_for_org skipped: %', sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------
-- 1. ロケーション
-- ---------------------------------------------------------------------
do $$
declare
  v_org uuid := current_setting('app.seed_org_id')::uuid;
begin
  insert into location (org_id, name, kind)
  select v_org, x.name, x.kind
  from (values
    ('EC倉庫',   'warehouse'),
    ('本店',     'store'),
    ('EC共通',   'online')
  ) as x(name, kind)
  where not exists (
    select 1 from location l where l.org_id = v_org and l.name = x.name
  );
end $$;

-- ---------------------------------------------------------------------
-- 2. ブランド（3ブランド）
-- ---------------------------------------------------------------------
do $$
declare
  v_org uuid := current_setting('app.seed_org_id')::uuid;
begin
  insert into brand (org_id, code, name, concept, description, story, sns, display_order, status)
  select v_org, b.code, b.name, b.concept, b.description, b.story, b.sns::jsonb, b.ord, 'active'
  from (values
    ('GNE', 'GENIEE BASIC',
     '上質なデイリーベーシック',
     '長く着られる定番アイテムを、上質な素材とシンプルなデザインで。',
     '2026年スタートのベーシックブランド。環境に配慮した素材を中心に展開。',
     '{"instagram":"https://instagram.com/genieebasic"}', 1),
    ('URB', 'URBAN EDGE',
     '都市生活のためのモードカジュアル',
     'モードとストリートを横断する、都会的なワードローブ。',
     'モノトーンを基調にしたエッジの効いたコレクション。',
     '{"instagram":"https://instagram.com/urbanedge","x":"https://x.com/urbanedge"}', 2),
    ('NAT', 'NATURE LINE',
     'サステナブルなナチュラルウェア',
     'オーガニック素材と自然な色合いで、心地よい毎日を。',
     'リネン・オーガニックコットン中心のリラックスウェア。',
     '{"instagram":"https://instagram.com/natureline"}', 3)
  ) as b(code, name, concept, description, story, sns, ord)
  where not exists (
    select 1 from brand x where x.org_id = v_org and x.code = b.code
  );
end $$;

-- ---------------------------------------------------------------------
-- 3. 商品 + バリエーション + 在庫
--    ヘルパー関数で「商品1点をサイズ×カラー展開し在庫付与」を生成
-- ---------------------------------------------------------------------
create or replace function seed_one_product(
  p_org        uuid,
  p_brand_code text,
  p_title      text,
  p_type       text,
  p_gender     text,
  p_season     text,
  p_price      numeric,
  p_tags       text[],
  p_sizes      text[],
  p_colors     jsonb,        -- [{"name":"Black","abbr":"BLK","code":"#000000"}, ...]
  p_base_stock int
) returns uuid
language plpgsql
as $$
declare
  v_brand_id   uuid;
  v_brand_code text;
  v_product_id uuid;
  v_seq        text;
  v_variant_id uuid;
  v_loc        record;
  v_color      jsonb;
  v_size       text;
  v_sku        text;
begin
  select id, upper(code) into v_brand_id, v_brand_code
  from brand where org_id = p_org and code = p_brand_code;
  if v_brand_id is null then
    raise notice 'brand % not found, skip product %', p_brand_code, p_title;
    return null;
  end if;

  -- 既存ならスキップ（タイトル一意で簡易判定）
  select id into v_product_id from product
   where org_id = p_org and title = p_title;
  if v_product_id is not null then
    return v_product_id;
  end if;

  insert into product (org_id, brand_id, title, description, product_type,
                       gender, season, price, tags, status)
  values (p_org, v_brand_id, p_title,
          p_title || ' — ' || p_type || 'の定番アイテム。',
          p_type, p_gender, p_season, p_price, p_tags, 'active')
  returning id into v_product_id;

  -- 商品連番（org内のproduct件数を流用しゼロ埋め）
  v_seq := lpad((
    select count(*)::text from product where org_id = p_org
  ), 5, '0');

  -- メイン画像（ダミーパス）
  insert into product_image (org_id, product_id, storage_path, position, alt)
  values (p_org, v_product_id,
          p_org::text || '/' || v_product_id::text || '/main.jpg', 0, p_title);

  -- サイズ×カラー 展開
  for v_color in select * from jsonb_array_elements(p_colors)
  loop
    foreach v_size in array p_sizes
    loop
      v_sku := upper(v_brand_code || '-' || v_seq || '-'
               || (v_color->>'abbr') || '-' || v_size);

      insert into variant (org_id, product_id, size, color, color_code, sku, price)
      values (p_org, v_product_id, v_size,
              v_color->>'name', v_color->>'code', v_sku, p_price)
      on conflict (org_id, sku) do nothing
      returning id into v_variant_id;

      if v_variant_id is null then
        select id into v_variant_id from variant
         where org_id = p_org and sku = v_sku;
      end if;

      -- 全ロケーションに在庫付与（サイズで増減を演出）
      for v_loc in select id, kind from location where org_id = p_org
      loop
        insert into inventory_level (org_id, variant_id, location_id,
                                     available, low_stock_threshold)
        values (
          p_org, v_variant_id, v_loc.id,
          greatest(0, p_base_stock
            + case when v_size in ('M','L') then 8 else 0 end
            - case when v_loc.kind = 'store' then 5 else 0 end),
          5
        )
        on conflict (variant_id, location_id) do nothing;
      end loop;
    end loop;
  end loop;

  return v_product_id;
end $$;

-- 商品投入の実行
do $$
declare
  v_org uuid := current_setting('app.seed_org_id')::uuid;
begin
  -- GENIEE BASIC
  perform seed_one_product(v_org,'GNE','オーガニックコットンTシャツ','Tシャツ',
    'unisex','2026SS',4900, array['new','cotton','basic'],
    array['S','M','L','XL'],
    '[{"name":"White","abbr":"WHT","code":"#FFFFFF"},
      {"name":"Black","abbr":"BLK","code":"#000000"},
      {"name":"Navy","abbr":"NVY","code":"#1B2A4A"}]'::jsonb, 30);

  perform seed_one_product(v_org,'GNE','スウェットパーカー','パーカー',
    'unisex','2026SS',8900, array['new','sweat'],
    array['M','L','XL'],
    '[{"name":"Gray","abbr":"GRY","code":"#9AA0A6"},
      {"name":"Black","abbr":"BLK","code":"#000000"}]'::jsonb, 18);

  -- URBAN EDGE
  perform seed_one_product(v_org,'URB','オーバーサイズシャツ','シャツ',
    'men','2026SS',12000, array['mode','street'],
    array['S','M','L'],
    '[{"name":"Black","abbr":"BLK","code":"#000000"},
      {"name":"Charcoal","abbr":"CHR","code":"#36454F"}]'::jsonb, 12);

  perform seed_one_product(v_org,'URB','テーパードスラックス','パンツ',
    'men','2026SS',14000, array['mode'],
    array['S','M','L','XL'],
    '[{"name":"Black","abbr":"BLK","code":"#000000"},
      {"name":"Beige","abbr":"BEG","code":"#C8B89E"}]'::jsonb, 9);

  -- NATURE LINE
  perform seed_one_product(v_org,'NAT','リネンワンピース','ワンピース',
    'women','2026SS',16800, array['linen','natural','new'],
    array['S','M','L'],
    '[{"name":"Ecru","abbr":"ECR","code":"#F0EAD6"},
      {"name":"Sage","abbr":"SGE","code":"#9CAF88"}]'::jsonb, 7);

  perform seed_one_product(v_org,'NAT','オーガニックリブカーディガン','カーディガン',
    'women','2026SS',11800, array['organic','natural'],
    array['F'],
    '[{"name":"Ecru","abbr":"ECR","code":"#F0EAD6"},
      {"name":"Brown","abbr":"BRN","code":"#6F4E37"}]'::jsonb, 4); -- 低在庫演出
end $$;

-- ---------------------------------------------------------------------
-- 4. コレクション（手動 + 自動ルール）
-- ---------------------------------------------------------------------
do $$
declare
  v_org      uuid := current_setting('app.seed_org_id')::uuid;
  v_new      uuid;
  v_sale     uuid;
  v_women    uuid;
begin
  -- 4-1. 手動: 2026SS 新着
  select id into v_new from collection where org_id = v_org and title = '2026SS 新着';
  if v_new is null then
    insert into collection (org_id, title, description, type, position, status)
    values (v_org, '2026SS 新着', '今シーズンの新着アイテム', 'manual', 1, 'active')
    returning id into v_new;
  end if;

  insert into collection_product (collection_id, product_id, org_id, position)
  select v_new, p.id, v_org, row_number() over (order by p.created_at)
  from product p
  where p.org_id = v_org and 'new' = any(p.tags)
  on conflict (collection_id, product_id) do nothing;

  -- 4-2. 自動(smart): レディース
  select id into v_women from collection where org_id = v_org and title = 'レディース';
  if v_women is null then
    insert into collection (org_id, title, description, type, position, status)
    values (v_org, 'レディース', '女性向けアイテム', 'smart', 2, 'active')
    returning id into v_women;

    insert into collection_rule (collection_id, org_id, field, operator, value)
    values (v_women, v_org, 'product_type', 'equals', 'ワンピース');
  end if;

  -- 4-3. 自動(smart): 在庫あり
  select id into v_sale from collection where org_id = v_org and title = '在庫あり';
  if v_sale is null then
    insert into collection (org_id, title, description, type, position, status)
    values (v_org, '在庫あり', '在庫があるアイテム', 'smart', 3, 'active')
    returning id into v_sale;

    insert into collection_rule (collection_id, org_id, field, operator, value)
    values (v_sale, v_org, 'in_stock', 'is_true', null);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. ブランドページ（Solidプリセット使用）
--    GENIEE BASIC に image-banner + rich-text を1枚ずつ配置
-- ---------------------------------------------------------------------
do $$
declare
  v_org        uuid := current_setting('app.seed_org_id')::uuid;
  v_brand      uuid;
  v_format     uuid;
  v_page       uuid;
  v_banner_def uuid;
  v_rich_def   uuid;
begin
  select id into v_brand from brand where org_id = v_org and code = 'GNE';
  select id into v_format from theme_format where org_id = v_org and name = 'Solid' limit 1;

  if v_brand is null or v_format is null then
    raise notice 'brand page seed skipped (brand or Solid format missing)';
    return;
  end if;

  select id into v_banner_def from theme_section_def
   where theme_format_id = v_format and section_type = 'image-banner';
  select id into v_rich_def from theme_section_def
   where theme_format_id = v_format and section_type = 'rich-text';

  select id into v_page from brand_page where brand_id = v_brand;
  if v_page is null then
    insert into brand_page (org_id, brand_id, theme_format_id, handle, status)
    values (v_org, v_brand, v_format, 'geniee-basic', 'active')
    returning id into v_page;
  end if;

  if v_banner_def is not null then
    insert into brand_page_section
      (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
    select v_org, v_page, v_banner_def, 0,
      jsonb_build_object(
        'image',   v_org::text || '/brand/' || v_brand::text || '/hero.jpg',
        'heading', 'GENIEE BASIC',
        'text',    '<p>上質なデイリーベーシック</p>',
        'button_link', '/collections/2026ss'
      ), true
    where not exists (
      select 1 from brand_page_section s
       where s.brand_page_id = v_page and s.theme_section_def_id = v_banner_def
    );
  end if;

  if v_rich_def is not null then
    insert into brand_page_section
      (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
    select v_org, v_page, v_rich_def, 1,
      jsonb_build_object(
        'heading', 'ブランドストーリー',
        'text',    '<p>2026年スタートのベーシックブランド。環境に配慮した素材を中心に展開します。</p>'
      ), true
    where not exists (
      select 1 from brand_page_section s
       where s.brand_page_id = v_page and s.theme_section_def_id = v_rich_def
    );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. 確認用クエリ（任意）
-- ---------------------------------------------------------------------
-- select * from brand        where org_id = current_setting('app.seed_org_id')::uuid;
-- select * from product      where org_id = current_setting('app.seed_org_id')::uuid;
-- select * from product_stock_summary;
-- select c.title, count(cp.*) from collection c
--   left join collection_product cp on cp.collection_id = c.id
--   group by c.title;

-- =====================================================================
-- シード完了
-- =====================================================================
