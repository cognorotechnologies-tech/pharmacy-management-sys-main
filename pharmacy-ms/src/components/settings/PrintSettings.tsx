import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';
import { Button } from '@/components/ui/Button';
import {
    Printer,
    Tag,
    CheckCircle2,
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPreferences } from '@/types/settings';

const LABEL_SIZES = ['Dymo 30252', 'A4 Standard', 'Brother DK-11201', 'Zebra 4x6'];
const LABEL_FIELDS = [
    { id: 'name', label: 'Product Name' },
    { id: 'generic', label: 'Generic Name' },
    { id: 'dosage', label: 'Dosage/Strength' },
    { id: 'expiry', label: 'Expiry Date' },
    { id: 'batch', label: 'Batch Number' },
    { id: 'barcode', label: 'Barcode' },
    { id: 'price', label: 'Retail Price' },
    { id: 'branch', label: 'Branch Name' },
];

export default function PrintSettings() {
    const { profile } = useAuth();
    const { data: preferences, isLoading } = useUserPreferences(profile?.id || null);
    const updatePreferences = useUpdateUserPreferences();

    const [formData, setFormData] = useState<Partial<UserPreferences>>({});

    useEffect(() => {
        if (preferences) {
            setFormData(preferences);
        } else {
            setFormData({
                print_settings: {
                    receipt_logo: true,
                    label_size: 'Dymo 30252',
                    label_fields: ['name', 'dosage', 'expiry']
                }
            });
        }
    }, [preferences]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        updatePreferences.mutate({ userId: profile.id, updates: formData });
    };

    const toggleField = (fieldId: string) => {
        const currentFields = formData.print_settings?.label_fields || [];
        const newFields = currentFields.includes(fieldId)
            ? currentFields.filter(f => f !== fieldId)
            : [...currentFields, fieldId];

        setFormData(prev => ({
            ...prev,
            print_settings: {
                ...prev.print_settings!,
                label_fields: newFields
            }
        }));
    };

    if (isLoading) return <div className="p-4 text-gray-400">Loading print settings...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Print & Labels</h2>
                <p className="text-sm text-gray-400">Configure your hardware and document layout preferences.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <Printer size={18} />
                        <h3>Receipt Configuration</h3>
                    </div>

                    <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
                                <ImageIcon size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">Print Logo on Receipt</p>
                                <p className="text-xs text-gray-500">Include the pharmacy logo in the receipt header</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(p => ({
                                ...p,
                                print_settings: { ...p.print_settings!, receipt_logo: !p.print_settings!.receipt_logo }
                            }))}
                            className={cn(
                                "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
                                formData.print_settings?.receipt_logo ? "bg-indigo-600" : "bg-slate-700"
                            )}
                        >
                            <span className={cn(
                                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                formData.print_settings?.receipt_logo ? "translate-x-6" : "translate-x-1"
                            )} />
                        </button>
                    </div>
                </section>

                <hr className="border-slate-800" />

                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <Tag size={18} />
                        <h3>Label Designer</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Primary Label Size</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                                    value={formData.print_settings?.label_size || 'Dymo 30252'}
                                    onChange={e => setFormData(p => ({
                                        ...p,
                                        print_settings: { ...p.print_settings!, label_size: e.target.value as any }
                                    }))}
                                >
                                    {LABEL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Visible Fields on Label</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {LABEL_FIELDS.map(f => {
                                        const isSelected = formData.print_settings?.label_fields.includes(f.id);
                                        return (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => toggleField(f.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left",
                                                    isSelected
                                                        ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400"
                                                        : "bg-slate-900 border-slate-800 text-gray-500 hover:border-slate-600"
                                                )}
                                            >
                                                <CheckCircle2 size={14} className={isSelected ? "opacity-100" : "opacity-0"} />
                                                {f.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-800 flex items-center justify-center min-h-[200px]">
                            <div className="w-48 bg-white border-2 border-dashed border-gray-300 rounded shadow-sm p-4 text-black font-mono text-[10px] space-y-1">
                                <div className="flex justify-between border-b border-gray-100 pb-1 mb-2">
                                    <span className="font-bold">RX LABEL</span>
                                    <span>#12345</span>
                                </div>
                                {formData.print_settings?.label_fields?.includes('name') && <div className="font-bold uppercase text-xs">Amoxicillin 500mg</div>}
                                {formData.print_settings?.label_fields?.includes('generic') && <div className="italic text-gray-500">Generic: Amoxil</div>}
                                {formData.print_settings?.label_fields?.includes('dosage') && <div>Take one capsule twice daily</div>}
                                {formData.print_settings?.label_fields?.includes('expiry') && <div className="pt-2">EXP: 12/2026</div>}
                                {formData.print_settings?.label_fields?.includes('batch') && <div>LOT: B-99212</div>}
                                {formData.print_settings?.label_fields?.includes('price') && <div className="text-right font-bold pt-1">$24.99</div>}
                                {formData.print_settings?.label_fields?.includes('barcode') && (
                                    <div className="mt-2 h-6 w-full bg-black flex items-center justify-center text-[6px] text-white">BARCODE_SAMPLE</div>
                                )}
                                {formData.print_settings?.label_fields?.includes('branch') && (
                                    <div className="text-[8px] text-gray-400 pt-2 text-center border-t border-gray-100">Downtown Pharmacy #1</div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                    <Button variant="primary" type="submit" isLoading={updatePreferences.isPending}>
                        Save Print Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
