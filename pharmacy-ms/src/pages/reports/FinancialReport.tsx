import { useEffect } from 'react';
import { useFinancialReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/exportUtils';
import { Loader2, DollarSign, TrendingUp, PieChart as PieChartIcon, ShieldCheck } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ReportProps {
    dateRange: { startDate: string; endDate: string };
    branchId: string | null;
}

export default function FinancialReport({ dateRange, branchId }: ReportProps) {
    const { data, isLoading, error } = useFinancialReports(dateRange, branchId);

    useEffect(() => {
        const handleExport = () => {
            if (data?.dailyTrendChart) {
                const exportData = data.dailyTrendChart.map((item: any) => ({
                    Date: item.date,
                    Revenue: item.revenue.toFixed(2),
                    COGS: item.cogs.toFixed(2),
                    Gross_Profit: item.profit.toFixed(2)
                }));
                exportToCsv('Financial_PL_Trend', exportData);
            }
        };
        window.addEventListener('export-csv-financial', handleExport as EventListener);
        return () => window.removeEventListener('export-csv-financial', handleExport as EventListener);
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
                Failed to load financial report data.
            </div>
        );
    }

    const {
        totalRevenue, totalCogs, grossProfit, profitMargin,
        totalInsurance, dailyTrendChart
    } = data;



    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded-sm shadow-xl min-w-[200px]">
                    <p className="font-semibold mb-3 border-b border-slate-700 pb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center mb-1 text-sm">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-semibold text-slate-100">${Number(entry.value).toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center text-sm">
                        <span className="text-slate-400">Margin:</span>
                        <span className="font-bold text-emerald-400">
                            {payload[0].value > 0 ? ((payload[2].value / payload[0].value) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-16 h-16 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Gross Revenue</p>
                    <p className="text-4xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">Total sales inc. tax</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <PieChartIcon className="w-16 h-16 text-rose-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Cost of Goods Sold (COGS)</p>
                    <p className="text-4xl font-bold text-slate-900">${totalCogs.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">Based on batch FIFO</p>
                </div>

                <div className="bg-slate-900 p-6 border border-slate-800 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-16 h-16 text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Gross Profit</p>
                    <p className="text-4xl font-bold text-emerald-400">${grossProfit.toFixed(2)}</p>
                    <p className="text-sm text-slate-400 mt-2">{profitMargin.toFixed(1)}% blended margin</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldCheck className="w-16 h-16 text-blue-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Insurance Payables</p>
                    <p className="text-4xl font-bold text-blue-600">${totalInsurance.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">Revenue covered by insurers</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* P&L Trend Chart */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-sm p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900 mb-6">Profit & Loss Trend</h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyTrendChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val: number) => `$${val}`} dx={-10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                <Area type="monotone" dataKey="cogs" name="COGS" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCogs)" />
                                <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}
