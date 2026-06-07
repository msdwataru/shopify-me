// =====================================================================
// Shopify練習アプリ : DBスキーマ TypeScript型定義
// バージョン: 1.0 (2026-06-07)
// 前提: supabase_migrations.sql のスキーマに対応
//
// 使い方:
//   - Supabase CLIの自動生成(`supabase gen types typescript`)に近い形で
//     Database 型を提供。createClient<Database>(...) に渡して型安全に。
//   - 列挙はアプリ全体で再利用できるよう Enums としても公開。
// =====================================================================

// ---------------------------------------------------------------------
// 列挙型（CHECK制約に対応）
// ---------------------------------------------------------------------
export type UserRole = 'admin' | 'editor' | 'viewer';
export type Gender = 'men' | 'women' | 'unisex' | 'kids';
export type ProductStatus = 'draft' | 'active';
export type BrandStatus = 'draft' | 'active';
export type CollectionType = 'manual' | 'smart';
export type CollectionStatus = 'draft' | 'active';
export type LocationKind = 'warehouse' | 'store' | 'online';
export type AdjustmentReason = 'inbound' | 'outbound' | 'adjust';
export type ThemeFormatSource = 'preset' | 'upload' | 'api';
export type BrandPageStatus = 'draft' | 'active';
export type CollectionRuleField =
  | 'brand' | 'tag' | 'product_type' | 'season' | 'in_stock';
export type CollectionRuleOperator = 'equals' | 'contains' | 'is_true';

// ---------------------------------------------------------------------
// 補助型
// ---------------------------------------------------------------------
export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

/** brand.sns に入れる構造（jsonb） */
export interface BrandSns {
  instagram?: string;
  x?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

/** theme_section_def.settings の各要素（Shopify section schema設定に対応） */
export interface ThemeSettingDef {
  type:
    | 'text' | 'textarea' | 'richtext' | 'image_picker' | 'color'
    | 'url' | 'select' | 'checkbox' | 'range' | 'product' | 'collection';
  id: string;
  label: string;
  default?: Json;
  options?: { value: string; label: string }[]; // select用
  min?: number; max?: number; step?: number;     // range用
}

/** theme_section_def.blocks の各要素 */
export interface ThemeBlockDef {
  type: string;
  name: string;
  settings: ThemeSettingDef[];
}

/** brand_page_section.settings_values（setting id -> 値） */
export type SectionSettingsValues = Record<string, Json>;

/** brand_page_section.blocks_values */
export interface SectionBlockValue {
  type: string;
  settings: SectionSettingsValues;
}

// =====================================================================
// Supabase Database 型
// =====================================================================
export interface Database {
  public: {
    Tables: {
      org: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };

      app_user: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          display_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          email: string;
          display_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          display_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'app_user_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] }
        ];
      };

      brand: {
        Row: {
          id: string;
          org_id: string;
          code: string;
          name: string;
          logo_path: string | null;
          hero_image_path: string | null;
          concept: string | null;
          description: string | null;
          story: string | null;
          sns: BrandSns;
          external_url: string | null;
          display_order: number;
          status: BrandStatus;
          shopify_metaobject_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          code: string;
          name: string;
          logo_path?: string | null;
          hero_image_path?: string | null;
          concept?: string | null;
          description?: string | null;
          story?: string | null;
          sns?: BrandSns;
          external_url?: string | null;
          display_order?: number;
          status?: BrandStatus;
          shopify_metaobject_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['brand']['Insert']>;
        Relationships: [
          { foreignKeyName: 'brand_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] }
        ];
      };

      product: {
        Row: {
          id: string;
          org_id: string;
          brand_id: string | null;
          title: string;
          description: string | null;
          product_type: string | null;
          gender: Gender | null;
          season: string | null;
          price: number | null;
          compare_at_price: number | null;
          tags: string[];
          status: ProductStatus;
          shopify_product_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          brand_id?: string | null;
          title: string;
          description?: string | null;
          product_type?: string | null;
          gender?: Gender | null;
          season?: string | null;
          price?: number | null;
          compare_at_price?: number | null;
          tags?: string[];
          status?: ProductStatus;
          shopify_product_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['product']['Insert']>;
        Relationships: [
          { foreignKeyName: 'product_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] },
          { foreignKeyName: 'product_brand_id_fkey'; columns: ['brand_id'];
            referencedRelation: 'brand'; referencedColumns: ['id'] }
        ];
      };

      product_image: {
        Row: {
          id: string;
          org_id: string;
          product_id: string;
          storage_path: string;
          position: number;
          alt: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          product_id: string;
          storage_path: string;
          position?: number;
          alt?: string | null;
        };
        Update: Partial<Database['public']['Tables']['product_image']['Insert']>;
        Relationships: [
          { foreignKeyName: 'product_image_product_id_fkey'; columns: ['product_id'];
            referencedRelation: 'product'; referencedColumns: ['id'] }
        ];
      };

      variant: {
        Row: {
          id: string;
          org_id: string;
          product_id: string;
          size: string | null;
          color: string | null;
          color_code: string | null;
          sku: string;
          barcode: string | null;
          price: number | null;
          shopify_variant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          product_id: string;
          size?: string | null;
          color?: string | null;
          color_code?: string | null;
          sku: string;
          barcode?: string | null;
          price?: number | null;
          shopify_variant_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['variant']['Insert']>;
        Relationships: [
          { foreignKeyName: 'variant_product_id_fkey'; columns: ['product_id'];
            referencedRelation: 'product'; referencedColumns: ['id'] }
        ];
      };

      location: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          kind: LocationKind;
          shopify_location_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          kind?: LocationKind;
          shopify_location_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['location']['Insert']>;
        Relationships: [
          { foreignKeyName: 'location_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] }
        ];
      };

      inventory_level: {
        Row: {
          id: string;
          org_id: string;
          variant_id: string;
          location_id: string;
          available: number;
          low_stock_threshold: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          variant_id: string;
          location_id: string;
          available?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory_level']['Insert']>;
        Relationships: [
          { foreignKeyName: 'inventory_level_variant_id_fkey'; columns: ['variant_id'];
            referencedRelation: 'variant'; referencedColumns: ['id'] },
          { foreignKeyName: 'inventory_level_location_id_fkey'; columns: ['location_id'];
            referencedRelation: 'location'; referencedColumns: ['id'] }
        ];
      };

      inventory_adjustment: {
        Row: {
          id: string;
          org_id: string;
          variant_id: string;
          location_id: string;
          delta: number;
          reason: AdjustmentReason | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          variant_id: string;
          location_id: string;
          delta: number;
          reason?: AdjustmentReason | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory_adjustment']['Insert']>;
        Relationships: [
          { foreignKeyName: 'inventory_adjustment_variant_id_fkey'; columns: ['variant_id'];
            referencedRelation: 'variant'; referencedColumns: ['id'] }
        ];
      };

      collection: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          description: string | null;
          type: CollectionType;
          position: number;
          status: CollectionStatus;
          shopify_collection_id: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          title: string;
          description?: string | null;
          type?: CollectionType;
          position?: number;
          status?: CollectionStatus;
          shopify_collection_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['collection']['Insert']>;
        Relationships: [
          { foreignKeyName: 'collection_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] }
        ];
      };

      collection_product: {
        Row: {
          collection_id: string;
          product_id: string;
          org_id: string;
          position: number;
        };
        Insert: {
          collection_id: string;
          product_id: string;
          org_id: string;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['collection_product']['Insert']>;
        Relationships: [
          { foreignKeyName: 'collection_product_collection_id_fkey';
            columns: ['collection_id'];
            referencedRelation: 'collection'; referencedColumns: ['id'] },
          { foreignKeyName: 'collection_product_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'product'; referencedColumns: ['id'] }
        ];
      };

      collection_rule: {
        Row: {
          id: string;
          org_id: string;
          collection_id: string;
          field: CollectionRuleField;
          operator: CollectionRuleOperator;
          value: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          collection_id: string;
          field: CollectionRuleField;
          operator: CollectionRuleOperator;
          value?: string | null;
        };
        Update: Partial<Database['public']['Tables']['collection_rule']['Insert']>;
        Relationships: [
          { foreignKeyName: 'collection_rule_collection_id_fkey';
            columns: ['collection_id'];
            referencedRelation: 'collection'; referencedColumns: ['id'] }
        ];
      };

      theme_format: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          source: ThemeFormatSource;
          raw_schema: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          source?: ThemeFormatSource;
          raw_schema?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['theme_format']['Insert']>;
        Relationships: [
          { foreignKeyName: 'theme_format_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] }
        ];
      };

      theme_section_def: {
        Row: {
          id: string;
          theme_format_id: string;
          section_type: string;
          name: string;
          settings: ThemeSettingDef[];
          blocks: ThemeBlockDef[];
          presets: Json[];
        };
        Insert: {
          id?: string;
          theme_format_id: string;
          section_type: string;
          name: string;
          settings: ThemeSettingDef[];
          blocks?: ThemeBlockDef[];
          presets?: Json[];
        };
        Update: Partial<Database['public']['Tables']['theme_section_def']['Insert']>;
        Relationships: [
          { foreignKeyName: 'theme_section_def_theme_format_id_fkey';
            columns: ['theme_format_id'];
            referencedRelation: 'theme_format'; referencedColumns: ['id'] }
        ];
      };

      brand_page: {
        Row: {
          id: string;
          org_id: string;
          brand_id: string;
          theme_format_id: string | null;
          handle: string | null;
          status: BrandPageStatus;
        };
        Insert: {
          id?: string;
          org_id: string;
          brand_id: string;
          theme_format_id?: string | null;
          handle?: string | null;
          status?: BrandPageStatus;
        };
        Update: Partial<Database['public']['Tables']['brand_page']['Insert']>;
        Relationships: [
          { foreignKeyName: 'brand_page_brand_id_fkey'; columns: ['brand_id'];
            referencedRelation: 'brand'; referencedColumns: ['id'] },
          { foreignKeyName: 'brand_page_theme_format_id_fkey';
            columns: ['theme_format_id'];
            referencedRelation: 'theme_format'; referencedColumns: ['id'] }
        ];
      };

      brand_page_section: {
        Row: {
          id: string;
          org_id: string;
          brand_page_id: string;
          theme_section_def_id: string;
          position: number;
          settings_values: SectionSettingsValues;
          blocks_values: SectionBlockValue[];
          enabled: boolean;
        };
        Insert: {
          id?: string;
          org_id: string;
          brand_page_id: string;
          theme_section_def_id: string;
          position?: number;
          settings_values?: SectionSettingsValues;
          blocks_values?: SectionBlockValue[];
          enabled?: boolean;
        };
        Update: Partial<Database['public']['Tables']['brand_page_section']['Insert']>;
        Relationships: [
          { foreignKeyName: 'brand_page_section_brand_page_id_fkey';
            columns: ['brand_page_id'];
            referencedRelation: 'brand_page'; referencedColumns: ['id'] },
          { foreignKeyName: 'brand_page_section_theme_section_def_id_fkey';
            columns: ['theme_section_def_id'];
            referencedRelation: 'theme_section_def'; referencedColumns: ['id'] }
        ];
      };

      activity_log: {
        Row: {
          id: string;
          org_id: string;
          actor: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          diff: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          actor?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          diff?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>;
        Relationships: [
          { foreignKeyName: 'activity_log_org_id_fkey'; columns: ['org_id'];
            referencedRelation: 'org'; referencedColumns: ['id'] }
        ];
      };
    };

    Views: {
      product_stock_summary: {
        Row: {
          product_id: string;
          org_id: string;
          title: string;
          variant_count: number;
          total_available: number;
        };
        Relationships: [];
      };
    };

    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string };
      can_write: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      seed_solid_for_org: { Args: { p_org: string }; Returns: undefined };
    };

    Enums: {
      user_role: UserRole;
      gender: Gender;
      product_status: ProductStatus;
      brand_status: BrandStatus;
      collection_type: CollectionType;
      collection_status: CollectionStatus;
      location_kind: LocationKind;
      adjustment_reason: AdjustmentReason;
      theme_format_source: ThemeFormatSource;
      brand_page_status: BrandPageStatus;
      collection_rule_field: CollectionRuleField;
      collection_rule_operator: CollectionRuleOperator;
    };
  };
}

// =====================================================================
// 便利な型エイリアス（アプリ実装で利用）
// =====================================================================
type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row'];

// 各エンティティの短縮型
export type Org = Tables<'org'>;
export type AppUser = Tables<'app_user'>;
export type Brand = Tables<'brand'>;
export type Product = Tables<'product'>;
export type ProductImage = Tables<'product_image'>;
export type Variant = Tables<'variant'>;
export type Location = Tables<'location'>;
export type InventoryLevel = Tables<'inventory_level'>;
export type InventoryAdjustment = Tables<'inventory_adjustment'>;
export type Collection = Tables<'collection'>;
export type CollectionProduct = Tables<'collection_product'>;
export type CollectionRule = Tables<'collection_rule'>;
export type ThemeFormat = Tables<'theme_format'>;
export type ThemeSectionDef = Tables<'theme_section_def'>;
export type BrandPage = Tables<'brand_page'>;
export type BrandPageSection = Tables<'brand_page_section'>;
export type ActivityLog = Tables<'activity_log'>;
export type ProductStockSummary = Views<'product_stock_summary'>;

// ネスト取得用の複合型（join想定）
export type ProductWithRelations = Product & {
  brand: Brand | null;
  variants: Variant[];
  images: ProductImage[];
};

export type VariantWithStock = Variant & {
  inventory: (InventoryLevel & { location: Location })[];
};

export type BrandPageWithSections = BrandPage & {
  sections: (BrandPageSection & { definition: ThemeSectionDef })[];
};
