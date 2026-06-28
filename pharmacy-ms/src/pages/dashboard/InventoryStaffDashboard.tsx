import { useAuth } from '@/contexts/AuthContext';
import { useInventoryDashboard } from '@/hooks/useDashboard';
import { Loader2, PackageSearch, AlertTriangle, AlertCircle, PlusCircle, ClipboardCheck, ArrowDownToLine, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { format, parseISO } from 'date-fns';
import { NotificationBell } from '@/components/ui/NotificationBell';

export default function InventoryStaffDashboard() {
    const { branchId, profile } = useAuth();
    const {
        totalProductsCount,
        lowStockItems,
        expiringBatches,
        isLoading
    } = useInventoryDashboard(branchId);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    // Combine alerts for the Attention Required table
    const attentionRequired: any[] = [];

    (lowStockItems || []).forEach((item: any) => {
        attentionRequired.push({
            id: `low_stock_${item.id}`,
            type: 'low_stock',
            name: item.products?.name,
            detail: `Stock: ${item.quantity_available} (Min: ${item.products?.min_stock_level})`,
            severity: 'high'
        });
    });

    (expiringBatches || []).forEach((batch: any) => {
        attentionRequired.push({
            id: `expiry_${batch.id}`,
            type: 'expiry',
            name: batch.products?.name,
            detail: `Batch ${batch.batch_number} expires on ${format(parseISO(batch.expiry_date), 'MMM dd, yyyy')}`,
            severity: 'medium'
        });
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventory Control Center</h1>
                    <p className="mt-1 text-sm text-slate-500">Welcome, {profile?.full_name?.split(' ')[0] || 'Staff'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex gap-3">
                        <Link to="/inventory/new">
                            <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
                                Add Product
                            </Button>
                        </Link>
                    </div>
                    <NotificationBell />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Stats & Actions */}
                <div className="space-y-6">

                    <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 text-white text-center">
                        <PackageSearch className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-4xl font-bold mb-1">{totalProductsCount}</p>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Products</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-sm text-center">
                            <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-orange-700">{lowStockItems?.length || 0}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mt-1">Low Stock</p>
                        </div>
                        <div className="bg-red-50 border border-red-100 p-4 rounded-sm text-center">
                            <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-700">{expiringBatches?.length || 0}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mt-1">Expiring</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-sm p-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link to="/inventory/audit" className="block">
                                <Button variant="outline" className="w-full justify-start text-slate-700 bg-slate-50 hover:bg-slate-100">
                                    <ClipboardCheck className="w-4 h-4 mr-2 text-slate-500" /> Stock Audit
                                </Button>
                            </Link>
                            <Link to="/purchases/receive" className="block">
                                <Button variant="outline" className="w-full justify-start text-slate-700 bg-slate-50 hover:bg-slate-100">
                                    <ArrowDownToLine className="w-4 h-4 mr-2 text-slate-500" /> Receive Delivery
                                </Button>
                            </Link>
                            <Link to="/inventory" className="block">
                                <Button variant="outline" className="w-full justify-start text-slate-700 bg-slate-50 hover:bg-slate-100">
                                    <Package className="w-4 h-4 mr-2 text-slate-500" /> View All Stock
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Table: Attention Required */}
                <div className="lg:col-span-3">
                    <div className="bg-white border border-slate-200 rounded-sm flex flex-col h-[700px]">
                        <div className="border-b border-slate-200 p-5 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-slate-500" /> Attention Required
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Issue Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {attentionRequired && attentionRequired.length > 0 ? (
                                        attentionRequired.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.type === 'low_stock' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-medium bg-orange-100 text-orange-800">
                                                            <AlertTriangle className="w-3 h-3" /> Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-medium bg-red-100 text-red-800">
                                                            <AlertCircle className="w-3 h-3" /> Expiring
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {item.detail}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {item.type === 'low_stock' ? (
                                                        <Link to="/inventory" className="text-blue-600 hover:text-blue-900">Reorder</Link>
                                                    ) : (
                                                        <Link to="/inventory/audit" className="text-blue-600 hover:text-blue-900">Audit</Link>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                                                No immediate attention required. All good!
                                            </td>
                                        </tr>
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

// Fixed missing import CheckCircle2
import { CheckCircle2 } from 'lucide-react';
