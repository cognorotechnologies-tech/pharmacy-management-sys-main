import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Loader2, AlertTriangle, Phone,
    ChevronRight, User,
} from 'lucide-react';
import { differenceInYears, format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { usePatients, useCreatePatient } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PatientsPage() {
    const navigate = useNavigate();
    const { role } = useAuth();

    /* ─── Search state with 300ms debounce ─────────────────── */
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: patients, isLoading } = usePatients(debouncedSearch);

    /* ─── Quick Add modal ──────────────────────────────────── */
    const [showAdd, setShowAdd] = useState(false);

    /* ─── Role-based visibility ────────────────────────────── */
    const isClinical = role === 'super_admin' || role === 'admin' || role === 'pharmacist';

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {patients?.length ?? 0} patient{(patients?.length ?? 0) !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Quick Add Patient
                    </button>
                </div>

                {/* Search bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, phone, or date of birth..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                    </div>
                ) : !patients || patients.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
                        <User className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm text-slate-400">
                            {search ? 'No patients match your search' : 'No patients yet'}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">DOB / Age</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                                    {isClinical && (
                                        <>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Insurance</th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-600">Allergies</th>
                                        </>
                                    )}
                                    <th className="w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {patients.map((p) => {
                                    const age = differenceInYears(new Date(), parseISO(p.date_of_birth));
                                    const allergyCount = p.allergies?.length ?? 0;
                                    const insuranceName = p.insurance_plan?.plan_name;
                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => navigate(`/patients/${p.id}`)}
                                            className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
                                                        {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{p.first_name} {p.last_name}</p>
                                                        {p.gender && <p className="text-xs text-slate-400 capitalize">{p.gender}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-slate-700">{format(parseISO(p.date_of_birth), 'MMM d, yyyy')}</p>
                                                <p className="text-xs text-slate-400">{age} yrs</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1 text-slate-600">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                    {p.phone}
                                                </span>
                                            </td>
                                            {isClinical && (
                                                <>
                                                    <td className="px-4 py-3">
                                                        {insuranceName ? (
                                                            <Badge variant="blue">{insuranceName}</Badge>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {allergyCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                                {allergyCount}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">0</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-2 py-3">
                                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Add Modal */}
            <QuickAddModal open={showAdd} onClose={() => setShowAdd(false)} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK ADD PATIENT MODAL
   ═══════════════════════════════════════════════════════════════ */

function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const create = useCreatePatient();
    const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', date_of_birth: '', gender: 'male' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.first_name || !form.last_name || !form.phone || !form.date_of_birth) {
            toast.error('Please fill in all required fields');
            return;
        }
        try {
            await create.mutateAsync({
                ...form,
                allergies: [],
                medical_conditions: [],
                is_active: true,
            });
            toast.success('Patient created');
            setForm({ first_name: '', last_name: '', phone: '', date_of_birth: '', gender: 'male' });
            onClose();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Quick Add Patient">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">First Name *</label>
                        <input
                            value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                            placeholder="First name"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Last Name *</label>
                        <input
                            value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                            placeholder="Last name"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Phone *</label>
                    <input
                        value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                        placeholder="05XX XXX XXXX"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Date of Birth *</label>
                        <input
                            type="date" value={form.date_of_birth}
                            onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
                        <select
                            value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={create.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add Patient
                    </button>
                </div>
            </form>
        </Modal>
    );
}
