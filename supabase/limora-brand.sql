-- =====================================================================
-- LIMORA ブランド シードSQL
-- supabase_seed_for_user.sql 実行済みの状態で実行してください
-- 実行後、limora-page.sql を実行するとブランドページが /p/limora で公開プレビューできます
-- =====================================================================

do $$
declare
  v_org   uuid;
  v_brand uuid;
begin
  -- 最新ユーザーの org を取得
  select org_id into v_org from app_user order by created_at desc limit 1;
  if v_org is null then
    raise exception 'app_user にユーザーが見つかりません';
  end if;

  insert into brand (org_id, code, name, logo_path, concept, description, story, sns, status, display_order)
  values (
    v_org,
    'LIM',
    'LIMORA',
    v_org || '/limora/limora-logo.png',
    '忙しい毎日に、そっと寄り添う余白。',
    'LIMORA（リモラ）は、仕事やプライベートに忙しい日々を送る20代の女性に向けた、韓国カジュアルとナチュラルテイストを融合したデイリーウェアブランドです。トレンドを程よく取り入れつつも、飽きがこず、長くお気に入りの一着としてクローゼットに残るタイムレスなデザインを提案。毎朝の服選びが少しだけ軽く、楽しい時間へと変わる体験を届けます。'
    || E'\n\nColor Palette: アイボリー #FAF6F0（45%）／ベージュ #EFE3D3（35%）／セージグリーン #A3B18A（12%）／ブラウン #6B5B4D・#4A3F35（8%）／テラコッタアクセント #C08552'
    || E'\nTypography: 見出し = Jost（シャープで都会的なジオメトリックサンセリフ）／本文 = Poppins（丸みのある柔らかい印象のサンセリフ）',
    'Brand Keywords'
    || E'\n・Natural & Cozy — 飾らない、自然体の自分でいられる、オーガニックな素材感と肌になじむ風合いを追求します。'
    || E'\n・Soft & Urban — 都会的で洗練されながらも、どこか人懐っこく柔らかい、優しげなアイボリーとベージュの世界観。'
    || E'\n・Everyday Use — 気張らず毎日手に取れる、快適性とコーディネートのしやすさを最優先したデイリーな提案。'
    || E'\n\nPersona: 田中 美咲 さん（27歳）— 都内のIT企業に勤務する、トレンド感と居心地の良さを大切にする女性。'
    || E'\n・ライフスタイル: 週に数日のリモートワーク。休日はお気に入りのカフェ巡り。'
    || E'\n・購買傾向: SNS（主にInstagram）の情報収集。シンプルでありながら、細部までデザインにこだわった「少しおしゃれに見える」服を好む。'
    || E'\n・価値観: 「何でもない日」の自分をちょっとだけ底上げしてくれる、着心地が良くて洗練されたデイリーウェアを求めている。',
    '{}'::jsonb,
    'active',
    10
  )
  on conflict (org_id, code) do update set
    name        = excluded.name,
    logo_path   = excluded.logo_path,
    concept     = excluded.concept,
    description = excluded.description,
    story       = excluded.story,
    status      = excluded.status,
    updated_at  = now()
  returning id into v_brand;

  raise notice 'brand id: %', v_brand;
end $$;
