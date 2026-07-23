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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brand_kits: {
        Row: {
          accent_color: string
          brand_model_enabled: boolean
          brand_model_photos: Json
          brand_model_source: string
          brand_model_url: string | null
          business_name: string
          created_at: string
          logo_url: string | null
          model_age: string | null
          model_body: string | null
          model_gender: string | null
          model_region: string | null
          model_skin: string | null
          primary_color: string
          sells_to: string
          sells_what: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string
          brand_model_enabled?: boolean
          brand_model_photos?: Json
          brand_model_source?: string
          brand_model_url?: string | null
          business_name?: string
          created_at?: string
          logo_url?: string | null
          model_age?: string | null
          model_body?: string | null
          model_gender?: string | null
          model_region?: string | null
          model_skin?: string | null
          primary_color?: string
          sells_to?: string
          sells_what?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string
          brand_model_enabled?: boolean
          brand_model_photos?: Json
          brand_model_source?: string
          brand_model_url?: string | null
          business_name?: string
          created_at?: string
          logo_url?: string | null
          model_age?: string | null
          model_body?: string | null
          model_gender?: string | null
          model_region?: string | null
          model_skin?: string | null
          primary_color?: string
          sells_to?: string
          sells_what?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_plans: {
        Row: {
          created_at: string
          id: string
          month: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          caption: string | null
          created_at: string
          day_index: number
          error: string | null
          hashtags: string | null
          id: string
          image_url: string | null
          plan_id: string
          post_date: string
          post_type: string
          posted: boolean
          product_id: string | null
          product_name: string | null
          product_ref_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          day_index: number
          error?: string | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          plan_id: string
          post_date: string
          post_type: string
          posted?: boolean
          product_id?: string | null
          product_name?: string | null
          product_ref_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          day_index?: number
          error?: string | null
          hashtags?: string | null
          id?: string
          image_url?: string | null
          plan_id?: string
          post_date?: string
          post_type?: string
          posted?: boolean
          product_id?: string | null
          product_name?: string | null
          product_ref_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage: {
        Row: {
          browser_id: string
          count: number
          date: string
        }
        Insert: {
          browser_id: string
          count?: number
          date?: string
        }
        Update: {
          browser_id?: string
          count?: number
          date?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          browser_id: string
          category: string | null
          copy: Json | null
          created_at: string
          csv_url: string | null
          detail: string | null
          feedback_rating: number | null
          feedback_text: string | null
          gen_metadata: Json
          generated_images: Json
          id: string
          original_image_url: string | null
          price: number | null
          product_name: string | null
          user_id: string | null
        }
        Insert: {
          browser_id: string
          category?: string | null
          copy?: Json | null
          created_at?: string
          csv_url?: string | null
          detail?: string | null
          feedback_rating?: number | null
          feedback_text?: string | null
          gen_metadata?: Json
          generated_images?: Json
          id?: string
          original_image_url?: string | null
          price?: number | null
          product_name?: string | null
          user_id?: string | null
        }
        Update: {
          browser_id?: string
          category?: string | null
          copy?: Json | null
          created_at?: string
          csv_url?: string | null
          detail?: string | null
          feedback_rating?: number | null
          feedback_text?: string | null
          gen_metadata?: Json
          generated_images?: Json
          id?: string
          original_image_url?: string | null
          price?: number | null
          product_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          channel: string
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          expires_at?: string
          state: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_inr: number
          created_at: string
          credits_granted: number
          id: string
          invoice_url: string | null
          plan_id: string
          razorpay_invoice_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          credits_granted?: number
          id?: string
          invoice_url?: string | null
          plan_id: string
          razorpay_invoice_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          credits_granted?: number
          id?: string
          invoice_url?: string | null
          plan_id?: string
          razorpay_invoice_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          credits: number
          features: Json
          id: string
          interval: string | null
          kind: string
          name: string
          price_inr: number
          sort_order: number
        }
        Insert: {
          credits: number
          features?: Json
          id: string
          interval?: string | null
          kind: string
          name: string
          price_inr: number
          sort_order?: number
        }
        Update: {
          credits?: number
          features?: Json
          id?: string
          interval?: string | null
          kind?: string
          name?: string
          price_inr?: number
          sort_order?: number
        }
        Relationships: []
      }
      razorpay_plans: {
        Row: {
          created_at: string
          plan_id: string
          razorpay_plan_id: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          razorpay_plan_id: string
        }
        Update: {
          created_at?: string
          plan_id?: string
          razorpay_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "razorpay_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: true
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token_ciphertext: string
          account_id: string
          account_name: string | null
          channel: string
          created_at: string
          id: string
          last_refreshed_at: string | null
          meta: Json
          needs_reconnect: boolean
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          account_id: string
          account_name?: string | null
          channel: string
          created_at?: string
          id?: string
          last_refreshed_at?: string | null
          meta?: Json
          needs_reconnect?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          account_id?: string
          account_name?: string | null
          channel?: string
          created_at?: string
          id?: string
          last_refreshed_at?: string | null
          meta?: Json
          needs_reconnect?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          cost_price_paise: number
          created_at: string
          id: string
          low_stock_alert: number
          name: string
          product_id: string | null
          quantity: number
          selling_price_paise: number
          sku: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_price_paise?: number
          created_at?: string
          id?: string
          low_stock_alert?: number
          name: string
          product_id?: string | null
          quantity?: number
          selling_price_paise?: number
          sku?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_price_paise?: number
          created_at?: string
          id?: string
          low_stock_alert?: number
          name?: string
          product_id?: string | null
          quantity?: number
          selling_price_paise?: number
          sku?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          note: string | null
          reason: string
          stock_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          reason: string
          stock_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          reason?: string
          stock_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          pack_credits: number
          period_end: string | null
          period_start: string | null
          plan_id: string
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          subscription_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          pack_credits?: number
          period_end?: string | null
          period_start?: string | null
          plan_id?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          subscription_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          pack_credits?: number
          period_end?: string | null
          period_start?: string | null
          plan_id?: string
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          subscription_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_social_connections: {
        Row: {
          account_id: string | null
          account_name: string | null
          channel: string | null
          created_at: string | null
          id: string | null
          last_refreshed_at: string | null
          needs_reconnect: boolean | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string | null
          last_refreshed_at?: string | null
          needs_reconnect?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string | null
          last_refreshed_at?: string | null
          needs_reconnect?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_stock_movement: {
        Args: {
          _delta: number
          _note?: string
          _reason: string
          _stock_item_id: string
        }
        Returns: number
      }
      consume_credit: {
        Args: { _amount?: number; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_credits: {
        Args: { _pack: number; _sub: number; _user_id: string }
        Returns: undefined
      }
      spend_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          balance: number
          ok: boolean
          took_pack: number
          took_sub: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
