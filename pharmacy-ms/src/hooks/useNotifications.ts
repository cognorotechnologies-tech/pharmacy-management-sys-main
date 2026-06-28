import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import type { Notification, NotificationUpdate } from '@/types/database';
import toast from 'react-hot-toast';

export function useNotifications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch Notifications
    const query = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Notification[];
        },
        enabled: !!user,
    });

    // 2. Realtime Subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // Update cache
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });

                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new as Notification;
                        toast(`New Alert: ${newNotif.title}`, {
                            icon: '🔔',
                            id: newNotif.id // Prevent duplicate toasts for same notification
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);

    // 3. Mark as read mutation
    const markAsRead = useMutation({
        mutationFn: async (notificationId: string) => {
            const updates: NotificationUpdate = { read: true };
            const { error } = await supabase
                .from('notifications')
                .update(updates)
                .eq('id', notificationId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
        },
    });

    // 4. Mark all as read mutation
    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const updates: NotificationUpdate = { read: true };
            const { error } = await supabase
                .from('notifications')
                .update(updates)
                .eq('user_id', user.id)
                .eq('read', false);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
            toast.success('All notifications marked as read', { id: 'mark-all-read-toast' });
        },
    });

    const unreadCount = query.data?.filter(n => !n.read).length || 0;

    return {
        notifications: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        unreadCount,
        markAsRead: markAsRead.mutate,
        isMarkingAsRead: markAsRead.isPending,
        markAllAsRead: markAllAsRead.mutate,
        isMarkingAllAsRead: markAllAsRead.isPending,
    };
}
