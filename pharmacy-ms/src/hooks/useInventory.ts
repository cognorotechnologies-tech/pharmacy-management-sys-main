import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Batch, Product, AdjustmentType } from '@/types/database';

/* ─── Types ────────────────────────────────────────────────── */

export interface InventoryRow {
    id: string;
    product_id: string;
    branch_id: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number | null;
    last_restocked_at: string | null;
    last_sold_at: string | null;
    created_at: string;
    updated_at: string;
    product: Product;
    batches: Batch[];
}

export interface InventoryValuation {
    total_skus: number;
    total_units: number;
    total_value: number;
    last_updated: string;
}

export interface AdjustmentInput {
    product_id: string;
    batch_id: string | null;
    branch_id: string;
    adjustment_type: AdjustmentType;
    quantity: number;
    reason: string;
    adjusted_by: string;
}

/* ─── Keys ─────────────────────────────────────────────────── */

const KEYS = {
    all: ['inventory'] as const,
    list: (filter?: string) => [...KEYS.all, 'list', filter || 'all'] as const,
    valuation: () => [...KEYS.all, 'valuation'] as const,
};

/* ─── Inventory list with products + batches join ──────────── */

async function fetchInventory(filter?: string): Promise<InventoryRow[]> {
    const query = supabase
        .from('inventory')
        .select(`
      *,
      product:products!inner(*),
      batches:batches(*)
    `)
        .order('updated_at', { ascending: false });

    // Batches joined via product_id — filter logic handled client-side after fetch
    const { data, error } = await query;
    if (error) throw error;

    let rows = (data || []) as unknown as InventoryRow[];

    // Client-side filters that require computed data
    if (filter === 'low_stock') {
        rows = rows.filter((r) => r.quantity_on_hand <= r.product.reorder_point);
    } else if (filter === 'expiring_soon') {
        const ninetyDays = new Date();
        ninetyDays.setDate(ninetyDays.getDate() + 90);
        rows = rows.filter((r) =>
            r.batches.some((b) => b.is_active && new Date(b.expiry_date) <= ninetyDays),
        );
    } else if (filter === 'expired') {
        const now = new Date();
        rows = rows.filter((r) =>
            r.batches.some((b) => b.is_active && new Date(b.expiry_date) < now),
        );
    }

    return rows;
}

export function useInventory(filter?: string) {
    return useQuery({
        queryKey: KEYS.list(filter),
        queryFn: () => fetchInventory(filter),
        staleTime: 30_000,
    });
}

/* ─── Realtime subscription hook ───────────────────────────── */

export function useInventoryRealtime() {
    const qc = useQueryClient();

    const invalidateAll = useCallback(() => {
        qc.invalidateQueries({ queryKey: KEYS.all });
    }, [qc]);

    useEffect(() => {
        const channel = supabase
            .channel('inventory-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'inventory' },
                () => {
                    // Invalidate all inventory queries on any change
                    invalidateAll();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [invalidateAll]);
}

/* ─── Inventory valuation ──────────────────────────────────── */

async function fetchValuation(): Promise<InventoryValuation> {
    // Total SKUs and units from inventory
    const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('quantity_on_hand');
    if (invErr) throw invErr;

    const totalSkus = invData?.length || 0;
    const totalUnits = (invData || []).reduce((sum, i) => sum + i.quantity_on_hand, 0);

    // Total value from active batches (FIFO: qty_remaining * cost_price)
    const { data: batchData, error: batchErr } = await supabase
        .from('batches')
        .select('quantity_remaining, cost_price')
        .eq('is_active', true);
    if (batchErr) throw batchErr;

    const totalValue = (batchData || []).reduce(
        (sum, b) => sum + b.quantity_remaining * Number(b.cost_price), 0,
    );

    return {
        total_skus: totalSkus,
        total_units: totalUnits,
        total_value: totalValue,
        last_updated: new Date().toISOString(),
    };
}

export function useInventoryValuation() {
    return useQuery({
        queryKey: KEYS.valuation(),
        queryFn: fetchValuation,
        staleTime: 60_000,
    });
}

/* ─── Stock adjustment mutation ────────────────────────────── */

export function useStockAdjustment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (input: AdjustmentInput) => {
            const requiresApproval = Math.abs(input.quantity) > 50;

            const { data, error } = await supabase.rpc('perform_stock_adjustment', {
                p_product_id: input.product_id,
                p_batch_id: input.batch_id,
                p_branch_id: input.branch_id,
                p_adjustment_type: input.adjustment_type,
                p_quantity: Math.abs(input.quantity),
                p_reason: input.reason,
                p_adjusted_by: input.adjusted_by,
                p_requires_approval: requiresApproval,
            });

            if (error) throw error;
            return data as { status: string; quantity_before?: number; quantity_after?: number; id?: string };
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
        },
    });
}
