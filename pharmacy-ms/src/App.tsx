import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import UsersPage from '@/pages/admin/UsersPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import ComplianceReportsPage from './pages/admin/ComplianceReportsPage';
import ProductsPage from '@/pages/inventory/ProductsPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import SuppliersPage from '@/pages/purchasing/SuppliersPage';
import PurchaseOrdersPage from '@/pages/purchasing/PurchaseOrdersPage';
import CreatePOPage from '@/pages/purchasing/CreatePOPage';
import ReceiveDeliveryPage from '@/pages/purchasing/ReceiveDeliveryPage';
import PatientsPage from '@/pages/patients/PatientsPage';
import PatientProfilePage from '@/pages/patients/PatientProfilePage';
import PrescriptionQueuePage from '@/pages/prescriptions/PrescriptionQueuePage';
import CreatePrescriptionPage from '@/pages/prescriptions/CreatePrescriptionPage';
import DispensePrescriptionPage from '@/pages/prescriptions/DispensePrescriptionPage';
import POSPage from '@/pages/sales/POSPage';
import type { UserRole } from '@/types/database';

import DashboardPage from '@/pages/dashboard/DashboardPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import NotificationCenterPage from '@/pages/notifications/NotificationCenterPage';
import SettingsPage from '@/pages/settings/SettingsPage';


/* ─── Role groups ──────────────────────────────────────────── */

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'pharmacist', 'inventory_staff', 'cashier'];
const ADMIN_PLUS: UserRole[] = ['super_admin', 'admin'];
const INVENTORY_ROLES: UserRole[] = ['super_admin', 'admin', 'inventory_staff'];
const CLINICAL_ROLES: UserRole[] = ['super_admin', 'admin', 'pharmacist'];
const SALES_ROLES: UserRole[] = ['super_admin', 'admin', 'cashier', 'pharmacist'];

/* ─── App ──────────────────────────────────────────────────── */

import MainLayout from '@/components/MainLayout';
import CommandPalette from '@/components/CommandPalette';

export default function App() {
  return (
    <>
      <CommandPalette />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes wrapped in MainLayout */}
        <Route element={<ProtectedRoute allowedRoles={ALL_ROLES}><MainLayout children={<Navigate to="/" />} /></ProtectedRoute>}>
          {/* This is a bit tricky with react-router-dom v7. Since I'm using v7 (from package.json), I should use Layout routes or just wrap each. 
              Actually, the original App.tsx used individual Routes. I will use a Layout Route pattern if possible, or just wrap the children.
          */}
        </Route>

        {/* I'll refactor to use a Layout Route for cleaner structure */}
        <Route element={<LayoutWrapper />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={[...INVENTORY_ROLES, 'pharmacist']}>
              <InventoryPage />
            </ProtectedRoute>
          } />

          <Route path="/inventory/products" element={
            <ProtectedRoute allowedRoles={[...INVENTORY_ROLES, 'pharmacist']}>
              <ProductsPage />
            </ProtectedRoute>
          } />

          <Route path="/purchasing/suppliers" element={
            <ProtectedRoute allowedRoles={INVENTORY_ROLES}>
              <SuppliersPage />
            </ProtectedRoute>
          } />

          <Route path="/purchasing/orders" element={
            <ProtectedRoute allowedRoles={INVENTORY_ROLES}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          } />

          <Route path="/purchasing/orders/new" element={
            <ProtectedRoute allowedRoles={INVENTORY_ROLES}>
              <CreatePOPage />
            </ProtectedRoute>
          } />

          <Route path="/purchasing/orders/:id/receive" element={
            <ProtectedRoute allowedRoles={INVENTORY_ROLES}>
              <ReceiveDeliveryPage />
            </ProtectedRoute>
          } />

          <Route path="/sales" element={
            <ProtectedRoute allowedRoles={SALES_ROLES}>
              <POSPage />
            </ProtectedRoute>
          } />

          <Route path="/prescriptions" element={
            <ProtectedRoute allowedRoles={CLINICAL_ROLES}>
              <PrescriptionQueuePage />
            </ProtectedRoute>
          } />

          <Route path="/prescriptions/new" element={
            <ProtectedRoute allowedRoles={CLINICAL_ROLES}>
              <CreatePrescriptionPage />
            </ProtectedRoute>
          } />

          <Route path="/prescriptions/:id/dispense" element={
            <ProtectedRoute allowedRoles={CLINICAL_ROLES}>
              <DispensePrescriptionPage />
            </ProtectedRoute>
          } />

          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientProfilePage />} />

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={ADMIN_PLUS}>
              <ReportsPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={ADMIN_PLUS}>
              <UsersPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/audit-logs" element={
            <ProtectedRoute allowedRoles={ADMIN_PLUS}>
              <AuditLogPage />
            </ProtectedRoute>
          } />

          <Route path="/admin/compliance" element={
            <ProtectedRoute allowedRoles={ADMIN_PLUS}>
              <ComplianceReportsPage />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={<NotificationCenterPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all → redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/**
 * A simple layout wrapper that applies MainLayout and ProtectedRoute 
 * to all nested routes that don't have their own specific role requirements.
 */
function LayoutWrapper() {
  return (
    <ProtectedRoute allowedRoles={ALL_ROLES}>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ProtectedRoute>
  );
}
