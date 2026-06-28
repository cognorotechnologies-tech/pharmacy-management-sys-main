import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse bg-slate-800 rounded-sm", className)} />
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
    return (
        <div className="w-full space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between py-4 border-b border-slate-800">
                <Skeleton className="h-6 w-48" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-4 py-3 border-b border-slate-800/50">
                        {Array.from({ length: cols }).map((_, j) => (
                            <Skeleton key={j} className={cn("h-4 flex-1", j === 0 ? "max-w-[150px]" : "")} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    );
}
