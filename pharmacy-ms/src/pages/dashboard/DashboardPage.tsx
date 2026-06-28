import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';
import PharmacistDashboard from './PharmacistDashboard';
import CashierDashboard from './CashierDashboard';
import InventoryStaffDashboard from './InventoryStaffDashboard';
import { Navigate } from 'react-router-dom';

export default function DashboardPage() {
    const { role, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user || !role) {
        return <Navigate to="/login" replace />;
    }

    switch (role) {
        case 'super_admin':
            return <SuperAdminDashboard />;
        case 'admin':
            return <AdminDashboard />;
        case 'pharmacist':
            return <PharmacistDashboard />;
        case 'cashier':
            return <CashierDashboard />;
        case 'inventory_staff':
            return <InventoryStaffDashboard />;
        default:
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-50">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                        <p className="mt-2 text-slate-500">Unrecognized role: {role}</p>
                    </div>
                </div>
            );
    }
}
