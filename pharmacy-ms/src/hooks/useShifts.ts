import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Shift, ShiftInsert, ShiftUpdate } from '@/types/database';

const KEYS = {
    all: ['shifts'] as const,
    current: (userId: string, branchId: string) => [...KEYS.all, 'current', userId, branchId] as const,
    stats: (shiftId: string) => [...KEYS.all, 'stats', shiftId] as const,
    report: (shiftId: string) => [...KEYS.all, 'report', shiftId] as const,
};

/* ═══════════════════════════════════════════════════════════════
   1. Active Shift Hook
   ═══════════════════════════════════════════════════════════════ */

export function useActiveShift(userId: string | undefined, branchId: string | undefined) {

    return useQuery({
        queryKey: KEYS.current(userId || '', branchId || ''),
        queryFn: async () => {
            if (!userId || !branchId) return null;

            // Try to find an open shift
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('cashier_id', userId)
                .eq('branch_id', branchId)
                .is('ended_at', null)
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (data) return data as Shift;

            // No active shift? Auto-create one for this session
            const newShift: ShiftInsert = {
                branch_id: branchId,
                cashier_id: userId,
                started_at: new Date().toISOString(),
                ended_at: null,
                total_sales: 0,
                total_revenue: 0,
                cash_total: 0,
                card_total: 0,
                insurance_total: 0,
                discount_total: 0,
                refund_total: 0,
                net_revenue: 0,
                closed_by: null,
                closed_at: null,
                notes: null,
            };

            const { data: created, error: createError } = await supabase
                .from('shifts')
                .insert(newShift)
                .select()
                .single();

            if (createError) throw createError;
            return created as Shift;
        },
        enabled: !!userId && !!branchId,
        staleTime: Infinity, // Keep until explicit end shift
    });
}

/* ═══════════════════════════════════════════════════════════════
   2. Shift Stats Hook (Aggregates sales for current shift)
   ═══════════════════════════════════════════════════════════════ */

export interface ShiftStats {
    count: number;
    revenue: number;
    cash: number;
    card: number;
    insurance: number;
    discounts: number;
    avg_transaction: number;
}

export function useShiftStats(shiftId: string | undefined) {
    return useQuery({
        queryKey: KEYS.stats(shiftId || ''),
        queryFn: async (): Promise<ShiftStats> => {
            if (!shiftId) return { count: 0, revenue: 0, cash: 0, card: 0, insurance: 0, discounts: 0, avg_transaction: 0 };

            const { data, error } = await supabase
                .from('sales')
                .select('payment_method, total_amount, discount_amount, insurance_amount')
                .eq('shift_id', shiftId)
                .neq('status', 'void');

            if (error) throw error;

            const stats = (data || []).reduce(
                (acc, s) => {
                    acc.count++;
                    acc.revenue += Number(s.total_amount);
                    acc.discounts += Number(s.discount_amount);
                    if (s.payment_method === 'cash') acc.cash += Number(s.total_amount);
                    else if (s.payment_method === 'card') acc.card += Number(s.total_amount);
                    else acc.insurance += Number(s.insurance_amount);
                    return acc;
                },
                { count: 0, revenue: 0, cash: 0, card: 0, insurance: 0, discounts: 0 }
            );

            return {
                ...stats,
                avg_transaction: stats.count > 0 ? stats.revenue / stats.count : 0,
            };
        },
        enabled: !!shiftId,
        refetchInterval: 30_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   3. End Shift Mutation
   ═══════════════════════════════════════════════════════════════ */

export function useEndShift() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ shiftId, stats }: { shiftId: string; stats: ShiftStats }) => {
            const update: ShiftUpdate = {
                ended_at: new Date().toISOString(),
                total_sales: stats.count,
                total_revenue: stats.revenue,
                cash_total: stats.cash,
                card_total: stats.card,
                insurance_total: stats.insurance,
                discount_total: stats.discounts,
                net_revenue: stats.revenue, // Simplified for now
            };

            const { data, error } = await supabase
                .from('shifts')
                .update(update)
                .eq('id', shiftId)
                .select()
                .single();

            if (error) throw error;
            return data as Shift;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
        },
    });
}

/* ═══════════════════════════════════════════════════════════════
   4. Admin Close Shift Mutation
   ═══════════════════════════════════════════════════════════════ */

export function useAdminCloseShift() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ shiftId, adminId, notes }: { shiftId: string; adminId: string; notes?: string }) => {
            const { data, error } = await supabase
                .from('shifts')
                .update({
                    closed_by: adminId,
                    closed_at: new Date().toISOString(),
                    notes,
                })
                .eq('id', shiftId)
                .select()
                .single();

            if (error) throw error;
            return data as Shift;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
        },
    });
}
