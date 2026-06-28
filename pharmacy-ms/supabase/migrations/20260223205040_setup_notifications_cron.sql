-- Enable the pg_cron extension (requires superuser, managed by Supabase usually)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net to make HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Note: Replace the URL and Anon Key with actual production values when deploying to Supabase platform.
-- For local development, this cron job will run and try to hit the edge function URL.
SELECT cron.schedule(
    'daily-notify', 
    '0 7 * * *', 
    $$
    SELECT net.http_post(
        url:='http://host.docker.internal:54321/functions/v1/notifications-scheduler',
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', current_setting('request.jwt.claim.role', true) -- Using the role as auth or replace with 'Bearer ANON_KEY'
        )
    )
    $$
);
