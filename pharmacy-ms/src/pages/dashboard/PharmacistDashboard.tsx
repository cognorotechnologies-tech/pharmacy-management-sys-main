import { useAuth } from '@/contexts/AuthContext';
import { usePharmacistDashboard } from '@/hooks/useDashboard';
import { Loader2, Clock, CheckCircle2, AlertTriangle, Pill, User, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

import { NotificationBell } from '@/components/ui/NotificationBell';

export default function PharmacistDashboard() {
    const { branchId, profile } = useAuth();
    const {
        pendingPrescriptions,
        dispensedTodayCount,
        lowStockItems,
        isLoading
    } = usePharmacistDashboard(branchId);

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
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome, {profile?.full_name?.split(' ')[0] || 'Pharmacist'}</h1>
                    <p className="mt-1 text-sm text-slate-500">Your daily dispensing queue and alerts</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right border-r border-slate-200 pr-4 mr-1">
                        <p className="text-sm font-medium text-slate-600">Dispensed Today</p>
                        <p className="text-2xl font-bold text-emerald-600">{dispensedTodayCount}</p>
                    </div>
                    <NotificationBell />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Queue */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-sm flex flex-col h-[600px]">
                        <div className="border-b border-slate-200 p-5 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <Clock className="h-4 w-4 text-orange-500" /> Pending Prescriptions ({pendingPrescriptions?.length || 0})
                            </h2>
                            <Link to="/prescriptions">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">View All</Button>
                            </Link>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            {pendingPrescriptions && pendingPrescriptions.length > 0 ? (
                                <ul className="divide-y divide-slate-100">
                                    {pendingPrescriptions.map((rx: any) => (
                                        <li key={rx.id} className="p-5 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-900">{rx.patient_name}</h3>
                                                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                                        <User className="h-3 w-3" /> Dr. {rx.doctor_name}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-sm bg-orange-100 text-orange-700">
                                                    Wait: {Math.floor((new Date().getTime() - new Date(rx.created_at).getTime()) / 60000)} mins
                                                </span>
                                            </div>

                                            {rx.notes && (
                                                <div className="mt-3 bg-yellow-50/50 border border-yellow-100 p-3 rounded-sm text-sm text-yellow-800">
                                                    <p className="font-medium text-xs mb-1 uppercase tracking-wider text-yellow-600">Notes</p>
                                                    {rx.notes}
                                                </div>
                                            )}

                                            <div className="mt-4 flex gap-3">
                                                <Link to={`/prescriptions/${rx.id}`}>
                                                    <Button size="sm">Process Prescription</Button>
                                                </Link>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                                    <p>Queue is empty. Great job!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 text-white">
                        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <Link to="/prescriptions/new" className="block">
                                <Button variant="secondary" className="w-full justify-start text-white bg-slate-800 hover:bg-slate-700 border border-slate-700">
                                    <FileText className="h-4 w-4 mr-2" /> New Prescription
                                </Button>
                            </Link>
                            <Link to="/inventory" className="block">
                                <Button variant="secondary" className="w-full justify-start text-white bg-slate-800 hover:bg-slate-700 border border-slate-700">
                                    <Pill className="h-4 w-4 mr-2" /> Check Stock
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Low Rx Stock */}
                    <div className="bg-white border border-slate-200 rounded-sm">
                        <div className="border-b border-slate-200 p-4 bg-slate-50/50">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" /> Low Rx Stock
                            </h2>
                        </div>
                        <div className="p-0">
                            {lowStockItems && lowStockItems.length > 0 ? (
                                <ul className="divide-y divide-slate-100">
                                    {lowStockItems.map((item: any) => (
                                        <li key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{item.products?.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Min: {item.products?.min_stock_level}</p>
                                            </div>
                                            <span className="text-lg font-bold text-red-600">{item.quantity_available}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-6 text-center text-sm text-slate-500">
                                    All prescription drugs are well-stocked.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
