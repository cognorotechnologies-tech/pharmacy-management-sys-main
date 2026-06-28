import { useState, useEffect } from 'react';
import { useGeneralSettings, useUpdateGeneralSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Upload, Globe, DollarSign, Shield } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { toast } from 'react-hot-toast';

export default function GeneralSettings() {
    const { data: settings, isLoading } = useGeneralSettings();
    const updateSettings = useUpdateGeneralSettings();

    const [formData, setFormData] = useState({
        name: '',
        tax_rate: 0,
        currency: 'USD',
        timezone: 'UTC',
        logo_url: ''
    });

    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                name: settings.name,
                tax_rate: settings.tax_rate,
                currency: settings.currency,
                timezone: settings.timezone,
                logo_url: settings.logo_url || ''
            });
        }
    }, [settings]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const url = await settingsService.uploadLogo(file);
            setFormData(prev => ({ ...prev, logo_url: url }));
            toast.success('Logo uploaded successfuly');
        } catch (error: any) {
            toast.error('Logo upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings.mutate(formData);
    };

    if (isLoading) return <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-800 rounded w-1/4"></div>
        <div className="h-64 bg-slate-800 rounded"></div>
    </div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">General Settings</h2>
                <p className="text-sm text-gray-400">Manage global pharmacy information and system-wide defaults.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Branding Section */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <Globe size={18} />
                        <h3>Pharmacy Branding</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 font-medium">Pharmacy Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter pharmacy name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 font-medium">Logo</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                    {formData.logo_url ? (
                                        <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Globe className="text-slate-600" size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="cursor-pointer">
                                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-gray-300 transition-colors">
                                            <Upload size={16} />
                                            {isUploading ? 'Uploading...' : 'Change Logo'}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* Financials Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-4">
                        <DollarSign size={18} />
                        <h3>Financials & Localization</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 font-medium">Default Tax Rate (%)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.tax_rate}
                                onChange={e => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 font-medium">Currency Code</label>
                            <Input
                                value={formData.currency}
                                onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                placeholder="USD"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 font-medium">System Timezone</label>
                            <Input
                                value={formData.timezone}
                                onChange={e => setFormData((prev: any) => ({ ...prev, timezone: e.target.value }))}
                                placeholder="UTC"
                            />
                        </div>
                    </div>
                </section>

                <hr className="border-slate-800" />

                {/* Governance Section (Static info for now) */}
                <section className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Shield className="text-indigo-400 mt-1" size={20} />
                        <div>
                            <h4 className="text-indigo-400 font-semibold text-sm">Data Retention Policy</h4>
                            <p className="text-xs text-gray-400 mt-1">Audit logs are retained for 365 days. Sales records are kept for 5 years as per compliance requirements.</p>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                    <Button variant="primary" type="submit" isLoading={updateSettings.isPending}>
                        Save General Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
