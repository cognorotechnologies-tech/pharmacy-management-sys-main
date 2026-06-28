import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Supplier, SupplierInsert, SupplierUpdate } from '@/types/database';

/* ─── Keys ─────────────────────────────────────────────────── */
const KEYS = {
    all: ['suppliers'] as const,
    list: () => [...KEYS.all, 'list'] as const,
    detail: (id: string) => [...KEYS.all, 'detail', id] as const,
    stats: (id: string) => [...KEYS.all, 'stats', id] as const,
};

/* ─── List all suppliers ───────────────────────────────────── */
export function useSuppliers() {
    return useQuery({
        queryKey: KEYS.list(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as Supplier[];
        },
        staleTime: 60_000,
    });
}

/* ─── Single supplier ──────────────────────────────────────── */
export function useSupplier(id: string | null) {
    return useQuery({
        queryKey: KEYS.detail(id || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', id!)
                .single();
            if (error) throw error;
            return data as Supplier;
        },
        enabled: !!id,
    });
}

/* ─── Supplier stats (orders + spend) ──────────────────────── */
export interface SupplierStats {
    total_orders: number;
    total_spend: number;
    last_order_date: string | null;
    orders: { id: string; order_number: string; status: string; total_amount: number; order_date: string }[];
}

export function useSupplierStats(id: string | null) {
    return useQuery({
        queryKey: KEYS.stats(id || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('id, order_number, status, total_amount, order_date')
                .eq('supplier_id', id!)
                .order('order_date', { ascending: false });
            if (error) throw error;

            const orders = data || [];
            return {
                total_orders: orders.length,
                total_spend: orders.reduce((s, o) => s + Number(o.total_amount), 0),
                last_order_date: orders[0]?.order_date || null,
                orders,
            } as SupplierStats;
        },
        enabled: !!id,
    });
}

/* ─── Create supplier ──────────────────────────────────────── */
export function useCreateSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: SupplierInsert) => {
            const { data, error } = await supabase.from('suppliers').insert(input).select().single();
            if (error) throw error;
            return data as Supplier;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    });
}

/* ─── Update supplier ──────────────────────────────────────── */
export function useUpdateSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: SupplierUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from('suppliers')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as Supplier;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    });
}
