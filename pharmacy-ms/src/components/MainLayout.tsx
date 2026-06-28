import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Pill,
    Package,
    Truck,
    Users,
    BarChart3,
    ShieldCheck,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Header } from './Header';
import { usePrescriptionQueue } from '@/hooks/usePrescriptions';

interface NavItem {
    name: string;
    href: string;
    icon: any;
    roles: string[];
    badge?: number;
}

const NAV_ITEMS: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'pharmacist', 'inventory_staff', 'cashier', 'technician'] },
    { name: 'POS / Sales', href: '/sales', icon: ShoppingCart, roles: ['super_admin', 'admin', 'cashier', 'pharmacist'] },
    { name: 'Prescriptions', href: '/prescriptions', icon: Pill, roles: ['super_admin', 'admin', 'pharmacist'], badge: 0 }, // Badge will be updated live
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['super_admin', 'admin', 'inventory_staff', 'pharmacist'] },
    { name: 'Purchasing', href: '/purchasing/orders', icon: Truck, roles: ['super_admin', 'admin', 'inventory_staff'] },
    { name: 'Patients', href: '/patients', icon: Users, roles: ['super_admin', 'admin', 'pharmacist', 'inventory_staff', 'cashier', 'technician'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['super_admin', 'admin'] },
    { name: 'Admin', href: '/admin/users', icon: ShieldCheck, roles: ['super_admin', 'admin'] },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { profile, signOut } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });
    const location = useLocation();

    const branchId = profile?.branch_id || null;
    const { data: pendingRx } = usePrescriptionQueue(branchId, 'pending');
    const pendingCount = pendingRx?.length || 0;

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    const userRole = profile?.role || 'technician';
    const visibleNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

    const isActive = (path: string) => {
        if (path === '/' && location.pathname !== '/') return false;
        return location.pathname.startsWith(path);
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside
                className={cn(
                    "relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out z-30",
                    isSidebarCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Sidebar Header */}
                <div className="h-16 flex items-center px-4 border-b border-slate-800/50">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 rounded-sm flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
                            P
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-sm font-bold text-white leading-tight">PharmacySys</span>
                                <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider line-clamp-1">
                                    {profile?.branch_id ? 'Downtown Branch' : 'HQ'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {visibleNavItems.map((item) => {
                        const Active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 group relative",
                                    Active
                                        ? "bg-emerald-500/10 text-emerald-500 font-medium"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                )}
                            >
                                <item.icon size={20} className={cn(
                                    "flex-shrink-0 transition-colors",
                                    Active ? "text-emerald-500" : "text-slate-500 group-hover:text-slate-300"
                                )} />

                                {!isSidebarCollapsed && (
                                    <span className="text-sm truncate animate-in fade-in duration-300">{item.name}</span>
                                )}

                                {item.name === 'Prescriptions' && pendingCount > 0 && (
                                    <span className={cn(
                                        "absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-in zoom-in",
                                        isSidebarCollapsed && "-top-1 -right-1 h-3 w-3"
                                    )}>
                                        {pendingCount > 9 ? '9+' : pendingCount}
                                    </span>
                                )}

                                {/* Active Indicator */}
                                {Active && (
                                    <div className="absolute left-0 w-0.5 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                )}

                                {/* Tooltip for collapsed state */}
                                {isSidebarCollapsed && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-40 shadow-xl border border-slate-700">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-800 space-y-4">
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-3 p-2 rounded-sm bg-slate-950/50 border border-slate-800 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="w-8 h-8 rounded-sm bg-slate-800 flex items-center justify-center border border-slate-700">
                                <UserIcon size={16} className="text-slate-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-white truncate">{profile?.full_name || 'User'}</span>
                                <span className="text-[10px] text-slate-500 capitalize">{userRole.replace('_', ' ')}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <Link
                            to="/settings"
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-sm transition-colors group",
                                isActive('/settings') ? "text-emerald-500 bg-emerald-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                            )}
                        >
                            <Settings size={20} className="flex-shrink-0" />
                            {!isSidebarCollapsed && <span className="text-sm">Settings</span>}
                        </Link>

                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-3 px-3 py-2 rounded-sm text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group"
                        >
                            <LogOut size={20} className="flex-shrink-0" />
                            {!isSidebarCollapsed && <span className="text-sm">Sign Out</span>}
                        </button>
                    </div>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-40 group shadow-lg"
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header />

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-6">
                    <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-1 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
