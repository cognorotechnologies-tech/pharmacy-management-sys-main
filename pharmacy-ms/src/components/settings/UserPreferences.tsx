import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';
import { Button } from '@/components/ui/Button';
import {
    Moon,
    Sun,
    Bell,
    Layout,
    ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPreferences as IUserPreferences } from '@/types/settings';

export default function UserPreferences() {
    const { profile } = useAuth();
    const { data: preferences, isLoading } = useUserPreferences(profile?.id || null);
    const updatePreferences = useUpdateUserPreferences();

    const [formData, setFormData] = useState<Partial<IUserPreferences>>({});

    useEffect(() => {
        if (preferences) {
            setFormData(preferences);
        }
    }, [preferences]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        updatePreferences.mutate({ userId: profile.id, updates: formData });
    };

    const toggleNotification = (key: keyof IUserPreferences['notifications']) => {
        setFormData(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications!,
                [key]: !prev.notifications![key]
            }
        }));
    };

    if (isLoading) return <div className="p-4">Loading preferences...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">User Preferences</h2>
                <p className="text-sm text-gray-400">Customize your workspace and notification settings.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Appearance */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <Layout size={18} />
                        <h3>Appearance</h3>
                    </div>

                    <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg text-gray-400">
                                {formData.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">Theme Mode</p>
                                <p className="text-xs text-gray-500">Switch between light and dark themes</p>
                            </div>
                        </div>
                        <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-700">
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, theme: 'light' }))}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                    formData.theme === 'light' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                                )}
                            >
                                Light
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, theme: 'dark' }))}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                    formData.theme === 'dark' ? "bg-indigo-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                                )}
                            >
                                Dark
                            </button>
                        </div>
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* Notifications */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <Bell size={18} />
                        <h3>Notification Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.notifications && Object.entries(formData.notifications).map(([key, enabled]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-slate-800/20 border border-slate-800 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-white capitalize">{key}</p>
                                    <p className="text-xs text-gray-500">Enable {key} alerts</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleNotification(key as any)}
                                    className={cn(
                                        "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                        enabled ? "bg-indigo-600" : "bg-slate-700"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                            enabled ? "translate-x-6" : "translate-x-1"
                                        )}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* POS Defaults */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <ShoppingCart size={18} />
                        <h3>POS & Workflow Defaults</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 font-medium">Default Payment Method</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                                value={formData.pos_preferences?.default_payment || 'cash'}
                                onChange={e => setFormData(p => ({
                                    ...p,
                                    pos_preferences: { ...p.pos_preferences!, default_payment: e.target.value }
                                }))}
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card / POS Terminal</option>
                                <option value="insurance">Insurance Billing</option>
                                <option value="wallet">Digital Wallet</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-800/20 border border-slate-800 rounded-lg h-[42px] mt-auto">
                            <p className="text-sm font-medium text-white">Show Patient Search by Default</p>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({
                                    ...p,
                                    pos_preferences: { ...p.pos_preferences!, show_patient_search: !p.pos_preferences!.show_patient_search }
                                }))}
                                className={cn(
                                    "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                    formData.pos_preferences?.show_patient_search ? "bg-indigo-600" : "bg-slate-700"
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                        formData.pos_preferences?.show_patient_search ? "translate-x-6" : "translate-x-1"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                    <Button variant="primary" type="submit" isLoading={updatePreferences.isPending}>
                        Save Preferences
                    </Button>
                </div>
            </form>
        </div>
    );
}
