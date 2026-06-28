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
      audit_logs: {
        Row: {
          action: string
          branch_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          branch_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          branch_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_number: string
          cost_price: number
          created_at: string
          expiry_date: string
          id: string
          is_active: boolean
          manufacturing_date: string
          po_item_id: string | null
          product_id: string
          quantity_received: number
          quantity_remaining: number
          selling_price: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number: string
          cost_price?: number
          created_at?: string
          expiry_date: string
          id?: string
          is_active?: boolean
          manufacturing_date: string
          po_item_id?: string | null
          product_id: string
          quantity_received?: number
          quantity_remaining?: number
          selling_price?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string
          cost_price?: number
          created_at?: string
          expiry_date?: string
          id?: string
          is_active?: boolean
          manufacturing_date?: string
          po_item_id?: string | null
          product_id?: string
          quantity_received?: number
          quantity_remaining?: number
          selling_price?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batches_po_item"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "po_items"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          license_number: string
          name: string
          phone: string
          settings: Json
          state: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number: string
          name: string
          phone: string
          settings?: Json
          state: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          license_number?: string
          name?: string
          phone?: string
          settings?: Json
          state?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      controlled_substance_dispensing: {
        Row: {
          batch_id: string | null
          branch_id: string
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          pharmacist_id: string
          pharmacist_license: string
          prescription_id: string
          prescription_item_id: string
          product_id: string
          quantity_dispensed: number
        }
        Insert: {
          batch_id?: string | null
          branch_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          pharmacist_id: string
          pharmacist_license: string
          prescription_id: string
          prescription_item_id: string
          product_id: string
          quantity_dispensed: number
        }
        Update: {
          batch_id?: string | null
          branch_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          pharmacist_id?: string
          pharmacist_license?: string
          prescription_id?: string
          prescription_item_id?: string
          product_id?: string
          quantity_dispensed?: number
        }
        Relationships: [
          {
            foreignKeyName: "controlled_substance_dispensing_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_dispensing_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_dispensing_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_dispensing_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_dispensing_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlled_substance_dispensing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          clinical_effects: string | null
          created_at: string
          description: string
          drug_a_name: string
          drug_b_name: string
          id: string
          recommendation: string | null
          severity: string
          source: string | null
          updated_at: string
        }
        Insert: {
          clinical_effects?: string | null
          created_at?: string
          description: string
          drug_a_name: string
          drug_b_name: string
          id?: string
          recommendation?: string | null
          severity: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          clinical_effects?: string | null
          created_at?: string
          description?: string
          drug_a_name?: string
          drug_b_name?: string
          id?: string
          recommendation?: string | null
          severity?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_plans: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          copay_amount: number | null
          coverage_percentage: number
          created_at: string
          deductible: number | null
          formulary_restrictions: Json
          id: string
          is_active: boolean
          max_annual_benefit: number | null
          plan_name: string
          plan_type: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          copay_amount?: number | null
          coverage_percentage?: number
          created_at?: string
          deductible?: number | null
          formulary_restrictions?: Json
          id?: string
          is_active?: boolean
          max_annual_benefit?: number | null
          plan_name: string
          plan_type: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          copay_amount?: number | null
          coverage_percentage?: number
          created_at?: string
          deductible?: number | null
          formulary_restrictions?: Json
          id?: string
          is_active?: boolean
          max_annual_benefit?: number | null
          plan_name?: string
          plan_type?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          last_restocked_at: string | null
          last_sold_at: string | null
          product_id: string
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          last_sold_at?: string | null
          product_id: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          last_sold_at?: string | null
          product_id?: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          branch_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[]
          city: string | null
          created_at: string
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string
          id: string
          insurance_member_id: string | null
          insurance_plan_id: string | null
          is_active: boolean
          last_name: string
          medical_conditions: string[]
          notes: string | null
          phone: string
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string[]
          city?: string | null
          created_at?: string
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender: string
          id?: string
          insurance_member_id?: string | null
          insurance_plan_id?: string | null
          is_active?: boolean
          last_name: string
          medical_conditions?: string[]
          notes?: string | null
          phone: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string[]
          city?: string | null
          created_at?: string
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string
          id?: string
          insurance_member_id?: string | null
          insurance_plan_id?: string | null
          is_active?: boolean
          last_name?: string
          medical_conditions?: string[]
          notes?: string | null
          phone?: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_insurance_plan_id_fkey"
            columns: ["insurance_plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_approvals: {
        Row: {
          approval_type: string
          created_at: string
          entity_data: Json
          entity_type: string
          id: string
          requested_at: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          approval_type?: string
          created_at?: string
          entity_data: Json
          entity_type: string
          id?: string
          requested_at?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          approval_type?: string
          created_at?: string
          entity_data?: Json
          entity_type?: string
          id?: string
          requested_at?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      po_items: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered?: number
          quantity_received?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          batch_id: string | null
          created_at: string
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          prescription_id: string
          product_id: string
          quantity_dispensed: number
          quantity_prescribed: number
          refills_allowed: number
          refills_used: number
          substitution_allowed: boolean
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          prescription_id: string
          product_id: string
          quantity_dispensed?: number
          quantity_prescribed?: number
          refills_allowed?: number
          refills_used?: number
          substitution_allowed?: boolean
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          prescription_id?: string
          product_id?: string
          quantity_dispensed?: number
          quantity_prescribed?: number
          refills_allowed?: number
          refills_used?: number
          substitution_allowed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          date_dispensed: string | null
          date_prescribed: string
          date_received: string
          diagnosis: string | null
          dispensed_by: string | null
          id: string
          image_url: string | null
          notes: string | null
          patient_id: string
          prescriber_license: string | null
          prescriber_name: string
          prescriber_phone: string | null
          prescription_number: string
          status: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          date_dispensed?: string | null
          date_prescribed: string
          date_received?: string
          diagnosis?: string | null
          dispensed_by?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          patient_id: string
          prescriber_license?: string | null
          prescriber_name: string
          prescriber_phone?: string | null
          prescription_number: string
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          date_dispensed?: string | null
          date_prescribed?: string
          date_received?: string
          diagnosis?: string | null
          dispensed_by?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          patient_id?: string
          prescriber_license?: string | null
          prescriber_name?: string
          prescriber_phone?: string | null
          prescription_number?: string
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string
          created_at: string
          description: string | null
          formulation: string
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_controlled: boolean
          manufacturer: string | null
          max_stock_level: number
          min_stock_level: number
          name: string
          reorder_point: number
          requires_prescription: boolean
          search_vector: unknown
          shelf_location: string | null
          sku: string
          strength: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          formulation?: string
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_controlled?: boolean
          manufacturer?: string | null
          max_stock_level?: number
          min_stock_level?: number
          name: string
          reorder_point?: number
          requires_prescription?: boolean
          search_vector?: unknown
          shelf_location?: string | null
          sku: string
          strength?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          formulation?: string
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_controlled?: boolean
          manufacturer?: string | null
          max_stock_level?: number
          min_stock_level?: number
          name?: string
          reorder_point?: number
          requires_prescription?: boolean
          search_vector?: unknown
          shelf_location?: string | null
          sku?: string
          strength?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          branch_id: string
          created_at: string
          created_by: string
          discount_amount: number
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          received_date: string | null
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          branch_id: string
          created_at?: string
          created_by: string
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          batch_id: string | null
          created_at: string
          discount: number
          id: string
          product_id: string
          quantity: number
          sale_id: string
          tax: number
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          product_id: string
          quantity?: number
          sale_id: string
          tax?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          tax?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          amount_paid: number
          branch_id: string
          cashier_id: string
          change_amount: number
          created_at: string
          discount_amount: number
          id: string
          insurance_amount: number
          notes: string | null
          patient_id: string | null
          payment_method: string
          prescription_id: string | null
          sale_number: string
          shift_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          branch_id: string
          cashier_id: string
          change_amount?: number
          created_at?: string
          discount_amount?: number
          id?: string
          insurance_amount?: number
          notes?: string | null
          patient_id?: string | null
          payment_method?: string
          prescription_id?: string | null
          sale_number: string
          shift_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          branch_id?: string
          cashier_id?: string
          change_amount?: number
          created_at?: string
          discount_amount?: number
          id?: string
          insurance_amount?: number
          notes?: string | null
          patient_id?: string | null
          payment_method?: string
          prescription_id?: string | null
          sale_number?: string
          shift_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string
          card_total: number | null
          cash_total: number | null
          cashier_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          discount_total: number | null
          ended_at: string | null
          id: string
          insurance_total: number | null
          net_revenue: number | null
          notes: string | null
          refund_total: number | null
          started_at: string
          total_revenue: number | null
          total_sales: number | null
        }
        Insert: {
          branch_id: string
          card_total?: number | null
          cash_total?: number | null
          cashier_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          discount_total?: number | null
          ended_at?: string | null
          id?: string
          insurance_total?: number | null
          net_revenue?: number | null
          notes?: string | null
          refund_total?: number | null
          started_at?: string
          total_revenue?: number | null
          total_sales?: number | null
        }
        Update: {
          branch_id?: string
          card_total?: number | null
          cash_total?: number | null
          cashier_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          discount_total?: number | null
          ended_at?: string | null
          id?: string
          insurance_total?: number | null
          net_revenue?: number | null
          notes?: string | null
          refund_total?: number | null
          started_at?: string
          total_revenue?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string
          adjustment_type: string
          approved_by: string | null
          batch_id: string | null
          branch_id: string
          created_at: string
          id: string
          product_id: string
          quantity_adjusted: number
          quantity_after: number
          quantity_before: number
          reason: string
          reference_number: string | null
        }
        Insert: {
          adjusted_by: string
          adjustment_type: string
          approved_by?: string | null
          batch_id?: string | null
          branch_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity_adjusted: number
          quantity_after: number
          quantity_before: number
          reason: string
          reference_number?: string | null
        }
        Update: {
          adjusted_by?: string
          adjustment_type?: string
          approved_by?: string | null
          batch_id?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity_adjusted?: number
          quantity_after?: number
          quantity_before?: number
          reason?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string
          rating: number | null
          state: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone: string
          rating?: number | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          rating?: number | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_add_inventory_on_receive: {
        Args: { p_items: Json; p_po_id: string }
        Returns: Json
      }
      fn_checkout_sale: {
        Args: {
          p_amount_paid?: number
          p_branch_id: string
          p_cashier_id: string
          p_change_amount?: number
          p_discount_amount?: number
          p_insurance_amount?: number
          p_items?: Json
          p_notes?: string
          p_patient_id?: string
          p_payment_method?: string
          p_prescription_id?: string
          p_sale_number: string
          p_subtotal?: number
          p_tax_amount?: number
          p_total_amount?: number
        }
        Returns: Json
      }
      fn_dispense_prescription: {
        Args: {
          p_branch_id: string
          p_dispensed_by: string
          p_items: Json
          p_prescription_id: string
        }
        Returns: Json
      }
      fn_expire_batches: { Args: never; Returns: undefined }
      fn_void_sale: {
        Args: {
          p_items?: Json
          p_reason: string
          p_sale_id: string
          p_voided_by: string
        }
        Returns: Json
      }
      get_failed_logins: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          id: string
          ip_address: string
          payload: Json
        }[]
      }
      get_my_branch_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      perform_stock_adjustment: {
        Args: {
          p_adjusted_by: string
          p_adjustment_type: string
          p_batch_id: string
          p_branch_id: string
          p_product_id: string
          p_quantity: number
          p_reason: string
          p_requires_approval?: boolean
        }
        Returns: Json
      }
      search_products: {
        Args: { search_query: string }
        Returns: {
          barcode: string | null
          brand: string | null
          category: string
          created_at: string
          description: string | null
          formulation: string
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_controlled: boolean
          manufacturer: string | null
          max_stock_level: number
          min_stock_level: number
          name: string
          reorder_point: number
          requires_prescription: boolean
          search_vector: unknown
          shelf_location: string | null
          sku: string
          strength: string | null
          unit: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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

export type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

// ─── Individual Table Exports ───────────────────────────────
export type AuditLog = Tables<'audit_logs'>
export type Batch = Tables<'batches'>
export type Branch = Tables<'branches'>
export type DrugInteraction = Tables<'drug_interactions'>
export type InsurancePlan = Tables<'insurance_plans'>
export type Inventory = Tables<'inventory'>
export type Notification = Tables<'notifications'>
export type Patient = Tables<'patients'>
export type PendingApproval = Tables<'pending_approvals'>
export type PoItem = Tables<'po_items'>
export type PrescriptionItem = Tables<'prescription_items'>
export type Prescription = Tables<'prescriptions'>
export type Product = Tables<'products'>
export type Profile = Tables<'profiles'>
export type PurchaseOrder = Tables<'purchase_orders'>
export type SaleItem = Tables<'sale_items'>
export type Sale = Tables<'sales'>
export type Shift = Tables<'shifts'>
export type StockAdjustment = Tables<'stock_adjustments'>
export type Supplier = Tables<'suppliers'>

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
