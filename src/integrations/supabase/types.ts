export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      budget_attachments: {
        Row: {
          budget_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_attachments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          billing_status: Database["public"]["Enums"]["billing_status"] | null
          budget_id: string
          category: string
          created_at: string
          id: string
          invoice_link: string | null
          is_attendee: boolean | null
          iva_percentage: number | null
          name: string
          observations: string | null
          quantity: number | null
          subcategory: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          budget_id: string
          category: string
          created_at?: string
          id?: string
          invoice_link?: string | null
          is_attendee?: boolean | null
          iva_percentage?: number | null
          name: string
          observations?: string | null
          quantity?: number | null
          subcategory?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          budget_id?: string
          category?: string
          created_at?: string
          id?: string
          invoice_link?: string | null
          is_attendee?: boolean | null
          iva_percentage?: number | null
          name?: string
          observations?: string | null
          quantity?: number | null
          subcategory?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_template_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_attendee: boolean | null
          iva_percentage: number | null
          name: string
          observations: string | null
          quantity: number | null
          subcategory: string | null
          template_id: string
          unit_price: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_attendee?: boolean | null
          iva_percentage?: number | null
          name: string
          observations?: string | null
          quantity?: number | null
          subcategory?: string | null
          template_id: string
          unit_price?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_attendee?: boolean | null
          iva_percentage?: number | null
          name?: string
          observations?: string | null
          quantity?: number | null
          subcategory?: string | null
          template_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      budgets: {
        Row: {
          artist_id: string | null
          budget_status: Database["public"]["Enums"]["budget_status"] | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          event_date: string | null
          event_time: string | null
          fee: number | null
          id: string
          internal_notes: string | null
          name: string
          show_status: Database["public"]["Enums"]["show_status"] | null
          template_id: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          artist_id?: string | null
          budget_status?: Database["public"]["Enums"]["budget_status"] | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          event_date?: string | null
          event_time?: string | null
          fee?: number | null
          id?: string
          internal_notes?: string | null
          name: string
          show_status?: Database["public"]["Enums"]["show_status"] | null
          template_id?: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          artist_id?: string | null
          budget_status?: Database["public"]["Enums"]["budget_status"] | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          event_date?: string | null
          event_time?: string | null
          fee?: number | null
          id?: string
          internal_notes?: string | null
          name?: string
          show_status?: Database["public"]["Enums"]["show_status"] | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "budgets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          artist_id: string
          category: string
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          artist_id: string
          category: string
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          artist_id?: string
          category?: string
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          created_at: string | null
          event_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          event_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          event_type: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          event_type: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          amount: number
          artist_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          period_end: string
          period_start: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          artist_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          period_end: string
          period_start: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          period_end?: string
          period_start?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"]
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          emergency_contact: string | null
          full_name: string
          id: string
          internal_notes: string | null
          phone: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          team_contacts: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role"]
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          emergency_contact?: string | null
          full_name: string
          id?: string
          internal_notes?: string | null
          phone?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          team_contacts?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"]
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          internal_notes?: string | null
          phone?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          team_contacts?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          management_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          management_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          management_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_management_id_fkey"
            columns: ["management_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      billing_status: "pendiente" | "pagado" | "facturado" | "cancelado"
      budget_status: "nacional" | "internacional"
      budget_type:
        | "concierto"
        | "produccion_musical"
        | "campana_promocional"
        | "videoclip"
        | "otros"
      show_status: "confirmado" | "pendiente" | "cancelado"
      user_role: "artist" | "management"
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
      billing_status: ["pendiente", "pagado", "facturado", "cancelado"],
      budget_status: ["nacional", "internacional"],
      budget_type: [
        "concierto",
        "produccion_musical",
        "campana_promocional",
        "videoclip",
        "otros",
      ],
      show_status: ["confirmado", "pendiente", "cancelado"],
      user_role: ["artist", "management"],
    },
  },
} as const
