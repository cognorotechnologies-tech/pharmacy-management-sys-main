import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    total: number;
    perPage: number;
}

export function Pagination({ page, totalPages, onPageChange, total, perPage }: PaginationProps) {
    if (totalPages <= 1) return null;

    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);

    return (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-700">{start}</span> to{' '}
                <span className="font-medium text-slate-700">{end}</span> of{' '}
                <span className="font-medium text-slate-700">{total}</span> results
            </p>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (page <= 3) {
                        pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = page - 2 + i;
                    }
                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={`min-w-[2rem] rounded-lg px-2.5 py-1 text-sm font-medium transition-colors ${pageNum === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
