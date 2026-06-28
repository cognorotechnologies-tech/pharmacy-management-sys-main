import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/database';
import { Forbidden403 } from './Forbidden403';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, role, isLoading } = useAuth();
    const location = useLocation();

    /* Loading spinner */
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    /* Not authenticated → redirect to login */
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    /* Role check */
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Forbidden403 />;
    }

    return <>{children}</>;
}
