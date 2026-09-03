export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      academic_terms: {
        Row: {
          academic_year_id: number;
          created_at: string;
          created_by: string | null;
          ends_on: string | null;
          id: number;
          is_current: boolean;
          name: string;
          sequence: number;
          starts_on: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          academic_year_id: number;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string | null;
          id?: never;
          is_current?: boolean;
          name: string;
          sequence: number;
          starts_on?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          academic_year_id?: number;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string | null;
          id?: never;
          is_current?: boolean;
          name?: string;
          sequence?: number;
          starts_on?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_terms_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_terms_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_terms_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_years: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: number;
          is_current: boolean;
          name: string;
          short_name: string;
          starts_on: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: never;
          is_current?: boolean;
          name: string;
          short_name: string;
          starts_on: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: never;
          is_current?: boolean;
          name?: string;
          short_name?: string;
          starts_on?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_years_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_years_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      administrator_accounts: {
        Row: {
          created_at: string;
          created_by: string | null;
          email: string;
          id: string;
          invitation_status: string;
          invited_at: string | null;
          phone: string | null;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email: string;
          id?: string;
          invitation_status?: string;
          invited_at?: string | null;
          phone?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email?: string;
          id?: string;
          invitation_status?: string;
          invited_at?: string | null;
          phone?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "administrator_accounts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "administrator_accounts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "administrator_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      administrator_provisioning_requests: {
        Row: {
          account_status: string;
          batch_id: string;
          completed_at: string | null;
          created_at: string;
          display_name: string;
          email: string;
          failure_reason: string | null;
          id: string;
          invited_by: string;
          phone: string | null;
          provider_user_id: string | null;
          role_code: string;
          status: string;
        };
        Insert: {
          account_status?: string;
          batch_id: string;
          completed_at?: string | null;
          created_at?: string;
          display_name: string;
          email: string;
          failure_reason?: string | null;
          id?: string;
          invited_by: string;
          phone?: string | null;
          provider_user_id?: string | null;
          role_code: string;
          status?: string;
        };
        Update: {
          account_status?: string;
          batch_id?: string;
          completed_at?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          failure_reason?: string | null;
          id?: string;
          invited_by?: string;
          phone?: string | null;
          provider_user_id?: string | null;
          role_code?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "administrator_provisioning_requests_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "administrator_provisioning_requests_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["code"];
          },
        ];
      };
      admission_receipts: {
        Row: {
          admission_number_snapshot: string;
          amount: number;
          business_date: string;
          class_name_snapshot: string;
          created_at: string;
          created_by: string;
          external_reference: string | null;
          id: number;
          notes: string | null;
          payment_method_id: number;
          receipt_number: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: string;
          student_id: number;
          student_name_snapshot: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          admission_number_snapshot: string;
          amount: number;
          business_date: string;
          class_name_snapshot: string;
          created_at?: string;
          created_by: string;
          external_reference?: string | null;
          id?: never;
          notes?: string | null;
          payment_method_id: number;
          receipt_number: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_id: number;
          student_name_snapshot: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          admission_number_snapshot?: string;
          amount?: number;
          business_date?: string;
          class_name_snapshot?: string;
          created_at?: string;
          created_by?: string;
          external_reference?: string | null;
          id?: never;
          notes?: string | null;
          payment_method_id?: number;
          receipt_number?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_id?: number;
          student_name_snapshot?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admission_receipts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admission_receipts_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admission_receipts_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admission_receipts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admission_receipts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admission_receipts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: number;
          new_values: Json | null;
          old_values: Json | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: never;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          class_group: string;
          code: string;
          created_at: string;
          created_by: string | null;
          id: number;
          name: string;
          sort_order: number;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          class_group: string;
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name: string;
          sort_order: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          class_group?: string;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "classes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: number;
          name: string;
          sort_order: number;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name: string;
          sort_order: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_categories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          attachment_path: string | null;
          business_date: string;
          created_at: string;
          created_by: string;
          description: string;
          expense_category_id: number;
          expense_number: string;
          external_reference: string | null;
          id: number;
          payment_method_id: number;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          amount: number;
          attachment_path?: string | null;
          business_date: string;
          created_at?: string;
          created_by: string;
          description: string;
          expense_category_id: number;
          expense_number: string;
          external_reference?: string | null;
          id?: never;
          payment_method_id: number;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          amount?: number;
          attachment_path?: string | null;
          business_date?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          expense_category_id?: number;
          expense_number?: string;
          external_reference?: string | null;
          id?: never;
          payment_method_id?: number;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_expense_category_id_fkey";
            columns: ["expense_category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_component_rates: {
        Row: {
          academic_term_id: number;
          academic_year_id: number;
          amount: number;
          class_id: number | null;
          created_at: string;
          created_by: string | null;
          fee_component_id: number;
          id: number;
          school_location_id: number | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          academic_term_id: number;
          academic_year_id: number;
          amount: number;
          class_id?: number | null;
          created_at?: string;
          created_by?: string | null;
          fee_component_id: number;
          id?: never;
          school_location_id?: number | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          academic_term_id?: number;
          academic_year_id?: number;
          amount?: number;
          class_id?: number | null;
          created_at?: string;
          created_by?: string | null;
          fee_component_id?: number;
          id?: never;
          school_location_id?: number | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_component_rates_academic_term_id_fkey";
            columns: ["academic_term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_component_rates_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_component_rates_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_component_rates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_component_rates_fee_component_id_fkey";
            columns: ["fee_component_id"];
            isOneToOne: false;
            referencedRelation: "fee_components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_component_rates_school_location_id_fkey";
            columns: ["school_location_id"];
            isOneToOne: false;
            referencedRelation: "school_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_component_rates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_components: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: number;
          is_required: boolean;
          name: string;
          scope: string;
          sort_order: number;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          is_required?: boolean;
          name: string;
          scope: string;
          sort_order: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          is_required?: boolean;
          name?: string;
          scope?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_components_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_components_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feeding_receipts: {
        Row: {
          admission_number_snapshot: string;
          amount: number;
          business_date: string;
          class_name_snapshot: string;
          created_at: string;
          created_by: string;
          external_reference: string | null;
          id: number;
          notes: string | null;
          payment_method_id: number;
          receipt_number: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: string;
          student_id: number;
          student_name_snapshot: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          admission_number_snapshot: string;
          amount: number;
          business_date: string;
          class_name_snapshot: string;
          created_at?: string;
          created_by: string;
          external_reference?: string | null;
          id?: never;
          notes?: string | null;
          payment_method_id: number;
          receipt_number: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_id: number;
          student_name_snapshot: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          admission_number_snapshot?: string;
          amount?: number;
          business_date?: string;
          class_name_snapshot?: string;
          created_at?: string;
          created_by?: string;
          external_reference?: string | null;
          id?: never;
          notes?: string | null;
          payment_method_id?: number;
          receipt_number?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_id?: number;
          student_name_snapshot?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feeding_receipts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feeding_receipts_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feeding_receipts_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feeding_receipts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feeding_receipts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feeding_receipts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      guardians: {
        Row: {
          address: string | null;
          alternative_phone: string | null;
          created_at: string;
          created_by: string;
          email: string | null;
          full_name: string;
          id: number;
          identity_key: string | null;
          primary_phone: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          address?: string | null;
          alternative_phone?: string | null;
          created_at?: string;
          created_by: string;
          email?: string | null;
          full_name: string;
          id?: never;
          identity_key?: string | null;
          primary_phone: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          address?: string | null;
          alternative_phone?: string | null;
          created_at?: string;
          created_by?: string;
          email?: string | null;
          full_name?: string;
          id?: never;
          identity_key?: string | null;
          primary_phone?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guardians_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardians_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_lines: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string;
          description: string;
          fee_component_id: number;
          id: number;
          invoice_id: number;
          sort_order: number;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by: string;
          description: string;
          fee_component_id: number;
          id?: never;
          invoice_id: number;
          sort_order: number;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string;
          description?: string;
          fee_component_id?: number;
          id?: never;
          invoice_id?: number;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_fee_component_id_fkey";
            columns: ["fee_component_id"];
            isOneToOne: false;
            referencedRelation: "fee_components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          academic_term_id: number;
          academic_year_id: number;
          admission_number_snapshot: string;
          amount_paid: number;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          class_id: number;
          class_name_snapshot: string;
          created_at: string;
          created_by: string;
          id: number;
          invoice_number: string;
          issued_on: string;
          location_name_snapshot: string;
          outstanding: number | null;
          school_location_id: number;
          status: string;
          student_id: number;
          student_name_snapshot: string;
          subtotal: number;
          total: number;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          academic_term_id: number;
          academic_year_id: number;
          admission_number_snapshot: string;
          amount_paid?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          class_id: number;
          class_name_snapshot: string;
          created_at?: string;
          created_by: string;
          id?: never;
          invoice_number: string;
          issued_on?: string;
          location_name_snapshot: string;
          outstanding?: number | null;
          school_location_id: number;
          status?: string;
          student_id: number;
          student_name_snapshot: string;
          subtotal: number;
          total: number;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          academic_term_id?: number;
          academic_year_id?: number;
          admission_number_snapshot?: string;
          amount_paid?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          class_id?: number;
          class_name_snapshot?: string;
          created_at?: string;
          created_by?: string;
          id?: never;
          invoice_number?: string;
          issued_on?: string;
          location_name_snapshot?: string;
          outstanding?: number | null;
          school_location_id?: number;
          status?: string;
          student_id?: number;
          student_name_snapshot?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_academic_term_id_fkey";
            columns: ["academic_term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_school_location_id_fkey";
            columns: ["school_location_id"];
            isOneToOne: false;
            referencedRelation: "school_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      misc_income_categories: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: number;
          name: string;
          sort_order: number;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name: string;
          sort_order: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "misc_income_categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_income_categories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      misc_receipts: {
        Row: {
          amount: number;
          business_date: string;
          created_at: string;
          created_by: string;
          description: string;
          external_reference: string | null;
          id: number;
          misc_income_category_id: number;
          notes: string | null;
          payer_name: string | null;
          payment_method_id: number;
          receipt_number: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: string;
          student_id: number | null;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          amount: number;
          business_date: string;
          created_at?: string;
          created_by: string;
          description: string;
          external_reference?: string | null;
          id?: never;
          misc_income_category_id: number;
          notes?: string | null;
          payer_name?: string | null;
          payment_method_id: number;
          receipt_number: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_id?: number | null;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          amount?: number;
          business_date?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          external_reference?: string | null;
          id?: never;
          misc_income_category_id?: number;
          notes?: string | null;
          payer_name?: string | null;
          payment_method_id?: number;
          receipt_number?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_id?: number | null;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "misc_receipts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_receipts_misc_income_category_id_fkey";
            columns: ["misc_income_category_id"];
            isOneToOne: false;
            referencedRelation: "misc_income_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_receipts_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_receipts_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_receipts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_receipts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misc_receipts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_methods: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: number;
          name: string;
          requires_reference: boolean;
          sort_order: number;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name: string;
          requires_reference?: boolean;
          sort_order: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name?: string;
          requires_reference?: boolean;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_methods_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          business_date: string;
          created_at: string;
          created_by: string;
          external_reference: string | null;
          id: number;
          invoice_id: number;
          notes: string | null;
          payment_method_id: number;
          payment_number: string;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          amount: number;
          business_date: string;
          created_at?: string;
          created_by: string;
          external_reference?: string | null;
          id?: never;
          invoice_id: number;
          notes?: string | null;
          payment_method_id: number;
          payment_number: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          amount?: number;
          business_date?: string;
          created_at?: string;
          created_by?: string;
          external_reference?: string | null;
          id?: never;
          invoice_id?: number;
          notes?: string | null;
          payment_method_id?: number;
          payment_number?: string;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          code: string;
          description: string;
        };
        Insert: {
          code: string;
          description: string;
        };
        Update: {
          code?: string;
          description?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          must_change_password: boolean;
          password_changed_at: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          must_change_password?: boolean;
          password_changed_at?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          must_change_password?: boolean;
          password_changed_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          academic_term_name_snapshot: string;
          academic_year_name_snapshot: string;
          admission_number_snapshot: string;
          amount: number;
          business_date: string;
          class_name_snapshot: string;
          collected_by_snapshot: string;
          created_at: string;
          created_by: string;
          id: number;
          invoice_number_snapshot: string;
          payment_id: number;
          payment_method_name_snapshot: string;
          previous_balance: number;
          receipt_number: string;
          remaining_balance: number;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
          status: string;
          student_name_snapshot: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          academic_term_name_snapshot: string;
          academic_year_name_snapshot: string;
          admission_number_snapshot: string;
          amount: number;
          business_date: string;
          class_name_snapshot: string;
          collected_by_snapshot: string;
          created_at?: string;
          created_by: string;
          id?: never;
          invoice_number_snapshot: string;
          payment_id: number;
          payment_method_name_snapshot: string;
          previous_balance: number;
          receipt_number: string;
          remaining_balance: number;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_name_snapshot: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          academic_term_name_snapshot?: string;
          academic_year_name_snapshot?: string;
          admission_number_snapshot?: string;
          amount?: number;
          business_date?: string;
          class_name_snapshot?: string;
          collected_by_snapshot?: string;
          created_at?: string;
          created_by?: string;
          id?: never;
          invoice_number_snapshot?: string;
          payment_id?: number;
          payment_method_name_snapshot?: string;
          previous_balance?: number;
          receipt_number?: string;
          remaining_balance?: number;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
          status?: string;
          student_name_snapshot?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission_code: string;
          role_code: string;
        };
        Insert: {
          permission_code: string;
          role_code: string;
        };
        Update: {
          permission_code?: string;
          role_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey";
            columns: ["permission_code"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "role_permissions_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["code"];
          },
        ];
      };
      roles: {
        Row: {
          code: string;
          label: string;
        };
        Insert: {
          code: string;
          label: string;
        };
        Update: {
          code?: string;
          label?: string;
        };
        Relationships: [];
      };
      school_locations: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          id: number;
          name: string;
          sort_order: number;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name: string;
          sort_order: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          name?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "school_locations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "school_locations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      school_settings: {
        Row: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: number;
          location_charge_label: string;
          logo_path: string | null;
          motto: string | null;
          phone: string | null;
          school_name: string;
          short_name: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: number;
          location_charge_label?: string;
          logo_path?: string | null;
          motto?: string | null;
          phone?: string | null;
          school_name: string;
          short_name?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: number;
          location_charge_label?: string;
          logo_path?: string | null;
          motto?: string | null;
          phone?: string | null;
          school_name?: string;
          short_name?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "school_settings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "school_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          created_at: string;
          created_by: string;
          date_joined: string | null;
          date_of_birth: string | null;
          email: string | null;
          first_name: string | null;
          id: number;
          known_subjects: string[];
          last_name: string | null;
          middle_name: string | null;
          phone: string | null;
          position: string;
          recorded_name: string | null;
          staff_number: string;
          staff_type: string;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          date_joined?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          id?: never;
          known_subjects?: string[];
          last_name?: string | null;
          middle_name?: string | null;
          phone?: string | null;
          position: string;
          recorded_name?: string | null;
          staff_number: string;
          staff_type: string;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          date_joined?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          id?: never;
          known_subjects?: string[];
          last_name?: string | null;
          middle_name?: string | null;
          phone?: string | null;
          position?: string;
          recorded_name?: string | null;
          staff_number?: string;
          staff_type?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_assignments: {
        Row: {
          academic_term_id: number;
          academic_year_id: number;
          assignment_kind: string;
          class_id: number;
          created_at: string;
          created_by: string;
          ended_on: string | null;
          id: number;
          staff_id: number;
          started_on: string;
          status: string;
          subject_name: string | null;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          academic_term_id: number;
          academic_year_id: number;
          assignment_kind?: string;
          class_id: number;
          created_at?: string;
          created_by: string;
          ended_on?: string | null;
          id?: never;
          staff_id: number;
          started_on: string;
          status?: string;
          subject_name?: string | null;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          academic_term_id?: number;
          academic_year_id?: number;
          assignment_kind?: string;
          class_id?: number;
          created_at?: string;
          created_by?: string;
          ended_on?: string | null;
          id?: never;
          staff_id?: number;
          started_on?: string;
          status?: string;
          subject_name?: string | null;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_assignments_academic_term_id_fkey";
            columns: ["academic_term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_assignments_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_enrollments: {
        Row: {
          academic_term_id: number;
          academic_year_id: number;
          class_id: number;
          created_at: string;
          created_by: string;
          ended_on: string | null;
          id: number;
          school_location_id: number;
          started_on: string;
          status: string;
          student_id: number;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          academic_term_id: number;
          academic_year_id: number;
          class_id: number;
          created_at?: string;
          created_by: string;
          ended_on?: string | null;
          id?: never;
          school_location_id: number;
          started_on: string;
          status?: string;
          student_id: number;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          academic_term_id?: number;
          academic_year_id?: number;
          class_id?: number;
          created_at?: string;
          created_by?: string;
          ended_on?: string | null;
          id?: never;
          school_location_id?: number;
          started_on?: string;
          status?: string;
          student_id?: number;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_enrollments_academic_term_id_fkey";
            columns: ["academic_term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_school_location_id_fkey";
            columns: ["school_location_id"];
            isOneToOne: false;
            referencedRelation: "school_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_guardians: {
        Row: {
          created_at: string;
          created_by: string;
          guardian_id: number;
          id: number;
          is_primary: boolean;
          relationship: string;
          student_id: number;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          guardian_id: number;
          id?: never;
          is_primary?: boolean;
          relationship: string;
          student_id: number;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          guardian_id?: number;
          id?: never;
          is_primary?: boolean;
          relationship?: string;
          student_id?: number;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_guardians_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_guardian_id_fkey";
            columns: ["guardian_id"];
            isOneToOne: false;
            referencedRelation: "guardians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_directory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_guardians_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          admission_date: string;
          admission_number: string;
          created_at: string;
          created_by: string;
          date_of_birth: string | null;
          disability_details: string | null;
          first_name: string;
          gender: string;
          has_disability: boolean;
          id: number;
          last_name: string;
          middle_name: string | null;
          notes: string | null;
          photo_path: string | null;
          previous_school: string | null;
          religious_denomination: string;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          admission_date: string;
          admission_number: string;
          created_at?: string;
          created_by: string;
          date_of_birth?: string | null;
          disability_details?: string | null;
          first_name: string;
          gender: string;
          has_disability: boolean;
          id?: never;
          last_name: string;
          middle_name?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          previous_school?: string | null;
          religious_denomination: string;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          admission_date?: string;
          admission_number?: string;
          created_at?: string;
          created_by?: string;
          date_of_birth?: string | null;
          disability_details?: string | null;
          first_name?: string;
          gender?: string;
          has_disability?: boolean;
          id?: never;
          last_name?: string;
          middle_name?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          previous_school?: string | null;
          religious_denomination?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          assigned_at: string;
          role_code: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          role_code: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          role_code?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      staff_directory: {
        Row: {
          assigned_classes: string | null;
          created_at: string | null;
          date_joined: string | null;
          email: string | null;
          first_name: string | null;
          full_name: string | null;
          id: number | null;
          known_subjects: string[] | null;
          last_name: string | null;
          middle_name: string | null;
          phone: string | null;
          position: string | null;
          staff_number: string | null;
          staff_type: string | null;
          status: string | null;
        };
        Relationships: [];
      };
      student_directory: {
        Row: {
          academic_term_id: number | null;
          academic_term_name: string | null;
          academic_year_id: number | null;
          academic_year_name: string | null;
          admission_date: string | null;
          admission_number: string | null;
          class_id: number | null;
          class_name: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          disability_details: string | null;
          enrollment_id: number | null;
          first_name: string | null;
          full_name: string | null;
          gender: string | null;
          guardian_name: string | null;
          guardian_phone: string | null;
          has_disability: boolean | null;
          id: number | null;
          last_name: string | null;
          middle_name: string | null;
          religious_denomination: string | null;
          school_location_id: number | null;
          school_location_name: string | null;
          status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_enrollments_academic_term_id_fkey";
            columns: ["academic_term_id"];
            isOneToOne: false;
            referencedRelation: "academic_terms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_enrollments_school_location_id_fkey";
            columns: ["school_location_id"];
            isOneToOne: false;
            referencedRelation: "school_locations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      archive_staff: { Args: { target_staff_id: number }; Returns: Json };
      assign_staff_class: {
        Args: { payload: Json; target_staff_id: number };
        Returns: Json;
      };
      cancel_invoice: {
        Args: { target_invoice_id: number; target_reason: string };
        Returns: Json;
      };
      reverse_admission_receipt: {
        Args: {
          request_fingerprint: string;
          request_key: string;
          target_reason: string;
          target_receipt_id: number;
        };
        Returns: Json;
      };
      reverse_feeding_receipt: {
        Args: {
          request_fingerprint: string;
          request_key: string;
          target_reason: string;
          target_receipt_id: number;
        };
        Returns: Json;
      };
      reverse_misc_receipt: {
        Args: {
          request_fingerprint: string;
          request_key: string;
          target_reason: string;
          target_receipt_id: number;
        };
        Returns: Json;
      };
      reverse_school_fee_payment: {
        Args: {
          request_fingerprint: string;
          request_key: string;
          target_payment_id: number;
          target_reason: string;
        };
        Returns: Json;
      };
      record_admission_receipt: {
        Args: {
          request_key: string;
          request_fingerprint: string;
          target_student_id: number;
          receipt_amount: number;
          target_business_date: string;
          target_payment_method_id: number;
          target_external_reference?: string;
          target_notes?: string;
        };
        Returns: Json;
      };
      record_expense: {
        Args: {
          request_key: string;
          request_fingerprint: string;
          target_expense_category_id: number;
          expense_amount: number;
          target_business_date: string;
          target_description: string;
          target_payment_method_id: number;
          target_external_reference?: string;
          target_attachment_path?: string;
          target_notes?: string;
        };
        Returns: Json;
      };
      record_feeding_receipt: {
        Args: {
          request_key: string;
          request_fingerprint: string;
          target_student_id: number;
          receipt_amount: number;
          target_business_date: string;
          target_payment_method_id: number;
          target_external_reference?: string;
          target_notes?: string;
        };
        Returns: Json;
      };
      record_misc_receipt: {
        Args: {
          request_key: string;
          request_fingerprint: string;
          target_misc_income_category_id: number;
          target_description: string;
          receipt_amount: number;
          target_business_date: string;
          target_payment_method_id: number;
          target_student_id?: number;
          target_payer_name?: string;
          target_external_reference?: string;
          target_notes?: string;
        };
        Returns: Json;
      };
      record_school_fee_payment: {
        Args: {
          request_key: string;
          request_fingerprint: string;
          target_invoice_id: number;
          payment_amount: number;
          target_payment_method_id: number;
          target_business_date: string;
          target_external_reference?: string;
          target_notes?: string;
        };
        Returns: Json;
      };
      change_administrator_role: {
        Args: { target_role_code: string; target_user_id: string };
        Returns: Json;
      };
      change_student_enrollment: {
        Args: { payload: Json; target_student_id: number };
        Returns: Json;
      };
      create_staff: { Args: { payload: Json }; Returns: Json };
      create_student: { Args: { payload: Json }; Returns: Json };
      end_staff_assignment: {
        Args: { target_assignment_id: number; target_ended_on: string };
        Returns: Json;
      };
      finalize_administrator_invitation: {
        Args: {
          error_message?: string;
          request_id: string;
          succeeded: boolean;
          target_user_id: string;
        };
        Returns: Json;
      };
      generate_term_invoices: {
        Args: {
          target_academic_term_id: number;
          target_academic_year_id: number;
          target_student_id?: number;
        };
        Returns: Json;
      };
      void_expense: {
        Args: {
          request_fingerprint: string;
          request_key: string;
          target_expense_id: number;
          target_reason: string;
        };
        Returns: Json;
      };
      get_access_context: { Args: never; Returns: Json };
      get_administrator_directory: {
        Args: {
          page_number?: number;
          page_size?: number;
          role_filter?: string;
          search_text?: string;
          status_filter?: string;
        };
        Returns: {
          account_status: string;
          display_name: string;
          email: string;
          invitation_status: string;
          invited_at: string;
          last_sign_in_at: string;
          mfa_enrolled: boolean;
          phone: string;
          role_code: string;
          total_count: number;
          user_id: string;
        }[];
      };
      import_staff: { Args: { payload: Json }; Returns: Json };
      import_students: { Args: { payload: Json }; Returns: Json };
      link_student_guardian: {
        Args: { payload: Json; target_student_id: number };
        Returns: Json;
      };
      prepare_administrator_invitations: {
        Args: { payload: Json };
        Returns: Json;
      };
      set_administrator_status: {
        Args: { target_status: string; target_user_id: string };
        Returns: Json;
      };
      set_current_academic_context: {
        Args: { target_term_id: number; target_year_id: number };
        Returns: undefined;
      };
      set_student_photo: {
        Args: { target_photo_path: string; target_student_id: number };
        Returns: Json;
      };
      update_staff: {
        Args: { payload: Json; target_staff_id: number };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
