import { useEffect } from 'react';
import { useSalesReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/exportUtils';
import { Loader2, TrendingUp, Tag, CreditCard, Users } from 'lucide-react';
import {
    BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
interface ReportProps {
    dateRange: { startDate: string; endDate: string };
    branchId: string | null;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-3 rounded-sm shadow-xl border border-slate-700">
                <p className="font-semibold mb-1">{label}</p>
                <p className="text-emerald-400">
                    ${Number(payload[0].value).toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};

export default function SalesReport({ dateRange, branchId }: ReportProps) {
    const { data, isLoading, error } = useSalesReports(dateRange, branchId);

    useEffect(() => {
        const handleExport = () => {
            if (data?.topProducts) {
                const exportData = data.topProducts.map((p: any) => ({
                    Product_Name: p.name,
                    Quantity_Sold: p.quantity,
                    Revenue: Number(p.revenue).toFixed(2)
                }));
                exportToCsv('Sales_Top_Products', exportData);
            }
        };

        window.addEventListener('export-csv-sales', handleExport as EventListener);
        return () => window.removeEventListener('export-csv-sales', handleExport as EventListener);
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="text-center text-red-500 py-10">
                Failed to load sales report data.
            </div>
        );
    }

    const {
        totalRevenue, totalDiscounts, totalTransactions,
        avgDiscount, discountPercentage, dailyChart,
        topProducts, cashierPerformance, paymentChart, categoryChart
    } = data;



    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-16 h-16 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Gross Revenue</p>
                    <p className="text-4xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">{totalTransactions} total transactions</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CreditCard className="w-16 h-16 text-blue-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Avg Transaction</p>
                    <p className="text-4xl font-bold text-slate-900">
                        ${totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Revenue per receipt</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Tag className="w-16 h-16 text-orange-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Total Discounts</p>
                    <p className="text-4xl font-bold text-orange-600">${totalDiscounts.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">{discountPercentage.toFixed(1)}% of gross revenue</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Users className="w-16 h-16 text-indigo-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Avg Discount / Sale</p>
                    <p className="text-4xl font-bold text-indigo-600">${avgDiscount.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">Given across all sales</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Daily Sales Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900 mb-6">Daily Revenue Summary</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyChart}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val: any) => `$${val}`} dx={-10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 flex flex-col items-center">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900 mb-2 self-start">Payment Methods</h3>
                    <div className="flex-1 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={paymentChart}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentChart.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                                    contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products Table */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Top 20 Products by Sales</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty Sold</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {topProducts.map((product, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                                        <td className="px-6 py-3 text-sm text-slate-500 text-right">{product.quantity}</td>
                                        <td className="px-6 py-3 text-sm text-emerald-600 font-medium text-right">${product.revenue.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {topProducts.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No product sales in this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Sales by Category */}
                    <div className="bg-white border border-slate-200 rounded-sm">
                        <div className="p-5 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Sales by Category</h3>
                        </div>
                        <div className="p-6">
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryChart} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" tickFormatter={(val: any) => `$${val}`} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip contentStyle={{ borderRadius: '4px' }} formatter={(val: any) => `$${Number(val).toFixed(2)}`} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Cashier Performance */}
                    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Cashier Performance</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cashier Name</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales Made</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {cashierPerformance.map((cashier, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-sm font-medium text-slate-900 capitalize">{cashier.name.toLowerCase()}</td>
                                            <td className="px-6 py-3 text-sm text-slate-500 text-right">{cashier.count}</td>
                                            <td className="px-6 py-3 text-sm text-blue-600 font-medium text-right">${cashier.revenue.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {cashierPerformance.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No cashiers active in this period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
