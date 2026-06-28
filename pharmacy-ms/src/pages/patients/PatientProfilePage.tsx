import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, AlertTriangle, Shield, Loader2, Pill, ShoppingBag,
    StickyNote, User, X, Plus, Package,
    Phone, Mail, MapPin, Heart, Edit3, Check,
} from 'lucide-react';
import { differenceInYears, format, parseISO, addDays } from 'date-fns';
import toast from 'react-hot-toast';

import {
    usePatient, useUpdatePatient, usePatientPrescriptions,
    usePatientSales, usePatientMedications,
} from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';

/* ─── Constants ───────────────────────────────────────────── */

const ALLERGY_SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    'life-threatening': 'bg-red-100 text-red-700 border-red-200',
};

const TABS = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { key: 'history', label: 'Purchase History', icon: ShoppingBag },
    { key: 'medications', label: 'Medications', icon: Package },
    { key: 'notes', label: 'Notes', icon: StickyNote },
] as const;

type TabKey = typeof TABS[number]['key'];

const RX_STATUS_BADGE: Record<string, { variant: 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'orange'; label: string }> = {
    pending: { variant: 'amber', label: 'Pending' },
    verified: { variant: 'blue', label: 'Verified' },
    dispensed: { variant: 'green', label: 'Dispensed' },
    partially_dispensed: { variant: 'orange', label: 'Partial' },
    cancelled: { variant: 'red', label: 'Cancelled' },
    expired: { variant: 'slate', label: 'Expired' },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PatientProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { role } = useAuth();
    const { data: patient, isLoading } = usePatient(id || null);

    const [tab, setTab] = useState<TabKey>('overview');

    const isClinical = role === 'super_admin' || role === 'admin' || role === 'pharmacist';
    const visibleTabs = isClinical ? TABS : TABS.filter((t) => t.key === 'overview' || t.key === 'history');

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-500">Patient not found</p>
            </div>
        );
    }

    const age = differenceInYears(new Date(), parseISO(patient.date_of_birth));
    const hasAllergies = patient.allergies && patient.allergies.length > 0;
    const insurancePlan = (patient as any).insurance_plan;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Back */}
                <button onClick={() => navigate('/patients')} className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Patients
                </button>

                {/* ─── Header Card ─────────────────────────────────── */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-lg font-bold">
                            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {patient.first_name} {patient.last_name}
                                </h1>
                                <span className="text-sm text-slate-500">{age} yrs · <span className="capitalize">{patient.gender}</span></span>
                                {insurancePlan && (
                                    <Badge variant="blue">
                                        <Shield className="mr-0.5 h-3 w-3" />
                                        {insurancePlan.plan_name}
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{patient.phone}</span>
                                {patient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{patient.email}</span>}
                                {patient.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{patient.city}{patient.state ? `, ${patient.state}` : ''}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Allergy warning banner */}
                    {isClinical && hasAllergies && (
                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-800">
                                    Allergy Alert — {patient.allergies.length} known allerg{patient.allergies.length === 1 ? 'y' : 'ies'}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {patient.allergies.map((a) => (
                                        <span key={a} className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Tabs ────────────────────────────────────────── */}
                <div className="flex gap-1 border-b border-slate-200 mb-6">
                    {visibleTabs.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key
                                    ? 'border-teal-500 text-teal-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* ─── Tab Content ─────────────────────────────────── */}
                {tab === 'overview' && <OverviewTab patient={patient} isClinical={isClinical} />}
                {tab === 'prescriptions' && isClinical && <PrescriptionsTab patientId={patient.id} />}
                {tab === 'history' && <PurchaseHistoryTab patientId={patient.id} />}
                {tab === 'medications' && isClinical && <MedicationsTab patientId={patient.id} />}
                {tab === 'notes' && isClinical && <NotesTab patient={patient} />}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: OVERVIEW — Editable info card + allergy tags
   ═══════════════════════════════════════════════════════════════ */

function OverviewTab({ patient, isClinical }: { patient: any; isClinical: boolean }) {
    const update = useUpdatePatient();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ ...patient });

    const [allergyInput, setAllergyInput] = useState('');
    const [allergySeverity, setAllergySeverity] = useState('medium');

    const handleSave = async () => {
        try {
            await update.mutateAsync({
                id: patient.id,
                first_name: form.first_name,
                last_name: form.last_name,
                phone: form.phone,
                email: form.email || null,
                address: form.address || null,
                city: form.city || null,
                state: form.state || null,
                zip_code: form.zip_code || null,
                emergency_contact_name: form.emergency_contact_name || null,
                emergency_contact_phone: form.emergency_contact_phone || null,
                gender: form.gender,
                date_of_birth: form.date_of_birth,
            });
            toast.success('Patient updated');
            setEditing(false);
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    /* ─── Allergy management ──────────────────────────────── */

    const addAllergy = () => {
        const name = allergyInput.trim();
        if (!name) return;
        const entry = `${name} (${allergySeverity})`;
        if (form.allergies.includes(entry) || form.allergies.some((a: string) => a.toLowerCase().startsWith(name.toLowerCase()))) {
            toast.error('Allergy already exists');
            return;
        }
        const updated = [...form.allergies, entry];
        setForm((f: any) => ({ ...f, allergies: updated }));
        setAllergyInput('');
        // Persist immediately
        update.mutate({ id: patient.id, allergies: updated });
    };

    const removeAllergy = (allergy: string) => {
        const updated = form.allergies.filter((a: string) => a !== allergy);
        setForm((f: any) => ({ ...f, allergies: updated }));
        update.mutate({ id: patient.id, allergies: updated });
    };

    const getAllergySeverity = (a: string): string => {
        const match = a.match(/\((.+)\)$/);
        return match?.[1] || 'medium';
    };

    return (
        <div className="space-y-6">

            {/* Contact Info Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
                    <h3 className="text-sm font-semibold text-slate-700">Contact Information</h3>
                    {editing ? (
                        <div className="flex gap-2">
                            <button onClick={() => { setForm({ ...patient }); setEditing(false); }}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={update.isPending}
                                className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                                <Check className="h-3 w-3" /> Save
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditing(true)}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            <Edit3 className="h-3 w-3" /> Edit
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
                    {(['first_name', 'last_name', 'phone', 'email', 'date_of_birth', 'gender', 'address', 'city', 'state', 'zip_code', 'emergency_contact_name', 'emergency_contact_phone'] as const).map((field) => (
                        <div key={field}>
                            <label className="mb-1 block text-xs font-medium text-slate-500 capitalize">
                                {field.replace(/_/g, ' ')}
                            </label>
                            {editing ? (
                                field === 'gender' ? (
                                    <select value={form[field] || ''} onChange={(e) => setForm((f: any) => ({ ...f, [field]: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                ) : (
                                    <input
                                        type={field === 'date_of_birth' ? 'date' : 'text'}
                                        value={form[field] || ''}
                                        onChange={(e) => setForm((f: any) => ({ ...f, [field]: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                                    />
                                )
                            ) : (
                                <p className="text-sm text-slate-900">
                                    {field === 'date_of_birth' && patient[field]
                                        ? format(parseISO(patient[field]), 'MMM d, yyyy')
                                        : patient[field] || <span className="text-slate-400">—</span>}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Allergies Card — clinical only */}
            {isClinical && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-3">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-500" /> Allergies
                        </h3>
                    </div>
                    <div className="p-6">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(form.allergies as string[]).length === 0 && (
                                <p className="text-sm text-slate-400">No known allergies</p>
                            )}
                            {(form.allergies as string[]).map((a) => {
                                const sev = getAllergySeverity(a);
                                const colorClass = ALLERGY_SEVERITY_COLORS[sev] || ALLERGY_SEVERITY_COLORS.medium;
                                return (
                                    <span key={a} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${colorClass}`}>
                                        {a}
                                        <button onClick={() => removeAllergy(a)} className="ml-0.5 hover:opacity-70">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>

                        {/* Add allergy input */}
                        <div className="flex gap-2">
                            <input
                                value={allergyInput}
                                onChange={(e) => setAllergyInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }}
                                placeholder="Type allergy name + Enter"
                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                            />
                            <select value={allergySeverity} onChange={(e) => setAllergySeverity(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="life-threatening">Life-threatening</option>
                            </select>
                            <button onClick={addAllergy}
                                className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
                                <Plus className="h-4 w-4" /> Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Medical Conditions — clinical only */}
            {isClinical && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-3">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <Heart className="h-4 w-4 text-rose-500" /> Medical Conditions
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-wrap gap-2">
                            {(patient.medical_conditions as string[]).length === 0 && (
                                <p className="text-sm text-slate-400">No known conditions</p>
                            )}
                            {(patient.medical_conditions as string[]).map((c: string) => (
                                <Badge key={c} variant="slate">{c}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: PRESCRIPTIONS
   ═══════════════════════════════════════════════════════════════ */

function PrescriptionsTab({ patientId }: { patientId: string }) {
    const { data: prescriptions, isLoading } = usePatientPrescriptions(patientId);

    if (isLoading) return <LoadingBlock />;
    if (!prescriptions || prescriptions.length === 0) return <EmptyBlock icon={<Pill className="h-8 w-8" />} text="No prescriptions" />;

    return (
        <div className="space-y-3">
            {prescriptions.map((rx) => {
                const badge = RX_STATUS_BADGE[rx.status] || RX_STATUS_BADGE.pending;
                return (
                    <div key={rx.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="font-semibold text-slate-900 text-sm">{rx.prescription_number}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Dr. {rx.prescriber_name} · Prescribed {format(parseISO(rx.date_prescribed), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>

                        {/* Line items */}
                        <div className="rounded-lg border border-slate-100 overflow-hidden">
                            <table className="min-w-full text-sm divide-y divide-slate-100">
                                <thead className="bg-slate-50/60">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Medication</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Dosage</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Frequency</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Qty</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Dispensed</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Refills</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rx.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-3 py-2">
                                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                                {item.product.generic_name && (
                                                    <p className="text-xs text-slate-400">{item.product.generic_name} {item.product.strength}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">{item.dosage}</td>
                                            <td className="px-3 py-2 text-slate-600">{item.frequency}</td>
                                            <td className="px-3 py-2 text-center">{item.quantity_prescribed}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={item.quantity_dispensed >= item.quantity_prescribed ? 'text-green-600 font-medium' : 'text-amber-600'}>
                                                    {item.quantity_dispensed}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500">
                                                {item.refills_used}/{item.refills_allowed}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {rx.diagnosis && (
                            <p className="mt-3 text-xs text-slate-500">
                                <span className="font-medium">Diagnosis:</span> {rx.diagnosis}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: PURCHASE HISTORY
   ═══════════════════════════════════════════════════════════════ */

function PurchaseHistoryTab({ patientId }: { patientId: string }) {
    const { data: sales, isLoading } = usePatientSales(patientId);

    if (isLoading) return <LoadingBlock />;
    if (!sales || sales.length === 0) return <EmptyBlock icon={<ShoppingBag className="h-8 w-8" />} text="No purchase history" />;

    return (
        <div className="space-y-3">
            {sales.map((sale) => (
                <div key={sale.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-semibold text-slate-900 text-sm">{sale.sale_number}</p>
                            <p className="text-xs text-slate-500">{format(parseISO(sale.created_at), 'MMM d, yyyy · h:mm a')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">₺{Number(sale.total_amount).toFixed(2)}</p>
                            <Badge variant={sale.status === 'completed' ? 'green' : sale.status === 'pending' ? 'amber' : 'slate'}>
                                {sale.status}
                            </Badge>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 overflow-hidden">
                        <table className="min-w-full text-sm divide-y divide-slate-100">
                            <thead className="bg-slate-50/60">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Product</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Qty</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Price</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sale.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-3 py-2 font-medium text-slate-900">{item.product.name}</td>
                                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                                        <td className="px-3 py-2 text-right">₺{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-medium">₺{Number(item.total_price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                        <span>Payment: <span className="font-medium capitalize">{sale.payment_method}</span></span>
                        {Number(sale.insurance_amount) > 0 && (
                            <span>Insurance: <span className="font-medium text-blue-600">₺{Number(sale.insurance_amount).toFixed(2)}</span></span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: MEDICATIONS (Current meds derived from dispensed Rx)
   ═══════════════════════════════════════════════════════════════ */

function MedicationsTab({ patientId }: { patientId: string }) {
    const { data: meds, isLoading } = usePatientMedications(patientId);

    if (isLoading) return <LoadingBlock />;
    if (!meds || meds.length === 0) return <EmptyBlock icon={<Package className="h-8 w-8" />} text="No current medications" />;

    const parseDuration = (dur: string): number => {
        const match = dur.match(/(\d+)/);
        if (!match) return 30;
        const n = parseInt(match[1]);
        if (dur.toLowerCase().includes('week')) return n * 7;
        if (dur.toLowerCase().includes('month')) return n * 30;
        return n; // assume days
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Medication</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Dosage</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Frequency</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Filled</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Expected Refill</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600">Refills Left</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {meds.map((med) => {
                        const daysSupply = parseDuration(med.duration);
                        const expectedRefill = addDays(parseISO(med.last_fill_date), daysSupply);
                        const isPastDue = expectedRefill < new Date();
                        return (
                            <tr key={med.product_id}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-slate-900">{med.product_name}</p>
                                    {med.generic_name && (
                                        <p className="text-xs text-slate-400">{med.generic_name} {med.strength}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{med.dosage}</td>
                                <td className="px-4 py-3 text-slate-600">{med.frequency}</td>
                                <td className="px-4 py-3 text-slate-600">
                                    {format(parseISO(med.last_fill_date), 'MMM d, yyyy')}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={isPastDue ? 'font-medium text-red-600' : 'text-slate-600'}>
                                        {format(expectedRefill, 'MMM d, yyyy')}
                                        {isPastDue && <span className="ml-1 text-xs">(overdue)</span>}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={med.refills_remaining > 0 ? 'text-green-600 font-medium' : 'text-slate-400'}>
                                        {med.refills_remaining}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: NOTES
   ═══════════════════════════════════════════════════════════════ */

function NotesTab({ patient }: { patient: any }) {
    const update = useUpdatePatient();
    const [notes, setNotes] = useState(patient.notes || '');
    const [saving, setSaving] = useState(false);
    const hasChanged = notes !== (patient.notes || '');

    const handleSave = async () => {
        setSaving(true);
        try {
            await update.mutateAsync({ id: patient.id, notes: notes || null });
            toast.success('Notes saved');
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-slate-400" /> Patient Notes
            </h3>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                placeholder="Add clinical notes, observations, or special instructions..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-relaxed focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none resize-none"
            />
            {hasChanged && (
                <div className="mt-3 flex justify-end">
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Save Notes
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Shared helpers ──────────────────────────────────────── */

function LoadingBlock() {
    return <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-500" /></div>;
}

function EmptyBlock({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
            <div className="text-slate-300 flex justify-center">{icon}</div>
            <p className="mt-2 text-sm text-slate-400">{text}</p>
        </div>
    );
}
