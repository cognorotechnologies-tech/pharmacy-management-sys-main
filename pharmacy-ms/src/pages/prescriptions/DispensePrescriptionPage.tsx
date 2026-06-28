import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Check, AlertTriangle, Package,
    Hash, ShieldAlert, Printer,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import {
    usePrescription, useBatchesForDispensing, useDispensePrescription,
    type DispenseItemInput,
} from '@/hooks/usePrescriptions';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

/* ─── Types ───────────────────────────────────────────────── */

interface DispenseRow {
    item_id: string;
    product_id: string;
    product_name: string;
    generic_name: string | null;
    strength: string | null;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    quantity_prescribed: number;
    quantity_dispensed: number;
    remaining: number;
    is_controlled: boolean;
    unit: string | null;
    selected_batch_id: string;
    qty_to_dispense: number;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function DispensePrescriptionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, branchId, profile } = useAuth();
    const { data: rx, isLoading } = usePrescription(id || null);
    const dispenseMutation = useDispensePrescription();

    /* ─── Dispense rows ──────────────────────────────── */
    const rows = useMemo<DispenseRow[]>(() => {
        if (!rx?.items) return [];
        return rx.items.map((item) => ({
            item_id: item.id,
            product_id: item.product_id,
            product_name: item.product?.name || 'Unknown',
            generic_name: item.product?.generic_name || null,
            strength: item.product?.strength || null,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            quantity_prescribed: item.quantity_prescribed,
            quantity_dispensed: item.quantity_dispensed,
            remaining: item.quantity_prescribed - item.quantity_dispensed,
            is_controlled: item.product?.is_controlled || false,
            unit: item.product?.unit || null,
            selected_batch_id: '',
            qty_to_dispense: item.quantity_prescribed - item.quantity_dispensed,
        }));
    }, [rx]);

    const [dispenseState, setDispenseState] = useState<Record<string, { batch_id: string; qty: number }>>({});

    const getState = (itemId: string, row: DispenseRow) =>
        dispenseState[itemId] || { batch_id: '', qty: row.remaining };

    const updateState = (itemId: string, patch: Partial<{ batch_id: string; qty: number }>) => {
        setDispenseState((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId] || { batch_id: '', qty: 0 }, ...patch },
        }));
    };

    /* ─── Controlled substance modal ─────────────────── */
    const [csModal, setCsModal] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });
    const [csLicense, setCsLicense] = useState('');
    const [csQtyConfirm, setCsQtyConfirm] = useState('');
    const [csConfirmed, setCsConfirmed] = useState(false);

    /* ─── Show label after dispensing ─────────────────── */
    const [dispensedResult, setDispensedResult] = useState<any>(null);

    /* ─── Check readiness ────────────────────────────── */
    const itemsToDispense = rows.filter((r) => r.remaining > 0);
    const canDispense = itemsToDispense.every((r) => {
        const s = getState(r.item_id, r);
        return s.batch_id && s.qty > 0 && s.qty <= r.remaining;
    });

    /* ─── Dispense handler ───────────────────────────── */
    const handleDispense = async () => {
        if (!rx || !user || !branchId) return;

        // Check controlled substances need confirmation
        const controlledItems = itemsToDispense.filter((r) => r.is_controlled);
        if (controlledItems.length > 0) {
            const firstUnconfirmed = controlledItems.find(() => !csConfirmed);
            if (firstUnconfirmed) {
                setCsModal({ open: true, itemId: firstUnconfirmed.item_id });
                return;
            }
        }

        const items: DispenseItemInput[] = itemsToDispense.map((r) => {
            const s = getState(r.item_id, r);
            return {
                item_id: r.item_id,
                batch_id: s.batch_id,
                quantity_dispensed: s.qty,
                ...(r.is_controlled ? { pharmacist_license: csLicense || '' } : {}),
            };
        });

        try {
            const result = await dispenseMutation.mutateAsync({
                prescription_id: rx.id,
                dispensed_by: user.id,
                branch_id: branchId,
                items,
            });
            setDispensedResult(result);
            toast.success(`Prescription ${result.status === 'dispensed' ? 'fully' : 'partially'} dispensed`);
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    /* ─── Controlled substance confirm ───────────────── */
    const handleCsConfirm = () => {
        const row = rows.find((r) => r.item_id === csModal.itemId);
        const s = row ? getState(row.item_id, row) : null;
        if (!csLicense || csQtyConfirm !== String(s?.qty || 0)) {
            toast.error('License and quantity confirmation required');
            return;
        }
        setCsConfirmed(true);
        setCsModal({ open: false, itemId: null });
        // Re-trigger dispense
        setTimeout(handleDispense, 100);
    };

    /* ─── Generate Label PDF ──────────────────────────── */
    const generateLabel = (row: DispenseRow) => {
        const s = getState(row.item_id, row);
        const doc = new jsPDF({ unit: 'mm', format: [100, 60] });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PharmaCare', 5, 6);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd')}`, 5, 11);

        doc.setDrawColor(200);
        doc.line(5, 13, 95, 13);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`Patient: ${rx?.patient?.first_name} ${rx?.patient?.last_name}`, 5, 18);

        doc.setFont('helvetica', 'normal');
        doc.text(`Rx #: ${rx?.prescription_number}`, 5, 23);

        doc.setFont('helvetica', 'bold');
        doc.text(row.product_name, 5, 29);
        doc.setFont('helvetica', 'normal');
        if (row.generic_name) doc.text(`(${row.generic_name} ${row.strength || ''})`, 5, 33);

        doc.text(`Dosage: ${row.dosage}`, 5, 38);
        doc.text(`Take: ${row.frequency} for ${row.duration}`, 5, 42);
        doc.text(`Qty: ${s.qty} ${row.unit || 'units'}`, 5, 46);
        if (row.instructions) doc.text(`Sig: ${row.instructions}`, 5, 50);

        doc.setFontSize(5);
        doc.text(`Pharmacist: ${profile?.full_name || user?.email}`, 5, 56);

        doc.save(`label_${rx?.prescription_number}_${row.product_name.replace(/\s/g, '_')}.pdf`);
        toast.success('Label PDF generated');
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
        );
    }

    if (!rx) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-500">Prescription not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <button onClick={() => navigate('/prescriptions')}
                    className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Queue
                </button>

                {/* ═══ Header ═══ */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                Dispense: {rx.prescription_number}
                                <Badge variant={rx.status === 'dispensed' ? 'green' : rx.status === 'partially_dispensed' ? 'orange' : 'amber'}>
                                    {rx.status.replace('_', ' ')}
                                </Badge>
                            </h1>
                            <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    Patient: <strong className="text-slate-700">{rx.patient?.first_name} {rx.patient?.last_name}</strong>
                                </span>
                                <span>Dr. {rx.prescriber_name}</span>
                                <span>{format(parseISO(rx.date_prescribed), 'MMM d, yyyy')}</span>
                            </div>
                        </div>

                        {rx.patient?.allergies?.length > 0 && (
                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                                <p className="font-semibold flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Allergies</p>
                                {rx.patient.allergies.map((a, i) => <p key={i}>• {a}</p>)}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ Success Result ═══ */}
                {dispensedResult && (
                    <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                        <Check className="mx-auto h-10 w-10 text-green-600 mb-2" />
                        <h2 className="text-lg font-bold text-green-800">
                            {dispensedResult.status === 'dispensed' ? 'Fully Dispensed' : 'Partially Dispensed'}
                        </h2>
                        <p className="text-sm text-green-700">
                            {dispensedResult.total_dispensed} / {dispensedResult.total_prescribed} items dispensed
                        </p>
                        <div className="mt-4 flex justify-center gap-3">
                            <button onClick={() => navigate('/prescriptions')}
                                className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100">
                                Return to Queue
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══ Line Items ═══ */}
                {!dispensedResult && (
                    <>
                        <div className="space-y-4">
                            {rows.map((row) => (
                                <DispenseItemCard
                                    key={row.item_id}
                                    row={row}
                                    branchId={branchId || ''}
                                    state={getState(row.item_id, row)}
                                    onStateChange={(patch) => updateState(row.item_id, patch)}
                                    onPrintLabel={() => generateLabel(row)}
                                />
                            ))}
                        </div>

                        {itemsToDispense.length > 0 && (
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => navigate('/prescriptions')}
                                    className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDispense}
                                    disabled={!canDispense || dispenseMutation.isPending}
                                    className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                >
                                    {dispenseMutation.isPending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Check className="h-4 w-4" />}
                                    Dispense {itemsToDispense.length} Item{itemsToDispense.length !== 1 ? 's' : ''}
                                </button>
                            </div>
                        )}

                        {itemsToDispense.length === 0 && (
                            <div className="mt-6 text-center py-8 text-sm text-slate-400">
                                All items have been fully dispensed
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ═══ Controlled Substance Modal ═══ */}
            <Modal open={csModal.open} onClose={() => setCsModal({ open: false, itemId: null })} title="🔒 Controlled Substance Verification">
                <div className="space-y-4">
                    {(() => {
                        const row = rows.find((r) => r.item_id === csModal.itemId);
                        const s = row ? getState(row.item_id, row) : null;
                        return row ? (
                            <>
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                                    <p className="text-sm font-semibold text-red-800">
                                        <AlertTriangle className="inline h-4 w-4 mr-1" />
                                        {row.product_name} is a controlled substance
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">
                                        This requires pharmacist license verification and double-confirmed quantity.
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Pharmacist License Number *</label>
                                    <input value={csLicense} onChange={(e) => setCsLicense(e.target.value)}
                                        placeholder="Enter your license number"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">
                                        Confirm Quantity (enter "{s?.qty}" to confirm) *
                                    </label>
                                    <input value={csQtyConfirm} onChange={(e) => setCsQtyConfirm(e.target.value)}
                                        placeholder={`Type ${s?.qty} to confirm`}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setCsModal({ open: false, itemId: null })}
                                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                                        Cancel
                                    </button>
                                    <button onClick={handleCsConfirm}
                                        disabled={!csLicense || csQtyConfirm !== String(s?.qty || 0)}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                                        Confirm & Dispense
                                    </button>
                                </div>
                            </>
                        ) : null;
                    })()}
                </div>
            </Modal>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   DISPENSE ITEM CARD
   ═══════════════════════════════════════════════════════════════ */

function DispenseItemCard({
    row, branchId, state, onStateChange, onPrintLabel,
}: {
    row: DispenseRow;
    branchId: string;
    state: { batch_id: string; qty: number };
    onStateChange: (patch: Partial<{ batch_id: string; qty: number }>) => void;
    onPrintLabel: () => void;
}) {
    const { data: batches, isLoading } = useBatchesForDispensing(row.product_id, branchId);
    const isFilled = row.remaining <= 0;

    return (
        <div className={`rounded-xl border bg-white shadow-sm overflow-hidden ${isFilled ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                    <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                        {row.product_name}
                        {row.is_controlled && <Badge variant="red">Controlled</Badge>}
                        {isFilled && <Badge variant="green">Filled</Badge>}
                    </p>
                    {row.generic_name && (
                        <p className="text-xs text-slate-400">{row.generic_name} {row.strength}</p>
                    )}
                </div>
                <div className="text-right text-xs text-slate-500">
                    <p>Prescribed: <strong>{row.quantity_prescribed}</strong></p>
                    <p>Dispensed: <strong>{row.quantity_dispensed}</strong></p>
                    <p>Remaining: <strong className={row.remaining > 0 ? 'text-amber-600' : 'text-green-600'}>{row.remaining}</strong></p>
                </div>
            </div>

            {/* Directions */}
            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600">
                <span className="font-medium">Sig:</span> {row.dosage} · {row.frequency} · {row.duration}
                {row.instructions && <span> · {row.instructions}</span>}
            </div>

            {/* Batch selector + qty (only if not fully filled) */}
            {!isFilled && (
                <div className="px-6 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Batch selector */}
                        <div className="col-span-2">
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                <Package className="inline h-3 w-3 mr-0.5" /> Batch (FEFO)
                            </label>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                            ) : (
                                <select
                                    value={state.batch_id}
                                    onChange={(e) => onStateChange({ batch_id: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                                >
                                    <option value="">Select batch...</option>
                                    {(batches || []).map((b) => {
                                        const daysToExpiry = differenceInDays(parseISO(b.expiry_date), new Date());
                                        return (
                                            <option key={b.id} value={b.id}>
                                                {b.batch_number} · Exp: {format(parseISO(b.expiry_date), 'MMM yyyy')}
                                                {daysToExpiry < 90 ? ' ⚠️' : ''} · Qty: {b.quantity_remaining}
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                <Hash className="inline h-3 w-3 mr-0.5" /> Qty
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={row.remaining}
                                value={state.qty || row.remaining}
                                onChange={(e) => onStateChange({ qty: parseInt(e.target.value) || 0 })}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Print label button */}
                    {state.batch_id && (
                        <button onClick={onPrintLabel}
                            className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium">
                            <Printer className="h-3.5 w-3.5" /> Print Label
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
