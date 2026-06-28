import type { ReactNode } from 'react';

type Variant =
    | 'blue'
    | 'green'
    | 'amber'
    | 'red'
    | 'purple'
    | 'slate'
    | 'emerald'
    | 'sky'
    | 'orange';

const variantClasses: Record<Variant, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    purple: 'bg-violet-50 text-violet-700 ring-violet-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};

interface BadgeProps {
    variant?: Variant;
    children: ReactNode;
    /** Pulsing dot indicator */
    dot?: boolean;
}

export function Badge({ variant = 'slate', children, dot }: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
        >
            {dot && (
                <span className={`h-1.5 w-1.5 rounded-full ${variant === 'green' ? 'bg-green-500' :
                        variant === 'red' ? 'bg-red-500' :
                            variant === 'amber' ? 'bg-amber-500' :
                                'bg-current'
                    }`} />
            )}
            {children}
        </span>
    );
}
