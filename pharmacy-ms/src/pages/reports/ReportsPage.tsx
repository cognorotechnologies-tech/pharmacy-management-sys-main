import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Printer, Download, Calendar as CalendarIcon, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Placeholder components for the individual report tabs
import SalesReport from './SalesReport';
import InventoryReport from './InventoryReport';
import { NotificationBell } from '@/components/ui/NotificationBell';
import FinancialReport from './FinancialReport';
import PrescriptionReport from './PrescriptionReport';
import PurchasesReport from './PurchasesReport';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'custom';
type Tab = 'sales' | 'inventory' | 'financial' | 'prescriptions' | 'purchases';

export default function ReportsPage() {
    const { role, branchId: userBranchId } = useAuth();
    const isSuperAdmin = role === 'super_admin';

    const [activeTab, setActiveTab] = useState<Tab>('sales');
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [datePreset, setDatePreset] = useState<DatePreset>('last_30_days');
    const [customRange] = useState({
        startDate: subDays(new Date(), 30).toISOString(),
        endDate: new Date().toISOString()
    });

    const { data: branches } = useQuery({
        queryKey: ['branches_for_reports'],
        queryFn: async () => {
            const { data, error } = await supabase.from('branches').select('id, name');
            if (error) throw error;
            return data;
        },
        enabled: isSuperAdmin
    });

    // Calculate actual date range based on preset
    const getDateRange = () => {
        const now = new Date();
        switch (datePreset) {
            case 'today':
                return { startDate: startOfDay(now).toISOString(), endDate: endOfDay(now).toISOString() };
            case 'this_week':
                return { startDate: startOfWeek(now).toISOString(), endDate: endOfDay(now).toISOString() };
            case 'this_month':
                return { startDate: startOfMonth(now).toISOString(), endDate: endOfDay(now).toISOString() };
            case 'last_30_days':
                return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() };
            case 'custom':
                return customRange;
        }
    };

    const currentRange = getDateRange();
    const effectiveBranchId = isSuperAdmin ? (selectedBranchId === 'all' ? null : selectedBranchId) : userBranchId;

    const handleExportCSV = () => {
        window.dispatchEvent(new CustomEvent(`export-csv-${activeTab}`));
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Comprehensive view of pharmacy performance
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <NotificationBell />

                    {/* Branch Selector (Super Admin Only) */}
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-sm px-3 py-2">
                            <Store className="w-4 h-4 text-slate-500" />
                            <select
                                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                            >
                                <option value="all">System-wide (All Branches)</option>
                                {branches?.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date Preset Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-sm px-3 py-2">
                        <CalendarIcon className="w-4 h-4 text-slate-500" />
                        <select
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-4"
                            value={datePreset}
                            onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                        >
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_30_days">Last 30 Days</option>
                            {/* Custom omitted for V1 simplicity unless explicitly needed, or could trigger a modal */}
                        </select>
                    </div>

                    <Button variant="outline" className="gap-2 bg-white" onClick={handleExportCSV}>
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button variant="outline" className="gap-2 bg-white" onClick={handlePrint}>
                        <Printer className="w-4 h-4" /> Print
                    </Button>
                </div>
            </div>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:block print:mb-8 border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics - {activeTab.toUpperCase()}</h1>
                <div className="mt-2 text-sm text-slate-600">
                    <p><strong>Period:</strong> {format(new Date(currentRange.startDate), 'MMM dd, yyyy')} - {format(new Date(currentRange.endDate), 'MMM dd, yyyy')}</p>
                    {isSuperAdmin && <p><strong>Scope:</strong> {selectedBranchId === 'all' ? 'System-wide' : branches?.find(b => b.id === selectedBranchId)?.name}</p>}
                    <p><strong>Generated:</strong> {format(new Date(), 'PPP p')}</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 border-b border-slate-200 print:hidden">
                {(['sales', 'inventory', 'financial', 'prescriptions', 'purchases'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                  capitalize px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
               `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content Area */}
            <div className="py-2 print:py-0">
                {activeTab === 'sales' && <SalesReport dateRange={currentRange} branchId={effectiveBranchId} />}
                {activeTab === 'inventory' && <InventoryReport dateRange={currentRange} branchId={effectiveBranchId} />}
                {activeTab === 'financial' && <FinancialReport dateRange={currentRange} branchId={effectiveBranchId} />}
                {activeTab === 'prescriptions' && <PrescriptionReport dateRange={currentRange} branchId={effectiveBranchId} />}
                {activeTab === 'purchases' && <PurchasesReport dateRange={currentRange} branchId={effectiveBranchId} />}
            </div>
        </div>
    );
}
