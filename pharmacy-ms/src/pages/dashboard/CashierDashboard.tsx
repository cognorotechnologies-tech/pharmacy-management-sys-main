import { useAuth } from '@/contexts/AuthContext';
import { useCashierDashboard } from '@/hooks/useDashboard';
import { Loader2, ShoppingCart, Clock, ArrowRight, CreditCard, Banknote, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { format, parseISO } from 'date-fns';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function CashierDashboard() {
    const { branchId, profile } = useAuth();
    const {
        todaySales,
        recentTransactions,
        activeShift,
        isLoading
    } = useCashierDashboard(branchId);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    const { revenue = 0, count = 0 } = todaySales || {};
    const avgSale = count > 0 ? revenue / count : 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checkout Terminal</h1>
                    <p className="mt-1 text-sm text-slate-500">Welcome back, {profile?.full_name?.split(' ')[0] || 'Cashier'}</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Shift Status Indicator */}
                    <div className="flex items-center gap-3">
                        {activeShift ? (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-sm">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-semibold text-emerald-800 uppercase tracking-widest">Shift Active</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-4 py-2 rounded-sm">
                                <span className="relative flex h-3 w-3">
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <span className="text-sm font-semibold text-red-800 uppercase tracking-widest">Shift Closed</span>
                            </div>
                        )}
                    </div>
                    <NotificationBell />
                </div>
            </div>

            {!activeShift && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-sm shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Activity className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">You don't have an active shift</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>Register operations and new sales require an active shift. Please start your shift to proceed.</p>
                            </div>
                            <div className="mt-4">
                                <div className="-mx-2 -my-1.5 flex">
                                    <Link to="/pos/shift">
                                        <Button size="sm" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200">
                                            Start Shift
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Primary Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <Link to="/pos" className={`block ${!activeShift ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 text-white h-full hover:bg-slate-800 transition-colors group relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="bg-slate-800 inline-block p-3 rounded-full mb-4">
                                <ShoppingCart className="h-6 w-6 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold">New Sale</h2>
                            <p className="text-slate-400 text-sm mt-1">Open Point of Sale register</p>
                        </div>
                        <ArrowRight className="absolute bottom-6 right-6 h-6 w-6 text-slate-600 group-hover:text-emerald-400 transform group-hover:translate-x-1 transition-all" />
                    </div>
                </Link>

                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    {/* KPI Cards */}
                    <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Register</p>
                        <p className="text-3xl font-bold text-slate-900">${revenue.toFixed(2)}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Receipts</p>
                        <p className="text-3xl font-bold text-slate-900">{count}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Avg Basket</p>
                        <p className="text-3xl font-bold text-blue-600">${avgSale.toFixed(2)}</p>
                    </div>
                </div>

            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-sm">
                <div className="border-b border-slate-200 p-5 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" /> Recent Transactions
                    </h2>
                    <Link to="/sales">
                        <Button variant="ghost" size="sm" className="text-blue-600">View History</Button>
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt #</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Method</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {format(parseISO(tx.created_at), 'hh:mm a')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {tx.receipt_number || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">
                                            ${Number(tx.total_amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                                                {tx.payment_method === 'cash' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                                                {tx.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                            <Link to={`/sales/${tx.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                                        No transactions recorded today.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
