import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranchSettings, useUpdateBranchSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { supabase } from '@/lib/supabase';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Clock,
    Receipt,
    Percent,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { BranchSettings as IBranchSettings } from '@/types/settings';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BranchSettings() {
    const { profile, branchId: userBranchId } = useAuth();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([]);

    const isSuperAdmin = profile?.role === 'super_admin';
    const effectiveBranchId = isSuperAdmin ? selectedBranchId : userBranchId;

    const { data: settings, isLoading } = useBranchSettings(effectiveBranchId);
    const updateSettings = useUpdateBranchSettings();

    const [formData, setFormData] = useState<Partial<IBranchSettings>>({});

    useEffect(() => {
        if (isSuperAdmin) {
            supabase.from('branches').select('id, name').eq('is_active', true).then(({ data }) => {
                if (data) {
                    setBranches(data);
                    if (!selectedBranchId && data.length > 0) setSelectedBranchId(data[0].id);
                }
            });
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveBranchId) return;
        updateSettings.mutate({ branchId: effectiveBranchId, updates: formData });
    };

    const updateOperatingHours = (day: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            operating_hours: {
                ...prev.operating_hours,
                [day]: {
                    ...(prev.operating_hours?.[day] || { open: '08:00', close: '20:00', isOpen: true }),
                    [field]: value
                }
            }
        }));
    };

    if (isLoading && effectiveBranchId) return <div className="animate-pulse">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Branch Settings</h2>
                    <p className="text-sm text-gray-400">Configure operational parameters for this location.</p>
                </div>

                {isSuperAdmin && (
                    <div className="w-full md:w-64">
                        <Select
                            value={selectedBranchId || ''}
                            onChange={e => setSelectedBranchId(e.target.value)}
                            options={branches.map(b => ({ value: b.id, label: b.name }))}
                        />
                    </div>
                )}
            </div>

            {!effectiveBranchId && !isLoading && (
                <div className="p-8 text-center bg-slate-800/50 rounded-xl border border-slate-700">
                    <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-gray-400">Please select a branch to manage its settings.</p>
                </div>
            )}

            {effectiveBranchId && (
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Contact Info */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                            <Building2 size={18} />
                            <h3>Branch Contact Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Branch Name</label>
                                <Input value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Address</label>
                                <Input value={formData.address || ''} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium text-left block">Phone</label>
                                <Input value={formData.phone || ''} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium text-left block">Email</label>
                                <Input type="email" value={formData.email || ''} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                            </div>
                        </div>
                    </section>

                    <hr className="border-slate-800" />

                    {/* Operating Hours */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                            <Clock size={18} />
                            <h3>Operating Hours</h3>
                        </div>

                        <div className="bg-slate-800/30 rounded-xl border border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th className="px-4 py-2 font-medium text-gray-400">Day</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Status</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Open</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Close</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {DAYS.map(day => {
                                        const hours = formData.operating_hours?.[day] || { open: '08:00', close: '20:00', isOpen: true };
                                        return (
                                            <tr key={day} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-2 text-gray-300 font-medium">{day}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={hours.isOpen}
                                                        onChange={e => updateOperatingHours(day, 'isOpen', e.target.checked)}
                                                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-indigo-600">
                                                    <input
                                                        type="time"
                                                        value={hours.open}
                                                        disabled={!hours.isOpen}
                                                        onChange={e => updateOperatingHours(day, 'open', e.target.value)}
                                                        className="bg-transparent border-none text-gray-300 focus:ring-0 p-0 text-sm disabled:opacity-30"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="time"
                                                        value={hours.close}
                                                        disabled={!hours.isOpen}
                                                        onChange={e => updateOperatingHours(day, 'close', e.target.value)}
                                                        className="bg-transparent border-none text-gray-300 focus:ring-0 p-0 text-sm disabled:opacity-30"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <hr className="border-slate-800" />

                    {/* Operational Logic */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                            <Receipt size={18} />
                            <h3>Operations & Documentation</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Receipt Header Text</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                                    value={formData.receipt_header || ''}
                                    onChange={e => setFormData(p => ({ ...p, receipt_header: e.target.value }))}
                                    placeholder="Welcome to our pharmacy..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Receipt Footer Text</label>
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                                    value={formData.receipt_footer || ''}
                                    onChange={e => setFormData(p => ({ ...p, receipt_footer: e.target.value }))}
                                    placeholder="Thank you for your visit!"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-gray-300 font-medium">Discount Approval Threshold (%)</label>
                                    <Percent size={14} className="text-indigo-400" />
                                </div>
                                <Input
                                    type="number"
                                    value={formData.discount_approval_threshold}
                                    onChange={e => setFormData(p => ({ ...p, discount_approval_threshold: parseFloat(e.target.value) }))}
                                    placeholder="10"
                                />
                                <p className="text-xs text-gray-500">Discounts above this value require manager approval.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-gray-300 font-medium">Low Stock Reorder (Override)</label>
                                    <AlertTriangle size={14} className="text-orange-400" />
                                </div>
                                <Input
                                    type="number"
                                    value={formData.low_stock_reorder_threshold_override || ''}
                                    onChange={e => setFormData(p => ({ ...p, low_stock_reorder_threshold_override: e.target.value ? parseInt(e.target.value) : null }))}
                                    placeholder="Using product default"
                                />
                                <p className="text-xs text-gray-500">Global override for this branch. Leave blank to use product settings.</p>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                        <Button variant="primary" type="submit" isLoading={updateSettings.isPending}>
                            Save Branch Settings
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
