import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    ClipboardList, Plus, Filter, Loader2, Eye, Download,
    Truck, FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
    usePurchaseOrders, usePurchaseOrder, useUpdatePOStatus,
    type POFilters,
} from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { POStatus, PurchaseOrder, Supplier } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { SlideOver } from '@/components/ui/SlideOver';

/* ═══════════════════════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════════════════ */

const STATUS_BADGE: Record<POStatus, { variant: 'slate' | 'blue' | 'green' | 'red' | 'amber' | 'orange' | 'emerald'; label: string }> = {
    draft: { variant: 'slate', label: 'Draft' },
    submitted: { variant: 'blue', label: 'Submitted' },
    confirmed: { variant: 'blue', label: 'Confirmed' },
    approved: { variant: 'blue', label: 'Approved' },
    partially_received: { variant: 'orange', label: 'Partial' },
    received: { variant: 'green', label: 'Received' },
    cancelled: { variant: 'red', label: 'Cancelled' },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PurchaseOrdersPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<POFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const [detailId, setDetailId] = useState<string | null>(null);

    const { data: orders, isLoading } = usePurchaseOrders(filters);
    const { data: suppliers } = useSuppliers();
    const rows = orders || [];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="rounded-lg bg-teal-100 p-2">
                                <ClipboardList className="h-6 w-6 text-teal-600" />
                            </div>
                            Purchase Orders
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">{rows.length} orders</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${showFilters ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Filter className="h-4 w-4" /> Filters
                        </button>
                        <button
                            onClick={() => navigate('/purchasing/orders/new')}
                            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
                        >
                            <Plus className="h-4 w-4" /> New PO
                        </button>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                        {/* Status */}
                        <select
                            value={filters.status || ''}
                            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as POStatus | undefined }))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All statuses</option>
                            {Object.entries(STATUS_BADGE).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>

                        {/* Supplier */}
                        <select
                            value={filters.supplier_id || ''}
                            onChange={(e) => setFilters((f) => ({ ...f, supplier_id: e.target.value || undefined }))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                            <option value="">All suppliers</option>
                            {(suppliers || []).map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {/* Date range */}
                        <div className="flex items-center gap-2">
                            <input type="date" value={filters.date_from || ''} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined }))}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                            <span className="text-xs text-slate-400">to</span>
                            <input type="date" value={filters.date_to || ''} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined }))}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                        </div>

                        <button
                            onClick={() => setFilters({})}
                            className="text-xs text-slate-500 hover:text-slate-700 underline"
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">PO #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Order Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Expected</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-500" /></td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">No purchase orders found</td></tr>
                                ) : (
                                    rows.map((po) => {
                                        const badge = STATUS_BADGE[(po.status as POStatus)] || STATUS_BADGE.draft;
                                        const sup = po.supplier as Pick<Supplier, 'id' | 'name' | 'rating'>;
                                        return (
                                            <tr key={po.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{po.order_number}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{sup.name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant={badge.variant} dot>{badge.label}</Badge>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{format(new Date(po.order_date), 'dd MMM yyyy')}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                                                    {po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd MMM yyyy') : '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">₺{Number(po.total_amount).toFixed(2)}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setDetailId(po.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="View">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        {(po.status === 'confirmed' || po.status === 'approved') && (
                                                            <button onClick={() => navigate(`/purchasing/orders/${po.id}/receive`)}
                                                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-green-600" title="Receive">
                                                                <Truck className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PO Detail Slide-Over */}
            <PODetailSlideOver poId={detailId} onClose={() => setDetailId(null)} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PO DETAIL SLIDE-OVER
   ═══════════════════════════════════════════════════════════════ */

function PODetailSlideOver({ poId, onClose }: { poId: string | null; onClose: () => void }) {
    const { data: po, isLoading } = usePurchaseOrder(poId);
    const updateStatus = useUpdatePOStatus();
    const navigate = useNavigate();

    const handlePrint = () => {
        if (!po) return;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Purchase Order: ${po.order_number}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Supplier: ${po.supplier.name}`, 14, 28);
        doc.text(`Date: ${format(new Date(po.order_date), 'dd MMM yyyy')}`, 14, 34);
        doc.text(`Status: ${po.status}`, 14, 40);
        if (po.expected_delivery_date) {
            doc.text(`Expected: ${format(new Date(po.expected_delivery_date), 'dd MMM yyyy')}`, 14, 46);
        }

        autoTable(doc, {
            startY: 55,
            head: [['Product', 'Qty Ordered', 'Qty Received', 'Unit Cost', 'Total']],
            body: po.items.map((i) => [
                i.product.name,
                i.quantity_ordered.toString(),
                i.quantity_received.toString(),
                `₺${Number(i.unit_cost).toFixed(2)}`,
                `₺${Number(i.total_cost).toFixed(2)}`,
            ]),
            foot: [['', '', '', 'Total:', `₺${Number(po.total_amount).toFixed(2)}`]],
        });

        doc.save(`${po.order_number}.pdf`);
    };

    const canSubmit = po?.status === 'draft';
    const canCancel = po?.status === 'draft' || po?.status === 'submitted';
    const canReceive = po?.status === 'confirmed' || po?.status === 'approved';

    return (
        <SlideOver open={!!poId} onClose={onClose} title={po?.order_number || 'Purchase Order'} width="max-w-2xl">
            {isLoading || !po ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-500">Supplier:</span> <span className="font-medium">{po.supplier.name}</span></div>
                        <div><span className="text-slate-500">Status:</span> <Badge variant={STATUS_BADGE[(po.status as POStatus)]?.variant || 'slate'} dot>{po.status.replace('_', ' ')}</Badge></div>
                        <div><span className="text-slate-500">Order Date:</span> <span className="font-medium">{format(new Date(po.order_date), 'dd MMM yyyy')}</span></div>
                        <div><span className="text-slate-500">Expected:</span> <span className="font-medium">{po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'dd MMM yyyy') : '—'}</span></div>
                        {po.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span>{po.notes}</span></div>}
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-2">Line Items</h3>
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="min-w-full text-xs divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Product</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Ordered</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Received</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Unit Cost</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {po.items.map((i) => (
                                        <tr key={i.id}>
                                            <td className="px-3 py-1.5 font-medium text-slate-900">{i.product.name}</td>
                                            <td className="px-3 py-1.5 text-right">{i.quantity_ordered}</td>
                                            <td className="px-3 py-1.5 text-right">{i.quantity_received}</td>
                                            <td className="px-3 py-1.5 text-right">₺{Number(i.unit_cost).toFixed(2)}</td>
                                            <td className="px-3 py-1.5 text-right font-medium">₺{Number(i.total_cost).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 text-right text-sm font-bold text-slate-900">Total: ₺{Number(po.total_amount).toFixed(2)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                        <button onClick={handlePrint}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <Download className="h-4 w-4" /> PDF
                        </button>
                        {canSubmit && (
                            <button onClick={async () => { await updateStatus.mutateAsync({ id: po.id, status: 'submitted' }); }}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                                <FileText className="h-4 w-4" /> Submit
                            </button>
                        )}
                        {canReceive && (
                            <button onClick={() => { onClose(); navigate(`/purchasing/orders/${po.id}/receive`); }}
                                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                                <Truck className="h-4 w-4" /> Receive
                            </button>
                        )}
                        {canCancel && (
                            <button onClick={async () => { await updateStatus.mutateAsync({ id: po.id, status: 'cancelled' }); }}
                                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                Cancel PO
                            </button>
                        )}
                    </div>
                </div>
            )}
        </SlideOver>
    );
}
