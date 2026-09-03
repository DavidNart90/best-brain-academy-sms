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
