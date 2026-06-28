import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AuditLogWithUser, FailedLoginAttempt } from '@/types/app';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLogFilters {
    date_range?: { from: Date; to: Date };
    user_id?: string;
    entity_type?: string;
    action?: string;
    search_query?: string;
    limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters) {
    const { branchId, profile } = useAuth();

    // Allow super_admin to view all logs if no branch is selected, 
    // otherwise filter by the user's branch
    const effectiveBranchId = profile?.role === 'super_admin' && !branchId ? null : branchId;

    return useQuery({
        queryKey: ['audit_logs', effectiveBranchId, filters],
        queryFn: async () => {
            // For non-super admins, a branch is required
            if (!effectiveBranchId && profile?.role !== 'super_admin') {
                throw new Error('No branch selected');
            }

            let query = supabase
                .from('audit_logs')
                .select(`
                    *,
                    user:profiles!audit_logs_user_id_fkey(id, full_name, email, avatar_url)
                `)
                .order('created_at', { ascending: false });

            if (effectiveBranchId) {
                query = query.eq('branch_id', effectiveBranchId);
            }

            // Apply filters
            if (filters.action && filters.action !== 'ALL') {
                query = query.eq('action', filters.action);
            }
            if (filters.entity_type && filters.entity_type !== 'ALL') {
                query = query.eq('entity_type', filters.entity_type);
            }
            if (filters.user_id && filters.user_id !== 'ALL') {
                query = query.eq('user_id', filters.user_id);
            }
            if (filters.search_query) {
                // Search by entity_id
                query = query.ilike('entity_id', `%${filters.search_query}%`);
            }
            if (filters.date_range?.from) {
                query = query.gte('created_at', filters.date_range.from.toISOString());
            }
            if (filters.date_range?.to) {
                query = query.lte('created_at', filters.date_range.to.toISOString());
            }

            if (filters.limit) {
                query = query.limit(filters.limit);
            } else {
                query = query.limit(500); // Default reasonable cap for performance
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data as AuditLogWithUser[];
        },
        enabled: profile?.role === 'super_admin' ? true : !!effectiveBranchId,
    });
}

export function useFailedLogins(limitCount = 50) {
    return useQuery({
        queryKey: ['failed_logins', limitCount],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_failed_logins', {
                limit_count: limitCount,
            });

            if (error) {
                throw error;
            }

            return data as unknown as FailedLoginAttempt[];
        },
    });
}
