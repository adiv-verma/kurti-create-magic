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
      background_images: {
        Row: {
          file_name: string
          id: string
          image_url: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name?: string
          id?: string
          image_url: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          image_url?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fabric_images: {
        Row: {
          file_name: string
          id: string
          image_url: string
          upload_type: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name?: string
          id?: string
          image_url: string
          upload_type?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          image_url?: string
          upload_type?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_content: {
        Row: {
          background_image_url: string | null
          caption_english: string | null
          caption_hindi: string | null
          created_at: string
          fabric_id: string
          id: string
          model_image_url: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          background_image_url?: string | null
          caption_english?: string | null
          caption_hindi?: string | null
          created_at?: string
          fabric_id: string
          id?: string
          model_image_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          background_image_url?: string | null
          caption_english?: string | null
          caption_hindi?: string | null
          created_at?: string
          fabric_id?: string
          id?: string
          model_image_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabric_images"
            referencedColumns: ["id"]
          },
        ]
      }
      mannequin_images: {
        Row: {
          file_name: string
          id: string
          image_url: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name?: string
          id?: string
          image_url: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          image_url?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      multi_fabric_jobs: {
        Row: {
          background_image_url: string | null
          color_output_mode: string
          created_at: string
          detected_labels: Json | null
          error_message: string | null
          id: string
          mannequin_image_url: string | null
          source_image_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background_image_url?: string | null
          color_output_mode?: string
          created_at?: string
          detected_labels?: Json | null
          error_message?: string | null
          id?: string
          mannequin_image_url?: string | null
          source_image_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          background_image_url?: string | null
          color_output_mode?: string
          created_at?: string
          detected_labels?: Json | null
          error_message?: string | null
          id?: string
          mannequin_image_url?: string | null
          source_image_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      multi_fabric_results: {
        Row: {
          caption_english: string | null
          caption_hindi: string | null
          color_variant: string | null
          created_at: string
          error_message: string | null
          generated_image_url: string | null
          id: string
          job_id: string
          label: string
          status: string
          user_id: string
        }
        Insert: {
          caption_english?: string | null
          caption_hindi?: string | null
          color_variant?: string | null
          created_at?: string
          error_message?: string | null
          generated_image_url?: string | null
          id?: string
          job_id: string
          label: string
          status?: string
          user_id: string
        }
        Update: {
          caption_english?: string | null
          caption_hindi?: string | null
          color_variant?: string | null
          created_at?: string
          error_message?: string | null
          generated_image_url?: string | null
          id?: string
          job_id?: string
          label?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multi_fabric_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "multi_fabric_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string
          created_at: string
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reels: {
        Row: {
          caption_english: string | null
          caption_hindi: string | null
          content_id: string
          created_at: string
          error_message: string | null
          id: string
          music_url: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
          voiceover_url: string | null
        }
        Insert: {
          caption_english?: string | null
          caption_hindi?: string | null
          content_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          music_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          voiceover_url?: string | null
        }
        Update: {
          caption_english?: string | null
          caption_hindi?: string | null
          content_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          music_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          voiceover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "generated_content"
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
      content_status: "pending" | "approved" | "rejected"
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
      content_status: ["pending", "approved", "rejected"],
    },
  },
} as const
