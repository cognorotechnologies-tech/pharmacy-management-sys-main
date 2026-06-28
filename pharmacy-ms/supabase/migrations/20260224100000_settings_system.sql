-- ============================================================
-- Settings Module Migration
-- Includes:
-- 1. pharmacy_settings (Global)
-- 2. user_preferences (Per-user)
-- 3. Storage bucket for pharmacy assets
-- ============================================================

-- ─── 1. pharmacy_settings (Global) ───────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    name TEXT NOT NULL DEFAULT 'My Pharmacy',
    logo_url TEXT,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    retention_policy JSONB NOT NULL DEFAULT '{"audit_logs": 365, "sales": 1825}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES profiles(id),
    CONSTRAINT one_row_only CHECK (id = 'global')
);

-- Initial global row
INSERT INTO pharmacy_settings (id) 
VALUES ('global') 
ON CONFLICT (id) DO NOTHING;

-- ─── 2. user_preferences ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    notifications JSONB NOT NULL DEFAULT '{
        "inventory": true,
        "expiry": true,
        "orders": true,
        "system": true
    }',
    pos_preferences JSONB NOT NULL DEFAULT '{
        "default_payment": "cash",
        "show_patient_search": true
    }',
    default_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Storage bucket for pharmacy assets ────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-assets', 'pharmacy-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Row-Level Security ───────────────────────────────────
ALTER TABLE pharmacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- pharmacy_settings Policies
CREATE POLICY "Super admins can manage global settings"
    ON pharmacy_settings FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Authenticated users can view global settings"
    ON pharmacy_settings FOR SELECT
    TO authenticated
    USING (true);

-- user_preferences Policies
CREATE POLICY "Users can manage own preferences"
    ON user_preferences FOR ALL
    USING (user_id = auth.uid());

-- Storage policies for pharmacy-assets
CREATE POLICY "Super admins can manage pharmacy assets"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'pharmacy-assets' AND 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Public can view pharmacy assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'pharmacy-assets');

-- ─── 5. Triggers for updated_at ─────────────────────────────
CREATE TRIGGER trg_pharmacy_settings_updated_at 
    BEFORE UPDATE ON pharmacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
