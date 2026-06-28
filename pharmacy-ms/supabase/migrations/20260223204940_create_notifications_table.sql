-- Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'low_stock', 
        'expiry_warning', 
        'prescription_ready', 
        'po_delivered', 
        'drug_interaction', 
        'controlled_substance', 
        'system_alert'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id on public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read on public.notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at on public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true); -- Usually restricted via RLS bypassing for service roles, but good to be explicit if using standard methods.

-- Enable Realtime for notifications
alter publication supabase_realtime add table public.notifications;

-- Update profiles table to include notification preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "low_stock": true,
    "expiry_warning": true,
    "prescription_ready": true,
    "po_delivered": true,
    "drug_interaction": true,
    "controlled_substance": true,
    "system_alert": true
}'::jsonb;
