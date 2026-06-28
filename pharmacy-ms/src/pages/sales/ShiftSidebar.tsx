import React, { useState } from 'react';
import {
    Clock,
    TrendingUp,
    CreditCard,
    Banknote,
    ShieldCheck,
    LogOut,
    ArrowRightLeft,
} from 'lucide-react';
import { useShiftStats, useEndShift } from '@/hooks/useShifts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { generateShiftReportPDF } from './ShiftReportPDF';

interface ShiftSidebarProps {
    shiftId: string;
    onShiftEnded: () => void;
}

export const ShiftSidebar: React.FC<ShiftSidebarProps> = ({ shiftId, onShiftEnded }) => {
    const { data: stats, isLoading } = useShiftStats(shiftId);
    const endShift = useEndShift();
    const [isEnding, setIsEnding] = useState(false);

    const handleEndShift = async () => {
        if (!stats) return;
        if (!window.confirm('Are you sure you want to end your shift? This will generate a final report.')) return;

        setIsEnding(true);
        try {
            await endShift.mutateAsync({ shiftId, stats });
            toast.success('Shift ended successfully');

            // Generate report
            const doc = generateShiftReportPDF({
                id: shiftId,
                stats,
            });
            doc.save(`Shift-Report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);

            onShiftEnded();
        } catch (err) {
            toast.error('Failed to end shift');
            setIsEnding(false);
        }
    };

    if (isLoading || !stats) {
        return <div className="p-6 text-center text-slate-500 text-sm">Loading shift stats...</div>;
    }

    return (
        <div className="h-full flex flex-col bg-slate-900 text-white border-l border-slate-800 shadow-2xl w-80">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Clock className="text-emerald-400" size={20} />
                        Shift Summary
                    </h3>
                    <Badge variant="green" className="animate-pulse">Active</Badge>
                </div>
                <p className="text-xs text-slate-400">Updating in real-time</p>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* Main KPIs */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Sales</p>
                        <p className="text-2xl font-bold text-white">{stats.count}</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total</p>
                        <p className="text-2xl font-bold text-emerald-400 truncate">${stats.revenue.toFixed(0)}</p>
                    </div>
                </div>

                {/* Avg Transaction */}
                <div className="bg-gradient-to-br from-indigo-600/20 to-emerald-600/20 p-4 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">Avg Transaction</p>
                        <p className="text-xl font-bold">${stats.avg_transaction.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="text-indigo-400 opacity-50" size={32} />
                </div>

                {/* Method Breakdown */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ArrowRightLeft size={14} />
                        Payment Methods
                    </h4>

                    <div className="space-y-3">
                        <div className="group">
                            <div className="flex justify-between text-sm mb-1.5 px-1">
                                <span className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                                    <Banknote size={14} className="text-emerald-400" /> Cash
                                </span>
                                <span className="font-medium">${stats.cash.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                    style={{ width: `${stats.revenue > 0 ? (stats.cash / stats.revenue) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="group">
                            <div className="flex justify-between text-sm mb-1.5 px-1">
                                <span className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                                    <CreditCard size={14} className="text-blue-400" /> Card
                                </span>
                                <span className="font-medium">${stats.card.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000"
                                    style={{ width: `${stats.revenue > 0 ? (stats.card / stats.revenue) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="group">
                            <div className="flex justify-between text-sm mb-1.5 px-1">
                                <span className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
                                    <ShieldCheck size={14} className="text-amber-400" /> Insurance
                                </span>
                                <span className="font-medium">${stats.insurance.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-1000"
                                    style={{ width: `${stats.revenue > 0 ? (stats.insurance * 2 / stats.revenue) * 100 : 0}%` }} // Insurance is usually a portion, multi by 2 for visibility if small
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Discounts Given</h4>
                        <span className="text-red-400 font-bold">-${stats.discounts.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-3">
                <Button
                    fullWidth
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white gap-2 border-none h-14 rounded-2xl shadow-lg shadow-red-900/20"
                    onClick={handleEndShift}
                    isLoading={isEnding}
                >
                    <LogOut size={18} />
                    End My Shift
                </Button>
            </div>
        </div>
    );
};

const Badge = ({ children, variant, className }: { children: React.ReactNode, variant: string, className?: string }) => {
    const variants: Record<string, string> = {
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        red: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
