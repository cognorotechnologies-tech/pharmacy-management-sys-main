import { useState, useMemo, useEffect } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Settings2,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: number;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    title?: string;
    searchPlaceholder?: string;
    id: string; // Unique ID for storage persistence
}

export function DataTable<T extends { id: string | number }>({
    data,
    columns: initialColumns,
    onRowClick,
    title,
    searchPlaceholder = "Search...",
    id
}: DataTableProps<T>) {
    // --- States ---
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem(`dt-columns-${id}`);
        return saved ? JSON.parse(saved) : initialColumns.map(c => String(c.key));
    });
    const [columnWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem(`dt-widths-${id}`);
        return saved ? JSON.parse(saved) : {};
    });
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [showConfig, setShowConfig] = useState(false);

    // --- Persistence ---
    useEffect(() => {
        localStorage.setItem(`dt-columns-${id}`, JSON.stringify(visibleColumns));
    }, [visibleColumns, id]);

    useEffect(() => {
        localStorage.setItem(`dt-widths-${id}`, JSON.stringify(columnWidths));
    }, [columnWidths, id]);

    // --- Logic ---
    const filteredData = useMemo(() => {
        return data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [data, searchQuery]);

    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;
        const { key, direction } = sortConfig;
        return [...filteredData].sort((a, b) => {
            const aVal = (a as any)[key];
            const bVal = (b as any)[key];
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / pageSize);
    const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const exportToCSV = () => {
        const headers = initialColumns.filter(c => visibleColumns.includes(String(c.key))).map(c => c.header).join(',');
        const rows = sortedData.map(item =>
            initialColumns
                .filter(c => visibleColumns.includes(String(c.key)))
                .map(c => {
                    const val = (item as any)[c.key];
                    return `"${String(val).replace(/"/g, '""')}"`;
                })
                .join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${id}_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-500">
            {/* Table Header / Toolbar */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/50 bg-slate-900/50">
                <div className="flex flex-col">
                    {title && <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>}
                    <p className="text-xs text-slate-500 font-medium">{filteredData.length} records found</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-sm text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all w-full sm:w-64"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfig(!showConfig)}
                            className={cn("gap-2", showConfig && "bg-slate-800 border-slate-700")}
                        >
                            <Settings2 size={16} />
                            <span className="hidden sm:inline">Columns</span>
                        </Button>

                        {showConfig && (
                            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 animate-in zoom-in-95 duration-200">
                                <h3 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visible Columns</h3>
                                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                    {initialColumns.map(col => (
                                        <label key={String(col.key)} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 rounded-sm cursor-pointer transition-colors group">
                                            <input
                                                type="checkbox"
                                                className="rounded-sm border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                                                checked={visibleColumns.includes(String(col.key))}
                                                onChange={() => toggleColumn(String(col.key))}
                                            />
                                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{col.header}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                        <Download size={16} />
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                </div>
            </div>

            {/* Actual Table */}
            <div className="overflow-x-auto custom-scrollbar relative min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 shadow-sm">
                        <tr className="border-b border-slate-800">
                            {initialColumns.filter(c => visibleColumns.includes(String(c.key))).map(col => (
                                <th
                                    key={String(col.key)}
                                    style={{ width: columnWidths[String(col.key)] || 'auto' }}
                                    className={cn(
                                        "px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-colors",
                                        col.sortable && "cursor-pointer hover:text-slate-300 select-none"
                                    )}
                                    onClick={() => col.sortable && handleSort(String(col.key))}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.header}
                                        {col.sortable && (
                                            <div className="flex flex-col">
                                                <ChevronUp size={10} className={cn(sortConfig?.key === col.key && sortConfig.direction === 'asc' ? "text-emerald-500" : "text-slate-700")} />
                                                <ChevronDown size={10} className={cn(sortConfig?.key === col.key && sortConfig.direction === 'desc' ? "text-emerald-500" : "text-slate-700")} />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="w-12 px-4 py-4" /> {/* Actions space */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        "group transition-colors",
                                        onRowClick ? "cursor-pointer hover:bg-slate-800/50" : "hover:bg-slate-800/30"
                                    )}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {initialColumns.filter(c => visibleColumns.includes(String(c.key))).map(col => (
                                        <td key={String(col.key)} className="px-4 py-4">
                                            {col.render ? (
                                                col.render(item)
                                            ) : (
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                                    {String((item as any)[col.key] ?? '-')}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-4 text-right">
                                        <button className="p-1 hover:bg-slate-700 rounded-sm text-slate-600 hover:text-white transition-all">
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={100} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-600">
                                            <Filter size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">No results found</h3>
                                            <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Show</span>
                        <select
                            className="bg-slate-950 border border-slate-800 rounded-sm text-xs text-slate-300 px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            {[10, 25, 50, 100].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-500 font-medium">per page</span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-slate-800" />
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                        Showing <span className="text-white">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-white">{Math.min(currentPage * pageSize, sortedData.length)}</span> of <span className="text-white">{sortedData.length}</span>
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft size={16} />
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Simple pagination logic for 5 pages
                            let pageNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) {
                                pageNum = currentPage - 2 + i;
                                if (pageNum + 2 > totalPages) pageNum = totalPages - 4 + i;
                            }
                            if (pageNum <= 0) return null;
                            if (pageNum > totalPages) return null;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={cn(
                                        "w-8 h-8 rounded-sm text-xs font-bold transition-all",
                                        currentPage === pageNum
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : "text-slate-500 hover:text-white hover:bg-slate-800"
                                    )}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
