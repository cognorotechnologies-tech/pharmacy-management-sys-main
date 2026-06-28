import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Sale, SaleItem } from '@/types/database';

/* ─── Keys ─────────────────────────────────────────────────── */

const KEYS = {
    all: ['sales'] as const,
    search: (q: string, branchId: string) => [...KEYS.all, 'pos-search', q, branchId] as const,
    patientSearch: (q: string) => [...KEYS.all, 'patient-search', q] as const,
    patientRx: (patientId: string) => [...KEYS.all, 'patient-rx', patientId] as const,
    patientInsurance: (patientId: string) => [...KEYS.all, 'patient-insurance', patientId] as const,
    history: (branchId: string, page: number) => [...KEYS.all, 'history', branchId, page] as const,
    detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

/* ═══════════════════════════════════════════════════════════════
   1. POS Product Search — debounced, returns stock + price + Rx badge
   ═══════════════════════════════════════════════════════════════ */

export interface POSProduct {
    id: string;
    name: string;
    generic_name: string | null;
    barcode: string | null;
    strength: string | null;
    unit: string;
    requires_prescription: boolean;
    is_controlled: boolean;
    category: string;
    stock: number;
    price: number;
    batch_id: string | null;
    batch_expiry: string | null;
}

async function searchPOSProducts(query: string, branchId: string): Promise<POSProduct[]> {
    if (!query || query.length < 2) return [];

    // Try barcode exact match first
    const { data: barcodeMatch } = await supabase
        .from('products')
        .select('id, name, generic_name, barcode, strength, unit, requires_prescription, is_controlled, category')
        .eq('barcode', query)
        .eq('is_active', true)
        .limit(1);

    let products: Record<string, unknown>[] = [];

    if (barcodeMatch && barcodeMatch.length > 0) {
        products = barcodeMatch;
    } else {
        // Full text search
        const { data, error } = await supabase
            .from('products')
            .select('id, name, generic_name, barcode, strength, unit, requires_prescription, is_controlled, category')
            .eq('is_active', true)
            .textSearch('search_vector', query, { type: 'websearch' })
            .limit(15);
        if (error) throw error;
        products = data || [];
    }

    // For each product, get stock + best FEFO batch
    const results: POSProduct[] = [];
    for (const p of products) {
        const productId = p.id as string;

        const [invRes, batchRes] = await Promise.all([
            supabase
                .from('inventory')
                .select('quantity_on_hand')
                .eq('product_id', productId)
                .eq('branch_id', branchId)
                .single(),
            supabase
                .from('batches')
                .select('id, selling_price, expiry_date, quantity_remaining')
                .eq('product_id', productId)
                .eq('is_active', true)
                .gt('quantity_remaining', 0)
                .order('expiry_date', { ascending: true })
                .limit(1),
        ]);

        const stock = invRes.data?.quantity_on_hand ?? 0;
        const batch = batchRes.data?.[0];

        results.push({
            id: productId,
            name: p.name as string,
            generic_name: p.generic_name as string | null,
            barcode: p.barcode as string | null,
            strength: p.strength as string | null,
            unit: p.unit as string,
            requires_prescription: p.requires_prescription as boolean,
            is_controlled: p.is_controlled as boolean,
            category: p.category as string,
            stock,
            price: batch?.selling_price ?? 0,
            batch_id: batch?.id ?? null,
            batch_expiry: batch?.expiry_date ?? null,
        });
    }

    return results;
}

export function usePOSProductSearch(query: string, branchId: string) {
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 150);
        return () => clearTimeout(timer);
    }, [query]);

    return useQuery({
        queryKey: KEYS.search(debouncedQuery, branchId),
        queryFn: () => searchPOSProducts(debouncedQuery, branchId),
        enabled: debouncedQuery.length >= 2,
        staleTime: 30_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   2. Patient Search
   ═══════════════════════════════════════════════════════════════ */

export interface POSPatient {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    allergies: string[];
    insurance_plan_id: string | null;
}

export function usePatientSearchPOS(query: string) {
    const [debounced, setDebounced] = useState(query);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query), 200);
        return () => clearTimeout(t);
    }, [query]);

    return useQuery({
        queryKey: KEYS.patientSearch(debounced),
        queryFn: async () => {
            if (!debounced || debounced.length < 2) return [];
            const { data, error } = await supabase
                .from('patients')
                .select('id, first_name, last_name, phone, allergies, insurance_plan_id')
                .eq('is_active', true)
                .or(`first_name.ilike.%${debounced}%,last_name.ilike.%${debounced}%,phone.ilike.%${debounced}%`)
                .limit(10);
            if (error) throw error;
            return (data || []) as POSPatient[];
        },
        enabled: debounced.length >= 2,
        staleTime: 30_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   3. Patient's Active Prescriptions
   ═══════════════════════════════════════════════════════════════ */

export interface POSPrescription {
    id: string;
    prescription_number: string;
    prescriber_name: string;
    status: string;
    date_prescribed: string;
    items: {
        id: string;
        product_id: string;
        product_name: string;
        quantity_prescribed: number;
        quantity_dispensed: number;
        dosage: string;
        batch_id: string | null;
    }[];
}

export function usePatientPrescriptions(patientId: string | null) {
    return useQuery({
        queryKey: KEYS.patientRx(patientId || ''),
        queryFn: async () => {
            if (!patientId) return [];
            const { data, error } = await supabase
                .from('prescriptions')
                .select(`
                    id, prescription_number, prescriber_name, status, date_prescribed,
                    prescription_items(
                        id, product_id, quantity_prescribed, quantity_dispensed, dosage, batch_id,
                        products(name)
                    )
                `)
                .eq('patient_id', patientId)
                .in('status', ['verified', 'partially_dispensed'])
                .order('date_prescribed', { ascending: false })
                .limit(10);
            if (error) throw error;

            return (data || []).map((rx) => ({
                id: rx.id,
                prescription_number: rx.prescription_number,
                prescriber_name: rx.prescriber_name,
                status: rx.status,
                date_prescribed: rx.date_prescribed,
                items: ((rx as Record<string, unknown>).prescription_items as Record<string, unknown>[] || []).map((item) => ({
                    id: item.id as string,
                    product_id: item.product_id as string,
                    product_name: ((item as Record<string, unknown>).products as Record<string, unknown>)?.name as string || 'Unknown',
                    quantity_prescribed: item.quantity_prescribed as number,
                    quantity_dispensed: item.quantity_dispensed as number,
                    dosage: item.dosage as string,
                    batch_id: item.batch_id as string | null,
                })),
            })) as POSPrescription[];
        },
        enabled: !!patientId,
        staleTime: 30_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   4. Patient Insurance
   ═══════════════════════════════════════════════════════════════ */

export interface POSInsurance {
    plan_name: string;
    provider_name: string;
    coverage_percentage: number;
    copay_amount: number | null;
    max_annual_benefit: number | null;
}

export function usePatientInsurance(patientId: string | null) {
    return useQuery({
        queryKey: KEYS.patientInsurance(patientId || ''),
        queryFn: async (): Promise<POSInsurance | null> => {
            if (!patientId) return null;
            const { data: patient } = await supabase
                .from('patients')
                .select('insurance_plan_id')
                .eq('id', patientId)
                .single();
            if (!patient?.insurance_plan_id) return null;

            const { data, error } = await supabase
                .from('insurance_plans')
                .select('plan_name, provider_name, coverage_percentage, copay_amount, max_annual_benefit')
                .eq('id', patient.insurance_plan_id)
                .eq('is_active', true)
                .single();
            if (error || !data) return null;
            return data as POSInsurance;
        },
        enabled: !!patientId,
        staleTime: 60_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   5. Checkout (fn_checkout_sale RPC)
   ═══════════════════════════════════════════════════════════════ */

export interface CheckoutInput {
    sale_number: string;
    branch_id: string;
    cashier_id: string;
    patient_id?: string | null;
    prescription_id?: string | null;
    payment_method: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    insurance_amount: number;
    total_amount: number;
    amount_paid: number;
    change_amount: number;
    notes?: string | null;
    shift_id?: string | null;
    items: {
        product_id: string;
        batch_id: string | null;
        quantity: number;
        unit_price: number;
        discount: number;
        tax: number;
        total_price: number;
    }[];
}

export function useCheckoutSale() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: CheckoutInput) => {
            const { data, error } = await supabase.rpc('fn_checkout_sale', {
                p_sale_number: input.sale_number,
                p_branch_id: input.branch_id,
                p_cashier_id: input.cashier_id,
                p_patient_id: input.patient_id || null,
                p_prescription_id: input.prescription_id || null,
                p_payment_method: input.payment_method,
                p_subtotal: input.subtotal,
                p_tax_amount: input.tax_amount,
                p_discount_amount: input.discount_amount,
                p_insurance_amount: input.insurance_amount,
                p_total_amount: input.total_amount,
                p_amount_paid: input.amount_paid,
                p_change_amount: input.change_amount,
                p_notes: input.notes || null,
                p_shift_id: input.shift_id || null,
                p_items: JSON.stringify(input.items),
            });
            if (error) throw error;
            return data as { sale_id: string; sale_number: string; status: string };
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
            qc.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/* ═══════════════════════════════════════════════════════════════
   6. Sale History (paginated)
   ═══════════════════════════════════════════════════════════════ */

export interface SaleWithDetails extends Sale {
    patient_name?: string;
    item_count: number;
}

export function useSaleHistory(branchId: string, page: number, perPage = 20) {
    return useQuery({
        queryKey: KEYS.history(branchId, page),
        queryFn: async () => {
            const offset = (page - 1) * perPage;
            const { data, count, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    patients(first_name, last_name),
                    sale_items(id)
                `, { count: 'exact' })
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .range(offset, offset + perPage - 1);
            if (error) throw error;

            const sales: SaleWithDetails[] = (data || []).map((s: Record<string, unknown>) => {
                const patient = s.patients as Record<string, unknown> | null;
                const items = s.sale_items as unknown[] | null;
                const { patients: _p, sale_items: _si, ...sale } = s;
                return {
                    ...sale,
                    patient_name: patient ? `${patient.first_name} ${patient.last_name}` : undefined,
                    item_count: items?.length || 0,
                } as SaleWithDetails;
            });

            return { sales, total: count || 0, totalPages: Math.ceil((count || 0) / perPage) };
        },
        enabled: !!branchId,
        staleTime: 30_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   7. Sale Detail (for receipt / void)
   ═══════════════════════════════════════════════════════════════ */

export interface SaleDetailItem extends SaleItem {
    product_name: string;
    product_unit: string;
}

export interface SaleDetail extends Sale {
    patient_name?: string;
    cashier_name?: string;
    prescription_number?: string;
    prescriber_name?: string;
    items: SaleDetailItem[];
}

export function useSaleDetail(saleId: string | null) {
    return useQuery({
        queryKey: KEYS.detail(saleId || ''),
        queryFn: async (): Promise<SaleDetail | null> => {
            if (!saleId) return null;
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    patients(first_name, last_name),
                    cashier:profiles!sales_cashier_id_fkey(full_name),
                    prescription:prescriptions(prescription_number, prescriber_name),
                    sale_items(*, products(name, unit))
                `)
                .eq('id', saleId)
                .single();
            if (error) throw error;

            const patient = (data as Record<string, unknown>).patients as Record<string, unknown> | null;
            const cashier = (data as Record<string, unknown>).cashier as Record<string, unknown> | null;
            const rx = (data as Record<string, unknown>).prescription as Record<string, unknown> | null;
            const rawItems = (data as Record<string, unknown>).sale_items as Record<string, unknown>[] || [];
            const { patients: _p, cashier: _c, prescription: _r, sale_items: _si, ...sale } = data as Record<string, unknown>;

            return {
                ...sale,
                patient_name: patient ? `${patient.first_name} ${patient.last_name}` : undefined,
                cashier_name: cashier?.full_name as string || 'Unknown',
                prescription_number: rx?.prescription_number as string || undefined,
                prescriber_name: rx?.prescriber_name as string || undefined,
                items: rawItems.map((item) => {
                    const prod = item.products as Record<string, unknown>;
                    const { products: _pr, ...rest } = item;
                    return {
                        ...rest,
                        product_name: prod?.name as string || 'Unknown',
                        product_unit: prod?.unit as string || 'units',
                    } as SaleDetailItem;
                }),
            } as SaleDetail;
        },
        enabled: !!saleId,
    });
}

/* ═══════════════════════════════════════════════════════════════
   8. Void Sale (fn_void_sale RPC)
   ═══════════════════════════════════════════════════════════════ */

export function useVoidSale() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ saleId, voidedBy, reason, items }: {
            saleId: string;
            voidedBy: string;
            reason: string;
            items?: { sale_item_id: string }[];
        }) => {
            const { data, error } = await supabase.rpc('fn_void_sale', {
                p_sale_id: saleId,
                p_voided_by: voidedBy,
                p_reason: reason,
                p_items: items ? JSON.stringify(items) : null,
            });
            if (error) throw error;
            return data as { sale_id: string; status: string; reason: string };
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
            qc.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/* ═══════════════════════════════════════════════════════════════
   9. Generate Sale Number
   ═══════════════════════════════════════════════════════════════ */

export function generateSaleNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SL-${date}-${rand}`;
}
