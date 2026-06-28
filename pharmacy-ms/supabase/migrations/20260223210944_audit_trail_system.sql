-- ==========================================
-- Audit Trail System Migration
-- Handles automatic auditing for core tables and failed login tracking
-- ==========================================

-- ─── 1. Generic Audit Trigger Function ────────────────────────
CREATE OR REPLACE FUNCTION process_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_branch_id UUID;
    v_action TEXT;
    v_entity_type TEXT;
    v_entity_id TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
    v_ip_address INET;
    v_user_agent TEXT;
BEGIN
    -- Determine the action type
    v_action := TG_OP;
    
    -- Entity type is the table name
    v_entity_type := TG_TABLE_NAME;
    
    -- Determine the entity ID
    -- Assumes all tables have an 'id' column. Falling back to null string if not.
    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id::TEXT;
        v_old_values := row_to_json(OLD)::JSONB;
        v_new_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := NEW.id::TEXT;
        v_old_values := row_to_json(OLD)::JSONB;
        v_new_values := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'INSERT' THEN
        v_entity_id := NEW.id::TEXT;
        v_old_values := NULL;
        v_new_values := row_to_json(NEW)::JSONB;
    END IF;

    -- Try to capture standard user and branch context via auth.uid()
    -- Only capture if auth.uid() resolves to a real user 
    -- (Helps prevent errors on system-level background tasks if any exist)
    BEGIN
        v_user_id := auth.uid();
        
        -- Get the branch ID associated with this user
        IF v_user_id IS NOT NULL THEN
            SELECT branch_id INTO v_branch_id FROM public.profiles WHERE id = v_user_id LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
        v_branch_id := NULL;
    END;
    
    -- Try reading header data for IP and User Agent
    -- Note: Supabase provides request headers in the current_setting('request.headers', true)
    BEGIN
        v_ip_address := (current_setting('request.headers', true)::jsonb->>'x-forwarded-for')::INET;
    EXCEPTION WHEN OTHERS THEN
        v_ip_address := NULL;
    END;
    
    BEGIN
        v_user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
    EXCEPTION WHEN OTHERS THEN
        v_user_agent := NULL;
    END;

    -- Insert the record. 
    -- Note: If user_id is null (e.g. system task), we bypass insert or use a system ID. 
    -- Given schema enforces NOT NULL on user_id for audit_logs, we log only authenticated actions.
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            user_id,
            branch_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            ip_address,
            user_agent
        ) VALUES (
            v_user_id,
            v_branch_id,
            v_action,
            v_entity_type,
            v_entity_id,
            v_old_values,
            v_new_values,
            v_ip_address,
            v_user_agent
        );
    END IF;

    -- Return appropriately
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 2. Attach Triggers to Core Tables ───────────────────────

-- 2.1 Products
DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();

-- 2.2 Batches
DROP TRIGGER IF EXISTS audit_batches ON public.batches;
CREATE TRIGGER audit_batches
    AFTER INSERT OR UPDATE OR DELETE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();

-- 2.3 Inventory
DROP TRIGGER IF EXISTS audit_inventory ON public.inventory;
CREATE TRIGGER audit_inventory
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();

-- 2.4 Prescriptions
DROP TRIGGER IF EXISTS audit_prescriptions ON public.prescriptions;
CREATE TRIGGER audit_prescriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();

-- 2.5 Sales
DROP TRIGGER IF EXISTS audit_sales ON public.sales;
CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();

-- 2.6 Stock Adjustments
DROP TRIGGER IF EXISTS audit_stock_adjustments ON public.stock_adjustments;
CREATE TRIGGER audit_stock_adjustments
    AFTER INSERT OR UPDATE OR DELETE ON public.stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();

-- 2.7 Drug Interactions
DROP TRIGGER IF EXISTS audit_drug_interactions ON public.drug_interactions;
CREATE TRIGGER audit_drug_interactions
    AFTER INSERT OR UPDATE OR DELETE ON public.drug_interactions
    FOR EACH ROW EXECUTE FUNCTION process_audit_log_trigger();


-- ─── 3. Enforce Strict RLS on Audit Logs ──────────────────────

-- Double check protection
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing generic ones if they contradict strict insert-only rule
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Re-establish that NO ONE can UPDATE or DELETE
-- Explicitly deny
CREATE POLICY "Strictly no updates to audit logs" ON public.audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "Strictly no deletes to audit logs" ON public.audit_logs
    FOR DELETE USING (false);

-- Only allow insert (via the security definer trigger handling it anyway)
CREATE POLICY "Authenticated users can insert through trigger" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);


-- ─── 4. Failed Logins View (Security Definer RPC) ─────────────

-- Allows super admins to securely query auth.audit_log_entries for failed attempts
CREATE OR REPLACE FUNCTION get_failed_logins(limit_count INT DEFAULT 50)
RETURNS TABLE (
    id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ,
    ip_address TEXT
) AS $$
BEGIN
    -- Only allow 'owner' or 'admin' to execute this
    IF get_user_role() NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.payload,
        a.created_at,
        a.ip_address
    FROM auth.audit_log_entries a
    WHERE a.payload->>'message' ILIKE '%failed%' 
       OR a.payload->>'message' ILIKE '%invalid%'
       OR a.payload->>'error_code' IS NOT NULL
    ORDER BY a.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
