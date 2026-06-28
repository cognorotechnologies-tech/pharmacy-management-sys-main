import { useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronRight,
    Search,
    LayoutGrid,
    Building2,
    LogOut,
    User,
    Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from './ui/NotificationBell';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Header() {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        if (profile?.role === 'super_admin') {
            supabase.from('branches').select('id, name').then(({ data }) => {
                if (data) setBranches(data);
            });
        }
    }, [profile]);

    // Generate breadcrumbs from location
    const pathnames = location.pathname.split('/').filter((x) => x);

    const handleToggleSearch = () => {
        window.dispatchEvent(new CustomEvent('toggle-command-palette'));
    };

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-medium">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 -ml-2 text-slate-500 hover:text-white transition-colors"
                >
                    <LayoutGrid size={16} />
                </button>

                {pathnames.map((name, index) => {
                    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathnames.length - 1;

                    return (
                        <div key={name} className="flex items-center gap-2">
                            <ChevronRight size={14} className="text-slate-700" />
                            <button
                                onClick={() => !isLast && navigate(routeTo)}
                                className={cn(
                                    "capitalize transition-colors",
                                    isLast ? "text-white font-bold" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {name.replace(/-/g, ' ')}
                            </button>
                        </div>
                    );
                })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {/* Global Search Trigger */}
                <button
                    onClick={handleToggleSearch}
                    className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-950 border border-slate-800 rounded-sm text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-all group"
                >
                    <Search size={16} className="group-hover:text-emerald-500 transition-colors" />
                    <span className="text-xs">Search...</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-600">
                        ⌘K
                    </kbd>
                </button>

                {/* Branch Switcher (Super Admin Only) */}
                {profile?.role === 'super_admin' && branches.length > 0 && (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-sm">
                        <Building2 size={14} className="text-slate-500" />
                        <select className="bg-transparent border-none text-[11px] font-bold text-slate-300 focus:ring-0 p-0 cursor-pointer hover:text-white transition-colors">
                            {branches.map(b => (
                                <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="w-px h-6 bg-slate-800 mx-1" />

                <NotificationBell />

                <div className="relative group ml-1">
                    <button className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-800 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs font-bold">
                            {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                    </button>

                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 z-50 p-2 hidden group-hover:block animate-in zoom-in-95 duration-200">
                        <div className="px-3 py-3 border-b border-slate-100 mb-1">
                            <p className="text-sm font-bold text-slate-900">{profile?.full_name || 'Pharmacist'}</p>
                            <p className="text-[10px] font-medium text-slate-500 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                        >
                            <User size={16} />
                            Profile Settings
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                        >
                            <Settings size={16} />
                            System Preferences
                        </button>
                        <div className="h-px bg-slate-100 my-1" />
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
