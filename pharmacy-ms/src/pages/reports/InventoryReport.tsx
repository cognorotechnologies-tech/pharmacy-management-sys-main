import { useEffect } from 'react';
import { useInventoryReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/exportUtils';
import { Loader2, Package, Layers, AlertCircle } from 'lucide-react';
import {
    Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ReportProps {
    dateRange: { startDate: string; endDate: string };
    branchId: string | null;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function InventoryReport({ dateRange, branchId }: ReportProps) {
    const { data, isLoading, error } = useInventoryReports(dateRange, branchId);

    useEffect(() => {
        const handleExport = () => {
            if (data?.stockValuation) {
                const exportData = data.stockValuation.map((item: any) => ({
                    Product_Name: item.product_name,
                    Category: item.category,
                    Quantity: item.quantity,
                    Unit_Cost: item.unit_cost.toFixed(2),
                    Total_Value: item.total_value.toFixed(2)
                }));
                exportToCsv('Inventory_Valuation', exportData);
            }
        };

        window.addEventListener('export-csv-inventory', handleExport as EventListener);
        return () => window.removeEventListener('export-csv-inventory', handleExport as EventListener);
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
                Failed to load inventory report data.
            </div>
        );
    }

    const {
        totalStockValue, activeProductsCount, stockValuation,
        abcAnalysis, expiringBatches, stockMovement
    } = data;

    // Summarize ABC
    const abcSummary = [
        { name: 'Class A (Top 80%)', value: abcAnalysis.filter(p => p.grade === 'A').length },
        { name: 'Class B (Next 15%)', value: abcAnalysis.filter(p => p.grade === 'B').length },
        { name: 'Class C (Bottom 5%)', value: abcAnalysis.filter(p => p.grade === 'C').length }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Layers className="w-16 h-16 text-indigo-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Total Stock Value</p>
                    <p className="text-4xl font-bold text-slate-900">${totalStockValue.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">Weighted FIFO across {activeProductsCount} products</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Package className="w-16 h-16 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Stock Movements (Net)</p>
                    <p className="text-4xl font-bold text-slate-900">
                        {stockMovement[0].value} <span className="text-lg text-slate-400 font-normal">in</span> / {stockMovement[1].value} <span className="text-lg text-slate-400 font-normal">out</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Aggregated periodic adjustments</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Period Expiries Risk</p>
                    <p className="text-4xl font-bold text-red-600">
                        ${expiringBatches.reduce((sum, b) => sum + b.potential_loss, 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">{expiringBatches.length} batches expiring in selected period</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ABC Analysis Distribution */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 flex flex-col items-center">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900 mb-2 self-start">ABC Class Distribution (By Volume)</h3>
                    <div className="flex-1 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={abcSummary}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {abcSummary.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [`${value} Products`, 'Count']}
                                    contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expiry Report */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col h-[350px]">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Batches Expiring in Period</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch #</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Loss Risk</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {expiringBatches.map((batch, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{batch.product_name}</td>
                                        <td className="px-6 py-3 text-sm text-slate-500">{batch.batch_number}</td>
                                        <td className="px-6 py-3 text-sm text-red-600 font-medium">{format(parseISO(batch.expiry_date), 'MMM dd, yyyy')}</td>
                                        <td className="px-6 py-3 text-sm text-slate-500 text-right">{batch.quantity}</td>
                                        <td className="px-6 py-3 text-sm text-slate-900 font-medium text-right">${batch.potential_loss.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {expiringBatches.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No batches expiring in this date range.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Current Stock Valuation Table */}
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-5 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Current Stock Valuation (Top 100 by Value)</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">On Hand</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Cost</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {stockValuation.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{item.product_name}</td>
                                    <td className="px-6 py-3 text-sm text-slate-500 capitalize">{item.category}</td>
                                    <td className="px-6 py-3 text-sm text-slate-900 font-medium text-right">{item.quantity}</td>
                                    <td className="px-6 py-3 text-sm text-slate-500 text-right">${item.unit_cost.toFixed(2)}</td>
                                    <td className="px-6 py-3 text-sm text-indigo-600 font-medium text-right">${item.total_value.toFixed(2)}</td>
                                </tr>
                            ))}
                            {stockValuation.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No active stock to value.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
