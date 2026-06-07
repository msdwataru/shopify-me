-- =====================================================================
-- URBAN EDGE ブランドページ シードSQL
-- supabase_seed_for_user.sql 実行済みの状態で実行してください
-- /p/urban-edge で公開プレビューできます
-- =====================================================================

do $$
declare
  v_org    uuid;
  v_brand  uuid;
  v_format uuid;
  v_page   uuid;
  v_banner uuid;
  v_rich   uuid;
  v_iwt    uuid;
begin
  -- 最新ユーザーの org を取得
  select org_id into v_org from app_user order by created_at desc limit 1;
  if v_org is null then
    raise exception 'app_user にユーザーが見つかりません';
  end if;

  select id into v_brand from brand where org_id = v_org and code = 'URB';
  if v_brand is null then
    raise exception 'URB ブランドが見つかりません。先に supabase_seed_for_user.sql を実行してください';
  end if;

  select id into v_format from theme_format where org_id = v_org and name = 'Solid' limit 1;
  if v_format is null then
    raise exception 'Solid テーマフォーマットが見つかりません';
  end if;

  select id into v_banner from theme_section_def
    where theme_format_id = v_format and section_type = 'image-banner' limit 1;
  select id into v_rich from theme_section_def
    where theme_format_id = v_format and section_type = 'rich-text' limit 1;
  select id into v_iwt from theme_section_def
    where theme_format_id = v_format and section_type = 'image-with-text' limit 1;

  raise notice 'org: %, brand: %, format: %', v_org, v_brand, v_format;
  raise notice 'section defs — banner: %, rich: %, iwt: %', v_banner, v_rich, v_iwt;

  -- ブランドページを upsert
  insert into brand_page (org_id, brand_id, theme_format_id, handle, status)
  values (v_org, v_brand, v_format, 'urban-edge', 'active')
  on conflict (brand_id) do update set
    handle           = 'urban-edge',
    status           = 'active',
    theme_format_id  = excluded.theme_format_id,
    updated_at       = now()
  returning id into v_page;

  raise notice 'brand_page id: %', v_page;

  -- 既存セクションをクリア（冪等）
  delete from brand_page_section where brand_page_id = v_page;

  -- 1. ヒーローバナー: グラフィティ壁×黒ジャケット男性
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_banner, 0, jsonb_build_object(
    'image',        'https://images.unsplash.com/photo-1586231912972-d0970f9ce787?w=1200&q=80',
    'heading',      'URBAN EDGE',
    'text',         '<p>都市に刻む、モードとストリートの交差点</p>',
    'button_label', '2026 S/S を見る',
    'overlay',      '#0a0a0a'
  ), true);

  -- 2. ブランド哲学 (rich-text, center)
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_rich, 1, jsonb_build_object(
    'heading',   'ABOUT URBAN EDGE',
    'text',      '<p>モードとストリートカルチャーが交わる場所に、URBAN EDGEは立つ。<br><br>都市に生きるすべての人へ。<br>洗練されたシルエットと、街に溶け込む無骨なリアリティ。<br><br>モノトーンを基調に、エッジの効いたデザインで<br>都会のワードローブを再定義する。</p>',
    'alignment', 'center'
  ), true);

  -- 3. オーバーサイズシャツ (image-with-text, 画像左)
  --    黒コート×ハット×幾何学的背景（エディトリアル）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_iwt, 2, jsonb_build_object(
    'image',       'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=1200&q=80',
    'heading',     'OVERSIZED SHIRTS',
    'text',        '<p>都市の輪郭をなぞる、ゆとりあるシルエット。<br>ブラックとチャコール、2つのダークトーンで描く静謐な存在感。</p>',
    'image_first', true
  ), true);

  -- 4. テーパードスラックス (image-with-text, 画像右)
  --    白アウトフィット×壁画ストリートアート
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_iwt, 3, jsonb_build_object(
    'image',       'https://images.unsplash.com/photo-1566206091558-7f218b696731?w=1200&q=80',
    'heading',     'TAPERED SLACKS',
    'text',        '<p>エッジの効いたテーパードラインが、都市の動線に沿う。<br>ブラックとベージュ——相反する2色が生むコントラスト。</p>',
    'image_first', false
  ), true);

  -- 5. シーズンCTAバナー: ニューヨーク摩天楼街路
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_banner, 4, jsonb_build_object(
    'image',        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
    'heading',      '2026 SPRING / SUMMER',
    'text',         '<p>新しい都市の美学を、あなたのクローゼットへ。</p>',
    'button_label', 'COLLECTION',
    'overlay',      '#1a1a1a'
  ), true);

  raise notice '完了: /p/urban-edge でプレビューできます';
end $$;

-- 確認クエリ
select
  s.position,
  d.section_type,
  s.enabled,
  s.settings_values->>'heading' as heading
from brand_page_section s
join theme_section_def d on d.id = s.theme_section_def_id
join brand_page p on p.id = s.brand_page_id
join brand b on b.id = p.brand_id
where b.code = 'URB'
order by s.position;
