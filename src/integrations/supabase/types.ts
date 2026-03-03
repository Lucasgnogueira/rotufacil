export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      food_composition_items: {
        Row: {
          contains_gluten: boolean | null
          contains_lactose: boolean | null
          created_at: string
          density_g_ml: number | null
          food_category: string | null
          id: string
          is_allergen_crustaceans: boolean | null
          is_allergen_egg: boolean | null
          is_allergen_fish: boolean | null
          is_allergen_milk: boolean | null
          is_allergen_peanut: boolean | null
          is_allergen_soy: boolean | null
          is_allergen_tree_nuts: boolean | null
          is_allergen_wheat: boolean | null
          name_pt: string
          per_100: Json
          source: string
          source_item_id: string | null
          synonyms: string[] | null
          updated_at: string
        }
        Insert: {
          contains_gluten?: boolean | null
          contains_lactose?: boolean | null
          created_at?: string
          density_g_ml?: number | null
          food_category?: string | null
          id?: string
          is_allergen_crustaceans?: boolean | null
          is_allergen_egg?: boolean | null
          is_allergen_fish?: boolean | null
          is_allergen_milk?: boolean | null
          is_allergen_peanut?: boolean | null
          is_allergen_soy?: boolean | null
          is_allergen_tree_nuts?: boolean | null
          is_allergen_wheat?: boolean | null
          name_pt: string
          per_100?: Json
          source?: string
          source_item_id?: string | null
          synonyms?: string[] | null
          updated_at?: string
        }
        Update: {
          contains_gluten?: boolean | null
          contains_lactose?: boolean | null
          created_at?: string
          density_g_ml?: number | null
          food_category?: string | null
          id?: string
          is_allergen_crustaceans?: boolean | null
          is_allergen_egg?: boolean | null
          is_allergen_fish?: boolean | null
          is_allergen_milk?: boolean | null
          is_allergen_peanut?: boolean | null
          is_allergen_soy?: boolean | null
          is_allergen_tree_nuts?: boolean | null
          is_allergen_wheat?: boolean | null
          name_pt?: string
          per_100?: Json
          source?: string
          source_item_id?: string | null
          synonyms?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          composition_source: string | null
          composition_source_id: string | null
          contains_gluten: boolean | null
          contains_lactose: boolean | null
          created_at: string
          density_g_ml: number | null
          grams_per_unit: number | null
          id: string
          is_allergen_crustaceans: boolean | null
          is_allergen_egg: boolean | null
          is_allergen_fish: boolean | null
          is_allergen_milk: boolean | null
          is_allergen_peanut: boolean | null
          is_allergen_soy: boolean | null
          is_allergen_tree_nuts: boolean | null
          is_allergen_wheat: boolean | null
          name: string
          nutrients_per_100: Json
          owner_user_id: string | null
          synonyms: string[] | null
          updated_at: string
        }
        Insert: {
          composition_source?: string | null
          composition_source_id?: string | null
          contains_gluten?: boolean | null
          contains_lactose?: boolean | null
          created_at?: string
          density_g_ml?: number | null
          grams_per_unit?: number | null
          id?: string
          is_allergen_crustaceans?: boolean | null
          is_allergen_egg?: boolean | null
          is_allergen_fish?: boolean | null
          is_allergen_milk?: boolean | null
          is_allergen_peanut?: boolean | null
          is_allergen_soy?: boolean | null
          is_allergen_tree_nuts?: boolean | null
          is_allergen_wheat?: boolean | null
          name: string
          nutrients_per_100?: Json
          owner_user_id?: string | null
          synonyms?: string[] | null
          updated_at?: string
        }
        Update: {
          composition_source?: string | null
          composition_source_id?: string | null
          contains_gluten?: boolean | null
          contains_lactose?: boolean | null
          created_at?: string
          density_g_ml?: number | null
          grams_per_unit?: number | null
          id?: string
          is_allergen_crustaceans?: boolean | null
          is_allergen_egg?: boolean | null
          is_allergen_fish?: boolean | null
          is_allergen_milk?: boolean | null
          is_allergen_peanut?: boolean | null
          is_allergen_soy?: boolean | null
          is_allergen_tree_nuts?: boolean | null
          is_allergen_wheat?: boolean | null
          name?: string
          nutrients_per_100?: Json
          owner_user_id?: string | null
          synonyms?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_composition_source_id_fkey"
            columns: ["composition_source_id"]
            isOneToOne: false
            referencedRelation: "food_composition_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          default_serving_unit: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          default_serving_unit?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          default_serving_unit?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          qty: number
          qty_in_grams_ml: number | null
          recipe_id: string
          sort_order: number | null
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          qty?: number
          qty_in_grams_ml?: number | null
          recipe_id: string
          sort_order?: number | null
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          qty?: number
          qty_in_grams_ml?: number | null
          recipe_id?: string
          sort_order?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_versions: {
        Row: {
          allergen_declarations: string | null
          computed_at: string
          created_at: string
          front_warning_flags: Json | null
          id: string
          ingredients_list: string | null
          inputs_snapshot: Json
          recipe_id: string
          results_snapshot: Json
          version_number: number
        }
        Insert: {
          allergen_declarations?: string | null
          computed_at?: string
          created_at?: string
          front_warning_flags?: Json | null
          id?: string
          ingredients_list?: string | null
          inputs_snapshot?: Json
          recipe_id: string
          results_snapshot?: Json
          version_number?: number
        }
        Update: {
          allergen_declarations?: string | null
          computed_at?: string
          created_at?: string
          front_warning_flags?: Json | null
          id?: string
          ingredients_list?: string | null
          inputs_snapshot?: Json
          recipe_id?: string
          results_snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cooking_loss_pct: number | null
          created_at: string
          household_measure_text: string | null
          id: string
          name: string
          notes: string | null
          owner_user_id: string
          product_type: Database["public"]["Enums"]["product_type"]
          serving_size_g_ml: number
          updated_at: string
          yield_total_g_ml: number
        }
        Insert: {
          cooking_loss_pct?: number | null
          created_at?: string
          household_measure_text?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_user_id: string
          product_type?: Database["public"]["Enums"]["product_type"]
          serving_size_g_ml?: number
          updated_at?: string
          yield_total_g_ml?: number
        }
        Update: {
          cooking_loss_pct?: number | null
          created_at?: string
          household_measure_text?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          serving_size_g_ml?: number
          updated_at?: string
          yield_total_g_ml?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_recipe: { Args: { recipe_uuid: string }; Returns: boolean }
      search_food_composition: {
        Args: { max_results?: number; search_term: string }
        Returns: {
          contains_gluten: boolean
          contains_lactose: boolean
          density_g_ml: number
          food_category: string
          id: string
          is_allergen_crustaceans: boolean
          is_allergen_egg: boolean
          is_allergen_fish: boolean
          is_allergen_milk: boolean
          is_allergen_peanut: boolean
          is_allergen_soy: boolean
          is_allergen_tree_nuts: boolean
          is_allergen_wheat: boolean
          name_pt: string
          per_100: Json
          similarity_score: number
          source: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      product_type: "solid" | "liquid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      product_type: ["solid", "liquid"],
    },
  },
} as const
