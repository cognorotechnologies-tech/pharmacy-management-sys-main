import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
    ArrowLeft, Truck, Loader2, Check, AlertTriangle,
    Package, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
    usePurchaseOrder, useReceiveDelivery,
    type ReceiveItemInput,
} from '@/hooks/usePurchaseOrders';
import { Badge } from '@/components/ui/Badge';

/* ─── Per-row receive state ────────────────────────────────── */

interface ReceiveRow {
    po_item_id: string;
    product_name: string;
    qty_ordered: number;
    qty_already_received: number;
    qty_remaining: number;
    qty_to_receive: number;
    batch_number: string;
    expiry_date: string;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function ReceiveDeliveryPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: po, isLoading } = usePurchaseOrder(id || null);
    const receiveDelivery = useReceiveDelivery();

    /* Build editable rows from PO items */
    const [rows, setRows] = useState<ReceiveRow[]>([]);
    const [initialized, setInitialized] = useState(false);

    if (po && !initialized) {
        setRows(
            po.items.map((item) => {
                const remaining = item.quantity_ordered - item.quantity_received;
                return {
                    po_item_id: item.id,
                    product_name: item.product.name,
                    qty_ordered: item.quantity_ordered,
                    qty_already_received: item.quantity_received,
                    qty_remaining: remaining,
                    qty_to_receive: remaining,
                    batch_number: item.batch_number || '',
                    expiry_date: item.expiry_date || '',
                };
            }),
        );
        setInitialized(true);
    }

    /* ─── Validation ─────────────────────────────────────────── */

    const activeRows = useMemo(() => rows.filter((r) => r.qty_to_receive > 0), [rows]);

    const hasErrors = useMemo(() => {
        return activeRows.some((r) =>
            r.qty_to_receive > r.qty_remaining ||
            r.qty_to_receive < 0 ||
            !r.batch_number.trim() ||
            !r.expiry_date,
        );
    }, [activeRows]);

    const canSubmit = activeRows.length > 0 && !hasErrors && !receiveDelivery.isPending;

    /* ─── Handlers ───────────────────────────────────────────── */

    const updateRow = (idx: number, field: keyof ReceiveRow, value: string | number) => {
        setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    const handleSubmit = useCallback(async () => {
        if (!id || !canSubmit) return;

        const payload: ReceiveItemInput[] = activeRows.map((r) => ({
            po_item_id: r.po_item_id,
            received_qty: r.qty_to_receive,
            batch_number: r.batch_number.trim(),
            expiry_date: r.expiry_date,
        }));

        try {
            const result = await receiveDelivery.mutateAsync({ po_id: id, items: payload });
            const msg = result.status === 'received'
                ? 'All items received! PO marked as completed.'
                : `Partial delivery recorded. ${result.total_received}/${result.total_ordered} items received.`;
            toast.success(msg);
            navigate('/purchasing/orders');
        } catch (err) {
            toast.error((err as Error).message);
        }
    }, [id, canSubmit, activeRows, receiveDelivery, navigate]);

    /* ─── Loading / Not found ────────────────────────────────── */

    if (isLoading || !po) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    const totalReceiving = activeRows.reduce((s, r) => s + r.qty_to_receive, 0);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Back */}
                <button
                    onClick={() => navigate('/purchasing/orders')}
                    className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Purchase Orders
                </button>

                {/* ─── Header ────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="rounded-lg bg-green-100 p-2">
                                <Truck className="h-6 w-6 text-green-600" />
                            </div>
                            Receive Delivery
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {po.order_number} • {po.supplier.name}
                        </p>
                    </div>
                    <Badge variant="blue" dot>{po.status.replace('_', ' ')}</Badge>
                </div>

                {/* ─── PO Summary ────────────────────────────────────── */}
                <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
                    <SummaryCell icon={<Package className="h-4 w-4 text-slate-400" />} label="Items" value={`${po.items.length} lines`} />
                    <SummaryCell icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Order Date" value={format(new Date(po.order_date), 'dd MMM yyyy')} />
                    <SummaryCell icon={<Calendar className="h-4 w-4 text-teal-500" />} label="Expected" value={po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd MMM yyyy') : '—'} />
                    <SummaryCell icon={<Truck className="h-4 w-4 text-green-500" />} label="Receiving Now" value={`${totalReceiving} units`} />
                </div>

                {/* ─── Rows table ────────────────────────────────────── */}
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-500">Ordered</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-500">Already Rcvd</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-500">Remaining</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-500 w-24">Receive Now</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-500">Batch #</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-500">Expiry Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, idx) => {
                                    const overReceive = row.qty_to_receive > row.qty_remaining;
                                    const missingBatch = row.qty_to_receive > 0 && !row.batch_number.trim();
                                    const missingExpiry = row.qty_to_receive > 0 && !row.expiry_date;

                                    return (
                                        <tr key={row.po_item_id} className={row.qty_remaining === 0 ? 'bg-green-50 opacity-60' : ''}>
                                            <td className="px-3 py-2.5 font-medium text-slate-900">{row.product_name}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-600">{row.qty_ordered}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-600">{row.qty_already_received}</td>
                                            <td className="px-3 py-2.5 text-right font-medium text-slate-900">{row.qty_remaining}</td>
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={row.qty_remaining}
                                                    value={row.qty_to_receive}
                                                    onChange={(e) => updateRow(idx, 'qty_to_receive', Math.max(0, parseInt(e.target.value) || 0))}
                                                    disabled={row.qty_remaining === 0}
                                                    className={`w-full rounded border px-2 py-1 text-right text-sm focus:outline-none ${overReceive
                                                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                                                            : 'border-slate-200 focus:border-teal-400'
                                                        } disabled:bg-slate-100 disabled:text-slate-400`}
                                                />
                                                {overReceive && (
                                                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-red-500">
                                                        <AlertTriangle className="h-3 w-3" /> Over-receive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <input
                                                    value={row.batch_number}
                                                    onChange={(e) => updateRow(idx, 'batch_number', e.target.value)}
                                                    placeholder="e.g. BN-20260301"
                                                    disabled={row.qty_remaining === 0}
                                                    className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${missingBatch
                                                            ? 'border-amber-400 bg-amber-50'
                                                            : 'border-slate-200 focus:border-teal-400'
                                                        } disabled:bg-slate-100`}
                                                />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="date"
                                                    value={row.expiry_date}
                                                    onChange={(e) => updateRow(idx, 'expiry_date', e.target.value)}
                                                    disabled={row.qty_remaining === 0}
                                                    className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${missingExpiry
                                                            ? 'border-amber-400 bg-amber-50'
                                                            : 'border-slate-200 focus:border-teal-400'
                                                        } disabled:bg-slate-100`}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ─── Warnings ──────────────────────────────────────── */}
                {activeRows.length > 0 && activeRows.length < rows.filter(r => r.qty_remaining > 0).length && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Partial delivery: only {activeRows.length} of {rows.filter(r => r.qty_remaining > 0).length} items will be received. The PO will be marked as <strong>partially received</strong>.</span>
                    </div>
                )}

                {/* ─── Submit ────────────────────────────────────────── */}
                <div className="mt-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/purchasing/orders')}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" /> Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-40"
                    >
                        {receiveDelivery.isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                        ) : (
                            <><Check className="h-4 w-4" /> Confirm Receive ({totalReceiving} units)</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Summary Cell helper ──────────────────────────────────── */

function SummaryCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            {icon}
            <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-medium text-slate-900">{value}</p>
            </div>
        </div>
    );
}
