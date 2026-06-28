import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutGrid, List, Plus, Loader2, Search, Clock,
    AlertTriangle, Pill, User, ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { usePrescriptionQueue, type RxQueueCard } from '@/hooks/usePrescriptions';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import type { PrescriptionStatus } from '@/types/database';

/* ─── Constants ───────────────────────────────────────────── */

const KANBAN_COLUMNS: { key: PrescriptionStatus; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: 'border-amber-300 bg-amber-50' },
    { key: 'in_progress', label: 'In Progress', color: 'border-blue-300 bg-blue-50' },
    { key: 'partially_dispensed', label: 'Partially Filled', color: 'border-orange-300 bg-orange-50' },
    { key: 'dispensed', label: 'Filled', color: 'border-green-300 bg-green-50' },
    { key: 'expired', label: 'Expired', color: 'border-slate-300 bg-slate-50' },
];

const STATUS_BADGE: Record<string, { variant: 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'orange'; label: string }> = {
    pending: { variant: 'amber', label: 'Pending' },
    in_progress: { variant: 'blue', label: 'In Progress' },
    verified: { variant: 'blue', label: 'Verified' },
    partially_dispensed: { variant: 'orange', label: 'Partial' },
    dispensed: { variant: 'green', label: 'Filled' },
    cancelled: { variant: 'red', label: 'Cancelled' },
    expired: { variant: 'slate', label: 'Expired' },
};

type ViewMode = 'kanban' | 'list';

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function PrescriptionQueuePage() {
    const navigate = useNavigate();
    const { branchId } = useAuth();
    const { data: prescriptions, isLoading } = usePrescriptionQueue(branchId);

    const [search, setSearch] = useState('');
    const [view, setView] = useState<ViewMode>(
        () => (localStorage.getItem('rx-view-pref') as ViewMode) || 'kanban',
    );

    const setViewAndPersist = (v: ViewMode) => {
        setView(v);
        localStorage.setItem('rx-view-pref', v);
    };

    // Filter by search
    const filtered = useMemo(() => {
        if (!prescriptions) return [];
        if (!search) return prescriptions;
        const q = search.toLowerCase();
        return prescriptions.filter((rx) =>
            `${rx.patient.first_name} ${rx.patient.last_name}`.toLowerCase().includes(q) ||
            rx.prescriber_name.toLowerCase().includes(q) ||
            rx.prescription_number.toLowerCase().includes(q),
        );
    }, [prescriptions, search]);

    // Group for kanban
    const grouped = useMemo(() => {
        const map: Record<string, RxQueueCard[]> = {};
        for (const col of KANBAN_COLUMNS) map[col.key] = [];
        for (const rx of filtered) {
            if (map[rx.status]) map[rx.status].push(rx);
        }
        return map;
    }, [filtered]);

    const totalPending = grouped.pending?.length || 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Prescription Queue
                            {totalPending > 0 && (
                                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
                                    {totalPending}
                                </span>
                            )}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {filtered.length} prescription{filtered.length !== 1 ? 's' : ''}
                            {search && ` matching "${search}"`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View toggle */}
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                            <button
                                onClick={() => setViewAndPersist('kanban')}
                                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-teal-50 text-teal-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" /> Board
                            </button>
                            <button
                                onClick={() => setViewAndPersist('list')}
                                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${view === 'list' ? 'bg-teal-50 text-teal-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <List className="h-3.5 w-3.5" /> List
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/prescriptions/new')}
                            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> New Rx
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by patient, doctor, or Rx number..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                    </div>
                ) : view === 'kanban' ? (
                    <KanbanView grouped={grouped} navigate={navigate} />
                ) : (
                    <ListView prescriptions={filtered} navigate={navigate} />
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   KANBAN VIEW
   ═══════════════════════════════════════════════════════════════ */

function KanbanView({
    grouped, navigate,
}: {
    grouped: Record<string, RxQueueCard[]>;
    navigate: ReturnType<typeof useNavigate>;
}) {
    return (
        <div className="grid grid-cols-5 gap-4">
            {KANBAN_COLUMNS.map((col) => {
                const cards = grouped[col.key] || [];
                return (
                    <div key={col.key} className="flex flex-col">
                        <div className={`rounded-t-lg border-t-4 px-3 py-2 ${col.color}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    {col.label}
                                </h3>
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/80 px-1.5 text-xs font-bold text-slate-600">
                                    {cards.length}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 rounded-b-lg border border-t-0 border-slate-200 bg-white/50 p-2 min-h-[200px]">
                            {cards.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-8">No items</p>
                            )}
                            {cards.map((rx) => (
                                <RxCard key={rx.id} rx={rx} onClick={() => {
                                    if (rx.status === 'pending' || rx.status === 'in_progress' || rx.status === 'verified' || rx.status === 'partially_dispensed') {
                                        navigate(`/prescriptions/${rx.id}/dispense`);
                                    }
                                }} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Single Kanban Card ─────────────────────────────────── */

function RxCard({ rx, onClick }: { rx: RxQueueCard; onClick: () => void }) {
    const itemCount = rx.items?.length ?? 0;
    const hasControlled = rx.items?.some((i) => i.product?.is_controlled) ?? false;

    return (
        <div
            onClick={onClick}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group"
        >
            <div className="flex items-start justify-between mb-1.5">
                <p className="text-xs font-medium text-slate-400">{rx.prescription_number}</p>
                {hasControlled && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-red-500" title="Contains controlled substance">
                        <AlertTriangle className="h-3 w-3" /> CS
                    </span>
                )}
            </div>

            <p className="font-semibold text-sm text-slate-900">
                {rx.patient.first_name} {rx.patient.last_name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
                Dr. {rx.prescriber_name}
            </p>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(rx.date_prescribed), 'MMM d')}
                </span>
                <span className="flex items-center gap-1">
                    <Pill className="h-3 w-3" />
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Urgency: allergies on patient */}
            {rx.patient.allergies?.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {rx.patient.allergies.length} allerg{rx.patient.allergies.length === 1 ? 'y' : 'ies'}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   LIST VIEW
   ═══════════════════════════════════════════════════════════════ */

function ListView({
    prescriptions, navigate,
}: {
    prescriptions: RxQueueCard[];
    navigate: ReturnType<typeof useNavigate>;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Rx #</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Doctor</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600">Items</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                        <th className="w-10" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {prescriptions.map((rx) => {
                        const badge = STATUS_BADGE[rx.status] || STATUS_BADGE.pending;
                        const hasControlled = rx.items?.some((i) => i.product?.is_controlled);
                        return (
                            <tr
                                key={rx.id}
                                onClick={() => {
                                    if (rx.status !== 'dispensed' && rx.status !== 'cancelled' && rx.status !== 'expired') {
                                        navigate(`/prescriptions/${rx.id}/dispense`);
                                    }
                                }}
                                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <span className="font-medium text-slate-900">{rx.prescription_number}</span>
                                    {hasControlled && (
                                        <span className="ml-1.5 text-red-500" title="Controlled">
                                            <AlertTriangle className="inline h-3.5 w-3.5" />
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
                                            {rx.patient.first_name.charAt(0)}{rx.patient.last_name.charAt(0)}
                                        </div>
                                        <span>{rx.patient.first_name} {rx.patient.last_name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">Dr. {rx.prescriber_name}</td>
                                <td className="px-4 py-3 text-slate-600">{format(parseISO(rx.date_prescribed), 'MMM d, yyyy')}</td>
                                <td className="px-4 py-3 text-center">{rx.items?.length ?? 0}</td>
                                <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                                <td className="px-2 py-3"><ChevronRight className="h-4 w-4 text-slate-300" /></td>
                            </tr>
                        );
                    })}
                    {prescriptions.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                                No prescriptions found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
