import type { LucideIcon } from 'lucide-react';
import { Filter } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({
    title,
    description,
    icon: Icon = Filter,
    action
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl animate-in fade-in zoom-in-95 duration-700">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mb-6 shadow-inner">
                <Icon size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
                {description}
            </p>
            {action && (
                <Button onClick={action.onClick} className="px-8 shadow-lg shadow-emerald-500/10">
                    {action.label}
                </Button>
            )}
        </div>
    );
}

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = "Something went wrong",
    message,
    onRetry
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl animate-in shake-in duration-500">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-rose-200/60 max-w-sm mb-8">
                {message}
            </p>
            {onRetry && (
                <Button variant="outline" onClick={onRetry} className="border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                    Try Again
                </Button>
            )}
        </div>
    );
}
