-- =====================================================================
-- Solid テーマに不足セクションを追加するマイグレーション
-- 既に supabase_seed_for_user.sql を実行済みの場合に実行してください
-- 冪等設計（何度実行しても安全）
-- =====================================================================

-- Step 1: solid_preset_sections() を最新版（11セクション）に更新
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

-- Step 2: 既存 Solid フォーマットに不足セクションを追加
do $$
declare
  v_fmt  record;
  rec    jsonb;
begin
  for v_fmt in
    select id, org_id from theme_format where name = 'Solid'
  loop
    for rec in
      select * from jsonb_array_elements(solid_preset_sections())
    loop
      insert into theme_section_def
        (org_id, theme_format_id, section_type, name, settings, blocks, presets)
      select
        v_fmt.org_id,
        v_fmt.id,
        rec->>'section_type',
        rec->>'name',
        coalesce(rec->'settings','[]'::jsonb),
        coalesce(rec->'blocks','[]'::jsonb),
        coalesce(rec->'presets','[]'::jsonb)
      where not exists (
        select 1 from theme_section_def t
        where t.theme_format_id = v_fmt.id
          and t.section_type = rec->>'section_type'
      );
    end loop;
    raise notice 'Updated Solid format % for org %', v_fmt.id, v_fmt.org_id;
  end loop;
end $$;

-- Step 3: rich-text の alignment options を修正（古いフォーマットの場合）
update theme_section_def
set settings = (
  select jsonb_agg(
    case
      when s->>'id' = 'alignment'
      then jsonb_set(s, '{options}', '[{"value":"left","label":"左"},{"value":"center","label":"中央"},{"value":"right","label":"右"}]')
      else s
    end
  )
  from jsonb_array_elements(settings) s
)
where section_type = 'rich-text'
  and settings::text like '%"options":["left%';

-- 確認
select
  tf.name as theme,
  tsd.section_type,
  tsd.name,
  jsonb_array_length(tsd.blocks) as block_types
from theme_section_def tsd
join theme_format tf on tf.id = tsd.theme_format_id
order by tf.name, tsd.section_type;
