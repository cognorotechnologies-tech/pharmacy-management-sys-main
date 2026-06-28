import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily notification checks...')

    const [lowStockResult, expiryResult, profilesResult] = await Promise.all([
      supabaseClient.from('inventory_items').select('id, product_name, stock_level, reorder_point').lt('stock_level', 'reorder_point'),
      supabaseClient.from('batches').select('id, product_name, expiry_date, batch_number').gte('expiry_date', new Date().toISOString()).lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseClient.from('profiles').select('id, notification_preferences')
    ])

    if (lowStockResult.error) throw lowStockResult.error
    if (expiryResult.error) throw expiryResult.error
    if (profilesResult.error) throw profilesResult.error

    const profiles = profilesResult.data
    const lowStockItems = lowStockResult.data
    const expiringBatches = expiryResult.data

    const newNotifications = []

    // 1. Process Low Stock Notifications
    for (const item of lowStockItems) {
      if (item.stock_level < item.reorder_point) {
        for (const profile of profiles) {
          const preferences = profile.notification_preferences as Record<string, boolean>
          if (preferences?.low_stock) {
            // Check for existing unread
            const { data: existing } = await supabaseClient
              .from('notifications')
              .select('id')
              .eq('user_id', profile.id)
              .eq('type', 'low_stock')
              .eq('reference_id', item.id)
              .eq('read', false)
              .single()

            if (!existing) {
              newNotifications.push({
                user_id: profile.id,
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${item.product_name} is running low (Current: ${item.stock_level}, Reorder: ${item.reorder_point}).`,
                reference_id: item.id
              })
            }
          }
        }
      }
    }

    // 2. Process Expiry Warnings (Thresholds: 90, 60, 30 days)
    for (const batch of expiringBatches) {
      const daysUntilExpiry = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24))

      // Only process exact threshold hits to avoid spamming every day
      if (daysUntilExpiry === 90 || daysUntilExpiry === 60 || daysUntilExpiry === 30) {
        for (const profile of profiles) {
          const preferences = profile.notification_preferences as Record<string, boolean>
          if (preferences?.expiry_warning) {
            const { data: existing } = await supabaseClient
              .from('notifications')
              .select('id')
              .eq('user_id', profile.id)
              .eq('type', 'expiry_warning')
              .eq('reference_id', batch.id)
              .eq('read', false)
              .single()

            if (!existing) {
              newNotifications.push({
                user_id: profile.id,
                type: 'expiry_warning',
                title: 'Expiry Warning',
                message: `Batch ${batch.batch_number} of ${batch.product_name || 'Product'} expires in ${daysUntilExpiry} days.`,
                reference_id: batch.id
              })
            }
          }
        }
      }
    }

    // Insert all accumulated notifications
    if (newNotifications.length > 0) {
      const { error: insertError } = await supabaseClient.from('notifications').insert(newNotifications)
      if (insertError) throw insertError
      console.log(`Inserted ${newNotifications.length} new notifications.`)
    } else {
      console.log('No new notifications to insert.')
    }

    return new Response(JSON.stringify({ success: true, count: newNotifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing notifications:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
