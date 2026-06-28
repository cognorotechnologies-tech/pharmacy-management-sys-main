import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/database';

/* ─── Role sets ────────────────────────────────────────────── */

const MANAGE_USERS: UserRole[] = ['super_admin', 'admin'];
const MANAGE_INVENTORY: UserRole[] = ['super_admin', 'admin', 'inventory_staff'];
const PROCESS_SALES: UserRole[] = ['super_admin', 'admin', 'cashier', 'pharmacist'];
const DISPENSE: UserRole[] = ['super_admin', 'admin', 'pharmacist'];
const VIEW_REPORTS: UserRole[] = ['super_admin', 'admin'];
const MANAGE_SUPPLIERS: UserRole[] = ['super_admin', 'admin', 'inventory_staff'];

/* ─── Hook ─────────────────────────────────────────────────── */

export function usePermissions() {
    const { role } = useAuth();

    return useMemo(() => {
        const has = (allowed: UserRole[]) => role !== null && allowed.includes(role);

        return {
            /** Can create/edit/deactivate user profiles */
            canManageUsers: () => has(MANAGE_USERS),

            /** Can manage inventory, batches, stock adjustments */
            canManageInventory: () => has(MANAGE_INVENTORY),

            /** Can create/process sales at POS */
            canProcessSales: () => has(PROCESS_SALES),

            /** Can verify and dispense prescriptions */
            canDispense: () => has(DISPENSE),

            /** Can access analytics and reporting dashboards */
            canViewReports: () => has(VIEW_REPORTS),

            /** Can manage supplier records and purchase orders */
            canManageSuppliers: () => has(MANAGE_SUPPLIERS),

            /** Has global (cross-branch) access — super_admin only */
            isGlobal: () => role === 'super_admin',

            /** Current role */
            role,
        };
    }, [role]);
}
