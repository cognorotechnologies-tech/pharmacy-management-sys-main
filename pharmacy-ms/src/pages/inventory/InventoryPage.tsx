import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
    Warehouse, Package, AlertTriangle, ChevronDown, ChevronRight,
    Plus, Minus, Loader2, RefreshCw, Activity, DollarSign, Clock,
    BarChart3, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
    useInventory,
    useInventoryRealtime,
    useInventoryValuation,
    useStockAdjustment,
    type InventoryRow,
} from '@/hooks/useInventory';
import type { AdjustmentType, Batch } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; icon: React.ReactNode }[] = [
    { value: 'addition', label: 'Addition', icon: <Plus className="h-4 w-4" /> },
    { value: 'damage', label: 'Damage', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'expiry_writeoff', label: 'Expiry Write-off', icon: <Clock className="h-4 w-4" /> },
    { value: 'return', label: 'Return to Supplier', icon: <RefreshCw className="h-4 w-4" /> },
    { value: 'correction', label: 'Correction', icon: <Activity className="h-4 w-4" /> },
];

type FilterType = 'all' | 'low_stock' | 'expiring_soon' | 'expired';

/* ═══════════════════════════════════════════════════════════════
   EXPIRY HELPERS
   ═══════════════════════════════════════════════════════════════ */

function expiryClass(expiryDate: string): string {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return 'bg-red-100 text-red-800';
    if (days <= 30) return 'bg-orange-100 text-orange-800';
    if (days <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-50 text-green-700';
}

function expiryLabel(expiryDate: string): string {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return 'EXPIRED';
    if (days <= 30) return `${days}d left`;
    if (days <= 60) return `${days}d left`;
    return format(new Date(expiryDate), 'dd MMM yyyy');
}

function earliestExpiry(batches: Batch[]): Batch | null {
    const active = batches.filter((b) => b.is_active);
    if (active.length === 0) return null;
    return active.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function InventoryPage() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);

    const { data: inventory, isLoading } = useInventory(filter);
    const { data: valuation } = useInventoryValuation();
    useInventoryRealtime(); // Live subscription

    const rows = inventory || [];

    const toggleExpand = (id: string) => {
        setExpandedRow((prev) => (prev === id ? null : id));
    };

    const openAdjust = (row: InventoryRow) => {
        setSelectedRow(row);
        setShowAdjustModal(true);
    };

    /* ── Stock progress bar ─────────────────────────────────── */
    const stockBar = (qty: number, max: number, reorder: number) => {
        const pct = Math.min(100, (qty / Math.max(max, 1)) * 100);
        let color = 'bg-green-500';
        if (qty === 0) color = 'bg-red-500';
        else if (qty <= reorder) color = 'bg-orange-500';
        else if (pct < 40) color = 'bg-yellow-500';

        return (
            <div className="flex items-center gap-2">
                <div className="h-2 w-20 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-xs font-semibold ${qty <= reorder ? 'text-orange-600' : qty === 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {qty}
                </span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="rounded-lg bg-blue-100 p-2">
                                <Warehouse className="h-6 w-6 text-blue-600" />
                            </div>
                            Inventory Management
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Real-time stock tracking with Supabase Realtime
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                            </span>
                        </p>
                    </div>
                </div>

                {/* Valuation Cards */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ValuationCard
                        title="Total SKUs"
                        value={valuation?.total_skus ?? '—'}
                        icon={<Package className="h-5 w-5 text-blue-600" />}
                        bgClass="bg-blue-50"
                    />
                    <ValuationCard
                        title="Total Units"
                        value={valuation?.total_units?.toLocaleString() ?? '—'}
                        icon={<BarChart3 className="h-5 w-5 text-emerald-600" />}
                        bgClass="bg-emerald-50"
                    />
                    <ValuationCard
                        title="Total Value (FIFO)"
                        value={valuation ? `₺${valuation.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        icon={<DollarSign className="h-5 w-5 text-amber-600" />}
                        bgClass="bg-amber-50"
                    />
                    <ValuationCard
                        title="Last Updated"
                        value={valuation ? format(new Date(valuation.last_updated), 'HH:mm:ss') : '—'}
                        icon={<Clock className="h-5 w-5 text-slate-600" />}
                        bgClass="bg-slate-100"
                    />
                </div>

                {/* Quick Filters */}
                <div className="mt-6 flex items-center gap-2">
                    {([
                        { key: 'all', label: 'All', icon: <Package className="h-3.5 w-3.5" /> },
                        { key: 'low_stock', label: 'Low Stock', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
                        { key: 'expiring_soon', label: 'Expiring Soon', icon: <Clock className="h-3.5 w-3.5" /> },
                        { key: 'expired', label: 'Expired', icon: <Shield className="h-3.5 w-3.5" /> },
                    ] as { key: FilterType; label: string; icon: React.ReactNode }[]).map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${filter === f.key
                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-8 px-4 py-3" />
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Available Qty</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Batches</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Earliest Expiry</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Last Received</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Stock Value</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
                                            <p className="mt-2 text-sm text-slate-500">Loading inventory…</p>
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center">
                                            <Warehouse className="mx-auto h-8 w-8 text-slate-300" />
                                            <p className="mt-2 text-sm text-slate-500">No inventory records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => {
                                        const isExpanded = expandedRow === row.id;
                                        const earliest = earliestExpiry(row.batches);
                                        const activeBatches = row.batches.filter((b) => b.is_active);
                                        const rowValue = activeBatches.reduce(
                                            (sum, b) => sum + b.quantity_remaining * Number(b.cost_price), 0,
                                        );

                                        return (
                                            <InventoryTableRow
                                                key={row.id}
                                                row={row}
                                                isExpanded={isExpanded}
                                                onToggle={() => toggleExpand(row.id)}
                                                onAdjust={() => openAdjust(row)}
                                                earliest={earliest}
                                                activeBatchCount={activeBatches.length}
                                                rowValue={rowValue}
                                                stockBar={stockBar}
                                            />
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Stock Adjustment Modal */}
            {selectedRow && (
                <StockAdjustmentModal
                    open={showAdjustModal}
                    onClose={() => { setShowAdjustModal(false); setSelectedRow(null); }}
                    row={selectedRow}
                />
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   VALUATION CARD
   ═══════════════════════════════════════════════════════════════ */

function ValuationCard({ title, value, icon, bgClass }: {
    title: string; value: string | number; icon: React.ReactNode; bgClass: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${bgClass}`}>{icon}</div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">{title}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TABLE ROW (with expandable batches)
   ═══════════════════════════════════════════════════════════════ */

const CATEGORY_VARIANT: Record<string, 'blue' | 'green' | 'red' | 'amber' | 'emerald' | 'orange'> = {
    prescription: 'blue',
    otc: 'green',
    controlled: 'red',
    supplement: 'emerald',
    medical_device: 'amber',
    cosmetic: 'orange',
};

function InventoryTableRow({ row, isExpanded, onToggle, onAdjust, earliest, activeBatchCount, rowValue, stockBar }: {
    row: InventoryRow;
    isExpanded: boolean;
    onToggle: () => void;
    onAdjust: () => void;
    earliest: Batch | null;
    activeBatchCount: number;
    rowValue: number;
    stockBar: (qty: number, max: number, reorder: number) => React.ReactNode;
}) {
    const p = row.product;

    return (
        <>
            <tr className="hover:bg-slate-50 transition-colors group">
                {/* Expand */}
                <td className="px-4 py-3">
                    <button onClick={onToggle} className="text-slate-400 hover:text-blue-600 transition-colors">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                </td>

                {/* Product */}
                <td className="max-w-[250px] px-4 py-3">
                    <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">{p.generic_name || p.sku}</p>
                </td>

                {/* Category */}
                <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={CATEGORY_VARIANT[p.category] || 'slate'}>
                        {p.category.replace('_', ' ')}
                    </Badge>
                </td>

                {/* Available Qty with progress bar */}
                <td className="px-4 py-3">
                    {stockBar(row.quantity_on_hand, p.max_stock_level, p.reorder_point)}
                </td>

                {/* Batches count */}
                <td className="whitespace-nowrap px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {activeBatchCount}
                    </span>
                </td>

                {/* Earliest Expiry */}
                <td className="whitespace-nowrap px-4 py-3">
                    {earliest ? (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${expiryClass(earliest.expiry_date)}`}>
                            {expiryLabel(earliest.expiry_date)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">—</span>
                    )}
                </td>

                {/* Last Received */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {row.last_restocked_at
                        ? format(new Date(row.last_restocked_at), 'dd MMM yyyy')
                        : '—'
                    }
                </td>

                {/* Stock Value */}
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
                    ₺{rowValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>

                {/* Actions */}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                        onClick={onAdjust}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Minus className="mr-1 inline h-3 w-3" />
                        Adjust
                    </button>
                </td>
            </tr>

            {/* Expanded batch rows */}
            {isExpanded && (
                <tr>
                    <td colSpan={9} className="bg-slate-50/50 px-4 py-2">
                        <div className="ml-8 rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <table className="min-w-full text-xs divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Batch #</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Expiry Date</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Qty</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Purchase Price</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Sell Price</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {row.batches.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-4 text-center text-slate-400">No batches</td>
                                        </tr>
                                    ) : (
                                        row.batches
                                            .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
                                            .map((b) => {
                                                const isExpired = new Date(b.expiry_date) < new Date();
                                                return (
                                                    <tr key={b.id} className={isExpired ? 'bg-red-50' : ''}>
                                                        <td className="px-3 py-1.5 font-medium text-slate-900">{b.batch_number}</td>
                                                        <td className="px-3 py-1.5">
                                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${expiryClass(b.expiry_date)}`}>
                                                                {expiryLabel(b.expiry_date)}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-medium">{b.quantity_remaining}</td>
                                                        <td className="px-3 py-1.5 text-right">₺{Number(b.cost_price).toFixed(2)}</td>
                                                        <td className="px-3 py-1.5 text-right">₺{Number(b.selling_price).toFixed(2)}</td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <Badge variant={b.is_active ? (isExpired ? 'red' : 'green') : 'slate'} dot>
                                                                {isExpired ? 'Expired' : b.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STOCK ADJUSTMENT MODAL
   ═══════════════════════════════════════════════════════════════ */

function StockAdjustmentModal({ open, onClose, row }: {
    open: boolean;
    onClose: () => void;
    row: InventoryRow;
}) {
    const { profile } = useAuth();
    const adjustMutation = useStockAdjustment();

    const [adjustType, setAdjustType] = useState<AdjustmentType>('correction');
    const [batchId, setBatchId] = useState<string>('');
    const [quantity, setQuantity] = useState(0);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const activeBatches = row.batches.filter((b) => b.is_active);
    const needsApproval = quantity > 50;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantity <= 0) { toast.error('Quantity must be positive'); return; }
        if (!reason.trim()) { toast.error('Reason is required'); return; }
        if (!profile) { toast.error('Not authenticated'); return; }

        setSubmitting(true);
        try {
            const result = await adjustMutation.mutateAsync({
                product_id: row.product_id,
                batch_id: batchId || null,
                branch_id: row.branch_id,
                adjustment_type: adjustType,
                quantity,
                reason,
                adjusted_by: profile.id,
            });

            if (result.status === 'pending_approval') {
                toast.success('Adjustment submitted for admin approval (>50 units)', { duration: 5000 });
            } else {
                toast.success(`Stock adjusted: ${result.quantity_before} → ${result.quantity_after}`);
            }
            onClose();
        } catch (err) {
            toast.error((err as Error).message);
        }
        setSubmitting(false);
    };

    return (
        <Modal open={open} onClose={onClose} title={`Adjust: ${row.product.name}`} maxWidth="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current stock */}
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="text-slate-500">Current stock:</span>
                    <span className="ml-2 font-bold text-slate-900">{row.quantity_on_hand} units</span>
                </div>

                {/* Batch selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Batch (optional)</label>
                    <select
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All batches (general adjustment)</option>
                        {activeBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.batch_number} — {b.quantity_remaining} units — Exp: {format(new Date(b.expiry_date), 'dd MMM yyyy')}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Adjustment type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Adjustment Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        {ADJUSTMENT_TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => setAdjustType(t.value)}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${adjustType === t.value
                                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Quantity</label>
                    <input
                        type="number"
                        min={1}
                        value={quantity || ''}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter quantity"
                    />
                    {needsApproval && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Adjustments &gt;50 units require admin approval
                        </p>
                    )}
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Reason *</label>
                    <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Reason for adjustment (required)"
                        required
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || quantity <= 0 || !reason.trim()}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {needsApproval ? 'Submit for Approval' : 'Apply Adjustment'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
