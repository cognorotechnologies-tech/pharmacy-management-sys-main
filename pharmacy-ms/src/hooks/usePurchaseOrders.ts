import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PurchaseOrder, PoItem, Product, Supplier, POStatus } from '@/types/database';

/* ─── Types ────────────────────────────────────────────────── */

export interface POWithDetails extends PurchaseOrder {
    supplier: Supplier;
    items: (PoItem & { product: Product })[];
}

export interface POFilters {
    status?: POStatus;
    supplier_id?: string;
    date_from?: string;
    date_to?: string;
}

export interface ReceiveItemInput {
    po_item_id: string;
    received_qty: number;
    batch_number: string;
    expiry_date: string;
    condition_notes?: string;
}

/* ─── Keys ─────────────────────────────────────────────────── */
const KEYS = {
    all: ['purchase_orders'] as const,
    list: (f?: POFilters) => [...KEYS.all, 'list', JSON.stringify(f)] as const,
    detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

/* ─── List purchase orders with supplier join ──────────────── */
export function usePurchaseOrders(filters?: POFilters) {
    return useQuery({
        queryKey: KEYS.list(filters),
        queryFn: async () => {
            let query = supabase
                .from('purchase_orders')
                .select('*, supplier:suppliers!inner(id, name, rating)')
                .order('created_at', { ascending: false });

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
            if (filters?.date_from) query = query.gte('order_date', filters.date_from);
            if (filters?.date_to) query = query.lte('order_date', filters.date_to);

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as (PurchaseOrder & { supplier: Pick<Supplier, 'id' | 'name' | 'rating'> })[];
        },
        staleTime: 30_000,
    });
}

/* ─── Single PO with items + product join ──────────────────── */
export function usePurchaseOrder(id: string | null) {
    return useQuery({
        queryKey: KEYS.detail(id || ''),
        queryFn: async () => {
            const { data: po, error: poErr } = await supabase
                .from('purchase_orders')
                .select('*, supplier:suppliers!inner(*)')
                .eq('id', id!)
                .single();
            if (poErr) throw poErr;

            const { data: items, error: itemsErr } = await supabase
                .from('po_items')
                .select('*, product:products!inner(id, name, generic_name, sku, barcode, category)')
                .eq('purchase_order_id', id!);
            if (itemsErr) throw itemsErr;

            return { ...po, items: items || [] } as POWithDetails;
        },
        enabled: !!id,
    });
}

/* ─── Create PO (header + items) ───────────────────────────── */
export interface CreatePOInput {
    supplier_id: string;
    branch_id: string;
    expected_delivery_date: string | null;
    notes: string | null;
    created_by: string;
    items: { product_id: string; quantity_ordered: number; unit_cost: number }[];
}

export function useCreatePO() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreatePOInput) => {
            const subtotal = input.items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);
            const order_number = `PO-${Date.now().toString(36).toUpperCase()}`;

            // Insert PO header
            const { data: po, error: poErr } = await supabase
                .from('purchase_orders')
                .insert({
                    order_number,
                    supplier_id: input.supplier_id,
                    branch_id: input.branch_id,
                    status: 'draft',
                    order_date: new Date().toISOString().split('T')[0],
                    expected_delivery_date: input.expected_delivery_date,
                    subtotal,
                    tax_amount: 0,
                    discount_amount: 0,
                    total_amount: subtotal,
                    notes: input.notes,
                    created_by: input.created_by,
                })
                .select()
                .single();
            if (poErr) throw poErr;

            // Insert line items
            const lineItems = input.items.map((i) => ({
                purchase_order_id: po.id,
                product_id: i.product_id,
                quantity_ordered: i.quantity_ordered,
                quantity_received: 0,
                unit_cost: i.unit_cost,
                total_cost: i.quantity_ordered * i.unit_cost,
            }));

            const { error: itemsErr } = await supabase.from('po_items').insert(lineItems);
            if (itemsErr) throw itemsErr;

            return po as PurchaseOrder;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    });
}

/* ─── Update PO status ─────────────────────────────────────── */
export function useUpdatePOStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: POStatus }) => {
            const { error } = await supabase
                .from('purchase_orders')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    });
}

/* ─── Receive delivery (calls DB function) ─────────────────── */
export function useReceiveDelivery() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ po_id, items }: { po_id: string; items: ReceiveItemInput[] }) => {
            const { data, error } = await supabase.rpc('fn_add_inventory_on_receive', {
                p_po_id: po_id,
                p_items: items,
            });
            if (error) throw error;
            return data as { status: string; total_ordered: number; total_received: number };
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
            qc.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}

/* ─── Product search for PO line items ─────────────────────── */
export function useProductSearch(search: string) {
    return useQuery({
        queryKey: ['products', 'search', search],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, generic_name, sku, barcode, category, unit_price')
                .or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,barcode.ilike.%${search}%`)
                .limit(10);
            if (error) throw error;
            return data || [];
        },
        enabled: search.length >= 2,
        staleTime: 30_000,
    });
}

/* ─── Last purchase price for a product ────────────────────── */
export async function getLastPurchasePrice(productId: string): Promise<number | null> {
    const { data } = await supabase
        .from('po_items')
        .select('unit_cost')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data ? Number(data.unit_cost) : null;
}
