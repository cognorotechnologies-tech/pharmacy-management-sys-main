import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Patient, Prescription, Sale } from '@/types/database';

/* ─── Query keys ──────────────────────────────────────────── */

const KEYS = {
    all: ['patients'] as const,
    list: (search?: string) => [...KEYS.all, 'list', search ?? ''] as const,
    detail: (id: string) => [...KEYS.all, 'detail', id] as const,
    prescriptions: (id: string) => [...KEYS.all, 'prescriptions', id] as const,
    sales: (id: string) => [...KEYS.all, 'sales', id] as const,
    medications: (id: string) => [...KEYS.all, 'medications', id] as const,
};

/* ─── Patient list (with debounced search) ────────────────── */

export type PatientListRow = Patient & {
    insurance_plan?: { plan_name: string; provider_name: string } | null;
    _prescriptions_count?: number;
    _last_visit?: string | null;
};

export function usePatients(search?: string) {
    return useQuery({
        queryKey: KEYS.list(search),
        queryFn: async () => {
            let query = supabase
                .from('patients')
                .select('*, insurance_plan:insurance_plans(plan_name, provider_name)')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(200);

            if (search && search.length >= 2) {
                // ilike search on name or phone
                query = query.or(
                    `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`,
                );
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as PatientListRow[];
        },
        staleTime: 30_000,
    });
}

/* ─── Single patient detail ───────────────────────────────── */

export function usePatient(id: string | null) {
    return useQuery({
        queryKey: KEYS.detail(id || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('patients')
                .select('*, insurance_plan:insurance_plans(id, plan_name, provider_name, plan_type, coverage_percentage)')
                .eq('id', id!)
                .single();
            if (error) throw error;
            return data as Patient & {
                insurance_plan?: {
                    id: string;
                    plan_name: string;
                    provider_name: string;
                    plan_type: string;
                    coverage_percentage: number;
                } | null;
            };
        },
        enabled: !!id,
    });
}

/* ─── Patient prescriptions ──────────────────────────────── */

export function usePatientPrescriptions(patientId: string | null) {
    return useQuery({
        queryKey: KEYS.prescriptions(patientId || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('prescriptions')
                .select('*, items:prescription_items(*, product:products(id, name, generic_name, strength, formulation))')
                .eq('patient_id', patientId!)
                .order('date_prescribed', { ascending: false });
            if (error) throw error;
            return (data || []) as (Prescription & {
                items: Array<{
                    id: string;
                    product_id: string;
                    quantity_prescribed: number;
                    quantity_dispensed: number;
                    dosage: string;
                    frequency: string;
                    duration: string;
                    instructions: string | null;
                    refills_allowed: number;
                    refills_used: number;
                    product: { id: string; name: string; generic_name: string | null; strength: string | null; formulation: string };
                }>;
            })[];
        },
        enabled: !!patientId,
    });
}

/* ─── Patient sales / purchase history ───────────────────── */

export function usePatientSales(patientId: string | null) {
    return useQuery({
        queryKey: KEYS.sales(patientId || ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sales')
                .select('*, items:sale_items(*, product:products(id, name))')
                .eq('patient_id', patientId!)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as (Sale & {
                items: Array<{
                    id: string;
                    product_id: string;
                    quantity: number;
                    unit_price: number;
                    total_price: number;
                    product: { id: string; name: string };
                }>;
            })[];
        },
        enabled: !!patientId,
    });
}

/* ─── Derived medications (current meds from dispensed Rx) ── */

export interface CurrentMedication {
    product_id: string;
    product_name: string;
    generic_name: string | null;
    strength: string | null;
    dosage: string;
    frequency: string;
    last_fill_date: string;
    duration: string;
    refills_remaining: number;
}

export function usePatientMedications(patientId: string | null) {
    return useQuery({
        queryKey: KEYS.medications(patientId || ''),
        queryFn: async () => {
            // Get dispensed prescriptions with items
            const { data, error } = await supabase
                .from('prescriptions')
                .select('date_dispensed, date_prescribed, items:prescription_items(*, product:products(id, name, generic_name, strength))')
                .eq('patient_id', patientId!)
                .in('status', ['dispensed', 'partially_dispensed'])
                .order('date_dispensed', { ascending: false });
            if (error) throw error;

            const medsMap = new Map<string, CurrentMedication>();
            for (const rx of data || []) {
                for (const item of (rx as any).items || []) {
                    if (item.quantity_dispensed > 0 && !medsMap.has(item.product_id)) {
                        medsMap.set(item.product_id, {
                            product_id: item.product_id,
                            product_name: item.product?.name ?? '',
                            generic_name: item.product?.generic_name ?? null,
                            strength: item.product?.strength ?? null,
                            dosage: item.dosage,
                            frequency: item.frequency,
                            last_fill_date: rx.date_dispensed || rx.date_prescribed,
                            duration: item.duration,
                            refills_remaining: item.refills_allowed - item.refills_used,
                        });
                    }
                }
            }
            return Array.from(medsMap.values());
        },
        enabled: !!patientId,
    });
}

/* ─── Create patient (quick-add: name + phone + dob) ──────── */

export type PatientInsert = Omit<Patient, 'id' | 'created_at' | 'updated_at'>;

export function useCreatePatient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: Partial<PatientInsert> & { first_name: string; last_name: string; date_of_birth: string; phone: string; gender: string }) => {
            const { data, error } = await supabase
                .from('patients')
                .insert(input)
                .select()
                .single();
            if (error) throw error;
            return data as Patient;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    });
}

/* ─── Update patient ──────────────────────────────────────── */

export function useUpdatePatient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
            const { data, error } = await supabase
                .from('patients')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as Patient;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: KEYS.all });
            qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
        },
    });
}
