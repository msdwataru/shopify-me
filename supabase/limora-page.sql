-- =====================================================================
-- LIMORA ブランドページ シードSQL
-- limora-brand.sql 実行済みの状態で実行してください
-- /p/limora で公開プレビューできます
-- =====================================================================

do $$
declare
  v_org      uuid;
  v_brand    uuid;
  v_format   uuid;
  v_page     uuid;
  v_banner   uuid;
  v_rich     uuid;
  v_iwt      uuid;
  v_multicol uuid;
  v_logo     text;
  v_hero     text;
  v_blouse   text;
  v_blazer   text;
  v_trousers text;
begin
  -- 最新ユーザーの org を取得
  select org_id into v_org from app_user order by created_at desc limit 1;
  if v_org is null then
    raise exception 'app_user にユーザーが見つかりません';
  end if;

  select id into v_brand from brand where org_id = v_org and code = 'LIM';
  if v_brand is null then
    raise exception 'LIM ブランドが見つかりません。先に limora-brand.sql を実行してください';
  end if;

  select id into v_format from theme_format where org_id = v_org and name = 'Solid' limit 1;
  if v_format is null then
    raise exception 'Solid テーマフォーマットが見つかりません';
  end if;

  select id into v_banner   from theme_section_def where theme_format_id = v_format and section_type = 'image-banner' limit 1;
  select id into v_rich     from theme_section_def where theme_format_id = v_format and section_type = 'rich-text' limit 1;
  select id into v_iwt      from theme_section_def where theme_format_id = v_format and section_type = 'image-with-text' limit 1;
  select id into v_multicol from theme_section_def where theme_format_id = v_format and section_type = 'multicolumn' limit 1;

  raise notice 'org: %, brand: %, format: %', v_org, v_brand, v_format;
  raise notice 'section defs — banner: %, rich: %, iwt: %, multicolumn: %', v_banner, v_rich, v_iwt, v_multicol;

  -- アップロード済みブランド画像のStorageパス（brand-images バケット, scripts/upload-limora-images.mjs 参照）
  v_logo     := v_org || '/limora/limora-logo.png';
  v_hero     := v_org || '/limora/limora-hero.png';
  v_blouse   := v_org || '/limora/limora-look-blouse.png';
  v_blazer   := v_org || '/limora/limora-look-blazer.png';
  v_trousers := v_org || '/limora/limora-look-trousers.png';

  -- ブランドページを upsert
  insert into brand_page (org_id, brand_id, theme_format_id, handle, status)
  values (v_org, v_brand, v_format, 'limora', 'active')
  on conflict (brand_id) do update set
    handle           = 'limora',
    status           = 'active',
    theme_format_id  = excluded.theme_format_id,
    updated_at       = now()
  returning id into v_page;

  raise notice 'brand_page id: %', v_page;

  -- 既存セクションをクリア（冪等）
  delete from brand_page_section where brand_page_id = v_page;

  -- 0. ヒーローバナー（limora-hero.liquid の見出し・本文・CTA文言を流用）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_banner, 0, jsonb_build_object(
    'image',        v_hero,
    'heading',      'LIMORA',
    'text',         '<p>毎日の服選びを少しだけ軽くする。韓国カジュアル × ナチュラルテイストのデイリーウェア。</p>',
    'button_label', 'コレクションを見る',
    'overlay',      '#4A3F35'
  ), true);

  -- 1. ABOUT / コンセプト（limora-moodboard.liquid のコンセプトステートメント＋リード文）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_rich, 1, jsonb_build_object(
    'heading',   'ABOUT LIMORA',
    'text',      '<p><strong>忙しい毎日に、そっと寄り添う余白。</strong></p>'
                 || '<p>LIMORA（リモラ）は、仕事やプライベートに忙しい日々を送る20代の女性に向けた、'
                 || '韓国カジュアルとナチュラルテイストを融合したデイリーウェアブランドです。<br>'
                 || 'トレンドを程よく取り入れつつも、飽きがこず、長くお気に入りの一着としてクローゼットに残る'
                 || 'タイムレスなデザインを提案。<br>'
                 || '毎朝の服選びが少しだけ軽く、楽しい時間へと変わる体験を届けます。</p>',
    'alignment', 'center'
  ), true);

  -- 2. ブランドキーワード3本柱（limora-moodboard.liquid の Brand Keywords を multicolumn で再構成）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, blocks_values, enabled)
  values (v_org, v_page, v_multicol, 2, jsonb_build_object(
    'heading',          'Brand Keywords',
    'columns_desktop',  '3',
    'alignment',        'center'
  ), jsonb_build_array(
    jsonb_build_object('type', 'column', 'settings', jsonb_build_object(
      'title', 'Natural & Cozy',
      'text',  '<p>飾らない、自然体の自分でいられる、オーガニックな素材感と肌になじむ風合いを追求します。</p>'
    )),
    jsonb_build_object('type', 'column', 'settings', jsonb_build_object(
      'title', 'Soft & Urban',
      'text',  '<p>都会的で洗練されながらも、どこか人懐っこく柔らかい、優しげなアイボリーとベージュの世界観。</p>'
    )),
    jsonb_build_object('type', 'column', 'settings', jsonb_build_object(
      'title', 'Everyday Use',
      'text',  '<p>気張らず毎日手に取れる、快適性とコーディネートのしやすさを最優先したデイリーな提案。</p>'
    ))
  ), true);

  -- 3. ルックブック1: エアリーリネン ボリュームブラウス（limora-lookbook.liquid の実コピーを流用、画像左）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_iwt, 3, jsonb_build_object(
    'image',       v_blouse,
    'heading',     'エアリーリネン ボリュームブラウス',
    'text',        '<p><em>「朝、袖を通した瞬間に、心がすっと軽くなる。そんな一日を、やさしいリネンとともに。」</em></p>'
                   || '<p>洗うたびに肌に柔らかく馴染むオーガニックリネンを100%使用。'
                   || '甘すぎないボリュームスリーブが気になる腕まわりをカバーしながら、都会的な抜け感を演出します。</p>',
    'image_first', true
  ), true);

  -- 4. ルックブック2: リラックスリネン テーラードブレザー（画像右）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_iwt, 4, jsonb_build_object(
    'image',       v_blazer,
    'heading',     'リラックスリネン テーラードブレザー',
    'text',        '<p><em>「肩の力を抜いても、きちんと見える。そんな自分を後押ししてくれる、頼れる一枚。」</em></p>'
                   || '<p>柔らかな質感のリネン混素材で、オンの日もオフの日も心地よく羽織れる一枚。'
                   || 'ベージュの落ち着いた色味が、どんなコーディネートにもなじみます。</p>',
    'image_first', false
  ), true);

  -- 5. ルックブック3: ソフトコットン テーパードスラックス（画像左）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_iwt, 5, jsonb_build_object(
    'image',       v_trousers,
    'heading',     'ソフトコットン テーパードスラックス',
    'text',        '<p><em>「きちんと見えするのに、心地よさはパジャマのまま。リモートワークにも寄り添う美シルエット。」</em></p>'
                   || '<p>ストレッチ性を備えた上質なオーガニックコットン素材。'
                   || '美しいテーパードラインが脚長効果を発揮しつつ、ウエストは後ろゴム仕様でストレスフリーな履き心地です。</p>',
    'image_first', true
  ), true);

  -- 6. ペルソナ紹介（limora-moodboard.liquid の Persona セクションを流用）
  insert into brand_page_section
    (org_id, brand_page_id, theme_section_def_id, position, settings_values, enabled)
  values (v_org, v_page, v_rich, 6, jsonb_build_object(
    'heading',   'Persona — 田中 美咲さん（27歳）',
    'text',      '<p>都内のIT企業に勤務する、トレンド感と居心地の良さを大切にする女性。</p>'
                 || '<p><strong>ライフスタイル:</strong> 週に数日のリモートワーク。休日はお気に入りのカフェ巡り。<br>'
                 || '<strong>購買傾向:</strong> SNS（主にInstagram）の情報収集。シンプルでありながら、'
                 || '細部までデザインにこだわった「少しおしゃれに見える」服を好む。<br>'
                 || '<strong>価値観:</strong> 「何でもない日」の自分をちょっとだけ底上げしてくれる、'
                 || '着心地が良くて洗練されたデイリーウェアを求めている。</p>',
    'alignment', 'left'
  ), true);

  raise notice '完了: /p/limora でプレビューできます';
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
where b.code = 'LIM'
order by s.position;
