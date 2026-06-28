import { useState } from 'react';
import { format } from 'date-fns';
import {
    Truck, Plus, Star, Phone, Mail, MapPin, Loader2,
    Edit, Eye, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
    useSuppliers, useCreateSupplier, useUpdateSupplier, useSupplierStats,
} from '@/hooks/useSuppliers';
import type { Supplier, SupplierInsert } from '@/types/database';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { SlideOver } from '@/components/ui/SlideOver';

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function SuppliersPage() {
    const { data: suppliers, isLoading } = useSuppliers();
    const [showForm, setShowForm] = useState(false);
    const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);

    const rows = suppliers || [];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="rounded-lg bg-indigo-100 p-2">
                                <Truck className="h-6 w-6 text-indigo-600" />
                            </div>
                            Suppliers
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">{rows.length} suppliers registered</p>
                    </div>
                    <button
                        onClick={() => { setEditSupplier(null); setShowForm(true); }}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" /> Add Supplier
                    </button>
                </div>

                {/* Table */}
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Rating</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Terms</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Lead Days</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" /></td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">No suppliers yet</td></tr>
                                ) : (
                                    rows.map((s) => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm">
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{s.name}</p>
                                                        {s.contact_person && <p className="text-xs text-slate-500">{s.contact_person}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <StarRating rating={Number(s.rating) || 0} />
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{s.payment_terms || '—'}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-slate-700">
                                                {s.lead_time_days !== null ? `${s.lead_time_days}d` : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                                                    {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                                                    {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={s.is_active ? 'green' : 'slate'} dot>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setDetailId(s.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => { setEditSupplier(s); setShowForm(true); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <SupplierFormModal
                open={showForm}
                onClose={() => { setShowForm(false); setEditSupplier(null); }}
                supplier={editSupplier}
            />

            {/* Detail Slide-Over */}
            <SupplierDetail supplierId={detailId} onClose={() => setDetailId(null)} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   STAR RATING
   ═══════════════════════════════════════════════════════════════ */

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                />
            ))}
            <span className="ml-1 text-xs font-medium text-slate-600">{rating.toFixed(1)}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SUPPLIER FORM MODAL
   ═══════════════════════════════════════════════════════════════ */

function SupplierFormModal({ open, onClose, supplier }: { open: boolean; onClose: () => void; supplier: Supplier | null }) {
    const createMut = useCreateSupplier();
    const updateMut = useUpdateSupplier();
    const isEdit = !!supplier;

    const [form, setForm] = useState<Partial<SupplierInsert>>({});

    // Reset form when modal opens
    const formData = isEdit
        ? { ...supplier, ...form }
        : { name: '', phone: '', is_active: true, ...form };

    const set = (key: string, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await updateMut.mutateAsync({ id: supplier!.id, ...form });
                toast.success('Supplier updated');
            } else {
                await createMut.mutateAsync(formData as SupplierInsert);
                toast.success('Supplier created');
            }
            setForm({});
            onClose();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Supplier' : 'Add Supplier'} maxWidth="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <Field label="Company Name *" value={formData.name || ''} onChange={(v) => set('name', v)} required />
                <Field label="Contact Person" value={formData.contact_person || ''} onChange={(v) => set('contact_person', v)} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone *" value={formData.phone || ''} onChange={(v) => set('phone', v)} required />
                    <Field label="Email" value={formData.email || ''} onChange={(v) => set('email', v)} type="email" />
                </div>
                <Field label="Address" value={formData.address || ''} onChange={(v) => set('address', v)} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={formData.city || ''} onChange={(v) => set('city', v)} />
                    <Field label="State" value={formData.state || ''} onChange={(v) => set('state', v)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Tax ID" value={formData.tax_id || ''} onChange={(v) => set('tax_id', v)} />
                    <Field label="Payment Terms" value={formData.payment_terms || ''} onChange={(v) => set('payment_terms', v)} placeholder="Net 30" />
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Lead Days</label>
                        <input type="number" min={0} value={formData.lead_time_days ?? ''} onChange={(e) => set('lead_time_days', e.target.value ? Number(e.target.value) : null)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Rating</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} type="button" onClick={() => set('rating', n)}
                                className="p-0.5">
                                <Star className={`h-5 w-5 ${n <= (Number(formData.rating) || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function Field({ label, value, onChange, required, type = 'text', placeholder }: {
    label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SUPPLIER DETAIL SLIDE-OVER
   ═══════════════════════════════════════════════════════════════ */

function SupplierDetail({ supplierId, onClose }: { supplierId: string | null; onClose: () => void }) {
    const { data: stats } = useSupplierStats(supplierId);

    // We need the supplier data itself — reuse from list cache
    const { data: suppliers } = useSuppliers();
    const supplier = suppliers?.find((s) => s.id === supplierId);

    if (!supplier) return <SlideOver open={!!supplierId} onClose={onClose} title="Supplier Detail"><div /></SlideOver>;

    const STATUS_COLOR: Record<string, 'slate' | 'blue' | 'green' | 'red' | 'orange'> = {
        draft: 'slate', submitted: 'blue', confirmed: 'blue', partially_received: 'orange',
        received: 'green', cancelled: 'red',
    };

    return (
        <SlideOver open={!!supplierId} onClose={onClose} title={supplier.name} width="max-w-xl">
            <div className="space-y-6">
                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoItem icon={<Building2 className="h-4 w-4" />} label="Company" value={supplier.name} />
                    <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={supplier.phone} />
                    <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={supplier.email || '—'} />
                    <InfoItem icon={<MapPin className="h-4 w-4" />} label="Location" value={[supplier.city, supplier.state].filter(Boolean).join(', ') || '—'} />
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard label="Total Orders" value={stats.total_orders} />
                        <StatCard label="Total Spend" value={`₺${stats.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                        <StatCard label="Last Order" value={stats.last_order_date ? format(new Date(stats.last_order_date), 'dd MMM yy') : '—'} />
                    </div>
                )}

                {/* Order History */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Order History</h3>
                    <div className="space-y-2">
                        {stats?.orders.map((o) => (
                            <div key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <div>
                                    <span className="font-medium text-slate-900">{o.order_number}</span>
                                    <span className="ml-2 text-xs text-slate-500">{format(new Date(o.order_date), 'dd MMM yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={STATUS_COLOR[o.status] || 'slate'}>{o.status.replace('_', ' ')}</Badge>
                                    <span className="font-medium text-slate-900">₺{Number(o.total_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                        {(!stats || stats.orders.length === 0) && (
                            <p className="text-sm text-slate-400">No orders yet</p>
                        )}
                    </div>
                </div>
            </div>
        </SlideOver>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-0.5 text-slate-400">{icon}</div>
            <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-medium text-slate-900">{value}</p>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
    );
}
