-- ============================================================
-- Pharmacy Management System — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Helper: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 1: Core Tables
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. branches ─────────────────────────────────────────────
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. profiles ─────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'technician'
    CHECK (role IN ('owner','admin','pharmacist','technician','cashier')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. suppliers ────────────────────────────────────────────
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  lead_time_days INT,
  rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. insurance_plans ──────────────────────────────────────
CREATE TABLE insurance_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_annual_benefit NUMERIC(12,2),
  copay_amount NUMERIC(10,2),
  deductible NUMERIC(10,2),
  formulary_restrictions JSONB NOT NULL DEFAULT '{}',
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_insurance_plans_updated_at BEFORE UPDATE ON insurance_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 5. products ─────────────────────────────────────────────
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  brand TEXT,
  barcode TEXT UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'otc'
    CHECK (category IN ('prescription','otc','controlled','supplement','medical_device','cosmetic')),
  formulation TEXT NOT NULL DEFAULT 'tablet'
    CHECK (formulation IN ('tablet','capsule','syrup','injection','cream','ointment','drops','inhaler','suppository','powder','other')),
  strength TEXT,
  unit TEXT NOT NULL DEFAULT 'units',
  description TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  is_controlled BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_stock_level INT NOT NULL DEFAULT 10,
  max_stock_level INT NOT NULL DEFAULT 1000,
  reorder_point INT NOT NULL DEFAULT 20,
  shelf_location TEXT,
  manufacturer TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 2: Inventory & Purchasing
-- ═══════════════════════════════════════════════════════════════

-- ─── 6. patients ─────────────────────────────────────────────
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  medical_conditions TEXT[] NOT NULL DEFAULT '{}',
  insurance_plan_id UUID REFERENCES insurance_plans(id) ON DELETE SET NULL,
  insurance_member_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 7. batches ──────────────────────────────────────────────
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  manufacturing_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity_received INT NOT NULL DEFAULT 0,
  quantity_remaining INT NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  po_item_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, batch_number)
);
CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 8. inventory ────────────────────────────────────────────
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity_on_hand INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  last_restocked_at TIMESTAMPTZ,
  last_sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch_id)
);
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 9. purchase_orders ──────────────────────────────────────
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','received','cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 10. po_items ────────────────────────────────────────────
CREATE TABLE po_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ordered INT NOT NULL DEFAULT 0,
  quantity_received INT NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_po_items_updated_at BEFORE UPDATE ON po_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK from batches.po_item_id to po_items
ALTER TABLE batches
  ADD CONSTRAINT fk_batches_po_item
  FOREIGN KEY (po_item_id) REFERENCES po_items(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 3: Clinical & Sales
-- ═══════════════════════════════════════════════════════════════

-- ─── 11. prescriptions ──────────────────────────────────────
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  prescriber_name TEXT NOT NULL,
  prescriber_phone TEXT,
  prescriber_license TEXT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','dispensed','partially_dispensed','cancelled')),
  date_prescribed DATE NOT NULL,
  date_received DATE NOT NULL DEFAULT CURRENT_DATE,
  date_dispensed DATE,
  diagnosis TEXT,
  notes TEXT,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dispensed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 12. prescription_items ──────────────────────────────────
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  quantity_prescribed INT NOT NULL DEFAULT 0,
  quantity_dispensed INT NOT NULL DEFAULT 0,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  refills_allowed INT NOT NULL DEFAULT 0,
  refills_used INT NOT NULL DEFAULT 0,
  substitution_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_prescription_items_updated_at BEFORE UPDATE ON prescription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 13. sales ───────────────────────────────────────────────
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number TEXT NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','refunded','void')),
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','card','insurance','mobile_payment','credit')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 14. sale_items ──────────────────────────────────────────
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 4: Support Tables
-- ═══════════════════════════════════════════════════════════════

-- ─── 15. stock_adjustments ───────────────────────────────────
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('damage','expired','theft','correction','return','transfer')),
  quantity_before INT NOT NULL,
  quantity_adjusted INT NOT NULL,
  quantity_after INT NOT NULL,
  reason TEXT NOT NULL,
  reference_number TEXT,
  adjusted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 16. drug_interactions ───────────────────────────────────
CREATE TABLE drug_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_a_name TEXT NOT NULL,
  drug_b_name TEXT NOT NULL,
  severity TEXT NOT NULL
    CHECK (severity IN ('mild','moderate','severe','contraindicated')),
  description TEXT NOT NULL,
  clinical_effects TEXT,
  recommendation TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(drug_a_name, drug_b_name)
);
CREATE TRIGGER trg_drug_interactions_updated_at BEFORE UPDATE ON drug_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 17. notifications ──────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  type TEXT NOT NULL
    CHECK (type IN ('low_stock','expiry_warning','order_update','prescription_ready','system_alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 18. audit_logs ──────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 5: Indexes for Performance
-- ═══════════════════════════════════════════════════════════════

-- profiles
CREATE INDEX idx_profiles_branch ON profiles(branch_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('english', name));

-- batches
CREATE INDEX idx_batches_product ON batches(product_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);
CREATE INDEX idx_batches_supplier ON batches(supplier_id);

-- inventory
CREATE INDEX idx_inventory_product_branch ON inventory(product_id, branch_id);
CREATE INDEX idx_inventory_low_stock ON inventory(quantity_on_hand) WHERE quantity_on_hand > 0;

-- purchase_orders
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_branch ON purchase_orders(branch_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_created_at ON purchase_orders(created_at DESC);

-- po_items
CREATE INDEX idx_po_items_order ON po_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON po_items(product_id);

-- patients
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_insurance ON patients(insurance_plan_id);

-- prescriptions
CREATE INDEX idx_rx_patient ON prescriptions(patient_id);
CREATE INDEX idx_rx_branch ON prescriptions(branch_id);
CREATE INDEX idx_rx_status ON prescriptions(status);
CREATE INDEX idx_rx_created_at ON prescriptions(created_at DESC);

-- prescription_items
CREATE INDEX idx_rx_items_prescription ON prescription_items(prescription_id);
CREATE INDEX idx_rx_items_product ON prescription_items(product_id);

-- sales
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_patient ON sales(patient_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_payment ON sales(payment_method);

-- sale_items
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- stock_adjustments
CREATE INDEX idx_adj_product ON stock_adjustments(product_id);
CREATE INDEX idx_adj_branch ON stock_adjustments(branch_id);
CREATE INDEX idx_adj_type ON stock_adjustments(adjustment_type);
CREATE INDEX idx_adj_created_at ON stock_adjustments(created_at DESC);

-- drug_interactions
CREATE INDEX idx_interactions_drug_a ON drug_interactions(drug_a_name);
CREATE INDEX idx_interactions_drug_b ON drug_interactions(drug_b_name);

-- notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- audit_logs
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 6: Row-Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user branch
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── profiles policies ──────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (get_user_role() IN ('owner','admin'));
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL USING (get_user_role() IN ('owner','admin'));

-- ─── branches policies ──────────────────────────────────────
CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL USING (get_user_role() IN ('owner','admin'));

-- ─── products policies ──────────────────────────────────────
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage products"
  ON products FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── batches policies ────────────────────────────────────────
CREATE POLICY "Authenticated users can view batches"
  ON batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage batches"
  ON batches FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── inventory policies ─────────────────────────────────────
CREATE POLICY "Authenticated users can view inventory"
  ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage inventory"
  ON inventory FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── suppliers policies ─────────────────────────────────────
CREATE POLICY "Authenticated users can view suppliers"
  ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL USING (get_user_role() IN ('owner','admin'));

-- ─── insurance_plans policies ────────────────────────────────
CREATE POLICY "Authenticated users can view insurance plans"
  ON insurance_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage insurance plans"
  ON insurance_plans FOR ALL USING (get_user_role() IN ('owner','admin'));

-- ─── patients policies ──────────────────────────────────────
CREATE POLICY "Staff can view patients"
  ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage patients"
  ON patients FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist','technician'));

-- ─── purchase_orders policies ────────────────────────────────
CREATE POLICY "Staff can view purchase orders"
  ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage purchase orders"
  ON purchase_orders FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── po_items policies ──────────────────────────────────────
CREATE POLICY "Staff can view PO items"
  ON po_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage PO items"
  ON po_items FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── prescriptions policies ─────────────────────────────────
CREATE POLICY "Staff can view prescriptions"
  ON prescriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage prescriptions"
  ON prescriptions FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── prescription_items policies ─────────────────────────────
CREATE POLICY "Staff can view prescription items"
  ON prescription_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage prescription items"
  ON prescription_items FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── sales policies ─────────────────────────────────────────
CREATE POLICY "Staff can view sales"
  ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create sales"
  ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage sales"
  ON sales FOR ALL USING (get_user_role() IN ('owner','admin'));

-- ─── sale_items policies ─────────────────────────────────────
CREATE POLICY "Staff can view sale items"
  ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create sale items"
  ON sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- ─── stock_adjustments policies ──────────────────────────────
CREATE POLICY "Staff can view adjustments"
  ON stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can create adjustments"
  ON stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── drug_interactions policies ──────────────────────────────
CREATE POLICY "Authenticated users can view interactions"
  ON drug_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists+ can manage interactions"
  ON drug_interactions FOR ALL USING (get_user_role() IN ('owner','admin','pharmacist'));

-- ─── notifications policies ─────────────────────────────────
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ─── audit_logs policies ────────────────────────────────────
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT USING (get_user_role() IN ('owner','admin'));
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
