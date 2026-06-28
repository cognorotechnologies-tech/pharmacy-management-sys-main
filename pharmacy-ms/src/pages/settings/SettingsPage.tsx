import { useState } from 'react';
import {
    Settings as SettingsIcon,
    Building2,
    User,
    Printer,
    Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import GeneralSettings from '@/components/settings/GeneralSettings';
import BranchSettings from '@/components/settings/BranchSettings';
import UserPreferences from '@/components/settings/UserPreferences';
import PrintSettings from '@/components/settings/PrintSettings';

type TabId = 'general' | 'branch' | 'user' | 'print';

export default function SettingsPage() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('user');

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    const isSuperAdmin = profile?.role === 'super_admin';

    const tabs = [
        {
            id: 'user',
            name: 'User Preferences',
            icon: User,
            description: 'Personalize your interface and notifications',
            show: true
        },
        {
            id: 'print',
            name: 'Print & Labels',
            icon: Printer,
            description: 'Configure receipt and label printing options',
            show: true
        },
        {
            id: 'branch',
            name: 'Branch Settings',
            icon: Building2,
            description: 'Manage operating hours and branch operations',
            show: isAdmin
        },
        {
            id: 'general',
            name: 'General Settings',
            icon: Globe,
            description: 'Global pharmacy branding and tax settings',
            show: isSuperAdmin
        },
    ];

    const visibleTabs = tabs.filter(t => t.show);

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <SettingsIcon size={28} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                </div>
                <p className="text-gray-400">Manage your pharmacy system configuration and personal preferences.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="lg:w-72 flex-shrink-0">
                    <nav className="space-y-1">
                        {visibleTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabId)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                                        activeTab === tab.id
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                            : "text-gray-400 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <Icon size={20} className={cn(
                                        activeTab === tab.id ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                                    )} />
                                    <div className="text-left">
                                        <div className="block">{tab.name}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'general' && <GeneralSettings />}
                        {activeTab === 'branch' && <BranchSettings />}
                        {activeTab === 'user' && <UserPreferences />}
                        {activeTab === 'print' && <PrintSettings />}
                    </div>
                </main>
            </div>
        </div>
    );
}
