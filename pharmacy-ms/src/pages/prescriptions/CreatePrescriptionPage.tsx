import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Plus, Loader2, Trash2, Upload,
    AlertTriangle, ShieldAlert, X, Check, ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePatients, useCreatePatient } from '@/hooks/usePatients';
import {
    useCreatePrescription, useRxProductSearch,
    useDrugInteractionCheck, useAllergyCheck, useUploadRxImage,
} from '@/hooks/usePrescriptions';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Patient, DrugInteractionSeverity } from '@/types/database';

/* ─── Types ───────────────────────────────────────────────── */

interface LineItem {
    product_id: string;
    name: string;
    generic_name: string | null;
    strength: string | null;
    is_controlled: boolean;
    quantity_prescribed: number;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    refills_allowed: number;
    substitution_allowed: boolean;
}

const SEVERITY_CONFIG: Record<DrugInteractionSeverity, { color: string; label: string; blocks: boolean }> = {
    mild: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Mild', blocks: false },
    moderate: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Moderate', blocks: false },
    severe: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Severe', blocks: true },
    contraindicated: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Contraindicated', blocks: true },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function CreatePrescriptionPage() {
    const navigate = useNavigate();
    const { user, branchId } = useAuth();
    const createRx = useCreatePrescription();
    const uploadImage = useUploadRxImage();

    /* ─── Patient ─────────────────────────────────────── */
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [showPatientSearch, setShowPatientSearch] = useState(false);

    /* ─── Doctor Info ─────────────────────────────────── */
    const [doctor, setDoctor] = useState({
        name: '', license: '', phone: '',
        date_written: format(new Date(), 'yyyy-MM-dd'),
        diagnosis: '',
    });

    /* ─── Line Items ──────────────────────────────────── */
    const [items, setItems] = useState<LineItem[]>([]);
    const [showProductSearch, setShowProductSearch] = useState(false);

    /* ─── Image ───────────────────────────────────────── */
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ─── Override confirmation ────────────────────────── */
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideConfirmed, setOverrideConfirmed] = useState(false);

    /* ─── Notes ────────────────────────────────────────── */
    const [notes, setNotes] = useState('');

    /* ─── Drug interaction check ──────────────────────── */
    const productNames = items.map((i) => i.generic_name || i.name);
    const { data: interactions } = useDrugInteractionCheck(productNames);
    const blockingInteractions = (interactions || []).filter(
        (i) => SEVERITY_CONFIG[i.severity]?.blocks,
    );

    /* ─── Allergy check ──────────────────────────────── */
    const allergyWarnings = useAllergyCheck(
        selectedPatient?.allergies || [],
        items.map((i) => ({ id: i.product_id, name: i.name, generic_name: i.generic_name })),
    );

    /* ─── Image handling ─────────────────────────────── */
    const handleImageChange = (file: File) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            toast.error('Please upload an image or PDF');
            return;
        }
        setImageFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleImageChange(file);
    }, []);

    /* ─── Add line item ──────────────────────────────── */
    const addItem = (product: any) => {
        if (items.some((i) => i.product_id === product.id)) {
            toast.error('Product already added');
            return;
        }
        setItems((prev) => [
            ...prev,
            {
                product_id: product.id,
                name: product.name,
                generic_name: product.generic_name,
                strength: product.strength,
                is_controlled: product.is_controlled,
                quantity_prescribed: 1,
                dosage: '',
                frequency: '',
                duration: '',
                instructions: '',
                refills_allowed: 0,
                substitution_allowed: !product.is_controlled,
            },
        ]);
        setShowProductSearch(false);
    };

    const updateItem = (idx: number, field: keyof LineItem, value: any) => {
        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
    };

    const removeItem = (idx: number) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    /* ─── Submit ─────────────────────────────────────── */
    const canSubmit = selectedPatient && doctor.name && items.length > 0 &&
        items.every((i) => i.dosage && i.frequency && i.quantity_prescribed > 0);

    const hasBlockers = blockingInteractions.length > 0 && !overrideConfirmed;

    const handleSubmit = async () => {
        if (!canSubmit || !user || !branchId) return;

        if (hasBlockers) {
            setShowOverrideModal(true);
            return;
        }

        try {
            let imageUrl: string | null = null;
            if (imageFile) {
                imageUrl = await uploadImage.mutateAsync({ file: imageFile });
            }

            await createRx.mutateAsync({
                patient_id: selectedPatient!.id,
                prescriber_name: doctor.name,
                prescriber_phone: doctor.phone || null,
                prescriber_license: doctor.license || null,
                branch_id: branchId,
                date_prescribed: doctor.date_written,
                diagnosis: doctor.diagnosis || null,
                notes: notes || null,
                image_url: imageUrl,
                created_by: user.id,
                items: items.map((i) => ({
                    product_id: i.product_id,
                    quantity_prescribed: i.quantity_prescribed,
                    dosage: i.dosage,
                    frequency: i.frequency,
                    duration: i.duration,
                    instructions: i.instructions || null,
                    refills_allowed: i.refills_allowed,
                    substitution_allowed: i.substitution_allowed,
                })),
            });

            toast.success('Prescription created');
            navigate('/prescriptions');
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <button onClick={() => navigate('/prescriptions')}
                    className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Queue
                </button>

                <h1 className="text-2xl font-bold text-slate-900 mb-6">New Prescription</h1>

                {/* ═══ Section 1: Patient ═══ */}
                <SectionCard title="Patient" number={1}>
                    {selectedPatient ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-sm font-bold">
                                    {selectedPatient.first_name.charAt(0)}{selectedPatient.last_name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        {selectedPatient.first_name} {selectedPatient.last_name}
                                    </p>
                                    <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
                                </div>
                                {selectedPatient.allergies?.length > 0 && (
                                    <Badge variant="red">
                                        <AlertTriangle className="mr-0.5 h-3 w-3" />
                                        {selectedPatient.allergies.length} allerg{selectedPatient.allergies.length === 1 ? 'y' : 'ies'}
                                    </Badge>
                                )}
                            </div>
                            <button onClick={() => { setSelectedPatient(null); setItems([]); }}
                                className="text-xs text-slate-500 hover:text-slate-700">Change</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowPatientSearch(true)}
                            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 w-full transition-colors">
                            <Search className="h-4 w-4" /> Search or create patient
                        </button>
                    )}
                </SectionCard>

                {/* ═══ Section 2: Doctor Info ═══ */}
                <SectionCard title="Prescriber Information" number={2}>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Doctor Name *" value={doctor.name}
                            onChange={(v) => setDoctor((d) => ({ ...d, name: v }))} placeholder="Dr. Name" />
                        <InputField label="License Number" value={doctor.license}
                            onChange={(v) => setDoctor((d) => ({ ...d, license: v }))} placeholder="License #" />
                        <InputField label="Phone" value={doctor.phone}
                            onChange={(v) => setDoctor((d) => ({ ...d, phone: v }))} placeholder="Phone" />
                        <InputField label="Date Written *" type="date" value={doctor.date_written}
                            onChange={(v) => setDoctor((d) => ({ ...d, date_written: v }))} />
                    </div>
                    <div className="mt-4">
                        <InputField label="Diagnosis" value={doctor.diagnosis}
                            onChange={(v) => setDoctor((d) => ({ ...d, diagnosis: v }))} placeholder="Diagnosis / ICD code" />
                    </div>
                </SectionCard>

                {/* ═══ Section 3: Prescription Image ═══ */}
                <SectionCard title="Prescription Image" number={3}>
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="relative rounded-lg border-2 border-dashed border-slate-300 p-6 text-center hover:border-teal-400 transition-colors"
                    >
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
                            onChange={(e) => { if (e.target.files?.[0]) handleImageChange(e.target.files[0]); }} />

                        {imagePreview ? (
                            <div className="relative inline-block">
                                <img src={imagePreview} alt="Rx" className="max-h-48 rounded-lg mx-auto" />
                                <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                                    className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : imageFile ? (
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                                <ImageIcon className="h-5 w-5" />
                                {imageFile.name}
                                <button onClick={() => setImageFile(null)} className="text-red-500 hover:text-red-700">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <Upload className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-2 text-sm text-slate-500">
                                    Drag & drop or{' '}
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="text-teal-600 font-medium hover:text-teal-700">browse</button>
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Images or PDF</p>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* ═══ Section 4: Line Items ═══ */}
                <SectionCard title="Medications" number={4}>
                    {/* Allergy warnings */}
                    {allergyWarnings.length > 0 && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                            <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4" /> Allergy Warning
                            </p>
                            {allergyWarnings.map((w, i) => (
                                <p key={i} className="mt-1 text-xs text-red-700">
                                    Patient is allergic to <strong>{w.allergy}</strong> — conflicts with <strong>{w.product_name}</strong>
                                </p>
                            ))}
                        </div>
                    )}

                    {/* Drug interaction warnings */}
                    {interactions && interactions.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {interactions.map((inter) => {
                                const cfg = SEVERITY_CONFIG[inter.severity];
                                return (
                                    <div key={inter.id} className={`rounded-lg border p-3 ${cfg.color}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className="h-4 w-4" />
                                            <span className="text-sm font-semibold">
                                                {cfg.label}: {inter.drug_a_name} ↔ {inter.drug_b_name}
                                            </span>
                                            {cfg.blocks && (
                                                <Badge variant="red">Blocks Save</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs">{inter.description}</p>
                                        {inter.recommendation && (
                                            <p className="text-xs mt-1 font-medium">Rec: {inter.recommendation}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Items list */}
                    {items.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No medications added</p>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={item.product_id} className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                                {item.name}
                                                {item.is_controlled && (
                                                    <Badge variant="red">Controlled</Badge>
                                                )}
                                            </p>
                                            {item.generic_name && (
                                                <p className="text-xs text-slate-400">{item.generic_name} {item.strength}</p>
                                            )}
                                        </div>
                                        <button onClick={() => removeItem(idx)}
                                            className="text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <InputField label="Qty *" type="number" value={String(item.quantity_prescribed)}
                                            onChange={(v) => updateItem(idx, 'quantity_prescribed', parseInt(v) || 0)} />
                                        <InputField label="Dosage *" value={item.dosage}
                                            onChange={(v) => updateItem(idx, 'dosage', v)} placeholder="e.g. 500mg" />
                                        <InputField label="Frequency *" value={item.frequency}
                                            onChange={(v) => updateItem(idx, 'frequency', v)} placeholder="e.g. 3x daily" />
                                        <InputField label="Duration" value={item.duration}
                                            onChange={(v) => updateItem(idx, 'duration', v)} placeholder="e.g. 7 days" />
                                        <InputField label="Refills" type="number" value={String(item.refills_allowed)}
                                            onChange={(v) => updateItem(idx, 'refills_allowed', parseInt(v) || 0)} />
                                        <InputField label="Instructions" value={item.instructions}
                                            onChange={(v) => updateItem(idx, 'instructions', v)} placeholder="Take with food" />
                                    </div>

                                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                                        <input type="checkbox" checked={item.substitution_allowed}
                                            onChange={(e) => updateItem(idx, 'substitution_allowed', e.target.checked)}
                                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                                        Allow generic substitution
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    <button onClick={() => setShowProductSearch(true)}
                        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 w-full justify-center transition-colors">
                        <Plus className="h-4 w-4" /> Add Medication
                    </button>
                </SectionCard>

                {/* ═══ Notes ═══ */}
                <SectionCard title="Notes" number={5}>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        rows={3} placeholder="Additional notes..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none resize-none" />
                </SectionCard>

                {/* ═══ Submit ═══ */}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => navigate('/prescriptions')}
                        className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || createRx.isPending || uploadImage.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                        {(createRx.isPending || uploadImage.isPending)
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Check className="h-4 w-4" />}
                        Create Prescription
                    </button>
                </div>
            </div>

            {/* ═══ Patient Search Modal ═══ */}
            <PatientSearchModal
                open={showPatientSearch}
                onClose={() => setShowPatientSearch(false)}
                onSelect={(p) => { setSelectedPatient(p); setShowPatientSearch(false); }}
            />

            {/* ═══ Product Search Modal ═══ */}
            <ProductSearchModal
                open={showProductSearch}
                onClose={() => setShowProductSearch(false)}
                onSelect={addItem}
            />

            {/* ═══ Override Confirmation ═══ */}
            <Modal open={showOverrideModal} onClose={() => setShowOverrideModal(false)} title="⚠️ Safety Override Required">
                <div className="space-y-3">
                    <p className="text-sm text-slate-700">
                        This prescription contains <strong>{blockingInteractions.length}</strong> severe/contraindicated drug interaction(s).
                        Saving requires explicit pharmacist override.
                    </p>
                    {blockingInteractions.map((i) => (
                        <div key={i.id} className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                            <strong>{SEVERITY_CONFIG[i.severity].label}:</strong> {i.drug_a_name} ↔ {i.drug_b_name} — {i.description}
                        </div>
                    ))}
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={overrideConfirmed}
                            onChange={(e) => setOverrideConfirmed(e.target.checked)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
                        I acknowledge the risks and override this safety check
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setShowOverrideModal(false)}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                            Cancel
                        </button>
                        <button disabled={!overrideConfirmed}
                            onClick={() => { setShowOverrideModal(false); handleSubmit(); }}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                            Override & Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PATIENT SEARCH MODAL
   ═══════════════════════════════════════════════════════════════ */

function PatientSearchModal({
    open, onClose, onSelect,
}: {
    open: boolean; onClose: () => void; onSelect: (p: Patient) => void;
}) {
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const { data: patients, isLoading } = usePatients(debounced);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const createPatient = useCreatePatient();

    const [quickForm, setQuickForm] = useState({
        first_name: '', last_name: '', phone: '', date_of_birth: '', gender: 'male',
    });

    const handleQuickAdd = async () => {
        try {
            const p = await createPatient.mutateAsync({
                ...quickForm, allergies: [], medical_conditions: [], is_active: true,
            });
            onSelect(p);
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title="Select Patient" maxWidth="max-w-xl">
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                        placeholder="Search by name or phone..."
                        className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>

                {isLoading ? (
                    <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-teal-500" /></div>
                ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {(patients || []).map((p) => (
                            <button key={p.id} onClick={() => onSelect(p)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-teal-50 transition-colors">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
                                    {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">{p.first_name} {p.last_name}</p>
                                    <p className="text-xs text-slate-400">{p.phone}</p>
                                </div>
                                {p.allergies?.length > 0 && (
                                    <Badge variant="amber">{p.allergies.length} allergy</Badge>
                                )}
                            </button>
                        ))}
                        {debounced && (patients || []).length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No patients found</p>
                        )}
                    </div>
                )}

                <div className="border-t border-slate-200 pt-3">
                    {showQuickAdd ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <InputField label="First Name" value={quickForm.first_name}
                                    onChange={(v) => setQuickForm((f) => ({ ...f, first_name: v }))} />
                                <InputField label="Last Name" value={quickForm.last_name}
                                    onChange={(v) => setQuickForm((f) => ({ ...f, last_name: v }))} />
                                <InputField label="Phone" value={quickForm.phone}
                                    onChange={(v) => setQuickForm((f) => ({ ...f, phone: v }))} />
                                <InputField label="DOB" type="date" value={quickForm.date_of_birth}
                                    onChange={(v) => setQuickForm((f) => ({ ...f, date_of_birth: v }))} />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowQuickAdd(false)}
                                    className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                <button onClick={handleQuickAdd} disabled={createPatient.isPending}
                                    className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                                    {createPatient.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                    Create
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowQuickAdd(true)}
                            className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
                            <Plus className="h-4 w-4" /> Quick create new patient
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT SEARCH MODAL (Rx-only)
   ═══════════════════════════════════════════════════════════════ */

function ProductSearchModal({
    open, onClose, onSelect,
}: {
    open: boolean; onClose: () => void; onSelect: (p: any) => void;
}) {
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const { data: products, isLoading } = useRxProductSearch(debounced);

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title="Add Medication" maxWidth="max-w-xl">
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                        placeholder="Search prescription drugs..."
                        className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                </div>

                {isLoading ? (
                    <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-teal-500" /></div>
                ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                        {(products || []).map((p) => (
                            <button key={p.id} onClick={() => onSelect(p)}
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-teal-50 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-slate-900 text-left">{p.name}</p>
                                    <p className="text-xs text-slate-400">
                                        {p.generic_name} {p.strength} · {p.formulation}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    {p.is_controlled && <Badge variant="red">Controlled</Badge>}
                                    <Badge variant="blue">{p.category}</Badge>
                                </div>
                            </button>
                        ))}
                        {debounced.length >= 2 && (products || []).length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No Rx products found</p>
                        )}
                        {debounced.length < 2 && (
                            <p className="text-sm text-slate-400 text-center py-4">Type at least 2 characters to search</p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════ */

function SectionCard({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-4">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                    {number}
                </span>
                <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function InputField({
    label, value, onChange, placeholder, type = 'text',
}: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        </div>
    );
}
