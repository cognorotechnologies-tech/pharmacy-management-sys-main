import { useAuth } from '@/contexts/AuthContext';
import { useAdminDashboard } from '@/hooks/useDashboard';
import { Loader2, ShoppingCart, AlertCircle, Clock, Package, Users, TrendingUp, ShieldAlert, FileSearch } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function AdminDashboard() {
    const { branchId } = useAuth();
    const {
        todayKpis,
        salesTrend,
        topProducts,
        lowStockItems,
        expiryAlerts,
        pendingPrescriptionsCount,
        activeShifts,
        isLoading
    } = useAdminDashboard(branchId);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    // Calculate some aggregates
    const alerts30Count = expiryAlerts?.alerts30?.length || 0;
    const alerts60Count = expiryAlerts?.alerts60?.length || 0;
    const alerts90Count = expiryAlerts?.alerts90?.length || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Branch Operations</h1>
                    <p className="mt-1 text-sm text-slate-500">Live operational metrics for your location</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/admin/audit-logs">
                        <Button variant="outline" size="sm" className="h-9 border-slate-300">
                            <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
                            Audit Logs
                        </Button>
                    </Link>
                    <Link to="/admin/compliance">
                        <Button variant="outline" size="sm" className="h-9 border-slate-300">
                            <FileSearch className="w-4 h-4 mr-2 text-slate-500" />
                            Compliance
                        </Button>
                    </Link>
                    <NotificationBell />
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Revenue */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Today Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">${(todayKpis?.revenue || 0).toFixed(2)}</p>
                </div>

                {/* Transactions */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-slate-900">{todayKpis?.transactions || 0}</p>
                </div>

                {/* Avg Sale */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Avg Sale</p>
                    <p className="text-2xl font-bold text-slate-900">${(todayKpis?.avgSale || 0).toFixed(2)}</p>
                </div>

                {/* Gross Profit */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Gross Profit</p>
                    <p className="text-2xl font-bold text-emerald-600">${(todayKpis?.grossProfit || 0).toFixed(2)}</p>
                </div>

                {/* Margin */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 hover:shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Margin</p>
                    <p className="text-2xl font-bold text-indigo-600">{(todayKpis?.margin || 0).toFixed(1)}%</p>
                </div>
            </div>

            {/* Main Content Area (Asymmetric Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column (Charts and Trends) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Sales Trend Chart */}
                    <div className="bg-white border border-slate-200 rounded-sm flex flex-col">
                        <div className="border-b border-slate-200 p-5 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> 30-Day Sales Trend
                            </h2>
                        </div>
                        <div className="p-6 h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(parseISO(val), 'MMM dd')}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => `$${val}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '2px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                                        labelFormatter={(label) => format(parseISO(label as string), 'MMM dd, yyyy')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        name="Daily Revenue"
                                        stroke="#0EA5E9"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="movingAverage"
                                        name="7-Day Avg"
                                        stroke="#F59E0B"
                                        strokeWidth={2}
                                        fill="none"
                                        strokeDasharray="5 5"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-white border border-slate-200 rounded-sm flex flex-col">
                        <div className="border-b border-slate-200 p-5 bg-slate-50/50">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <Package className="h-4 w-4" /> Top 10 Products (30 Days)
                            </h2>
                        </div>
                        <div className="p-6 h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts || []} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                    <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#F8FAFC' }}
                                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="#14B8A6" radius={[0, 2, 2, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column (Widgets) */}
                <div className="space-y-6">

                    {/* Staff & Prescriptions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-sm p-4">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Users className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Active Staff</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{activeShifts?.length || 0}</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between text-slate-500 mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs font-medium uppercase tracking-wider truncate">Rx Queue</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-orange-600 mb-2">{pendingPrescriptionsCount || 0}</p>
                                <Link to="/prescriptions" className="text-xs font-medium text-blue-600 hover:text-blue-800 uppercase tracking-wider">View Queue &rarr;</Link>
                            </div>
                        </div>
                    </div>

                    {/* Expiry Alerts */}
                    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                        <div className="border-b border-slate-200 p-4 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500" /> Expiry Alerts
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-2 border-b border-slate-100">
                            <div className="text-center p-2 bg-red-50 text-red-700 rounded-sm">
                                <p className="text-xl font-bold">{alerts30Count}</p>
                                <p className="text-[10px] uppercase font-bold tracking-widest mt-1">30 Days</p>
                            </div>
                            <div className="text-center p-2 bg-orange-50 text-orange-700 rounded-sm">
                                <p className="text-xl font-bold">{alerts60Count}</p>
                                <p className="text-[10px] uppercase font-bold tracking-widest mt-1">60 Days</p>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 text-yellow-700 rounded-sm">
                                <p className="text-xl font-bold">{alerts90Count}</p>
                                <p className="text-[10px] uppercase font-bold tracking-widest mt-1">90 Days</p>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                            {/* Just showing the closest 5 alerts overall for compactness */}
                            {([...(expiryAlerts?.alerts30 || []), ...(expiryAlerts?.alerts60 || [])].slice(0, 5)).map((alert: any) => (
                                <div key={alert.id} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-700 truncate">{alert.products?.name}</span>
                                    <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-sm">
                                        {format(parseISO(alert.expiry_date), 'MM/dd')}
                                    </span>
                                </div>
                            ))}
                            {alerts30Count === 0 && alerts60Count === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No immediate expiry threats.</p>
                            )}
                        </div>
                    </div>

                    {/* Low Stock Widget */}
                    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col">
                        <div className="border-b border-slate-200 p-4 bg-slate-50/50">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-orange-500" /> Action Required: Low Stock
                            </h2>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-0">
                            <ul className="divide-y divide-slate-100">
                                {lowStockItems?.map((item: any) => (
                                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="text-sm font-medium text-slate-900 truncate">{item.products?.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Stock: <span className="text-red-600 font-semibold">{item.quantity_available}</span> / Min: {item.products?.min_stock_level}
                                            </p>
                                        </div>
                                        <Link to="/inventory">
                                            <Button size="sm" variant="outline" className="text-xs h-7 px-2">Refill</Button>
                                        </Link>
                                    </li>
                                ))}
                                {(!lowStockItems || lowStockItems.length === 0) && (
                                    <li className="p-8 text-center text-sm text-slate-500">All inventory levels optimal.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
