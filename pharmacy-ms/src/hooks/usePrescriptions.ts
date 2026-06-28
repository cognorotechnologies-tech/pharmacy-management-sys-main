import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
    Prescription, PrescriptionItem, PrescriptionStatus,
    DrugInteraction, Product, Batch,
} from '@/types/database';

/* ═══════════════════════════════════════════════════════════════
   QUERY KEYS
   ═══════════════════════════════════════════════════════════════ */

const KEYS = {
    all: ['prescriptions'] as const,
    queue: (branchId: string, status?: PrescriptionStatus) =>
        [...KEYS.all, 'queue', branchId, status ?? 'all'] as const,
    detail: (id: string) => [...KEYS.all, 'detail', id] as const,
    interactions: (ids: string[]) => [...KEYS.all, 'interactions', ...ids.sort()] as const,
    allergies: (patientId: string, ids: string[]) =>
        [...KEYS.all, 'allergies', patientId, ...ids.sort()] as const,
    batches: (productId: string, branchId: string) =>
        [...KEYS.all, 'batches', productId, branchId] as const,
};

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface RxQueueCard extends Prescription {
    patient: { id: string; first_name: string; last_name: string; allergies: string[] };
    items: Array<PrescriptionItem & {
        product: Pick<Product, 'id' | 'name' | 'is_controlled' | 'requires_prescription'>;
    }>;
}

export interface RxDetail extends Prescription {
    patient: {
        id: string; first_name: string; last_name: string;
        phone: string; allergies: string[]; date_of_birth: string;
    };
    items: Array<PrescriptionItem & {
        product: Pick<Product, 'id' | 'name' | 'generic_name' | 'strength' |
            'formulation' | 'is_controlled' | 'requires_prescription' | 'unit'>;
    }>;
}

export interface InteractionWarning {
    id: string;
    drug_a_name: string;
    drug_b_name: string;
    severity: DrugInteraction['severity'];
    description: string;
    clinical_effects: string | null;
    recommendation: string | null;
}

export interface AllergyWarning {
    allergy: string;
    product_name: string;
    product_id: string;
}

export interface DispenseItemInput {
    item_id: string;
    batch_id: string;
    quantity_dispensed: number;
    pharmacist_license?: string;
}

/* ═══════════════════════════════════════════════════════════════
   1. PRESCRIPTION QUEUE — list + realtime
   ═══════════════════════════════════════════════════════════════ */

export function usePrescriptionQueue(branchId: string | null, status?: PrescriptionStatus) {
    const qc = useQueryClient();

    const query = useQuery({
        queryKey: KEYS.queue(branchId || '', status),
        queryFn: async () => {
            let q = supabase
                .from('prescriptions')
                .select(`
                    *,
                    patient:patients!inner(id, first_name, last_name, allergies),
                    items:prescription_items(
                        *,
                        product:products!inner(id, name, is_controlled, requires_prescription)
                    )
                `)
                .eq('branch_id', branchId!)
                .order('created_at', { ascending: false });

            if (status) q = q.eq('status', status);

            const { data, error } = await q;
            if (error) throw error;
            return (data || []) as RxQueueCard[];
        },
        enabled: !!branchId,
        staleTime: 15_000,
    });

    // Realtime subscription
    useEffect(() => {
        if (!branchId) return;

        const channel = supabase
            .channel(`rx-queue-${branchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'prescriptions',
                    filter: `branch_id=eq.${branchId}`,
                },
                () => {
                    qc.invalidateQueries({ queryKey: KEYS.queue(branchId, status) });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [branchId, status, qc]);

    return query;
}

/* ═══════════════════════════════════════════════════════════════
   2. SINGLE PRESCRIPTION DETAIL
   ═══════════════════════════════════════════════════════════════ */

export function usePrescription(id: string | null) {
    return useQuery({
        queryKey: KEYS.detail(id || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('prescriptions')
                .select(`
                    *,
                    patient:patients!inner(id, first_name, last_name, phone, allergies, date_of_birth),
                    items:prescription_items(
                        *,
                        product:products!inner(id, name, generic_name, strength, formulation, is_controlled, requires_prescription, unit)
                    )
                `)
                .eq('id', id!)
                .single();
            if (error) throw error;
            return data as RxDetail;
        },
        enabled: !!id,
    });
}

/* ═══════════════════════════════════════════════════════════════
   3. CREATE PRESCRIPTION
   ═══════════════════════════════════════════════════════════════ */

interface CreateRxInput {
    patient_id: string;
    prescriber_name: string;
    prescriber_phone?: string | null;
    prescriber_license?: string | null;
    branch_id: string;
    date_prescribed: string;
    diagnosis?: string | null;
    notes?: string | null;
    image_url?: string | null;
    created_by: string;
    items: Array<{
        product_id: string;
        quantity_prescribed: number;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string | null;
        refills_allowed: number;
        substitution_allowed: boolean;
    }>;
}

export function useCreatePrescription() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreateRxInput) => {
            const { items, ...rx } = input;

            // Generate Rx number
            const rxNumber = `RX-${Date.now().toString(36).toUpperCase()}`;

            // Insert prescription
            const { data: rxData, error: rxError } = await supabase
                .from('prescriptions')
                .insert({
                    ...rx,
                    prescription_number: rxNumber,
                    status: 'pending' as PrescriptionStatus,
                    date_received: new Date().toISOString(),
                })
                .select()
                .single();
            if (rxError) throw rxError;

            // Insert items
            const itemRows = items.map((item) => ({
                ...item,
                prescription_id: rxData.id,
                quantity_dispensed: 0,
                refills_used: 0,
            }));
            const { error: itemError } = await supabase
                .from('prescription_items')
                .insert(itemRows);
            if (itemError) throw itemError;

            return rxData as Prescription;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    });
}

/* ═══════════════════════════════════════════════════════════════
   4. UPDATE PRESCRIPTION
   ═══════════════════════════════════════════════════════════════ */

export function useUpdatePrescription() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Prescription> & { id: string }) => {
            const { data, error } = await supabase
                .from('prescriptions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as Prescription;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: KEYS.all });
            qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
        },
    });
}

/* ═══════════════════════════════════════════════════════════════
   5. DRUG INTERACTION CHECK
   ═══════════════════════════════════════════════════════════════ */

export function useDrugInteractionCheck(productNames: string[]) {
    return useQuery({
        queryKey: KEYS.interactions(productNames),
        queryFn: async () => {
            if (productNames.length < 2) return [] as InteractionWarning[];

            // Build OR filter for all pairs
            const filters: string[] = [];
            for (let i = 0; i < productNames.length; i++) {
                for (let j = i + 1; j < productNames.length; j++) {
                    const a = productNames[i];
                    const b = productNames[j];
                    filters.push(
                        `and(drug_a_name.ilike.%${a}%,drug_b_name.ilike.%${b}%)`,
                        `and(drug_a_name.ilike.%${b}%,drug_b_name.ilike.%${a}%)`,
                    );
                }
            }

            const { data, error } = await supabase
                .from('drug_interactions')
                .select('*')
                .or(filters.join(','));

            if (error) throw error;
            return (data || []) as InteractionWarning[];
        },
        enabled: productNames.length >= 2,
        staleTime: 60_000,
    });
}

/* ═══════════════════════════════════════════════════════════════
   6. ALLERGY CHECK
   ═══════════════════════════════════════════════════════════════ */

export function useAllergyCheck(
    patientAllergies: string[],
    products: Array<{ id: string; name: string; generic_name: string | null }>,
): AllergyWarning[] {
    if (!patientAllergies.length || !products.length) return [];

    const warnings: AllergyWarning[] = [];
    const allergyLower = patientAllergies.map((a) => a.toLowerCase().replace(/\s*\(.+\)$/, ''));

    for (const product of products) {
        const namesLower = [product.name.toLowerCase()];
        if (product.generic_name) namesLower.push(product.generic_name.toLowerCase());

        for (let i = 0; i < allergyLower.length; i++) {
            if (namesLower.some((n) => n.includes(allergyLower[i]) || allergyLower[i].includes(n))) {
                warnings.push({
                    allergy: patientAllergies[i],
                    product_name: product.name,
                    product_id: product.id,
                });
            }
        }
    }

    return warnings;
}

/* ═══════════════════════════════════════════════════════════════
   7. BATCHES FOR DISPENSING (FEFO — nearest expiry first)
   ═══════════════════════════════════════════════════════════════ */

export function useBatchesForDispensing(productId: string | null, branchId: string | null) {
    return useQuery({
        queryKey: KEYS.batches(productId || '', branchId || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('batches')
                .select('*')
                .eq('product_id', productId!)
                .gt('quantity_remaining', 0)
                .eq('is_active', true)
                .gte('expiry_date', new Date().toISOString().split('T')[0]) // not expired
                .order('expiry_date', { ascending: true }); // FEFO

            if (error) throw error;
            return (data || []) as Batch[];
        },
        enabled: !!productId && !!branchId,
    });
}

/* ═══════════════════════════════════════════════════════════════
   8. DISPENSE PRESCRIPTION (RPC call)
   ═══════════════════════════════════════════════════════════════ */

export function useDispensePrescription() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            prescription_id, dispensed_by, branch_id, items,
        }: {
            prescription_id: string;
            dispensed_by: string;
            branch_id: string;
            items: DispenseItemInput[];
        }) => {
            const { data, error } = await supabase.rpc('fn_dispense_prescription', {
                p_prescription_id: prescription_id,
                p_dispensed_by: dispensed_by,
                p_branch_id: branch_id,
                p_items: items,
            });
            if (error) throw error;
            return data as { status: string; total_prescribed: number; total_dispensed: number };
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.all });
            qc.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}

/* ═══════════════════════════════════════════════════════════════
   9. UPLOAD PRESCRIPTION IMAGE
   ═══════════════════════════════════════════════════════════════ */

export function useUploadRxImage() {
    return useMutation({
        mutationFn: async ({ file, prescriptionId }: { file: File; prescriptionId?: string }) => {
            const ext = file.name.split('.').pop();
            const fileName = `${prescriptionId || Date.now()}_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('prescription-images')
                .upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('prescription-images')
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        },
    });
}

/* ═══════════════════════════════════════════════════════════════
   10. PRESCRIPTION-ONLY PRODUCT SEARCH
   ═══════════════════════════════════════════════════════════════ */

export function useRxProductSearch(search: string) {
    return useQuery({
        queryKey: ['rx-products', search],
        queryFn: async () => {
            let q = supabase
                .from('products')
                .select('id, name, generic_name, strength, formulation, unit, is_controlled, requires_prescription, category')
                .eq('is_active', true)
                .eq('requires_prescription', true)
                .order('name')
                .limit(20);

            if (search.length >= 2) {
                q = q.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,barcode.ilike.%${search}%`);
            }

            const { data, error } = await q;
            if (error) throw error;
            return (data || []) as Array<Pick<Product, 'id' | 'name' | 'generic_name' | 'strength' |
                'formulation' | 'unit' | 'is_controlled' | 'requires_prescription' | 'category'>>;
        },
        enabled: search.length >= 2,
        staleTime: 30_000,
    });
}
