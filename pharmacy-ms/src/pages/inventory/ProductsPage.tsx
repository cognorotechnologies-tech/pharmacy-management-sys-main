import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { z } from 'zod/v4';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    Package, Plus, Search, Filter, Download, Upload, Barcode,
    Pencil, Eye, Loader2, X, ChevronDown, AlertTriangle, Shield,
    FileText, Activity, Layers, RefreshCw, Check, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
    useProducts,
    useCreateProduct,
    useUpdateProduct,
    useBulkImport,
    useProductBatches,
    useProductSalesTrend,
    useProduct,
    exportProductsCSV,
    type ProductFilters,
    type ProductWithStock,
} from '@/hooks/useProducts';
import type {
    Product, ProductInsert, ProductCategory, ProductFormulation,
} from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SlideOver } from '@/components/ui/SlideOver';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const PER_PAGE = 20;

const CATEGORIES: { value: ProductCategory; label: string }[] = [
    { value: 'prescription', label: 'Prescription' },
    { value: 'otc', label: 'OTC' },
    { value: 'controlled', label: 'Controlled' },
    { value: 'supplement', label: 'Supplement' },
    { value: 'medical_device', label: 'Medical Device' },
    { value: 'cosmetic', label: 'Cosmetic' },
];

const CATEGORY_VARIANT: Record<ProductCategory, 'blue' | 'green' | 'red' | 'amber' | 'emerald' | 'orange'> = {
    prescription: 'blue',
    otc: 'green',
    controlled: 'red',
    supplement: 'emerald',
    medical_device: 'amber',
    cosmetic: 'orange',
};

const FORMULATIONS: { value: ProductFormulation; label: string }[] = [
    { value: 'tablet', label: 'Tablet' },
    { value: 'capsule', label: 'Capsule' },
    { value: 'syrup', label: 'Syrup' },
    { value: 'injection', label: 'Injection' },
    { value: 'cream', label: 'Cream' },
    { value: 'ointment', label: 'Ointment' },
    { value: 'drops', label: 'Drops' },
    { value: 'inhaler', label: 'Inhaler' },
    { value: 'suppository', label: 'Suppository' },
    { value: 'powder', label: 'Powder' },
    { value: 'other', label: 'Other' },
];

/* ═══════════════════════════════════════════════════════════════
   CSV SCHEMA
   ═══════════════════════════════════════════════════════════════ */

const csvRowSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    generic_name: z.string().optional(),
    brand: z.string().optional(),
    barcode: z.string().optional(),
    sku: z.string().min(1, 'SKU is required'),
    category: z.enum(['prescription', 'otc', 'controlled', 'supplement', 'medical_device', 'cosmetic']),
    formulation: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other']),
    strength: z.string().optional(),
    unit: z.string().default('units'),
    requires_prescription: z.preprocess((v) => v === 'true' || v === 'yes' || v === '1', z.boolean()),
    is_controlled: z.preprocess((v) => v === 'true' || v === 'yes' || v === '1', z.boolean()),
    min_stock_level: z.coerce.number().int().min(0).default(10),
    max_stock_level: z.coerce.number().int().min(0).default(1000),
    reorder_point: z.coerce.number().int().min(0).default(20),
    manufacturer: z.string().optional(),
    shelf_location: z.string().optional(),
    description: z.string().optional(),
});

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function ProductsPage() {
    /* ── State ──────────────────────────────────────────────── */
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([]);
    const [rxOnly, setRxOnly] = useState(false);
    const [controlledOnly, setControlledOnly] = useState(false);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [statusFilter, setStatusFilter] = useState<boolean | 'all'>('all');
    const [showCatDropdown, setShowCatDropdown] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [detailProductId, setDetailProductId] = useState<string | null>(null);
    const [showCategoryMgmt, setShowCategoryMgmt] = useState(false);

    /* ── Debounced search ───────────────────────────────────── */
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    /* ── Filters ────────────────────────────────────────────── */
    const filters: ProductFilters = {
        search: search || undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        requiresPrescription: rxOnly ? true : undefined,
        isControlled: controlledOnly ? true : undefined,
        lowStockOnly,
        isActive: statusFilter,
        page,
        perPage: PER_PAGE,
    };

    const { data, isLoading } = useProducts(filters);
    const updateProduct = useUpdateProduct();

    const products = data?.products || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    /* ── Toggle status ──────────────────────────────────────── */
    const toggleActive = (p: ProductWithStock) => {
        updateProduct.mutate(
            { id: p.id, is_active: !p.is_active },
            {
                onSuccess: () => toast.success(`Product ${p.is_active ? 'deactivated' : 'activated'}`),
                onError: (e) => toast.error(e.message),
            },
        );
    };

    /* ── Category toggle ────────────────────────────────────── */
    const toggleCategory = (cat: ProductCategory) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
        );
        setPage(1);
    };

    /* ── Stock color ────────────────────────────────────────── */
    const stockColor = (stock: number, reorder: number) => {
        if (stock === 0) return 'text-red-600 bg-red-50';
        if (stock <= reorder) return 'text-orange-600 bg-orange-50';
        return 'text-green-600 bg-green-50';
    };

    /* ── Render ─────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="rounded-lg bg-emerald-100 p-2">
                                <Package className="h-6 w-6 text-emerald-600" />
                            </div>
                            Drug Catalog
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {total} product{total !== 1 ? 's' : ''} in catalog
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <Upload className="h-4 w-4" /> Import CSV
                        </button>
                        <button
                            onClick={() => exportProductsCSV(products)}
                            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <Download className="h-4 w-4" /> Export
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Product
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            placeholder="Search drugs by name, generic, or barcode…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Category multi-select */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCatDropdown(!showCatDropdown)}
                            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <Filter className="h-4 w-4" />
                            Categories{selectedCategories.length > 0 && ` (${selectedCategories.length})`}
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        {showCatDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)} />
                                <div className="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                    {CATEGORIES.map((cat) => (
                                        <label key={cat.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat.value)}
                                                onChange={() => toggleCategory(cat.value)}
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                                            />
                                            {cat.label}
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Toggle filters */}
                    <ToggleFilter label="Rx Only" active={rxOnly} onClick={() => { setRxOnly(!rxOnly); setPage(1); }} icon={<FileText className="h-3.5 w-3.5" />} />
                    <ToggleFilter label="Controlled" active={controlledOnly} onClick={() => { setControlledOnly(!controlledOnly); setPage(1); }} icon={<Shield className="h-3.5 w-3.5" />} />
                    <ToggleFilter label="Low Stock" active={lowStockOnly} onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }} icon={<AlertTriangle className="h-3.5 w-3.5" />} />

                    {/* Status */}
                    <select
                        value={String(statusFilter)}
                        onChange={(e) => {
                            const v = e.target.value;
                            setStatusFilter(v === 'all' ? 'all' : v === 'true');
                            setPage(1);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>

                {/* Table */}
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Form</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Stock</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Flags</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Price</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
                                            <p className="mt-2 text-sm text-slate-500">Loading products…</p>
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <Package className="mx-auto h-8 w-8 text-slate-300" />
                                            <p className="mt-2 text-sm text-slate-500">No products match your filters</p>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                            {/* Product */}
                                            <td className="max-w-[280px] px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                                        <Barcode className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                                                        <p className="truncate text-xs text-slate-500">
                                                            {p.generic_name && <span>{p.generic_name} · </span>}
                                                            {p.barcode || p.sku}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <Badge variant={CATEGORY_VARIANT[p.category]}>
                                                    {CATEGORIES.find((c) => c.value === p.category)?.label}
                                                </Badge>
                                            </td>

                                            {/* Form */}
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 capitalize">
                                                {p.formulation}{p.strength ? ` · ${p.strength}` : ''}
                                            </td>

                                            {/* Stock */}
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockColor(p.total_stock, p.reorder_point)}`}>
                                                    {p.total_stock}
                                                </span>
                                            </td>

                                            {/* Flags */}
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {p.requires_prescription && <Badge variant="blue">Rx</Badge>}
                                                    {p.is_controlled && <Badge variant="red">C-II</Badge>}
                                                </div>
                                            </td>

                                            {/* Price */}
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
                                                {p.latest_price != null ? `₺${p.latest_price.toFixed(2)}` : '—'}
                                            </td>

                                            {/* Status toggle */}
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <button
                                                    onClick={() => toggleActive(p)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${p.is_active ? 'bg-green-500' : 'bg-slate-300'
                                                        }`}
                                                    aria-label={p.is_active ? 'Deactivate' : 'Activate'}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${p.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                                        }`} />
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setDetailProductId(p.id)}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                        title="View details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditProduct(p)}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        page={page} totalPages={totalPages} total={total}
                        perPage={PER_PAGE} onPageChange={setPage}
                    />
                </div>

                {/* Category Management */}
                <div className="mt-6">
                    <button
                        onClick={() => setShowCategoryMgmt(!showCategoryMgmt)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <Layers className="h-4 w-4" />
                        {showCategoryMgmt ? 'Hide' : 'Show'} Category Management
                        <ChevronDown className={`h-3 w-3 transition-transform ${showCategoryMgmt ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategoryMgmt && <CategoryManager />}
                </div>
            </div>

            {/* ── Modals & Panels ──────────────────────────────────── */}
            <ProductFormModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                mode="create"
            />

            {editProduct && (
                <ProductFormModal
                    open={!!editProduct}
                    onClose={() => setEditProduct(null)}
                    mode="edit"
                    product={editProduct}
                />
            )}

            <CSVImportModal
                open={showImportModal}
                onClose={() => setShowImportModal(false)}
            />

            <ProductDetailSlideOver
                productId={detailProductId}
                onClose={() => setDetailProductId(null)}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TOGGLE FILTER BUTTON
   ═══════════════════════════════════════════════════════════════ */

function ToggleFilter({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${active
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
        >
            {icon} {label}
        </button>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ADD / EDIT PRODUCT MODAL
   ═══════════════════════════════════════════════════════════════ */

interface ProductFormModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    product?: Product;
}

function ProductFormModal({ open, onClose, mode, product }: ProductFormModalProps) {
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();
    const [submitting, setSubmitting] = useState(false);

    const empty: ProductInsert = {
        name: '', generic_name: '', brand: '', barcode: '', sku: '',
        category: 'otc', formulation: 'tablet', strength: '', unit: 'units',
        description: '', requires_prescription: false, is_controlled: false,
        is_active: true, min_stock_level: 10, max_stock_level: 1000,
        reorder_point: 20, shelf_location: '', manufacturer: '', image_url: null,
    };

    const [form, setForm] = useState<ProductInsert>(
        product ? { ...product } : empty,
    );

    // Reset form when product changes
    useEffect(() => {
        setForm(product ? { ...product } : empty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product, open]);

    const generateBarcode = () => {
        setForm({ ...form, barcode: nanoid(8).toUpperCase() });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.sku) {
            toast.error('Name and SKU are required');
            return;
        }
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await createProduct.mutateAsync(form);
                toast.success('Product created');
            } else if (product) {
                await updateProduct.mutateAsync({ id: product.id, ...form });
                toast.success('Product updated');
            }
            onClose();
        } catch (err) {
            toast.error((err as Error).message);
        }
        setSubmitting(false);
    };

    const set = (field: keyof ProductInsert, value: unknown) =>
        setForm((f) => ({ ...f, [field]: value }));

    return (
        <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Add New Product' : `Edit: ${product?.name}`} maxWidth="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Name *" value={form.name} onChange={(v) => set('name', v)} />
                    <Field label="Generic Name" value={form.generic_name || ''} onChange={(v) => set('generic_name', v)} />
                    <Field label="Brand" value={form.brand || ''} onChange={(v) => set('brand', v)} />

                    {/* Barcode with auto-generate */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Barcode</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                type="text"
                                value={form.barcode || ''}
                                onChange={(e) => set('barcode', e.target.value)}
                                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Auto or manual"
                            />
                            <button
                                type="button"
                                onClick={generateBarcode}
                                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                title="Auto-generate"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <Field label="SKU *" value={form.sku} onChange={(v) => set('sku', v)} />

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => set('category', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>

                    {/* Formulation */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Formulation</label>
                        <select
                            value={form.formulation}
                            onChange={(e) => set('formulation', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {FORMULATIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>

                    <Field label="Strength" value={form.strength || ''} onChange={(v) => set('strength', v)} placeholder="e.g. 500mg" />
                    <Field label="Unit" value={form.unit} onChange={(v) => set('unit', v)} />
                    <Field label="Manufacturer" value={form.manufacturer || ''} onChange={(v) => set('manufacturer', v)} />
                    <Field label="Shelf Location" value={form.shelf_location || ''} onChange={(v) => set('shelf_location', v)} />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                        rows={2}
                        value={form.description || ''}
                        onChange={(e) => set('description', e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Stock levels */}
                <div className="grid grid-cols-3 gap-4">
                    <NumberField label="Min Stock" value={form.min_stock_level} onChange={(v) => set('min_stock_level', v)} />
                    <NumberField label="Max Stock" value={form.max_stock_level} onChange={(v) => set('max_stock_level', v)} />
                    <NumberField label="Reorder Point" value={form.reorder_point} onChange={(v) => set('reorder_point', v)} />
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-6">
                    <ToggleField label="Requires Prescription" checked={form.requires_prescription} onChange={(v) => set('requires_prescription', v)} />
                    <ToggleField label="Controlled Substance" checked={form.is_controlled} onChange={(v) => set('is_controlled', v)} />
                    <ToggleField label="Active" checked={form.is_active} onChange={(v) => set('is_active', v)} />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button
                        type="submit" disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {mode === 'create' ? 'Add Product' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ─── Tiny form helpers ────────────────────────────────────── */

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        </div>
    );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            <input
                type="number" min={0}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        </div>
    );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
                type="checkbox" checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            {label}
        </label>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CSV IMPORT MODAL
   ═══════════════════════════════════════════════════════════════ */

interface ParsedRow {
    data: ProductInsert;
    errors: string[];
    row: number;
}

function CSVImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [parsed, setParsed] = useState<ParsedRow[]>([]);
    const [stage, setStage] = useState<'upload' | 'preview' | 'importing'>('upload');
    const fileRef = useRef<HTMLInputElement>(null);
    const bulkImport = useBulkImport();

    const reset = () => {
        setParsed([]);
        setStage('upload');
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
            if (lines.length < 2) {
                toast.error('CSV must have a header row + at least 1 data row');
                return;
            }

            const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
            const rows: ParsedRow[] = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
                const obj: Record<string, string> = {};
                headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });

                const result = csvRowSchema.safeParse(obj);
                if (result.success) {
                    rows.push({ data: result.data as unknown as ProductInsert, errors: [], row: i + 1 });
                } else {
                    const errors = result.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`);
                    rows.push({ data: obj as unknown as ProductInsert, errors, row: i + 1 });
                }
            }

            setParsed(rows);
            setStage('preview');
        };
        reader.readAsText(file);
    };

    const doImport = async () => {
        const valid = parsed.filter((r) => r.errors.length === 0);
        if (valid.length === 0) {
            toast.error('No valid rows to import');
            return;
        }
        setStage('importing');
        try {
            await bulkImport.mutateAsync(valid.map((r) => r.data));
            toast.success(`${valid.length} products imported`);
            reset();
            onClose();
        } catch (err) {
            toast.error((err as Error).message);
            setStage('preview');
        }
    };

    return (
        <Modal open={open} onClose={() => { reset(); onClose(); }} title="Import Products from CSV" maxWidth="max-w-2xl">
            {stage === 'upload' && (
                <div className="space-y-4">
                    <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
                        <Upload className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-600">Drop your CSV file here or click to browse</p>
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Choose File
                        </button>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-700">Required CSV columns:</p>
                        <p className="mt-1 text-xs text-slate-500">name, sku, category, formulation</p>
                        <p className="text-xs text-slate-500">Optional: generic_name, brand, barcode, strength, unit, requires_prescription, is_controlled, min_stock_level, max_stock_level, reorder_point, manufacturer, shelf_location, description</p>
                    </div>
                </div>
            )}

            {stage === 'preview' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-green-600">
                            <Check className="h-4 w-4" /> {parsed.filter((r) => !r.errors.length).length} valid
                        </span>
                        <span className="flex items-center gap-1.5 text-red-600">
                            <X className="h-4 w-4" /> {parsed.filter((r) => r.errors.length > 0).length} errors
                        </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                        <table className="min-w-full text-sm divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Row</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">SKU</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {parsed.map((r) => (
                                    <tr key={r.row} className={r.errors.length ? 'bg-red-50' : ''}>
                                        <td className="px-3 py-1.5 text-slate-500">{r.row}</td>
                                        <td className="px-3 py-1.5">{(r.data as Record<string, unknown>).name as string || '—'}</td>
                                        <td className="px-3 py-1.5">{(r.data as Record<string, unknown>).sku as string || '—'}</td>
                                        <td className="px-3 py-1.5">
                                            {r.errors.length ? (
                                                <span className="text-xs text-red-600">{r.errors[0]}</span>
                                            ) : (
                                                <Check className="h-4 w-4 text-green-500" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => { reset(); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Reset
                        </button>
                        <button
                            type="button" onClick={doImport}
                            disabled={parsed.filter((r) => !r.errors.length).length === 0}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                        >
                            Import {parsed.filter((r) => !r.errors.length).length} Products
                        </button>
                    </div>
                </div>
            )}

            {stage === 'importing' && (
                <div className="py-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                    <p className="mt-3 text-sm text-slate-600">Importing products…</p>
                </div>
            )}
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT DETAIL SLIDE-OVER
   ═══════════════════════════════════════════════════════════════ */

function ProductDetailSlideOver({ productId, onClose }: { productId: string | null; onClose: () => void }) {
    const { data: product, isLoading: loadingProduct } = useProduct(productId);
    const { data: batches, isLoading: loadingBatches } = useProductBatches(productId);
    const { data: salesTrend } = useProductSalesTrend(productId);

    const isOpen = !!productId;

    return (
        <SlideOver open={isOpen} onClose={onClose} title="Product Details" width="max-w-xl">
            {loadingProduct ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
            ) : product ? (
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                        {product.generic_name && <p className="text-sm text-slate-500">{product.generic_name}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={CATEGORY_VARIANT[product.category]}>
                                {CATEGORIES.find((c) => c.value === product.category)?.label}
                            </Badge>
                            {product.requires_prescription && <Badge variant="blue">Rx Required</Badge>}
                            {product.is_controlled && <Badge variant="red">Controlled</Badge>}
                            {product.interaction_count! > 0 && (
                                <Badge variant="amber">
                                    <AlertTriangle className="h-3 w-3" /> {product.interaction_count} Interactions
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoRow label="Barcode" value={product.barcode || '—'} />
                        <InfoRow label="SKU" value={product.sku} />
                        <InfoRow label="Formulation" value={product.formulation} />
                        <InfoRow label="Strength" value={product.strength || '—'} />
                        <InfoRow label="Unit" value={product.unit} />
                        <InfoRow label="Brand" value={product.brand || '—'} />
                        <InfoRow label="Manufacturer" value={product.manufacturer || '—'} />
                        <InfoRow label="Shelf" value={product.shelf_location || '—'} />
                        <InfoRow label="Reorder Point" value={String(product.reorder_point)} />
                        <InfoRow label="Min / Max Stock" value={`${product.min_stock_level} / ${product.max_stock_level}`} />
                    </div>

                    {product.description && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Description</p>
                            <p className="mt-1 text-sm text-slate-700">{product.description}</p>
                        </div>
                    )}

                    {/* Sales Trend */}
                    {salesTrend && salesTrend.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                                <Activity className="inline h-3.5 w-3.5 mr-1" />
                                Sales — Last 30 Days
                            </p>
                            <div className="h-32 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesTrend}>
                                        <defs>
                                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" tick={false} />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem' }}
                                            labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
                                        />
                                        <Area type="monotone" dataKey="quantity" stroke="#3b82f6" fill="url(#salesGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Batches */}
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                            Stock by Batch ({batches?.length || 0})
                        </p>
                        {loadingBatches ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : batches && batches.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full text-xs divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Batch #</th>
                                            <th className="px-3 py-2 text-right font-semibold text-slate-500">Qty</th>
                                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Expiry</th>
                                            <th className="px-3 py-2 text-right font-semibold text-slate-500">Price</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {batches.map((b) => {
                                            const isExpired = new Date(b.expiry_date) < new Date();
                                            return (
                                                <tr key={b.id} className={isExpired ? 'bg-red-50' : ''}>
                                                    <td className="px-3 py-1.5 font-medium text-slate-900">{b.batch_number}</td>
                                                    <td className="px-3 py-1.5 text-right">{b.quantity_remaining}</td>
                                                    <td className="px-3 py-1.5">
                                                        <span className={isExpired ? 'text-red-600' : ''}>
                                                            {new Date(b.expiry_date).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right">₺{b.selling_price.toFixed(2)}</td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <Badge variant={b.is_active ? 'green' : 'red'} dot>
                                                            {b.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No batches found</p>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-500">Product not found</p>
            )}
        </SlideOver>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-medium text-slate-800 capitalize">{value}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY MANAGER (inline CRUD)
   ═══════════════════════════════════════════════════════════════ */

function CategoryManager() {
    // Categories are enum-based in this schema, so we display them with product counts
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            setLoading(true);
            const promises = CATEGORIES.map(async (cat) => {
                const { count } = await (await import('@/lib/supabase')).supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('category', cat.value);
                return { category: cat.value, count: count || 0 };
            });
            const results = await Promise.all(promises);
            const map: Record<string, number> = {};
            results.forEach((r) => { map[r.category] = r.count; });
            setCounts(map);
            setLoading(false);
        };
        fetchCounts();
    }, []);

    return (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Product Categories</h3>
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {CATEGORIES.map((cat) => (
                        <div key={cat.value} className="rounded-lg border border-slate-200 p-3 text-center hover:border-blue-300 transition-colors">
                            <Badge variant={CATEGORY_VARIANT[cat.value]}>{cat.label}</Badge>
                            <p className="mt-2 text-lg font-bold text-slate-900">{counts[cat.value] ?? 0}</p>
                            <p className="text-xs text-slate-500">products</p>
                        </div>
                    ))}
                </div>
            )}
            <p className="mt-3 text-xs text-slate-400">
                Categories are schema-defined. Contact your administrator to add new categories.
            </p>
        </div>
    );
}
