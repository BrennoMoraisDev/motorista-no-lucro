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
      daily_records: {
        Row: {
          created_at: string
          custo_financiamento_diario: number | null
          date: string
          gasto_alimentacao: number | null
          gasto_combustivel: number | null
          gasto_outros: number | null
          id: string
          indrive_amount: number | null
          indrive_rides: number | null
          km_total: number | null
          lucro_bruto: number | null
          lucro_liquido: number | null
          media_hora_liquida: number | null
          ninety_nine_amount: number | null
          ninety_nine_rides: number | null
          private_amount: number | null
          private_rides: number | null
          provisao_ipva_diaria: number | null
          provisao_manutencao_diaria: number | null
          provisao_seguro_diaria: number | null
          shift_session_id: string | null
          tempo_ativo_segundos: number | null
          total_faturamento: number | null
          total_gastos_variaveis: number | null
          uber_amount: number | null
          uber_rides: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custo_financiamento_diario?: number | null
          date: string
          gasto_alimentacao?: number | null
          gasto_combustivel?: number | null
          gasto_outros?: number | null
          id?: string
          indrive_amount?: number | null
          indrive_rides?: number | null
          km_total?: number | null
          lucro_bruto?: number | null
          lucro_liquido?: number | null
          media_hora_liquida?: number | null
          ninety_nine_amount?: number | null
          ninety_nine_rides?: number | null
          private_amount?: number | null
          private_rides?: number | null
          provisao_ipva_diaria?: number | null
          provisao_manutencao_diaria?: number | null
          provisao_seguro_diaria?: number | null
          shift_session_id?: string | null
          tempo_ativo_segundos?: number | null
          total_faturamento?: number | null
          total_gastos_variaveis?: number | null
          uber_amount?: number | null
          uber_rides?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custo_financiamento_diario?: number | null
          date?: string
          gasto_alimentacao?: number | null
          gasto_combustivel?: number | null
          gasto_outros?: number | null
          id?: string
          indrive_amount?: number | null
          indrive_rides?: number | null
          km_total?: number | null
          lucro_bruto?: number | null
          lucro_liquido?: number | null
          media_hora_liquida?: number | null
          ninety_nine_amount?: number | null
          ninety_nine_rides?: number | null
          private_amount?: number | null
          private_rides?: number | null
          provisao_ipva_diaria?: number | null
          provisao_manutencao_diaria?: number | null
          provisao_seguro_diaria?: number | null
          shift_session_id?: string | null
          tempo_ativo_segundos?: number | null
          total_faturamento?: number | null
          total_gastos_variaveis?: number | null
          uber_amount?: number | null
          uber_rides?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_records_shift_session_id_fkey"
            columns: ["shift_session_id"]
            isOneToOne: false
            referencedRelation: "shift_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kiwify_events: {
        Row: {
          created_at: string | null
          email: string | null
          error_log: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          error_log?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          error_log?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          data_expiracao: string | null
          email: string
          id: string
          name: string
          photo_url: string | null
          plano: string
          status_assinatura: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_expiracao?: string | null
          email: string
          id?: string
          name: string
          photo_url?: string | null
          plano?: string
          status_assinatura?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_expiracao?: string | null
          email?: string
          id?: string
          name?: string
          photo_url?: string | null
          plano?: string
          status_assinatura?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_paused: boolean
          meta_acumulada: number
          paused_at: string | null
          start_time: string
          total_active_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_paused?: boolean
          meta_acumulada?: number
          paused_at?: string | null
          start_time?: string
          total_active_seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_paused?: boolean
          meta_acumulada?: number
          paused_at?: string | null
          start_time?: string
          total_active_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          kiwify_transaction_id: string | null
          plan_type: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          kiwify_transaction_id?: string | null
          plan_type?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          kiwify_transaction_id?: string | null
          plan_type?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          dias_trabalho_mes: number
          id: string
          meta_mensal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dias_trabalho_mes?: number
          id?: string
          meta_mensal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dias_trabalho_mes?: number
          id?: string
          meta_mensal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          financiamento_mensal: number | null
          id: string
          incluir_financiamento: boolean
          incluir_ipva: boolean
          incluir_manutencao: boolean
          incluir_seguro: boolean
          ipva_vencimento: string | null
          manutencao_mensal_est: number | null
          seguro_mensal_est: number | null
          updated_at: string
          user_id: string
          valor_fipe: number
        }
        Insert: {
          created_at?: string
          financiamento_mensal?: number | null
          id?: string
          incluir_financiamento?: boolean
          incluir_ipva?: boolean
          incluir_manutencao?: boolean
          incluir_seguro?: boolean
          ipva_vencimento?: string | null
          manutencao_mensal_est?: number | null
          seguro_mensal_est?: number | null
          updated_at?: string
          user_id: string
          valor_fipe?: number
        }
        Update: {
          created_at?: string
          financiamento_mensal?: number | null
          id?: string
          incluir_financiamento?: boolean
          incluir_ipva?: boolean
          incluir_manutencao?: boolean
          incluir_seguro?: boolean
          ipva_vencimento?: string | null
          manutencao_mensal_est?: number | null
          seguro_mensal_est?: number | null
          updated_at?: string
          user_id?: string
          valor_fipe?: number
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
