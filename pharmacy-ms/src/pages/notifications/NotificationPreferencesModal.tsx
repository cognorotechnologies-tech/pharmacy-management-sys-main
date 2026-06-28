import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface NotificationPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_PREFS = {
    low_stock: true,
    expiry_warning: true,
    prescription_ready: true,
    po_delivered: true,
    drug_interaction: true,
    controlled_substance: true,
    system_alert: true
};

export function NotificationPreferencesModal({ isOpen, onClose }: NotificationPreferencesModalProps) {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<Record<string, boolean>>(DEFAULT_PREFS);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            loadPreferences();
        }
    }, [isOpen, user]);

    const loadPreferences = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', user?.id)
                .single();

            if (error) throw error;
            if (data?.notification_preferences) {
                setPreferences({ ...DEFAULT_PREFS, ...(data.notification_preferences as Record<string, boolean>) });
            }
        } catch (error: any) {
            console.error('Error loading preferences:', error);
            toast.error('Failed to load notification preferences');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: preferences })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Preferences saved successfully');
            onClose();
        } catch (error: any) {
            console.error('Error saving preferences:', error);
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = (key: string) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (!isOpen) return null;

    const PREF_OPTIONS = [
        { key: 'low_stock', label: 'Low Stock Alerts', desc: 'Get notified when inventory items fall below reorder minimums.' },
        { key: 'expiry_warning', label: 'Expiry Warnings', desc: 'Get notified about lots expiring within 90 days.' },
        { key: 'prescription_ready', label: 'Prescriptions Ready', desc: 'Get notified when a prescription is ready to be dispensed.' },
        { key: 'po_delivered', label: 'PO Delivered', desc: 'Get notified when a purchase order changes status to delivered.' },
        { key: 'drug_interaction', label: 'Drug Interactions', desc: 'Get notified about severe drug-to-drug interactions.' },
        { key: 'controlled_substance', label: 'Controlled Substances', desc: 'Alerts for compliance thresholds on controlled meds.' },
        { key: 'system_alert', label: 'System Alerts', desc: 'General system announcements and important updates.' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-500">
                                Choose which types of events you want to be notified about.
                            </p>

                            <div className="space-y-4">
                                {PREF_OPTIONS.map(opt => (
                                    <div key={opt.key} className="flex items-start gap-4">
                                        <div className="flex items-center h-5 mt-0.5">
                                            <input
                                                id={`pref-${opt.key}`}
                                                name={`pref-${opt.key}`}
                                                type="checkbox"
                                                checked={!!preferences[opt.key]}
                                                onChange={() => handleToggle(opt.key)}
                                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-300 rounded cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <label htmlFor={`pref-${opt.key}`} className="text-sm font-medium text-slate-900 cursor-pointer">
                                                {opt.label}
                                            </label>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                {opt.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading} className="flex items-center gap-2">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Preferences
                    </Button>
                </div>
            </div>
        </div>
    );
}
