import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Check, Search, Trash2,
    Plus, Loader2, Package, Truck, ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useSuppliers } from '@/hooks/useSuppliers';
import {
    useProductSearch, useCreatePO, getLastPurchasePrice,
    type CreatePOInput,
} from '@/hooks/usePurchaseOrders';
import { useAuth } from '@/contexts/AuthContext';
import type { Supplier } from '@/types/database';

/* ─── Types ────────────────────────────────────────────────── */

interface LineItem {
    product_id: string;
    product_name: string;
    sku: string;
    quantity_ordered: number;
    unit_cost: number;
}

/* ─── Steps ────────────────────────────────────────────────── */

const STEPS = [
    { label: 'Supplier', icon: Truck },
    { label: 'Items', icon: Package },
    { label: 'Review', icon: ClipboardCheck },
] as const;

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function CreatePOPage() {
    const navigate = useNavigate();
    const { user, branchId } = useAuth();
    const createPO = useCreatePO();

    const [step, setStep] = useState(0);

    // Step 1 state
    const [supplierId, setSupplierId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');

    // Step 2 state
    const [items, setItems] = useState<LineItem[]>([]);
    const [search, setSearch] = useState('');

    const { data: suppliers } = useSuppliers();

    const selectedSupplier: Supplier | undefined = useMemo(
        () => (suppliers || []).find((s) => s.id === supplierId),
        [suppliers, supplierId],
    );

    const subtotal = useMemo(
        () => items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0),
        [items],
    );

    /* ─── Navigation helpers ─────────────────────────────────── */

    const canNext = (): boolean => {
        if (step === 0) return !!supplierId;
        if (step === 1) return items.length > 0 && items.every((i) => i.quantity_ordered > 0 && i.unit_cost > 0);
        return true;
    };

    const handleSubmit = useCallback(async () => {
        if (!user || !branchId) {
            toast.error('Missing auth context');
            return;
        }
        try {
            const input: CreatePOInput = {
                supplier_id: supplierId,
                branch_id: branchId,
                expected_delivery_date: expectedDate || null,
                notes: notes || null,
                created_by: user.id,
                items: items.map((i) => ({
                    product_id: i.product_id,
                    quantity_ordered: i.quantity_ordered,
                    unit_cost: i.unit_cost,
                })),
            };
            await createPO.mutateAsync(input);
            toast.success('Purchase Order created!');
            navigate('/purchasing/orders');
        } catch (err) {
            toast.error((err as Error).message);
        }
    }, [supplierId, expectedDate, notes, items, user, branchId, createPO, navigate]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Back */}
                <button
                    onClick={() => navigate('/purchasing/orders')}
                    className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Purchase Orders
                </button>

                <h1 className="text-2xl font-bold text-slate-900">Create Purchase Order</h1>

                {/* ─── Stepper ───────────────────────────────────────── */}
                <div className="mt-6 flex items-center gap-2">
                    {STEPS.map((s, idx) => {
                        const Icon = s.icon;
                        const done = idx < step;
                        const active = idx === step;
                        return (
                            <div key={s.label} className="flex items-center gap-2">
                                {idx > 0 && <div className={`h-px w-8 sm:w-16 ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />}
                                <div
                                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${done
                                            ? 'bg-teal-100 text-teal-700'
                                            : active
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-slate-100 text-slate-400'
                                        }`}
                                >
                                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ─── Step Content ──────────────────────────────────── */}
                <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {step === 0 && (
                        <StepSupplier
                            suppliers={suppliers || []}
                            supplierId={supplierId}
                            onSelect={setSupplierId}
                            expectedDate={expectedDate}
                            onDateChange={setExpectedDate}
                            notes={notes}
                            onNotesChange={setNotes}
                        />
                    )}

                    {step === 1 && (
                        <StepItems
                            items={items}
                            setItems={setItems}
                            search={search}
                            setSearch={setSearch}
                        />
                    )}

                    {step === 2 && (
                        <StepReview
                            supplier={selectedSupplier}
                            expectedDate={expectedDate}
                            notes={notes}
                            items={items}
                            subtotal={subtotal}
                        />
                    )}
                </div>

                {/* ─── Footer Nav ────────────────────────────────────── */}
                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    {step < 2 ? (
                        <button
                            onClick={() => setStep((s) => s + 1)}
                            disabled={!canNext()}
                            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-40"
                        >
                            Next <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={createPO.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
                        >
                            {createPO.isPending ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                            ) : (
                                <><Check className="h-4 w-4" /> Create PO</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 1 — SELECT SUPPLIER
   ═══════════════════════════════════════════════════════════════ */

function StepSupplier({
    suppliers, supplierId, onSelect, expectedDate, onDateChange, notes, onNotesChange,
}: {
    suppliers: Supplier[];
    supplierId: string;
    onSelect: (id: string) => void;
    expectedDate: string;
    onDateChange: (v: string) => void;
    notes: string;
    onNotesChange: (v: string) => void;
}) {
    const [filter, setFilter] = useState('');
    const filtered = suppliers.filter(
        (s) => s.is_active && s.name.toLowerCase().includes(filter.toLowerCase()),
    );

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Select Supplier</h2>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search suppliers…"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => onSelect(s.id)}
                        className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${supplierId === s.id
                                ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-400'
                                : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                            }`}
                    >
                        <span className="text-sm font-medium text-slate-900">{s.name}</span>
                        {s.contact_person && <span className="text-xs text-slate-500">{s.contact_person}</span>}
                        {s.phone && <span className="text-xs text-slate-400">{s.phone}</span>}
                    </button>
                ))}
                {filtered.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-slate-400 py-4">No suppliers found</p>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Expected Delivery Date</label>
                    <input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none resize-none"
                        placeholder="Optional notes…"
                    />
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 2 — ADD LINE ITEMS
   ═══════════════════════════════════════════════════════════════ */

function StepItems({
    items, setItems, search, setSearch,
}: {
    items: LineItem[];
    setItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
    search: string;
    setSearch: (v: string) => void;
}) {
    const { data: results, isLoading } = useProductSearch(search);

    const addProduct = useCallback(async (product: { id: string; name: string; sku: string }) => {
        if (items.some((i) => i.product_id === product.id)) {
            toast.error('Product already added');
            return;
        }
        const lastPrice = await getLastPurchasePrice(product.id);
        setItems((prev) => [
            ...prev,
            {
                product_id: product.id,
                product_name: product.name,
                sku: product.sku,
                quantity_ordered: 1,
                unit_cost: lastPrice ?? 0,
            },
        ]);
        setSearch('');
    }, [items, setItems, setSearch]);

    const updateItem = (idx: number, field: keyof LineItem, value: number) => {
        setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
    };

    const removeItem = (idx: number) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const subtotal = items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Add Items</h2>

            {/* Product search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products by name, generic, or barcode…"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-teal-500" />}

                {/* Search results dropdown */}
                {search.length >= 2 && results && results.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {results.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => addProduct({ id: p.id, name: p.name, sku: p.sku })}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-teal-50 transition-colors"
                            >
                                <div>
                                    <span className="font-medium text-slate-900">{p.name}</span>
                                    {p.generic_name && <span className="ml-2 text-xs text-slate-400">({p.generic_name})</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{p.sku}</span>
                                    <Plus className="h-4 w-4 text-teal-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Items table */}
            {items.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="min-w-full text-sm divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Product</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-24">Qty</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-32">Unit Cost (₺)</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 w-28">Line Total</th>
                                <th className="px-3 py-2 w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                                <tr key={item.product_id}>
                                    <td className="px-3 py-2">
                                        <span className="font-medium text-slate-900">{item.product_name}</span>
                                        <span className="ml-2 text-xs text-slate-400">{item.sku}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number" min={1}
                                            value={item.quantity_ordered}
                                            onChange={(e) => updateItem(idx, 'quantity_ordered', Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-teal-400 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number" min={0} step={0.01}
                                            value={item.unit_cost}
                                            onChange={(e) => updateItem(idx, 'unit_cost', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="w-full rounded border border-slate-200 px-2 py-1 text-right text-sm focus:border-teal-400 focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-900">
                                        ₺{(item.quantity_ordered * item.unit_cost).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button onClick={() => removeItem(idx)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-right text-sm font-bold text-slate-900">
                        Subtotal: ₺{subtotal.toFixed(2)}
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-400">Search for products above to add items</p>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 3 — REVIEW & CONFIRM
   ═══════════════════════════════════════════════════════════════ */

function StepReview({
    supplier, expectedDate, notes, items, subtotal,
}: {
    supplier: Supplier | undefined;
    expectedDate: string;
    notes: string;
    items: LineItem[];
    subtotal: number;
}) {
    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Review Purchase Order</h2>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                <div><span className="text-slate-500">Supplier:</span> <span className="font-medium">{supplier?.name || '—'}</span></div>
                <div><span className="text-slate-500">Expected Delivery:</span> <span className="font-medium">{expectedDate || '—'}</span></div>
                <div><span className="text-slate-500">Items:</span> <span className="font-medium">{items.length}</span></div>
                <div><span className="text-slate-500">Total:</span> <span className="font-bold text-teal-700">₺{subtotal.toFixed(2)}</span></div>
                {notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span>{notes}</span></div>}
            </div>

            {/* Items list */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Product</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Qty</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Unit Cost</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((i) => (
                            <tr key={i.product_id}>
                                <td className="px-3 py-2 font-medium text-slate-900">{i.product_name}</td>
                                <td className="px-3 py-2 text-right">{i.quantity_ordered}</td>
                                <td className="px-3 py-2 text-right">₺{i.unit_cost.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-medium">₺{(i.quantity_ordered * i.unit_cost).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="border-t border-slate-200 bg-teal-50 px-4 py-2.5 text-right text-sm font-bold text-teal-800">
                    Grand Total: ₺{subtotal.toFixed(2)}
                </div>
            </div>
        </div>
    );
}
