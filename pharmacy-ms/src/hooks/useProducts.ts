import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product, ProductInsert, ProductUpdate, ProductCategory } from '@/types/database';

/* ─── Types ────────────────────────────────────────────────── */

export interface ProductFilters {
    search?: string;
    categories?: ProductCategory[];
    requiresPrescription?: boolean;
    isControlled?: boolean;
    lowStockOnly?: boolean;
    isActive?: boolean | 'all';
    page: number;
    perPage: number;
}

export interface ProductWithStock extends Product {
    total_stock: number;
    latest_price: number | null;
    interaction_count?: number;
}

interface PaginatedProducts {
    products: ProductWithStock[];
    total: number;
    totalPages: number;
}

interface DailySale {
    date: string;
    quantity: number;
    revenue: number;
}

/* ─── Keys ─────────────────────────────────────────────────── */

const KEYS = {
    all: ['products'] as const,
    lists: () => [...KEYS.all, 'list'] as const,
    list: (filters: ProductFilters) => [...KEYS.lists(), filters] as const,
    detail: (id: string) => [...KEYS.all, 'detail', id] as const,
    batches: (id: string) => [...KEYS.all, 'batches', id] as const,
    salesTrend: (id: string) => [...KEYS.all, 'sales-trend', id] as const,
};

/* ─── List products (paginated + filtered) ─────────────────── */

async function fetchProducts(filters: ProductFilters): Promise<PaginatedProducts> {
    const { search, categories, requiresPrescription, isControlled, lowStockOnly, isActive, page, perPage } = filters;
    const offset = (page - 1) * perPage;

    // Build query - fetch products and join inventory for stock totals
    let query = supabase
        .from('products')
        .select(`
      *,
      inventory(quantity_on_hand),
      batches(selling_price, is_active)
    `, { count: 'exact' });

    // Full-text search using the search_vector column
    if (search && search.trim()) {
        query = query.textSearch('search_vector', search, { type: 'websearch' });
    }

    if (categories && categories.length > 0) {
        query = query.in('category', categories);
    }
    if (requiresPrescription !== undefined) {
        query = query.eq('requires_prescription', requiresPrescription);
    }
    if (isControlled !== undefined) {
        query = query.eq('is_controlled', isControlled);
    }
    if (isActive !== 'all' && isActive !== undefined) {
        query = query.eq('is_active', isActive);
    }

    query = query.order('name', { ascending: true }).range(offset, offset + perPage - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    // Compute stock totals and latest price
    const products: ProductWithStock[] = (data || []).map((p: Record<string, unknown>) => {
        const inv = p.inventory as { quantity_on_hand: number }[] | null;
        const batchArr = p.batches as { selling_price: number; is_active: boolean }[] | null;

        const totalStock = (inv || []).reduce((sum, i) => sum + (i.quantity_on_hand || 0), 0);
        const activeBatches = (batchArr || []).filter(b => b.is_active);
        const latestPrice = activeBatches.length > 0 ? activeBatches[0].selling_price : null;

        // Remove join fields from product
        const { inventory: _inv, batches: _bat, ...product } = p as Record<string, unknown>;
        return {
            ...product,
            total_stock: totalStock,
            latest_price: latestPrice,
        } as ProductWithStock;
    });

    // Client-side low stock filter (needs computed total_stock)
    const filtered = lowStockOnly
        ? products.filter((p) => p.total_stock <= p.reorder_point)
        : products;

    const total = count || 0;

    return {
        products: filtered,
        total: lowStockOnly ? filtered.length : total,
        totalPages: Math.ceil((lowStockOnly ? filtered.length : total) / perPage),
    };
}

export function useProducts(filters: ProductFilters) {
    return useQuery({
        queryKey: KEYS.list(filters),
        queryFn: () => fetchProducts(filters),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
    });
}

/* ─── Single product detail ────────────────────────────────── */

export function useProduct(id: string | null) {
    return useQuery({
        queryKey: KEYS.detail(id || ''),
        queryFn: async () => {
            if (!id) return null;

            const [productRes, interactionCountRes] = await Promise.all([
                supabase.from('products').select('*').eq('id', id).single(),
                supabase
                    .from('drug_interactions')
                    .select('id', { count: 'exact', head: true })
                    .or(`drug_a_name.ilike.%${(await supabase.from('products').select('name').eq('id', id).single()).data?.name}%,drug_b_name.ilike.%${(await supabase.from('products').select('name').eq('id', id).single()).data?.name}%`),
            ]);

            if (productRes.error) throw productRes.error;

            return {
                ...productRes.data,
                interaction_count: interactionCountRes.count || 0,
            } as ProductWithStock;
        },
        enabled: !!id,
        staleTime: 60_000,
    });
}

/* ─── Batches for a product ────────────────────────────────── */

export function useProductBatches(productId: string | null) {
    return useQuery({
        queryKey: KEYS.batches(productId || ''),
        queryFn: async () => {
            if (!productId) return [];
            const { data, error } = await supabase
                .from('batches')
                .select('*')
                .eq('product_id', productId)
                .order('expiry_date', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!productId,
        staleTime: 60_000,
    });
}

/* ─── 30-day sales trend ───────────────────────────────────── */

export function useProductSalesTrend(productId: string | null) {
    return useQuery({
        queryKey: KEYS.salesTrend(productId || ''),
        queryFn: async (): Promise<DailySale[]> => {
            if (!productId) return [];

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data, error } = await supabase
                .from('sale_items')
                .select('quantity, total_price, created_at')
                .eq('product_id', productId)
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (error) throw error;

            // Group by date
            const grouped = new Map<string, { quantity: number; revenue: number }>();
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                grouped.set(key, { quantity: 0, revenue: 0 });
            }

            (data || []).forEach((item) => {
                const key = new Date(item.created_at).toISOString().slice(0, 10);
                const existing = grouped.get(key);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.revenue += item.total_price;
                }
            });

            return Array.from(grouped.entries())
                .map(([date, vals]) => ({ date, ...vals }))
                .sort((a, b) => a.date.localeCompare(b.date));
        },
        enabled: !!productId,
        staleTime: 60_000,
    });
}

/* ─── Create product ───────────────────────────────────────── */

export function useCreateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (product: ProductInsert) => {
            const { data, error } = await supabase.from('products').insert(product).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.lists() });
        },
    });
}

/* ─── Update product (with optimistic toggle for is_active) ── */

export function useUpdateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
            const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        onMutate: async (updated) => {
            // Optimistic update for is_active toggle
            if ('is_active' in updated) {
                await qc.cancelQueries({ queryKey: KEYS.lists() });
                const prev = qc.getQueriesData({ queryKey: KEYS.lists() });
                qc.setQueriesData({ queryKey: KEYS.lists() }, (old: PaginatedProducts | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        products: old.products.map((p) =>
                            p.id === updated.id ? { ...p, is_active: updated.is_active! } : p,
                        ),
                    };
                });
                return { prev };
            }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) {
                ctx.prev.forEach(([key, data]) => {
                    qc.setQueryData(key, data);
                });
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: KEYS.lists() });
        },
    });
}

/* ─── Bulk import ──────────────────────────────────────────── */

export function useBulkImport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (products: ProductInsert[]) => {
            const { data, error } = await supabase.from('products').insert(products).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.lists() });
        },
    });
}

/* ─── CSV export utility ───────────────────────────────────── */

export function exportProductsCSV(products: ProductWithStock[]) {
    const headers = [
        'Name', 'Generic Name', 'Brand', 'Barcode', 'SKU', 'Category', 'Formulation',
        'Strength', 'Unit', 'Requires Prescription', 'Is Controlled', 'Stock',
        'Reorder Point', 'Price', 'Status', 'Manufacturer', 'Shelf Location',
    ];

    const rows = products.map((p) => [
        p.name,
        p.generic_name || '',
        p.brand || '',
        p.barcode || '',
        p.sku,
        p.category,
        p.formulation,
        p.strength || '',
        p.unit,
        p.requires_prescription ? 'Yes' : 'No',
        p.is_controlled ? 'Yes' : 'No',
        p.total_stock,
        p.reorder_point,
        p.latest_price ?? '',
        p.is_active ? 'Active' : 'Inactive',
        p.manufacturer || '',
        p.shelf_location || '',
    ]);

    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
