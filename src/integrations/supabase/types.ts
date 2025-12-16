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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      approval_comments: {
        Row: {
          approval_id: string
          author_user_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          approval_id: string
          author_user_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          approval_id?: string
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_comments_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_events: {
        Row: {
          actor_user_id: string
          approval_id: string
          created_at: string
          diff: Json | null
          event_type: Database["public"]["Enums"]["approval_event_type"]
          from_status: Database["public"]["Enums"]["approval_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["approval_status"] | null
        }
        Insert: {
          actor_user_id: string
          approval_id: string
          created_at?: string
          diff?: Json | null
          event_type: Database["public"]["Enums"]["approval_event_type"]
          from_status?: Database["public"]["Enums"]["approval_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Update: {
          actor_user_id?: string
          approval_id?: string
          created_at?: string
          diff?: Json | null
          event_type?: Database["public"]["Enums"]["approval_event_type"]
          from_status?: Database["public"]["Enums"]["approval_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          amount: number | null
          assigned_to_user_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          project_id: string
          status: Database["public"]["Enums"]["approval_status"]
          title: string
          type: Database["public"]["Enums"]["approval_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to_user_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          status?: Database["public"]["Enums"]["approval_status"]
          title: string
          type: Database["public"]["Enums"]["approval_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to_user_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          title?: string
          type?: Database["public"]["Enums"]["approval_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_role_bindings: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["artist_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["artist_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["artist_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_role_bindings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          profile_id: string | null
          stage_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          profile_id?: string | null
          stage_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          profile_id?: string | null
          stage_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      booking_documents: {
        Row: {
          booking_id: string
          content: string | null
          contract_token: string | null
          created_at: string
          created_by: string | null
          document_type: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          signature_image_url: string | null
          signed_at: string | null
          signer_name: string | null
          status: string
        }
        Insert: {
          booking_id: string
          content?: string | null
          contract_token?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          content?: string | null
          contract_token?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          signature_image_url?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_expenses: {
        Row: {
          amount: number
          booking_id: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          handler: string
          id: string
          iva_percentage: number | null
          payer: string
        }
        Insert: {
          amount?: number
          booking_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          handler?: string
          id?: string
          iva_percentage?: number | null
          payer?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          handler?: string
          id?: string
          iva_percentage?: number | null
          payer?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_itinerary: {
        Row: {
          booking_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          handler: string | null
          id: string
          item_type: string
          location: string | null
          payer: string | null
          sort_order: number
          start_time: string | null
          title: string
        }
        Insert: {
          booking_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          handler?: string | null
          id?: string
          item_type: string
          location?: string | null
          payer?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
        }
        Update: {
          booking_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          handler?: string | null
          id?: string
          item_type?: string
          location?: string | null
          payer?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_itinerary_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_offers: {
        Row: {
          adjuntos: Json | null
          anunciado: boolean | null
          artist_id: string | null
          capacidad: number | null
          ciudad: string | null
          comision_euros: number | null
          comision_porcentaje: number | null
          condiciones: string | null
          contacto: string | null
          contratos: string | null
          created_at: string
          created_by: string
          duracion: string | null
          es_cityzen: boolean | null
          es_internacional: boolean | null
          es_privado: boolean | null
          estado: string | null
          estado_facturacion: string | null
          event_id: string | null
          fecha: string | null
          fee: number | null
          festival_ciclo: string | null
          folder_url: string | null
          formato: string | null
          gastos_estimados: number | null
          hora: string | null
          id: string
          info_comentarios: string | null
          inicio_venta: string | null
          invitaciones: number | null
          link_venta: string | null
          logistica: string | null
          lugar: string | null
          notas: string | null
          oferta: string | null
          pais: string | null
          phase: string | null
          project_id: string | null
          promotor: string | null
          publico: string | null
          pvp: number | null
          sort_order: number | null
          tour_manager: string | null
          tour_manager_new: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          adjuntos?: Json | null
          anunciado?: boolean | null
          artist_id?: string | null
          capacidad?: number | null
          ciudad?: string | null
          comision_euros?: number | null
          comision_porcentaje?: number | null
          condiciones?: string | null
          contacto?: string | null
          contratos?: string | null
          created_at?: string
          created_by: string
          duracion?: string | null
          es_cityzen?: boolean | null
          es_internacional?: boolean | null
          es_privado?: boolean | null
          estado?: string | null
          estado_facturacion?: string | null
          event_id?: string | null
          fecha?: string | null
          fee?: number | null
          festival_ciclo?: string | null
          folder_url?: string | null
          formato?: string | null
          gastos_estimados?: number | null
          hora?: string | null
          id?: string
          info_comentarios?: string | null
          inicio_venta?: string | null
          invitaciones?: number | null
          link_venta?: string | null
          logistica?: string | null
          lugar?: string | null
          notas?: string | null
          oferta?: string | null
          pais?: string | null
          phase?: string | null
          project_id?: string | null
          promotor?: string | null
          publico?: string | null
          pvp?: number | null
          sort_order?: number | null
          tour_manager?: string | null
          tour_manager_new?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          adjuntos?: Json | null
          anunciado?: boolean | null
          artist_id?: string | null
          capacidad?: number | null
          ciudad?: string | null
          comision_euros?: number | null
          comision_porcentaje?: number | null
          condiciones?: string | null
          contacto?: string | null
          contratos?: string | null
          created_at?: string
          created_by?: string
          duracion?: string | null
          es_cityzen?: boolean | null
          es_internacional?: boolean | null
          es_privado?: boolean | null
          estado?: string | null
          estado_facturacion?: string | null
          event_id?: string | null
          fecha?: string | null
          fee?: number | null
          festival_ciclo?: string | null
          folder_url?: string | null
          formato?: string | null
          gastos_estimados?: number | null
          hora?: string | null
          id?: string
          info_comentarios?: string | null
          inicio_venta?: string | null
          invitaciones?: number | null
          link_venta?: string | null
          logistica?: string | null
          lugar?: string | null
          notas?: string | null
          oferta?: string | null
          pais?: string | null
          phase?: string | null
          project_id?: string | null
          promotor?: string | null
          publico?: string | null
          pvp?: number | null
          sort_order?: number | null
          tour_manager?: string | null
          tour_manager_new?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_offers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_options: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          status_value: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          status_value: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          status_value?: string
        }
        Relationships: []
      }
      booking_template_config: {
        Row: {
          created_at: string
          created_by: string
          field_label: string
          field_name: string
          field_order: number
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          field_label: string
          field_name: string
          field_order: number
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          field_label?: string
          field_name?: string
          field_order?: number
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
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
      budget_categories: {
        Row: {
          created_at: string
          created_by: string
          icon_name: string
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          icon_name?: string
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          icon_name?: string
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          billing_status: Database["public"]["Enums"]["billing_status"] | null
          budget_id: string
          category: string
          category_id: string | null
          created_at: string
          fecha_emision: string | null
          id: string
          invoice_link: string | null
          irpf_percentage: number | null
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
          category_id?: string | null
          created_at?: string
          fecha_emision?: string | null
          id?: string
          invoice_link?: string | null
          irpf_percentage?: number | null
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
          category_id?: string | null
          created_at?: string
          fecha_emision?: string | null
          id?: string
          invoice_link?: string | null
          irpf_percentage?: number | null
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
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
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
          capacidad: number | null
          city: string | null
          condiciones: string | null
          country: string | null
          created_at: string
          created_by: string
          event_date: string | null
          event_time: string | null
          fee: number | null
          festival_ciclo: string | null
          formato: string | null
          id: string
          internal_notes: string | null
          invitaciones: number | null
          name: string
          oferta: string | null
          parent_folder_id: string | null
          project_id: string | null
          show_status: Database["public"]["Enums"]["show_status"] | null
          status_negociacion: string | null
          template_id: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          artist_id?: string | null
          budget_status?: Database["public"]["Enums"]["budget_status"] | null
          capacidad?: number | null
          city?: string | null
          condiciones?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          event_date?: string | null
          event_time?: string | null
          fee?: number | null
          festival_ciclo?: string | null
          formato?: string | null
          id?: string
          internal_notes?: string | null
          invitaciones?: number | null
          name: string
          oferta?: string | null
          parent_folder_id?: string | null
          project_id?: string | null
          show_status?: Database["public"]["Enums"]["show_status"] | null
          status_negociacion?: string | null
          template_id?: string | null
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          artist_id?: string | null
          budget_status?: Database["public"]["Enums"]["budget_status"] | null
          capacidad?: number | null
          city?: string | null
          condiciones?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          event_date?: string | null
          event_time?: string | null
          fee?: number | null
          festival_ciclo?: string | null
          formato?: string | null
          id?: string
          internal_notes?: string | null
          invitaciones?: number | null
          name?: string
          oferta?: string | null
          parent_folder_id?: string | null
          project_id?: string | null
          show_status?: Database["public"]["Enums"]["show_status"] | null
          status_negociacion?: string | null
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
            foreignKeyName: "budgets_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          channel_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message: string
          read_by: string[] | null
          sender_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message: string
          read_by?: string[] | null
          sender_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string
          read_by?: string[] | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      checklist_template_items: {
        Row: {
          created_at: string
          due_anchor: Database["public"]["Enums"]["due_anchor"] | null
          due_days_offset: number | null
          id: string
          owner_label_es: string | null
          section: string
          section_es: string | null
          sort_order: number
          task: string
          task_es: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          due_anchor?: Database["public"]["Enums"]["due_anchor"] | null
          due_days_offset?: number | null
          id?: string
          owner_label_es?: string | null
          section: string
          section_es?: string | null
          sort_order?: number
          task: string
          task_es?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          due_anchor?: Database["public"]["Enums"]["due_anchor"] | null
          due_days_offset?: number | null
          id?: string
          owner_label_es?: string | null
          section?: string
          section_es?: string | null
          sort_order?: number
          task?: string
          task_es?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_checklist_template_items_template_id"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          description_es: string | null
          id: string
          is_system_template: boolean
          name: string
          name_es: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_system_template?: boolean
          name: string
          name_es?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_system_template?: boolean
          name?: string
          name_es?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      contact_group_members: {
        Row: {
          contact_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          allergies: string | null
          artist_id: string | null
          bank_info: string | null
          category: string | null
          city: string | null
          clothing_size: string | null
          company: string | null
          contract_url: string | null
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          field_config: Json | null
          iban: string | null
          id: string
          is_public: boolean | null
          legal_name: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_hours: string | null
          public_slug: string | null
          role: string | null
          shared_with_users: string[] | null
          shoe_size: string | null
          special_needs: string | null
          stage_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          artist_id?: string | null
          bank_info?: string | null
          category?: string | null
          city?: string | null
          clothing_size?: string | null
          company?: string | null
          contract_url?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          field_config?: Json | null
          iban?: string | null
          id?: string
          is_public?: boolean | null
          legal_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_hours?: string | null
          public_slug?: string | null
          role?: string | null
          shared_with_users?: string[] | null
          shoe_size?: string | null
          special_needs?: string | null
          stage_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          artist_id?: string | null
          bank_info?: string | null
          category?: string | null
          city?: string | null
          clothing_size?: string | null
          company?: string | null
          contract_url?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          field_config?: Json | null
          iban?: string | null
          id?: string
          is_public?: boolean | null
          legal_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_hours?: string | null
          public_slug?: string | null
          role?: string | null
          shared_with_users?: string[] | null
          shoe_size?: string | null
          special_needs?: string | null
          stage_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signers: {
        Row: {
          created_at: string
          document_id: string
          email: string | null
          id: string
          name: string
          role: string
          signature_image_url: string | null
          signed_at: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          email?: string | null
          id?: string
          name: string
          role?: string
          signature_image_url?: string | null
          signed_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          signature_image_url?: string | null
          signed_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "booking_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_bucket: string
          file_path: string | null
          file_url: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_bucket?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_bucket?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
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
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      epk_analytics: {
        Row: {
          accion: string | null
          created_at: string | null
          epk_id: string
          id: string
          ip_address: unknown
          recurso: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          accion?: string | null
          created_at?: string | null
          epk_id: string
          id?: string
          ip_address?: unknown
          recurso?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          accion?: string | null
          created_at?: string | null
          epk_id?: string
          id?: string
          ip_address?: unknown
          recurso?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epk_analytics_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_audios: {
        Row: {
          creado_en: string | null
          epk_id: string
          id: string
          orden: number | null
          titulo: string
          url: string
        }
        Insert: {
          creado_en?: string | null
          epk_id: string
          id?: string
          orden?: number | null
          titulo: string
          url: string
        }
        Update: {
          creado_en?: string | null
          epk_id?: string
          id?: string
          orden?: number | null
          titulo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epk_audios_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_documentos: {
        Row: {
          creado_en: string | null
          epk_id: string
          file_size: number | null
          file_type: string | null
          id: string
          orden: number | null
          tipo: string | null
          titulo: string
          url: string
        }
        Insert: {
          creado_en?: string | null
          epk_id: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          orden?: number | null
          tipo?: string | null
          titulo: string
          url: string
        }
        Update: {
          creado_en?: string | null
          epk_id?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          orden?: number | null
          tipo?: string | null
          titulo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epk_documentos_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_fotos: {
        Row: {
          creado_en: string | null
          descargable: boolean | null
          epk_id: string
          id: string
          orden: number | null
          titulo: string | null
          url: string
        }
        Insert: {
          creado_en?: string | null
          descargable?: boolean | null
          epk_id: string
          id?: string
          orden?: number | null
          titulo?: string | null
          url: string
        }
        Update: {
          creado_en?: string | null
          descargable?: boolean | null
          epk_id?: string
          id?: string
          orden?: number | null
          titulo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "epk_fotos_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epk_password_attempts: {
        Row: {
          created_at: string
          epk_slug: string
          failed_attempts: number
          id: string
          ip_address: unknown
          last_attempt_at: string
          locked_until: string | null
        }
        Insert: {
          created_at?: string
          epk_slug: string
          failed_attempts?: number
          id?: string
          ip_address?: unknown
          last_attempt_at?: string
          locked_until?: string | null
        }
        Update: {
          created_at?: string
          epk_slug?: string
          failed_attempts?: number
          id?: string
          ip_address?: unknown
          last_attempt_at?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      epk_videos: {
        Row: {
          creado_en: string | null
          epk_id: string
          id: string
          orden: number | null
          privado: boolean | null
          tipo: Database["public"]["Enums"]["epk_video_type"]
          titulo: string
          url: string | null
          video_id: string | null
        }
        Insert: {
          creado_en?: string | null
          epk_id: string
          id?: string
          orden?: number | null
          privado?: boolean | null
          tipo: Database["public"]["Enums"]["epk_video_type"]
          titulo: string
          url?: string | null
          video_id?: string | null
        }
        Update: {
          creado_en?: string | null
          epk_id?: string
          id?: string
          orden?: number | null
          privado?: boolean | null
          tipo?: Database["public"]["Enums"]["epk_video_type"]
          titulo?: string
          url?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epk_videos_epk_id_fkey"
            columns: ["epk_id"]
            isOneToOne: false
            referencedRelation: "epks"
            referencedColumns: ["id"]
          },
        ]
      }
      epks: {
        Row: {
          acceso_directo: boolean
          actualizado_en: string | null
          artista_proyecto: string
          bio_corta: string | null
          booking: Json | null
          coordinadora_booking: Json | null
          creado_en: string | null
          creado_por: string
          descargas_totales: number | null
          etiquetas: string[] | null
          expira_el: string | null
          id: string
          imagen_portada: string | null
          management: Json | null
          nota_prensa_pdf: string | null
          password_hash: string | null
          permitir_zip: boolean | null
          presupuesto_id: string | null
          proyecto_id: string | null
          rastrear_analiticas: boolean | null
          slug: string
          tagline: string | null
          tema: Database["public"]["Enums"]["epk_theme"] | null
          titulo: string
          tour_manager: Json | null
          tour_production: Json | null
          ultima_vista_en: string | null
          visibilidad: Database["public"]["Enums"]["epk_visibility"] | null
          vistas_totales: number | null
          vistas_unicas: number | null
        }
        Insert: {
          acceso_directo?: boolean
          actualizado_en?: string | null
          artista_proyecto: string
          bio_corta?: string | null
          booking?: Json | null
          coordinadora_booking?: Json | null
          creado_en?: string | null
          creado_por: string
          descargas_totales?: number | null
          etiquetas?: string[] | null
          expira_el?: string | null
          id?: string
          imagen_portada?: string | null
          management?: Json | null
          nota_prensa_pdf?: string | null
          password_hash?: string | null
          permitir_zip?: boolean | null
          presupuesto_id?: string | null
          proyecto_id?: string | null
          rastrear_analiticas?: boolean | null
          slug: string
          tagline?: string | null
          tema?: Database["public"]["Enums"]["epk_theme"] | null
          titulo: string
          tour_manager?: Json | null
          tour_production?: Json | null
          ultima_vista_en?: string | null
          visibilidad?: Database["public"]["Enums"]["epk_visibility"] | null
          vistas_totales?: number | null
          vistas_unicas?: number | null
        }
        Update: {
          acceso_directo?: boolean
          actualizado_en?: string | null
          artista_proyecto?: string
          bio_corta?: string | null
          booking?: Json | null
          coordinadora_booking?: Json | null
          creado_en?: string | null
          creado_por?: string
          descargas_totales?: number | null
          etiquetas?: string[] | null
          expira_el?: string | null
          id?: string
          imagen_portada?: string | null
          management?: Json | null
          nota_prensa_pdf?: string | null
          password_hash?: string | null
          permitir_zip?: boolean | null
          presupuesto_id?: string | null
          proyecto_id?: string | null
          rastrear_analiticas?: boolean | null
          slug?: string
          tagline?: string | null
          tema?: Database["public"]["Enums"]["epk_theme"] | null
          titulo?: string
          tour_manager?: Json | null
          tour_production?: Json | null
          ultima_vista_en?: string | null
          visibilidad?: Database["public"]["Enums"]["epk_visibility"] | null
          vistas_totales?: number | null
          vistas_unicas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "epks_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epks_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epks_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      event_document_index: {
        Row: {
          content_fragment: string
          created_at: string
          embedding_data: Json | null
          event_id: string
          file_name: string
          file_path: string
          fragment_index: number
          id: string
          metadata: Json | null
          page_number: number | null
          subfolder: string
          updated_at: string
        }
        Insert: {
          content_fragment: string
          created_at?: string
          embedding_data?: Json | null
          event_id: string
          file_name: string
          file_path: string
          fragment_index?: number
          id?: string
          metadata?: Json | null
          page_number?: number | null
          subfolder: string
          updated_at?: string
        }
        Update: {
          content_fragment?: string
          created_at?: string
          embedding_data?: Json | null
          event_id?: string
          file_name?: string
          file_path?: string
          fragment_index?: number
          id?: string
          metadata?: Json | null
          page_number?: number | null
          subfolder?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_index_status: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          id: string
          last_indexed_at: string | null
          metadata: Json | null
          processed_documents: number
          status: string
          total_documents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          id?: string
          last_indexed_at?: string | null
          metadata?: Json | null
          processed_documents?: number
          status?: string
          total_documents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          id?: string
          last_indexed_at?: string | null
          metadata?: Json | null
          processed_documents?: number
          status?: string
          total_documents?: number
          updated_at?: string
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
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          duration: number | null
          file_bucket: string
          file_path: string
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          last_used_at: string | null
          mime_type: string | null
          platform: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          video_id: string | null
          width: number | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration?: number | null
          file_bucket?: string
          file_path: string
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          last_used_at?: string | null
          mime_type?: string | null
          platform?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          video_id?: string | null
          width?: number | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration?: number | null
          file_bucket?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          last_used_at?: string | null
          mime_type?: string | null
          platform?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          video_id?: string | null
          width?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          scheduled_for: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          scheduled_for?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          scheduled_for?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_earnings: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          currency: string | null
          id: string
          period_end: string
          period_start: string
          platform: string
          song_id: string
          streams: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          currency?: string | null
          id?: string
          period_end: string
          period_start: string
          platform: string
          song_id: string
          streams?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          currency?: string | null
          id?: string
          period_end?: string
          period_start?: string
          platform?: string
          song_id?: string
          streams?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"]
          address: string | null
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          dni_nie: string | null
          dni_photo_url: string | null
          drivers_license_photo_url: string | null
          email: string
          emergency_contact: string | null
          first_name: string | null
          full_name: string
          height: string | null
          home_phone: string | null
          iban: string | null
          id: string
          internal_notes: string | null
          is_smoker: boolean | null
          is_test_user: boolean | null
          jacket_size: string | null
          last_name: string | null
          license_type: string | null
          observations: string | null
          pants_size: string | null
          passport_photo_url: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          second_last_name: string | null
          shirt_size: string | null
          shoe_size: string | null
          social_security: string | null
          stage_name: string | null
          street: string | null
          team_contacts: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role"]
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dni_nie?: string | null
          dni_photo_url?: string | null
          drivers_license_photo_url?: string | null
          email: string
          emergency_contact?: string | null
          first_name?: string | null
          full_name: string
          height?: string | null
          home_phone?: string | null
          iban?: string | null
          id?: string
          internal_notes?: string | null
          is_smoker?: boolean | null
          is_test_user?: boolean | null
          jacket_size?: string | null
          last_name?: string | null
          license_type?: string | null
          observations?: string | null
          pants_size?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          second_last_name?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          social_security?: string | null
          stage_name?: string | null
          street?: string | null
          team_contacts?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"]
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dni_nie?: string | null
          dni_photo_url?: string | null
          drivers_license_photo_url?: string | null
          email?: string
          emergency_contact?: string | null
          first_name?: string | null
          full_name?: string
          height?: string | null
          home_phone?: string | null
          iban?: string | null
          id?: string
          internal_notes?: string | null
          is_smoker?: boolean | null
          is_test_user?: boolean | null
          jacket_size?: string | null
          last_name?: string | null
          license_type?: string | null
          observations?: string | null
          pants_size?: string | null
          passport_photo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          second_last_name?: string | null
          shirt_size?: string | null
          shoe_size?: string | null
          social_security?: string | null
          stage_name?: string | null
          street?: string | null
          team_contacts?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_completed: boolean
          project_id: string
          section: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_completed?: boolean
          project_id: string
          section?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          project_id?: string
          section?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          folder_type: string
          id: string
          project_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder_type?: string
          id?: string
          project_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder_type?: string
          id?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_role_bindings: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_role_bindings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          profile_id: string | null
          project_id: string
          role: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          project_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          artist_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date_estimada: string | null
          equipo_involucrado: string | null
          id: string
          is_folder: boolean
          labels: string[] | null
          metadata: Json | null
          name: string
          objective: string | null
          parent_folder_id: string | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          public_share_enabled: boolean | null
          public_share_expires_at: string | null
          public_share_token: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date_estimada?: string | null
          equipo_involucrado?: string | null
          id?: string
          is_folder?: boolean
          labels?: string[] | null
          metadata?: Json | null
          name: string
          objective?: string | null
          parent_folder_id?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          public_share_enabled?: boolean | null
          public_share_expires_at?: string | null
          public_share_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date_estimada?: string | null
          equipo_involucrado?: string | null
          id?: string
          is_folder?: boolean
          labels?: string[] | null
          metadata?: Json | null
          name?: string
          objective?: string | null
          parent_folder_id?: string | null
          project_type?: Database["public"]["Enums"]["project_type"] | null
          public_share_enabled?: boolean | null
          public_share_expires_at?: string | null
          public_share_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      release_assets: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_bucket: string | null
          file_url: string
          id: string
          release_id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_bucket?: string | null
          file_url: string
          id?: string
          release_id: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_bucket?: string | null
          file_url?: string
          id?: string
          release_id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_assets_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_budgets: {
        Row: {
          actual_cost: number | null
          category: string
          created_at: string
          estimated_cost: number | null
          id: string
          item_name: string
          notes: string | null
          release_id: string
          status: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          actual_cost?: number | null
          category: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_name: string
          notes?: string | null
          release_id: string
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          release_id?: string
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_budgets_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_milestones: {
        Row: {
          category: string | null
          created_at: string
          days_offset: number | null
          due_date: string | null
          id: string
          is_anchor: boolean | null
          notes: string | null
          release_id: string
          responsible: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          days_offset?: number | null
          due_date?: string | null
          id?: string
          is_anchor?: boolean | null
          notes?: string | null
          release_id: string
          responsible?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          days_offset?: number | null
          due_date?: string | null
          id?: string
          is_anchor?: boolean | null
          notes?: string | null
          release_id?: string
          responsible?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_milestones_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          artist_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          genre: string | null
          id: string
          label: string | null
          release_date: string | null
          status: string
          title: string
          type: string
          upc: string | null
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          genre?: string | null
          id?: string
          label?: string | null
          release_date?: string | null
          status?: string
          title: string
          type?: string
          upc?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          genre?: string | null
          id?: string
          label?: string | null
          release_date?: string | null
          status?: string
          title?: string
          type?: string
          upc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
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
      royalty_earnings: {
        Row: {
          amount: number
          artist_id: string | null
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          notes: string | null
          period_end: string
          period_start: string
          platform: string
          song_id: string
          streams: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          period_end: string
          period_start: string
          platform: string
          song_id: string
          streams?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          period_end?: string
          period_start?: string
          platform?: string
          song_id?: string
          streams?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_earnings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_earnings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_payments: {
        Row: {
          calculated_amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_proof_url: string | null
          period_end: string
          period_start: string
          split_id: string
          status: string
          updated_at: string
        }
        Insert: {
          calculated_amount?: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          period_end: string
          period_start: string
          split_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          calculated_amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_proof_url?: string | null
          period_end?: string
          period_start?: string
          split_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_payments_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "royalty_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      royalty_splits: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          percentage: number
          role: string | null
          song_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          percentage: number
          role?: string | null
          song_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          percentage?: number
          role?: string | null
          song_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_splits_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitud_decision_messages: {
        Row: {
          author_name: string | null
          author_profile_id: string | null
          created_at: string
          id: string
          is_system: boolean
          message: string
          solicitud_id: string
        }
        Insert: {
          author_name?: string | null
          author_profile_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          message: string
          solicitud_id: string
        }
        Update: {
          author_name?: string | null
          author_profile_id?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          message?: string
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_decision_messages_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitud_decision_messages_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitud_history: {
        Row: {
          changed_at: string
          changed_by_profile_id: string
          changes: Json
          condicion: string | null
          estado: Database["public"]["Enums"]["request_status"]
          event_type: string
          id: string
          message: string | null
          nota: string | null
          related_message_id: string | null
          solicitud_id: string
        }
        Insert: {
          changed_at?: string
          changed_by_profile_id: string
          changes?: Json
          condicion?: string | null
          estado: Database["public"]["Enums"]["request_status"]
          event_type?: string
          id?: string
          message?: string | null
          nota?: string | null
          related_message_id?: string | null
          solicitud_id: string
        }
        Update: {
          changed_at?: string
          changed_by_profile_id?: string
          changes?: Json
          condicion?: string | null
          estado?: Database["public"]["Enums"]["request_status"]
          event_type?: string
          id?: string
          message?: string | null
          nota?: string | null
          related_message_id?: string | null
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_history_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitud_history_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          archived: boolean
          archivos_adjuntos: Json | null
          artist_id: string | null
          ciudad: string | null
          comentario_estado: string | null
          contact_id: string | null
          created_by: string
          decision_fecha: string | null
          decision_has_new_comment: boolean
          decision_por: string | null
          descripcion_libre: string | null
          email: string | null
          estado: Database["public"]["Enums"]["request_status"]
          fecha_actualizacion: string
          fecha_creacion: string
          fecha_limite_respuesta: string | null
          hora_entrevista: string | null
          hora_show: string | null
          id: string
          informacion_programa: string | null
          lugar_concierto: string | null
          medio: string | null
          nombre_entrevistador: string | null
          nombre_festival: string | null
          nombre_programa: string | null
          nombre_solicitante: string
          notas_internas: string | null
          observaciones: string | null
          oferta: string | null
          project_id: string | null
          telefono: string | null
          tipo: Database["public"]["Enums"]["request_type"]
        }
        Insert: {
          archived?: boolean
          archivos_adjuntos?: Json | null
          artist_id?: string | null
          ciudad?: string | null
          comentario_estado?: string | null
          contact_id?: string | null
          created_by: string
          decision_fecha?: string | null
          decision_has_new_comment?: boolean
          decision_por?: string | null
          descripcion_libre?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["request_status"]
          fecha_actualizacion?: string
          fecha_creacion?: string
          fecha_limite_respuesta?: string | null
          hora_entrevista?: string | null
          hora_show?: string | null
          id?: string
          informacion_programa?: string | null
          lugar_concierto?: string | null
          medio?: string | null
          nombre_entrevistador?: string | null
          nombre_festival?: string | null
          nombre_programa?: string | null
          nombre_solicitante: string
          notas_internas?: string | null
          observaciones?: string | null
          oferta?: string | null
          project_id?: string | null
          telefono?: string | null
          tipo: Database["public"]["Enums"]["request_type"]
        }
        Update: {
          archived?: boolean
          archivos_adjuntos?: Json | null
          artist_id?: string | null
          ciudad?: string | null
          comentario_estado?: string | null
          contact_id?: string | null
          created_by?: string
          decision_fecha?: string | null
          decision_has_new_comment?: boolean
          decision_por?: string | null
          descripcion_libre?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["request_status"]
          fecha_actualizacion?: string
          fecha_creacion?: string
          fecha_limite_respuesta?: string | null
          hora_entrevista?: string | null
          hora_show?: string | null
          id?: string
          informacion_programa?: string | null
          lugar_concierto?: string | null
          medio?: string | null
          nombre_entrevistador?: string | null
          nombre_festival?: string | null
          nombre_programa?: string | null
          nombre_solicitante?: string
          notas_internas?: string | null
          observaciones?: string | null
          oferta?: string | null
          project_id?: string | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["request_type"]
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "solicitudes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      song_splits: {
        Row: {
          collaborator_contact_id: string | null
          collaborator_email: string | null
          collaborator_name: string
          created_at: string
          created_by: string
          id: string
          payment_info: string | null
          percentage: number
          role: string
          song_id: string
          updated_at: string
        }
        Insert: {
          collaborator_contact_id?: string | null
          collaborator_email?: string | null
          collaborator_name: string
          created_at?: string
          created_by: string
          id?: string
          payment_info?: string | null
          percentage: number
          role?: string
          song_id: string
          updated_at?: string
        }
        Update: {
          collaborator_contact_id?: string | null
          collaborator_email?: string | null
          collaborator_name?: string
          created_at?: string
          created_by?: string
          id?: string
          payment_info?: string | null
          percentage?: number
          role?: string
          song_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_splits_collaborator_contact_id_fkey"
            columns: ["collaborator_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_splits_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist_id: string | null
          created_at: string
          created_by: string
          id: string
          isrc: string | null
          metadata: Json | null
          release_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          isrc?: string | null
          metadata?: Json | null
          release_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          isrc?: string | null
          metadata?: Json | null
          release_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      track_credits: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          percentage: number | null
          role: string
          track_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          percentage?: number | null
          role: string
          track_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          percentage?: number | null
          role?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_credits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_credits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_versions: {
        Row: {
          created_at: string
          file_bucket: string | null
          file_url: string
          id: string
          is_current_version: boolean | null
          notes: string | null
          track_id: string
          uploaded_by: string | null
          version_name: string
        }
        Insert: {
          created_at?: string
          file_bucket?: string | null
          file_url: string
          id?: string
          is_current_version?: boolean | null
          notes?: string | null
          track_id: string
          uploaded_by?: string | null
          version_name: string
        }
        Update: {
          created_at?: string
          file_bucket?: string | null
          file_url?: string
          id?: string
          is_current_version?: boolean | null
          notes?: string | null
          track_id?: string
          uploaded_by?: string | null
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_versions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          isrc: string | null
          lyrics: string | null
          notes: string | null
          release_id: string
          title: string
          track_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          isrc?: string | null
          lyrics?: string | null
          notes?: string | null
          release_id: string
          title: string
          track_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          isrc?: string | null
          lyrics?: string | null
          notes?: string | null
          release_id?: string
          title?: string
          track_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_changes_json: {
        Args: { new_data: Json; old_data: Json }
        Returns: Json
      }
      check_epk_password_attempts: {
        Args: { client_ip?: unknown; epk_slug: string }
        Returns: Json
      }
      check_pending_royalty_payments: { Args: never; Returns: undefined }
      generate_contact_slug: { Args: never; Returns: string }
      generate_epk_slug: { Args: { artista_proyecto: string }; Returns: string }
      generate_project_share_token: { Args: never; Returns: string }
      get_profile_id_by_user: { Args: { _user_id: string }; Returns: string }
      get_user_artist_roles: {
        Args: { _user_id: string }
        Returns: {
          artist_id: string
          role: Database["public"]["Enums"]["artist_role"]
        }[]
      }
      get_user_project_roles: {
        Args: { _user_id: string }
        Returns: {
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
        }[]
      }
      get_user_workspace_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
        }[]
      }
      increment_epk_download: {
        Args: { epk_slug: string; recurso?: string }
        Returns: undefined
      }
      increment_epk_view: {
        Args: { epk_slug: string; is_unique?: boolean; visitor_ip?: unknown }
        Returns: undefined
      }
      log_approval_event: {
        Args: {
          p_approval_id: string
          p_diff?: Json
          p_event_type: Database["public"]["Enums"]["approval_event_type"]
          p_from_status?: Database["public"]["Enums"]["approval_status"]
          p_to_status?: Database["public"]["Enums"]["approval_status"]
        }
        Returns: undefined
      }
      record_failed_password_attempt: {
        Args: { client_ip?: unknown; epk_slug: string }
        Returns: Json
      }
      reset_password_attempts: {
        Args: { client_ip?: unknown; epk_slug: string }
        Returns: undefined
      }
      safe_get_profile_id: { Args: { _user_id: string }; Returns: string }
      user_has_workspace_permission: {
        Args: {
          _required_role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      user_is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      validate_approval_transition: {
        Args: { p_action: string; p_approval_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      approval_event_type:
        | "CREATED"
        | "UPDATED"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "COMMENTED"
        | "ASSIGN_CHANGED"
      approval_status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
      approval_type: "BUDGET" | "PR_REQUEST" | "LOGISTICS"
      artist_role: "ARTIST_MANAGER" | "ARTIST_OBSERVER"
      billing_status:
        | "pendiente"
        | "pagado"
        | "facturado"
        | "cancelado"
        | "factura_solicitada"
      budget_status: "nacional" | "internacional"
      budget_type:
        | "concierto"
        | "produccion_musical"
        | "campana_promocional"
        | "videoclip"
        | "otros"
      contract_status: "borrador" | "pendiente_firma" | "firmado"
      due_anchor:
        | "SHOW_DAY"
        | "PRESS_LAUNCH"
        | "SHOOT_DAY"
        | "PUBLISH_DAY"
        | "RELEASE_DAY"
        | "MEETING_DAY"
        | "PAYRUN_DAY"
      epk_theme: "auto" | "claro" | "oscuro"
      epk_video_type: "youtube" | "vimeo" | "archivo"
      epk_visibility: "publico" | "privado" | "protegido_password"
      project_role: "EDITOR" | "COMMENTER" | "VIEWER"
      project_status: "en_curso" | "finalizado" | "archivado"
      project_type: "TOUR" | "SINGLE_RELEASE" | "VIDEO" | "CAMPAIGN"
      request_status:
        | "pendiente"
        | "aprobada"
        | "denegada"
        | "consulta"
        | "informacion"
      request_type:
        | "entrevista"
        | "booking"
        | "otro"
        | "consulta"
        | "informacion"
        | "licencia"
        | "otros"
      show_status: "confirmado" | "pendiente" | "cancelado"
      task_status:
        | "PENDING"
        | "IN_PROGRESS"
        | "BLOCKED"
        | "IN_REVIEW"
        | "COMPLETED"
        | "CANCELLED"
      user_role: "artist" | "management"
      workspace_role: "OWNER" | "TEAM_MANAGER"
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
      approval_event_type: [
        "CREATED",
        "UPDATED",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "COMMENTED",
        "ASSIGN_CHANGED",
      ],
      approval_status: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      approval_type: ["BUDGET", "PR_REQUEST", "LOGISTICS"],
      artist_role: ["ARTIST_MANAGER", "ARTIST_OBSERVER"],
      billing_status: [
        "pendiente",
        "pagado",
        "facturado",
        "cancelado",
        "factura_solicitada",
      ],
      budget_status: ["nacional", "internacional"],
      budget_type: [
        "concierto",
        "produccion_musical",
        "campana_promocional",
        "videoclip",
        "otros",
      ],
      contract_status: ["borrador", "pendiente_firma", "firmado"],
      due_anchor: [
        "SHOW_DAY",
        "PRESS_LAUNCH",
        "SHOOT_DAY",
        "PUBLISH_DAY",
        "RELEASE_DAY",
        "MEETING_DAY",
        "PAYRUN_DAY",
      ],
      epk_theme: ["auto", "claro", "oscuro"],
      epk_video_type: ["youtube", "vimeo", "archivo"],
      epk_visibility: ["publico", "privado", "protegido_password"],
      project_role: ["EDITOR", "COMMENTER", "VIEWER"],
      project_status: ["en_curso", "finalizado", "archivado"],
      project_type: ["TOUR", "SINGLE_RELEASE", "VIDEO", "CAMPAIGN"],
      request_status: [
        "pendiente",
        "aprobada",
        "denegada",
        "consulta",
        "informacion",
      ],
      request_type: [
        "entrevista",
        "booking",
        "otro",
        "consulta",
        "informacion",
        "licencia",
        "otros",
      ],
      show_status: ["confirmado", "pendiente", "cancelado"],
      task_status: [
        "PENDING",
        "IN_PROGRESS",
        "BLOCKED",
        "IN_REVIEW",
        "COMPLETED",
        "CANCELLED",
      ],
      user_role: ["artist", "management"],
      workspace_role: ["OWNER", "TEAM_MANAGER"],
    },
  },
} as const
