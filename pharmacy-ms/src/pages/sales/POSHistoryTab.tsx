import { useState } from 'react';
import {
    Search, RotateCcw, AlertTriangle, Loader2,
    ChevronRight, Package, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSaleHistory, useSaleDetail, useVoidSale } from '@/hooks/useSales';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

/* ═══════════════════════════════════════════════════════════════
   POS History Tab — Void / Return
   ═══════════════════════════════════════════════════════════════ */

interface Props {
    branchId: string;
    userId: string;
}

export default function POSHistoryTab({ branchId, userId }: Props) {
    const [page, setPage] = useState(1);
    const [searchFilter, setSearchFilter] = useState('');
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const { data: historyData, isLoading } = useSaleHistory(branchId, page);
    const { data: saleDetail, isLoading: loadingDetail } = useSaleDetail(selectedSaleId);
    const voidSale = useVoidSale();

    const filteredSales = (historyData?.sales || []).filter((s) => {
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return s.sale_number.toLowerCase().includes(q)
            || (s.patient_name?.toLowerCase().includes(q));
    });

    const handleVoid = async () => {
        if (!selectedSaleId || !voidReason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        try {
            const partial = selectedItems.size > 0 && saleDetail && selectedItems.size < saleDetail.items.length;
            await voidSale.mutateAsync({
                saleId: selectedSaleId,
                voidedBy: userId,
                reason: voidReason,
                items: partial ? Array.from(selectedItems).map((id) => ({ sale_item_id: id })) : undefined,
            });
            toast.success(partial ? 'Items voided & inventory restored' : 'Sale voided & inventory restored');
            setShowVoidModal(false);
            setSelectedSaleId(null);
            setVoidReason('');
            setSelectedItems(new Set());
        } catch (err) {
            toast.error(`Void failed: ${(err as Error).message}`);
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="green">Completed</Badge>;
            case 'void': return <Badge variant="red">Voided</Badge>;
            case 'refunded': return <Badge variant="amber">Refunded</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="flex h-full">
            {/* ─── Sale List (left) ───────────────────────── */}
            <div className="w-[45%] border-r border-gray-800 flex flex-col">
                {/* Search */}
                <div className="p-3 border-b border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by sale# or patient..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
                    ) : filteredSales.length === 0 ? (
                        <div className="text-center py-12 text-gray-600">
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No sales found</p>
                        </div>
                    ) : (
                        filteredSales.map((sale) => (
                            <button
                                key={sale.id}
                                onClick={() => setSelectedSaleId(sale.id)}
                                className={`w-full px-4 py-3 border-b border-gray-800/50 text-left hover:bg-gray-800/50 transition-colors ${selectedSaleId === sale.id ? 'bg-emerald-900/20 border-l-2 border-l-emerald-500' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{sale.sale_number}</span>
                                    {statusBadge(sale.status)}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {format(new Date(sale.created_at), 'MMM dd, hh:mm a')}
                                    </span>
                                    {sale.patient_name && <span>• {sale.patient_name}</span>}
                                    <span>• {sale.item_count} items</span>
                                </div>
                                <p className="text-emerald-400 font-semibold text-sm mt-1">${sale.total_amount.toFixed(2)}</p>
                            </button>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {historyData && historyData.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">Prev</button>
                        <span>{page} / {historyData.totalPages}</span>
                        <button disabled={page >= historyData.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">Next</button>
                    </div>
                )}
            </div>

            {/* ─── Sale Detail (right) ────────────────────── */}
            <div className="w-[55%] flex flex-col">
                {!selectedSaleId ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600">
                        <ChevronRight className="w-12 h-12 opacity-20 mb-2" />
                        <p className="text-sm">Select a sale to view details</p>
                    </div>
                ) : loadingDetail ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
                ) : saleDetail ? (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm">{saleDetail.sale_number}</h3>
                                <p className="text-xs text-gray-500">{format(new Date(saleDetail.created_at), 'MMM dd, yyyy  hh:mm a')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {statusBadge(saleDetail.status)}
                                {saleDetail.status === 'completed' && (
                                    <button
                                        onClick={() => setShowVoidModal(true)}
                                        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Void / Return
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <table className="w-full text-sm">
                                <thead className="text-gray-500 text-xs">
                                    <tr>
                                        <th className="text-left py-1">Product</th>
                                        <th className="text-center py-1">Qty</th>
                                        <th className="text-right py-1">Price</th>
                                        <th className="text-right py-1">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saleDetail.items.map((item) => (
                                        <tr key={item.id} className="border-t border-gray-800/30">
                                            <td className="py-2 font-medium">{item.product_name}</td>
                                            <td className="text-center py-2 text-gray-400">{item.quantity}</td>
                                            <td className="text-right py-2 text-gray-400">${item.unit_price.toFixed(2)}</td>
                                            <td className="text-right py-2 font-semibold text-emerald-400">${item.total_price.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="px-4 py-3 border-t border-gray-800 space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${saleDetail.subtotal.toFixed(2)}</span></div>
                            {saleDetail.discount_amount > 0 && <div className="flex justify-between text-amber-400"><span>Discount</span><span>-${saleDetail.discount_amount.toFixed(2)}</span></div>}
                            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>${saleDetail.tax_amount.toFixed(2)}</span></div>
                            {saleDetail.insurance_amount > 0 && <div className="flex justify-between text-blue-400"><span>Insurance</span><span>-${saleDetail.insurance_amount.toFixed(2)}</span></div>}
                            <div className="flex justify-between font-bold text-emerald-400 text-base pt-1 border-t border-gray-800"><span>Total</span><span>${saleDetail.total_amount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-xs text-gray-500"><span>Payment</span><span>{saleDetail.payment_method.toUpperCase()}</span></div>
                        </div>
                    </>
                ) : null}
            </div>

            {/* ─── Void Modal ─────────────────────────────── */}
            <Modal open={showVoidModal} onClose={() => { setShowVoidModal(false); setSelectedItems(new Set()); setVoidReason(''); }} title="Void / Return Sale">
                <div className="space-y-4">
                    <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-red-300">This will restore inventory</p>
                            <p className="text-red-400/80 text-xs mt-0.5">Select specific items for a partial return, or leave all unselected for a full void.</p>
                        </div>
                    </div>

                    {/* Item Selection */}
                    {saleDetail && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {saleDetail.items.map((item) => (
                                <label key={item.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(item.id)}
                                        onChange={() => {
                                            const next = new Set(selectedItems);
                                            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                                            setSelectedItems(next);
                                        }}
                                        className="rounded border-gray-600"
                                    />
                                    <span className="flex-1 text-sm">{item.product_name}</span>
                                    <span className="text-xs text-gray-400">×{item.quantity}</span>
                                    <span className="text-sm font-medium text-emerald-400">${item.total_price.toFixed(2)}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Reason (required)</label>
                        <textarea
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="e.g., Customer returned items, wrong product dispensed..."
                            rows={2}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => { setShowVoidModal(false); setSelectedItems(new Set()); setVoidReason(''); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button>
                        <button
                            onClick={handleVoid}
                            disabled={!voidReason.trim() || voidSale.isPending}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            {voidSale.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            {selectedItems.size > 0 ? `Return ${selectedItems.size} Items` : 'Void Entire Sale'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
