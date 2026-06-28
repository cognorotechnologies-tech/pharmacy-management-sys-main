import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, fullWidth, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

        const variants = {
            primary: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 focus:ring-emerald-500',
            secondary: 'bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500',
            outline: 'border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-500',
            ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white focus:ring-slate-500',
            danger: 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20 focus:ring-red-500',
            success: 'bg-emerald-500 text-white hover:bg-emerald-400 focus:ring-emerald-500',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        const widthStyle = fullWidth ? 'w-full' : '';

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';
