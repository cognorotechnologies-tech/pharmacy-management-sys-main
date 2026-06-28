import React, { useState } from 'react';
import type { AuditLogFilters } from '@/hooks/useAuditLogs';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { format } from 'date-fns';
import { Search, Download, ChevronDown, ChevronRight, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { AuditLogWithUser } from '@/types/app';

// ─── Helpers ──────────────────────────────────────────────────

function getActionColor(action: string) {
    switch (action) {
        case 'INSERT': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

// Generate a summary sentence based on action and table
function generateSummary(log: AuditLogWithUser) {
    const table = log.entity_type;
    const id = log.entity_id.split('-')[0]; // Shortened ID for readable display

    switch (log.action) {
        case 'INSERT': return `Created new record in ${table} (ID: ...${id})`;
        case 'UPDATE': return `Modified record in ${table} (ID: ...${id})`;
        case 'DELETE': return `Deleted record from ${table} (ID: ...${id})`;
        default: return `Action ${log.action} on ${table}`;
    }
}

// ─── Sub-Components ───────────────────────────────────────────

const JSONDiffViewer = ({ oldValues, newValues }: { oldValues: any, newValues: any }) => {
    // Basic structural difference map
    const allKeys = new Set([
        ...(oldValues ? Object.keys(oldValues) : []),
        ...(newValues ? Object.keys(newValues) : [])
    ]);

    const rows = Array.from(allKeys).map(key => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

        return {
            key,
            old: oldVal !== undefined ? JSON.stringify(oldVal) : 'null',
            new: newVal !== undefined ? JSON.stringify(newVal) : 'null',
            isChanged
        };
    });

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mt-2 mb-4 font-mono text-xs overflow-x-auto space-y-1">
            <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-200 text-slate-500 font-semibold mb-2 uppercase tracking-wider text-[10px]">
                <div className="col-span-3">Field</div>
                <div className="col-span-4">Previous Value</div>
                <div className="col-span-5">New Value</div>
            </div>
            {rows.map(row => (
                <div
                    key={row.key}
                    className={`grid grid-cols-12 gap-4 py-1.5 px-2 rounded-sm ${row.isChanged ? 'bg-amber-100/50' : ''}`}
                >
                    <div className="col-span-3 text-slate-700 font-medium truncate" title={row.key}>
                        {row.key}
                    </div>
                    <div className={`col-span-4 truncate ${row.isChanged && oldValues ? 'text-red-600 line-through opacity-70' : 'text-slate-600'}`} title={row.old}>
                        {row.old}
                    </div>
                    <div className={`col-span-5 truncate ${row.isChanged ? 'text-emerald-700 font-medium bg-emerald-50 px-1 rounded' : 'text-slate-600'}`} title={row.new}>
                        {row.new}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────

export default function AuditLogPage() {
    const [filters, setFilters] = useState<AuditLogFilters>({
        action: 'ALL',
        entity_type: 'ALL',
        limit: 100
    });
    const [searchInput, setSearchInput] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Debounced query setup (simple delay for typing)
    const { data: logs, isLoading, error } = useAuditLogs(filters);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, search_query: searchInput }));
    };


    const handleExportCSV = () => {
        if (!logs || logs.length === 0) return;

        const headers = ['Timestamp', 'User', 'Action', 'Table', 'Entity ID', 'IP Address', 'User Agent'];
        const csvRows = logs.map(log => [
            new Date(log.created_at).toISOString(),
            log.user?.email || 'System',
            log.action,
            log.entity_type,
            log.entity_id,
            log.ip_address || 'N/A',
            `"${log.user_agent?.replace(/"/g, '""') || ''}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Strict Compliance Banner */}
            <div className="bg-slate-900 text-slate-50 p-4 rounded-lg flex items-start gap-3 shadow-md border border-slate-800">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-200">System Audit Trail</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Audit records are retained for 7 years per regulatory requirements. This log captures immutable historical evidence of data mutations across the system.
                        Records are cryptographic, INSERT-only, and protected by strict Row Level Security.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <form onSubmit={handleSearch} className="flex-1 w-full max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search by Record ID..."
                        className="pl-9 h-9 border-slate-300 rounded-md bg-slate-50 focus:bg-white transition-colors text-sm"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </form>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <Select
                        value={filters.action || 'ALL'}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                        className="h-9 w-[140px] text-sm"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="INSERT">INSERT</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </Select>

                    <Select
                        value={filters.entity_type || 'ALL'}
                        onChange={(e) => setFilters(prev => ({ ...prev, entity_type: e.target.value }))}
                        className="h-9 w-[160px] text-sm"
                    >
                        <option value="ALL">All Tables</option>
                        <option value="inventory">Inventory</option>
                        <option value="prescriptions">Prescriptions</option>
                        <option value="batches">Batches</option>
                        <option value="products">Products</option>
                        <option value="sales">Sales</option>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="h-9 border-slate-300 text-slate-700 ml-auto lg:ml-0"
                        disabled={!logs?.length}
                    >
                        <Download className="w-4 h-4 mr-2 text-slate-500" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left align-top">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-4 py-3 font-semibold w-10"></th>
                                <th className="px-4 py-3 font-semibold w-[180px]">Timestamp</th>
                                <th className="px-4 py-3 font-semibold">User</th>
                                <th className="px-4 py-3 font-semibold w-[120px]">Action</th>
                                <th className="px-4 py-3 font-semibold">Summary & Table</th>
                                <th className="px-4 py-3 font-semibold w-[160px]">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        <div className="animate-pulse flex flex-col items-center gap-2">
                                            <div className="h-5 w-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mt-2">Scanning Ledgers...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center">
                                        <div className="inline-flex items-center justify-center p-3 bg-red-50 text-red-600 rounded-full mb-3">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <p className="text-slate-600 font-medium text-sm">Error loading audit records.</p>
                                        <p className="text-slate-400 text-xs mt-1">{error.message}</p>
                                    </td>
                                </tr>
                            ) : logs?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        No audit records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                logs?.map((log) => {
                                    const isExpanded = expandedRow === log.id;
                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer group ${isExpanded ? 'bg-slate-50' : ''}`}
                                                onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                                            >
                                                <td className="px-4 py-3 text-slate-400 text-center align-middle">
                                                    {isExpanded ?
                                                        <ChevronDown className="w-4 h-4 mx-auto text-blue-600" /> :
                                                        <ChevronRight className="w-4 h-4 mx-auto group-hover:text-slate-600 transition-colors" />
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[13px]">
                                                    {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 overflow-hidden">
                                                            {log.user?.avatar_url ? (
                                                                <img src={log.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                            ) : (
                                                                log.user?.full_name?.substring(0, 2).toUpperCase() || 'SY'
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-900 leading-tight">
                                                                {log.user?.full_name || 'System Worker'}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 leading-tight">
                                                                {log.user?.email || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${getActionColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-800">{generateSummary(log)}</span>
                                                        <span className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {log.entity_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded select-all">
                                                        {log.ip_address as string || 'Unknown'}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Expandable JSON Diff Row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 border-b border-t border-slate-100">
                                                    <td colSpan={6} className="px-12 py-3">
                                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                                                Data Payload Analysis
                                                                <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-sm normal-case font-mono text-[10px] font-normal">
                                                                    {log.action} payload on {log.entity_type}
                                                                </span>
                                                            </h4>
                                                            <JSONDiffViewer
                                                                oldValues={log.old_values}
                                                                newValues={log.new_values}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {logs && logs.length >= (filters.limit || 100) && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                        <Button
                            variant="ghost"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => setFilters(prev => ({ ...prev, limit: (prev.limit || 0) + 100 }))}
                        >
                            Load 100 More Records
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
