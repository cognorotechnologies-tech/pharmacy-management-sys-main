import { useSuperAdminDashboard } from '@/hooks/useDashboard';
import { Loader2, TrendingUp, Building2, AlertOctagon, FileText, Activity, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function SuperAdminDashboard() {
    const {
        pharmaciesCount,
        pendingPrescriptionsCount,
        lowStockCount,
        totalRevenue,
        branchPerformance,
        activityFeed,
        isLoading
    } = useSuperAdminDashboard();

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Overview</h1>
                    <p className="mt-1 text-sm text-slate-500">Live metrics across all pharmacy branches</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/admin/audit-logs">
                        <Button variant="outline" size="sm" className="h-9 border-slate-300">
                            <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
                            System Audit
                        </Button>
                    </Link>
                    <NotificationBell />
                </div>
            </div>

            {/* KPI Cards (Typographic Brutalism + Clean Borders) */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Revenue */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Total Revenue Today</p>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="mt-4 text-4xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
                </div>

                {/* Pharmacies */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Active Pharmacies</p>
                        <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="mt-4 text-4xl font-bold text-slate-900">{pharmaciesCount}</p>
                </div>

                {/* Low Stock */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Low Stock Alerts</p>
                        <AlertOctagon className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="mt-4 text-4xl font-bold text-slate-900">{lowStockCount}</p>
                </div>

                {/* Pending Prescriptions */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Pending Prescriptions</p>
                        <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="mt-4 text-4xl font-bold text-slate-900">{pendingPrescriptionsCount}</p>
                </div>
            </div>

            {/* Main Grid: 70/30 split for Charts and Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Branch Performance Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm flex flex-col">
                    <div className="border-b border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900">Branch Performance (Today)</h2>
                    </div>
                    <div className="p-6 flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={branchPerformance} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                <XAxis type="number" tick={{ fill: '#64748B' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="branchName" type="category" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '2px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#0EA5E9" radius={[0, 2, 2, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white border border-slate-200 rounded-sm flex flex-col h-[500px]">
                    <div className="border-b border-slate-200 p-6 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-500" />
                            Activity Feed
                        </h2>
                    </div>
                    <div className="p-0 overflow-y-auto flex-1">
                        <div className="divide-y divide-slate-100">
                            {activityFeed.map((log: any) => (
                                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-medium text-slate-900 truncate pr-4">
                                            {log.profiles?.full_name || 'System'}
                                        </span>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                            {format(new Date(log.created_at), 'HH:mm')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        <span className="font-semibold text-slate-700 capitalize">{log.action.replace('_', ' ')}</span> {log.entity_type}
                                    </p>
                                    {log.branches?.name && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            📍 {log.branches.name}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {activityFeed.length === 0 && (
                                <div className="p-8 text-center text-sm text-slate-500">
                                    No recent activity found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
