import React, { useEffect } from 'react';
import { usePurchasesReports } from '@/hooks/useReports';
import { exportToCsv } from '@/lib/exportUtils';
import { Loader2, ShoppingCart, Truck, Clock } from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ReportProps {
    dateRange: { startDate: string; endDate: string };
    branchId: string | null;
}

const COLORS = {
    'Draft': '#94a3b8',
    'Ordered': '#3b82f6',
    'Partially Received': '#f59e0b',
    'Received': '#10b981',
    'Cancelled': '#ef4444'
};
const defaultColor = '#64748b';

export default function PurchasesReport({ dateRange, branchId }: ReportProps) {
    const { data, isLoading, error } = usePurchasesReports(dateRange, branchId);

    useEffect(() => {
        const handleExport = () => {
            if (data?.ordersList) {
                const exportData = data.ordersList.map((po: any) => ({
                    PO_Number: po.order_number,
                    Order_Date: format(parseISO(po.order_date), 'MMM dd, yyyy'),
                    Expected_Date: po.expected_date ? format(parseISO(po.expected_date), 'MMM dd, yyyy') : 'N/A',
                    Supplier: po.supplier,
                    Amount: po.amount.toFixed(2),
                    Status: po.status
                }));
                exportToCsv('Purchase_Orders', exportData);
            }
        };
        window.addEventListener('export-csv-purchases', handleExport as EventListener);
        return () => window.removeEventListener('export-csv-purchases', handleExport as EventListener);
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
                Failed to load purchases report data.
            </div>
        );
    }

    const {
        totalOrders, totalValue, pendingValue,
        statusChart, ordersList
    } = data;



    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ordered': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Ordered</span>;
            case 'received': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Received</span>;
            case 'partially_received': return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Partial</span>;
            case 'cancelled': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Cancelled</span>;
            default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full capitalize">{status}</span>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShoppingCart className="w-16 h-16 text-slate-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Total Orders Placed</p>
                    <p className="text-4xl font-bold text-slate-900">{totalOrders}</p>
                    <p className="text-sm text-slate-500 mt-2">Purchase orders created</p>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Truck className="w-16 h-16 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Total Ordered Value</p>
                    <p className="text-4xl font-bold text-emerald-600">${totalValue.toFixed(2)}</p>
                    <p className="text-sm text-slate-500 mt-2">Gross purchases commitment</p>
                </div>

                <div className="bg-slate-900 p-6 border border-slate-800 rounded-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock className="w-16 h-16 text-orange-400" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Pending Delivery Value</p>
                    <p className="text-4xl font-bold text-orange-400">${pendingValue.toFixed(2)}</p>
                    <p className="text-sm text-slate-400 mt-2">Locked in awaiting stock</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Order Status Distribution */}
                <div className="bg-white border border-slate-200 rounded-sm p-6 flex flex-col items-center h-[400px]">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900 mb-2 self-start">Volume By Status</h3>
                    <div className="flex-1 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={statusChart}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusChart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name] || defaultColor} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Purchase Orders List */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Purchase Orders Issued</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {ordersList.map((po, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-sm font-bold text-slate-900">{po.order_number}</td>
                                        <td className="px-6 py-3 text-sm text-slate-500">{format(parseISO(po.order_date), 'MMM dd, yyyy')}</td>
                                        <td className="px-6 py-3 text-sm text-slate-800 font-medium">{po.supplier}</td>
                                        <td className="px-6 py-3 text-sm text-slate-900 font-medium text-right">${po.amount.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-sm text-right">{getStatusBadge(po.status)}</td>
                                    </tr>
                                ))}
                                {ordersList.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No purchase orders found for this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}
