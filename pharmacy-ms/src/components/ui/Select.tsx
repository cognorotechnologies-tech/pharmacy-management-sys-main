import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { }

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                className={cn(
                    'flex h-10 w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </select>
        );
    }
);
Select.displayName = 'Select';

export { Select };
