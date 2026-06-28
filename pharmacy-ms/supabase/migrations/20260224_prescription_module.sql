-- ============================================================
-- Prescription Module Migrations
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Extend prescription_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = 'prescription_status'::regtype) THEN
    ALTER TYPE prescription_status ADD VALUE 'in_progress';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expired' AND enumtypid = 'prescription_status'::regtype) THEN
    ALTER TYPE prescription_status ADD VALUE 'expired';
  END IF;
END$$;

-- 2) Add prescription image URL column
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS image_url text;

-- 3) Create controlled_substance_dispensing table
CREATE TABLE IF NOT EXISTS controlled_substance_dispensing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id uuid REFERENCES prescriptions(id) NOT NULL,
  prescription_item_id uuid REFERENCES prescription_items(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  patient_id uuid REFERENCES patients(id) NOT NULL,
  pharmacist_id uuid REFERENCES auth.users(id) NOT NULL,
  pharmacist_license text NOT NULL,
  quantity_dispensed integer NOT NULL,
  batch_id uuid REFERENCES batches(id),
  branch_id uuid REFERENCES branches(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE controlled_substance_dispensing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can insert controlled substance logs"
  ON controlled_substance_dispensing FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pharmacist','admin','super_admin'))
  );

CREATE POLICY "Clinical staff can view controlled substance logs"
  ON controlled_substance_dispensing FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pharmacist','admin','super_admin'))
  );

-- 4) Create prescription-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescription-images', 'prescription-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload prescription images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prescription-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view prescription images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prescription-images' AND auth.role() = 'authenticated');

-- 5) RPC: fn_dispense_prescription
-- Atomically dispenses items, updates inventory, logs controlled substances
CREATE OR REPLACE FUNCTION fn_dispense_prescription(
  p_prescription_id uuid,
  p_dispensed_by uuid,
  p_branch_id uuid,
  p_items jsonb -- array of {item_id, batch_id, quantity_dispensed, pharmacist_license?}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_is_controlled boolean;
  v_patient_id uuid;
  v_total_prescribed int := 0;
  v_total_dispensed int := 0;
  v_new_status text;
BEGIN
  -- Get patient_id
  SELECT patient_id INTO v_patient_id FROM prescriptions WHERE id = p_prescription_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get product_id and check if controlled
    SELECT pi.product_id, p.is_controlled
    INTO v_product_id, v_is_controlled
    FROM prescription_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.id = (v_item->>'item_id')::uuid;

    -- Update prescription_items
    UPDATE prescription_items
    SET quantity_dispensed = quantity_dispensed + (v_item->>'quantity_dispensed')::int,
        batch_id = (v_item->>'batch_id')::uuid,
        updated_at = now()
    WHERE id = (v_item->>'item_id')::uuid;

    -- Deduct from batch
    UPDATE batches
    SET quantity_remaining = quantity_remaining - (v_item->>'quantity_dispensed')::int,
        updated_at = now()
    WHERE id = (v_item->>'batch_id')::uuid;

    -- Deduct from inventory
    UPDATE inventory
    SET quantity_on_hand = quantity_on_hand - (v_item->>'quantity_dispensed')::int,
        quantity_available = quantity_available - (v_item->>'quantity_dispensed')::int,
        last_sold_at = now(),
        updated_at = now()
    WHERE product_id = v_product_id AND branch_id = p_branch_id;

    -- Log controlled substance if applicable
    IF v_is_controlled AND v_item->>'pharmacist_license' IS NOT NULL THEN
      INSERT INTO controlled_substance_dispensing
        (prescription_id, prescription_item_id, product_id, patient_id,
         pharmacist_id, pharmacist_license, quantity_dispensed, batch_id, branch_id)
      VALUES
        (p_prescription_id, (v_item->>'item_id')::uuid, v_product_id, v_patient_id,
         p_dispensed_by, v_item->>'pharmacist_license',
         (v_item->>'quantity_dispensed')::int, (v_item->>'batch_id')::uuid, p_branch_id);
    END IF;
  END LOOP;

  -- Calculate new status
  SELECT COALESCE(SUM(quantity_prescribed), 0), COALESCE(SUM(quantity_dispensed), 0)
  INTO v_total_prescribed, v_total_dispensed
  FROM prescription_items WHERE prescription_id = p_prescription_id;

  IF v_total_dispensed >= v_total_prescribed THEN
    v_new_status := 'dispensed';
  ELSIF v_total_dispensed > 0 THEN
    v_new_status := 'partially_dispensed';
  ELSE
    v_new_status := 'verified';
  END IF;

  -- Update prescription status
  UPDATE prescriptions
  SET status = v_new_status::prescription_status,
      dispensed_by = p_dispensed_by,
      date_dispensed = CASE WHEN v_new_status = 'dispensed' THEN now() ELSE date_dispensed END,
      updated_at = now()
  WHERE id = p_prescription_id;

  RETURN jsonb_build_object(
    'status', v_new_status,
    'total_prescribed', v_total_prescribed,
    'total_dispensed', v_total_dispensed
  );
END;
$$;
