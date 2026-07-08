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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_knowledge: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          for_bar: boolean | null
          for_kitchen: boolean | null
          group_name: string
          icon: string | null
          id: string
          name: string
          name_en: string | null
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          for_bar?: boolean | null
          for_kitchen?: boolean | null
          group_name?: string
          icon?: string | null
          id?: string
          name: string
          name_en?: string | null
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          for_bar?: boolean | null
          for_kitchen?: boolean | null
          group_name?: string
          icon?: string | null
          id?: string
          name?: string
          name_en?: string | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          table_number: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          table_number: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          table_number?: string
        }
        Relationships: []
      }
      inv_daily_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          turn1_closed_at: string | null
          turn1_data: Json
          turn2_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          turn1_closed_at?: string | null
          turn1_data?: Json
          turn2_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          turn1_closed_at?: string | null
          turn1_data?: Json
          turn2_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      inv_next_day_stock: {
        Row: {
          created_at: string
          id: string
          mulliri_fillim: number
          stock_data: Json
          stock_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mulliri_fillim?: number
          stock_data?: Json
          stock_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mulliri_fillim?: number
          stock_data?: Json
          stock_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      inv_products: {
        Row: {
          created_at: string
          id: string
          menu_item_ids: string[]
          name: string
          sort_order: number
          units_per_sale: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_ids?: string[]
          name: string
          sort_order?: number
          units_per_sale?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_ids?: string[]
          name?: string
          sort_order?: number
          units_per_sale?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          description_en: string | null
          display_order: number | null
          for_bar: boolean | null
          for_kitchen: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          name_en: string | null
          offer_end_time: string | null
          offer_price: number | null
          offer_start_time: string | null
          price: number
        }
        Insert: {
          available?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          display_order?: number | null
          for_bar?: boolean | null
          for_kitchen?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          name_en?: string | null
          offer_end_time?: string | null
          offer_price?: number | null
          offer_start_time?: string | null
          price: number
        }
        Update: {
          available?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          display_order?: number | null
          for_bar?: boolean | null
          for_kitchen?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          offer_end_time?: string | null
          offer_price?: number | null
          offer_start_time?: string | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items_split: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: string
          items: Json
          order_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          items: Json
          order_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          order_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_split_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          status: string
          table_number: string
          total_price: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          items: Json
          notes?: string | null
          status?: string
          table_number: string
          total_price: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          table_number?: string
          total_price?: number
        }
        Relationships: []
      }
      playlist_state: {
        Row: {
          current_song_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          current_song_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          current_song_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_state_current_song_id_fkey"
            columns: ["current_song_id"]
            isOneToOne: false
            referencedRelation: "song_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_orders: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          items: Json
          location_id: string | null
          mode: string | null
          notes: string | null
          operator_name: string | null
          printed_at: string | null
          status: string | null
          table_id: string | null
          table_number: number | null
          total_amount: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          location_id?: string | null
          mode?: string | null
          notes?: string | null
          operator_name?: string | null
          printed_at?: string | null
          status?: string | null
          table_id?: string | null
          table_number?: number | null
          total_amount?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          location_id?: string | null
          mode?: string | null
          notes?: string | null
          operator_name?: string | null
          printed_at?: string | null
          status?: string | null
          table_id?: string | null
          table_number?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          amount: number | null
          attempts: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          printed_at: string | null
          receipt_text: string
          station: string
          status: string
          table_code: string | null
          title: string | null
        }
        Insert: {
          amount?: number | null
          attempts?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          printed_at?: string | null
          receipt_text: string
          station?: string
          status?: string
          table_code?: string | null
          title?: string | null
        }
        Update: {
          amount?: number | null
          attempts?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          printed_at?: string | null
          receipt_text?: string
          station?: string
          status?: string
          table_code?: string | null
          title?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          shift_token: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          shift_token?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          shift_token?: string | null
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          min_threshold: number | null
          name: string
          quantity: number | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          min_threshold?: number | null
          name: string
          quantity?: number | null
          unit: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          min_threshold?: number | null
          name?: string
          quantity?: number | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          material_id: string
          menu_item_id: string
          quantity_needed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          menu_item_id: string
          quantity_needed: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          menu_item_id?: string
          quantity_needed?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          request_type: string
          status: string
          table_number: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          request_type: string
          status?: string
          table_number: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          request_type?: string
          status?: string
          table_number?: string
        }
        Relationships: []
      }
      shift_tokens: {
        Row: {
          created_at: string
          id: string
          shift_end: string
          shift_start: string
          token: string
          unlocked: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          shift_end: string
          shift_start: string
          token: string
          unlocked?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          shift_end?: string
          shift_start?: string
          token?: string
          unlocked?: boolean
        }
        Relationships: []
      }
      song_requests: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          played_at: string | null
          status: string
          table_number: string
          thumbnail: string
          title: string
          video_id: string
          youtube_url: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          played_at?: string | null
          status?: string
          table_number: string
          thumbnail: string
          title: string
          video_id: string
          youtube_url: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          played_at?: string | null
          status?: string
          table_number?: string
          thumbnail?: string
          title?: string
          video_id?: string
          youtube_url?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          pin_code: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          pin_code?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          pin_code?: string | null
          role?: string
        }
        Relationships: []
      }
      supplies: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          material_id: string | null
          note: string | null
          operator_name: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          material_id?: string | null
          note?: string | null
          operator_name?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          material_id?: string | null
          note?: string | null
          operator_name?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplies_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          location_id: string | null
          name: string
          number: number
          qr_code: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          number: number
          qr_code?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          number?: number
          qr_code?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          fiscal_code: string | null
          id: string
          items: Json | null
          location_id: string | null
          operator_name: string | null
          order_id: string | null
          table_number: number | null
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          fiscal_code?: string | null
          id?: string
          items?: Json | null
          location_id?: string | null
          operator_name?: string | null
          order_id?: string | null
          table_number?: number | null
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          fiscal_code?: string | null
          id?: string
          items?: Json | null
          location_id?: string | null
          operator_name?: string | null
          order_id?: string | null
          table_number?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_supply: {
        Args: {
          p_location_id: string
          p_material_id: string
          p_note: string
          p_operator_name: string
          p_quantity: number
        }
        Returns: {
          created_at: string | null
          id: string
          location_id: string | null
          min_threshold: number | null
          name: string
          quantity: number | null
          unit: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "raw_materials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_pos_order: {
        Args: { p_operator_name: string; p_order_id: string }
        Returns: {
          amount: number
          created_at: string | null
          fiscal_code: string | null
          id: string
          items: Json | null
          location_id: string | null
          operator_name: string | null
          order_id: string | null
          table_number: number | null
          type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decrement_material: {
        Args: { amount: number; material_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_material: {
        Args: { amount: number; material_id: string }
        Returns: undefined
      }
      verify_staff_pin: {
        Args: { p_pin: string }
        Returns: {
          id: string
          location_id: string
          name: string
          role: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
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
      app_role: ["admin", "manager", "user"],
    },
  },
} as const
