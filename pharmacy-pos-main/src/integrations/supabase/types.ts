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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string
          customer_code: string | null
          email: string | null
          gst_no: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_code?: string | null
          email?: string | null
          gst_no?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_code?: string | null
          email?: string | null
          gst_no?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medicines: {
        Row: {
          batch_no: string
          cgst_per: number | null
          created_at: string
          expiry_date: string
          hsn_code: string | null
          id: string
          igst_per: number | null
          item_code: string
          item_name: string
          item_name2: string | null
          manufacturer: string
          mrp: number
          pack_name: string | null
          ptr: number | null
          quantity: number
          rack: string | null
          sale_rate: number
          sgst_per: number | null
          updated_at: string
        }
        Insert: {
          batch_no: string
          cgst_per?: number | null
          created_at?: string
          expiry_date: string
          hsn_code?: string | null
          id?: string
          igst_per?: number | null
          item_code: string
          item_name: string
          item_name2?: string | null
          manufacturer: string
          mrp: number
          pack_name?: string | null
          ptr?: number | null
          quantity?: number
          rack?: string | null
          sale_rate: number
          sgst_per?: number | null
          updated_at?: string
        }
        Update: {
          batch_no?: string
          cgst_per?: number | null
          created_at?: string
          expiry_date?: string
          hsn_code?: string | null
          id?: string
          igst_per?: number | null
          item_code?: string
          item_name?: string
          item_name2?: string | null
          manufacturer?: string
          mrp?: number
          pack_name?: string | null
          ptr?: number | null
          quantity?: number
          rack?: string | null
          sale_rate?: number
          sgst_per?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cgst_amount: number | null
          created_at: string
          discount: number | null
          id: string
          igst_amount: number | null
          medicine_id: string
          mrp: number
          quantity: number
          sale_id: string
          sale_rate: number
          sgst_amount: number | null
          total_amount: number
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          discount?: number | null
          id?: string
          igst_amount?: number | null
          medicine_id: string
          mrp: number
          quantity: number
          sale_id: string
          sale_rate: number
          sgst_amount?: number | null
          total_amount: number
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          discount?: number | null
          id?: string
          igst_amount?: number | null
          medicine_id?: string
          mrp?: number
          quantity?: number
          sale_id?: string
          sale_rate?: number
          sgst_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cgst_total: number | null
          created_at: string
          customer_code: string | null
          customer_name: string | null
          discount: number | null
          id: string
          igst_total: number | null
          invoice_date: string
          invoice_no: string
          sgst_total: number | null
          total_amount: number
        }
        Insert: {
          cgst_total?: number | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          igst_total?: number | null
          invoice_date?: string
          invoice_no: string
          sgst_total?: number | null
          total_amount: number
        }
        Update: {
          cgst_total?: number | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          discount?: number | null
          id?: string
          igst_total?: number | null
          invoice_date?: string
          invoice_no?: string
          sgst_total?: number | null
          total_amount?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_no: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_no?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_no?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
