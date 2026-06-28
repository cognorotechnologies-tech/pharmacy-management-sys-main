import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    /** Max width class — defaults to max-w-lg */
    maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }, [open]);

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === dialogRef.current) onClose();
    };

    if (!open) return null;

    return (
        <dialog
            ref={dialogRef}
            onCancel={onClose}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full border-none bg-transparent p-0 backdrop:bg-black/50"
        >
            <div className="flex min-h-full items-center justify-center p-4">
                <div className={`w-full ${maxWidth} rounded-xl bg-white shadow-2xl`}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    {/* Body */}
                    <div className="px-6 py-4">{children}</div>
                </div>
            </div>
        </dialog>
    );
}
