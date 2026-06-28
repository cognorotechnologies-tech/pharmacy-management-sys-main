import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SlideOverProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    /** Width class — defaults to max-w-lg */
    width?: string;
}

export function SlideOver({ open, onClose, title, children, width = 'max-w-lg' }: SlideOverProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // Prevent body scroll
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed inset-y-0 right-0 z-50 flex w-full ${width} flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        aria-label="Close panel"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
            </div>
        </>
    );
}
